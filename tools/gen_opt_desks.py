import base64
import requests
import time
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

API_EDIT_URL = "http://47.131.241.228:8317/v1/images/edits"
API_KEY = os.environ["IMAGE_API_KEY"]

REF_PATH = "public/assets/generated/bg_i2i_30seats_blank_boards.png"
OUT_PATH = "public/assets/generated/bg_desks_optimized.png"

with open(REF_PATH, "rb") as f:
    REF_B64 = base64.b64encode(f.read()).decode("utf-8")
DATA_URL = f"data:image/png;base64,{REF_B64}"

prompt = (
    "Strictly preserve the exact same classroom colors, lighting, clean blank dark green chalkboard, "
    "empty podium, and lush green corridor plants from the reference image. "
    "OPTIMIZE THE DESKS AND CHAIRS: "
    "Clean up and optimize the student seating area so the desks and benches are perfectly straight, "
    "neatly aligned, and beautifully proportioned. "
    "4 spacious, clean horizontal rows of warm honey-oak wooden desks and benches with a wide central aisle, "
    "perfectly spaced for 30 students, sharp clean straight perspective lines, smooth wooden surfaces. "
    "Completely empty, zero students, zero people, high quality clean 2D anime game background asset, 9:16 vertical."
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

print("[*] Generating optimized desks and chairs background...")
start = time.time()
res = requests.post(API_EDIT_URL, json=payload, headers=headers, timeout=180)
res.raise_for_status()
data = res.json()
b64_str = data["data"][0]["b64_json"]
with open(OUT_PATH, "wb") as f:
    f.write(base64.b64decode(b64_str))
elapsed = round(time.time() - start, 2)
print(f"[+] Successfully saved optimized background to: {OUT_PATH} ({elapsed}s)")
