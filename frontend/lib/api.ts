export const API_URL = "http://localhost:8000";

export type Product = {
  id: number;
  name: string;
  description: string;
  price_cents: number;
  category: string;
  brand: string;
  sku: string;
  cover_image_url: string;
  stock: number;
};

export function formatPrice(cents: number) {
  return "$" + (cents / 100).toFixed(2);
}

async function newToken() {
  const res = await fetch(`${API_URL}/sessions`, { method: "POST" });
  const { token } = await res.json();
  localStorage.setItem("token", token);
  return token;
}

// fetch with the session token. if it expired (401), get a new one and retry.
export async function apiFetch(path: string, options: RequestInit = {}) {
  const send = (token: string) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    });

  const res = await send(localStorage.getItem("token") || (await newToken()));
  return res.status === 401 ? send(await newToken()) : res;
}

export function addToCart(productId: number) {
  return apiFetch("/cart", { method: "POST", body: JSON.stringify({ product_id: productId }) });
}
