CREATE TABLE order_items (
    order_id                BIGINT  NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_id              BIGINT  NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
    quantity                INTEGER NOT NULL CHECK (quantity > 0),
    price_cents_at_purchase INTEGER NOT NULL CHECK (price_cents_at_purchase >= 0),
    PRIMARY KEY (order_id, product_id)
);
