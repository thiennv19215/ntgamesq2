import base64
import requests
import time
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

API_EDIT_URL = "http://47.131.241.228:8317/v1/images/edits"
API_KEY = os.environ["IMAGE_API_KEY"]

REF_PATH = "nhan-vat/nen-lop-hoc-rong-khong-nguoi-2d.png"
OUT_PATH = "public/assets/generated/bg_30_seats_clean.png"

with open(REF_PATH, "rb") as f:
    REF_B64 = base64.b64encode(f.read()).decode("utf-8")
DATA_URL = f"data:image/png;base64,{REF_B64}"

prompt = (
    "Strictly follow the exact structural layout, camera perspective, and safe zone of the reference image: "
    "There are exactly 4 spacious horizontal rows of wooden desks and benches in the middle area "
    "designed for 30 students to sit clearly with ample space, "
    "the bottom floor area is clean and empty (safe zone for mobile stream overlay). "
    "Top center: a large rectangular dark green chalkboard with warm wooden frame, completely BLANK and empty with NO text. "
    "Front left: an elevated wooden teacher podium platform, completely EMPTY with NO teacher and NO people anywhere. "
    "Clean honey-oak wooden classroom desks, warm cozy sunlight, vibrant clean 2D anime game background illustration, "
    "zero students, completely empty room, high resolution 9:16 vertical ratio."
)

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}"
}
payload = {
    "model": "gpt-image-2.5",
    "prompt": prompt,
    "images": [{"image_url": DATA_URL}],
    "size": "1024x1792"
}

print("[*] Generating clean 30-seat classroom background with safe zone and blank chalkboard...")
start = time.time()
res = requests.post(API_EDIT_URL, json=payload, headers=headers, timeout=180)
res.raise_for_status()
data = res.json()
b64_str = data["data"][0]["b64_json"]
with open(OUT_PATH, "wb") as f:
    f.write(base64.b64decode(b64_str))
elapsed = round(time.time() - start, 2)
print(f"[+] 30-seat clean background saved to: {OUT_PATH} ({elapsed}s)")
