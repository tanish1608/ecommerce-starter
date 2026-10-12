"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { apiFetch, formatPrice } from "@/lib/api";

type CartItem = { product_id: number; name: string; price_cents: number; quantity: number };

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [message, setMessage] = useState("");

  async function loadCart(res: Response) {
    const cart = await res.json();
    setItems(cart.items);
    setSubtotal(cart.subtotal_cents);
  }

  useEffect(() => {
    apiFetch("/cart").then(loadCart);
  }, []);

  async function checkout() {
    const res = await apiFetch("/checkout", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setItems([]);
      setMessage(`Order #${data.order_id} placed! Total: ${formatPrice(data.total_cents)}`);
    } else {
      setMessage(data.detail);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Cart</h1>
      {message && <p>{message}</p>}

      {items.map((item) => (
        <div key={item.product_id} className="flex items-center justify-between border-b pb-2">
          <span>
            {item.name} × {item.quantity}
          </span>
          <Button variant="outline" onClick={() => apiFetch(`/cart/${item.product_id}`, { method: "DELETE" }).then(loadCart)}>
            Remove
          </Button>
        </div>
      ))}

      {items.length > 0 ? (
        <>
          <p>Subtotal: {formatPrice(subtotal)}</p>
          <Button onClick={checkout}>Checkout</Button>
        </>
      ) : (
        <p>Your cart is empty.</p>
      )}
    </div>
  );
}
