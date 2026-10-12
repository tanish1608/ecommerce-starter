"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { API_URL, addToCart, formatPrice, Product } from "@/lib/api";

export default function ProductPage() {
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    fetch(`${API_URL}/products/${id}`)
      .then((res) => res.json())
      .then(setProduct);
  }, []);

  if (!product) return <p>Loading...</p>;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <img src={product.cover_image_url} alt={product.name} className="w-full rounded-lg" />
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">{product.name}</h1>
        <p className="text-xl">{formatPrice(product.price_cents)}</p>
        <p>{product.description}</p>
        <p className="text-sm">
          {product.brand} · {product.category} · {product.stock} in stock
        </p>
        <Button disabled={product.stock === 0} onClick={() => addToCart(product.id)}>
          {product.stock === 0 ? "Sold out" : "Add to Cart"}
        </Button>
      </div>
    </div>
  );
}
