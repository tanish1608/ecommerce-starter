# Two (or more) people try to buy the last unit of a product at the same time.
# Expected: exactly one checkout succeeds, the rest get 409, stock ends at 0.
from concurrent.futures import ThreadPoolExecutor

import requests

API = "http://localhost:8000"
PRODUCT_ID = 9
BUYERS = 5

# set stock to exactly 1
product = requests.get(f"{API}/products/{PRODUCT_ID}").json()
requests.patch(f"{API}/admin/products/{PRODUCT_ID}/stock", json={"delta": 1 - product["stock"]})

# each buyer gets their own session and puts the product in their cart
headers = []
for _ in range(BUYERS):
    token = requests.post(f"{API}/sessions").json()["token"]
    h = {"Authorization": f"Bearer {token}"}
    requests.post(f"{API}/cart", json={"product_id": PRODUCT_ID, "quantity": 1}, headers=h)
    headers.append(h)

# everyone checks out at once
with ThreadPoolExecutor(BUYERS) as pool:
    results = list(pool.map(lambda h: requests.post(f"{API}/checkout", headers=h), headers))

for r in results:
    print(r.status_code, r.json())

print("final stock:", requests.get(f"{API}/products/{PRODUCT_ID}").json()["stock"])
