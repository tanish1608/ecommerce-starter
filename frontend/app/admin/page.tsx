"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_URL, formatPrice, Product } from "@/lib/api";

const emptyForm = {
  name: "",
  description: "",
  price_cents: 0,
  category: "",
  brand: "",
  sku: "",
  cover_image_url: "",
  stock: 0,
};

async function send(path: string, method: string, body?: object) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) alert((await res.json()).detail);
}

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  function loadProducts() {
    fetch(`${API_URL}/products`)
      .then((res) => res.json())
      .then(setProducts);
  }

  useEffect(loadProducts, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) await send(`/admin/products/${editingId}`, "PUT", form);
    else await send("/admin/products", "POST", form);
    setForm(emptyForm);
    setEditingId(null);
    loadProducts();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin</h1>

      <form onSubmit={save} className="grid max-w-md gap-2">
        {Object.keys(emptyForm).map((field) => (
          <label key={field} className="text-sm">
            {field}
            <Input
              value={form[field as keyof typeof form]}
              onChange={(e) => {
                const isNumber = typeof emptyForm[field as keyof typeof form] === "number";
                setForm({ ...form, [field]: isNumber ? Number(e.target.value) : e.target.value });
              }}
            />
          </label>
        ))}
        <Button type="submit">{editingId ? "Save" : "Add product"}</Button>
      </form>

      <table className="w-full text-left">
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="py-2">{p.name}</td>
              <td>{formatPrice(p.price_cents)}</td>
              <td>
                <Button variant="outline" size="xs" onClick={() => send(`/admin/products/${p.id}/stock`, "PATCH", { delta: -1 }).then(loadProducts)}>
                  -
                </Button>
                <span className="mx-2">{p.stock}</span>
                <Button variant="outline" size="xs" onClick={() => send(`/admin/products/${p.id}/stock`, "PATCH", { delta: 1 }).then(loadProducts)}>
                  +
                </Button>
              </td>
              <td className="space-x-2">
                <Button variant="outline" size="sm" onClick={() => { setEditingId(p.id); setForm(p); }}>
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => send(`/admin/products/${p.id}`, "DELETE").then(loadProducts)}>
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
