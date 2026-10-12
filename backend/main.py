import os
import secrets

import psycopg
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from psycopg.rows import dict_row
from pydantic import BaseModel

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/postgres")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


class ProductIn(BaseModel):
    name: str
    description: str = ""
    price_cents: int
    category: str
    brand: str
    sku: str
    cover_image_url: str = ""
    stock: int


class StockChange(BaseModel):
    delta: int


class CartItemIn(BaseModel):
    product_id: int
    quantity: int = 1


def get_session_token(authorization):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing session token")
    token = authorization.removeprefix("Bearer ")

    with get_db() as conn:
        row = conn.execute(
            "SELECT token FROM sessions WHERE token = %s AND expires_at > NOW()", (token,)
        ).fetchone()
    if row is None:
        raise HTTPException(401, "Session invalid or expired")
    return token


@app.get("/")
def root():
    return {"status": "ok"}


# ---------- sessions ----------

@app.post("/sessions")
def create_session():
    token = secrets.token_urlsafe(32)
    with get_db() as conn:
        conn.execute(
            "INSERT INTO sessions (token, expires_at) VALUES (%s, NOW() + INTERVAL '1 hour')",
            (token,),
        )
    return {"token": token}


# ---------- products ----------

@app.get("/products")
def list_products():
    with get_db() as conn:
        return conn.execute("SELECT * FROM products ORDER BY id").fetchall()


@app.get("/products/{product_id}")
def get_product(product_id: int):
    with get_db() as conn:
        product = conn.execute("SELECT * FROM products WHERE id = %s", (product_id,)).fetchone()
    if product is None:
        raise HTTPException(404, "Product not found")
    return product


# ---------- admin ----------

# duplicate SKU, stock below 0, or deleting a product that has orders
@app.exception_handler(psycopg.errors.IntegrityError)
def integrity_error(request, exc):
    return JSONResponse(status_code=409, content={"detail": str(exc.diag.message_primary)})

@app.post("/admin/products")
def create_product(p: ProductIn):
    with get_db() as conn:
        return conn.execute(
            """
            INSERT INTO products (name, description, price_cents, category, brand, sku, cover_image_url, stock)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (p.name, p.description, p.price_cents, p.category, p.brand, p.sku, p.cover_image_url, p.stock),
        ).fetchone()


@app.put("/admin/products/{product_id}")
def update_product(product_id: int, p: ProductIn):
    with get_db() as conn:
        product = conn.execute(
            """
            UPDATE products
            SET name = %s, description = %s, price_cents = %s, category = %s, brand = %s,
                sku = %s, cover_image_url = %s, stock = %s, updated_at = NOW()
            WHERE id = %s
            RETURNING *
            """,
            (p.name, p.description, p.price_cents, p.category, p.brand, p.sku, p.cover_image_url, p.stock, product_id),
        ).fetchone()
    if product is None:
        raise HTTPException(404, "Product not found")
    return product


@app.patch("/admin/products/{product_id}/stock")
def change_stock(product_id: int, body: StockChange):
    with get_db() as conn:
        product = conn.execute(
            "UPDATE products SET stock = stock + %s, updated_at = NOW() WHERE id = %s RETURNING *",
            (body.delta, product_id),
        ).fetchone()
    if product is None:
        raise HTTPException(404, "Product not found")
    return product


@app.delete("/admin/products/{product_id}")
def delete_product(product_id: int):
    with get_db() as conn:
        conn.execute("DELETE FROM products WHERE id = %s", (product_id,))
    return {"ok": True}


# ---------- cart ----------

@app.get("/cart")
def get_cart(authorization: str = Header(None)):
    token = get_session_token(authorization)
    with get_db() as conn:
        items = conn.execute(
            """
            SELECT p.id AS product_id, p.name, p.price_cents, p.cover_image_url, ci.quantity
            FROM cart_items ci
            JOIN products p ON p.id = ci.product_id
            WHERE ci.session_token = %s
            ORDER BY p.name
            """,
            (token,),
        ).fetchall()
    subtotal = sum(i["price_cents"] * i["quantity"] for i in items)
    return {"items": items, "subtotal_cents": subtotal}


@app.post("/cart")
def add_to_cart(item: CartItemIn, authorization: str = Header(None)):
    token = get_session_token(authorization)
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO cart_items (session_token, product_id, quantity)
            VALUES (%s, %s, %s)
            ON CONFLICT (session_token, product_id)
            DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
            """,
            (token, item.product_id, item.quantity),
        )
    return get_cart(authorization)


@app.delete("/cart/{product_id}")
def remove_from_cart(product_id: int, authorization: str = Header(None)):
    token = get_session_token(authorization)
    with get_db() as conn:
        conn.execute(
            "DELETE FROM cart_items WHERE session_token = %s AND product_id = %s",
            (token, product_id),
        )
    return get_cart(authorization)


# ---------- checkout ----------

@app.post("/checkout")
def checkout(authorization: str = Header(None)):
    token = get_session_token(authorization)

    # Everything inside this block is one transaction (commits at the end, rolls back on error).
    with get_db() as conn:
        # FOR UPDATE locks these product rows until we commit, so another checkout
        # for the same product has to wait and then sees the new stock.
        items = conn.execute(
            """
            SELECT p.id, p.name, p.price_cents, p.stock, ci.quantity
            FROM cart_items ci
            JOIN products p ON p.id = ci.product_id
            WHERE ci.session_token = %s
            ORDER BY p.id
            FOR UPDATE OF p
            """,
            (token,),
        ).fetchall()

        if not items:
            raise HTTPException(400, "Cart is empty")

        for item in items:
            if item["quantity"] > item["stock"]:
                raise HTTPException(409, f"{item['name']} is out of stock")

        total = sum(i["price_cents"] * i["quantity"] for i in items)
        order = conn.execute(
            "INSERT INTO orders (session_token, total_cents) VALUES (%s, %s) RETURNING id",
            (token, total),
        ).fetchone()

        for item in items:
            conn.execute(
                "UPDATE products SET stock = stock - %s, updated_at = NOW() WHERE id = %s",
                (item["quantity"], item["id"]),
            )
            conn.execute(
                """
                INSERT INTO order_items (order_id, product_id, quantity, price_cents_at_purchase)
                VALUES (%s, %s, %s, %s)
                """,
                (order["id"], item["id"], item["quantity"], item["price_cents"]),
            )

        conn.execute("DELETE FROM cart_items WHERE session_token = %s", (token,))

    return {"order_id": order["id"], "total_cents": total}
