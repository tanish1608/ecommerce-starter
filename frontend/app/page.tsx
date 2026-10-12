"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { API_URL, addToCart, formatPrice, Product } from "@/lib/api";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/products`)
      .then((res) => res.json())
      .then(setProducts);
  }, []);

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {products.map((p) => (
        <div key={p.id} className="rounded-lg border p-3">
          <Link href={`/product?id=${p.id}`}>
            <img src={p.cover_image_url} alt={p.name} className="aspect-square w-full rounded object-cover" />
            <p className="mt-2 font-medium">{p.name}</p>
          </Link>
          <p>{formatPrice(p.price_cents)}</p>
          <Button className="mt-2 w-full" disabled={p.stock === 0} onClick={() => addToCart(p.id)}>
            {p.stock === 0 ? "Sold out" : "Add to Cart"}
          </Button>
        </div>
      ))}
    </div>
  );
}
