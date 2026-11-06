import base64
import requests
import time
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

API_EDIT_URL = "http://47.131.241.228:8317/v1/images/edits"
API_KEY = os.environ["IMAGE_API_KEY"]

REF_PATH = "public/assets/generated/bg_i2i_from_reference.png"
OUT_PATH = "public/assets/generated/bg_i2i_30seats_blank_boards.png"

with open(REF_PATH, "rb") as f:
    REF_B64 = base64.b64encode(f.read()).decode("utf-8")
DATA_URL = f"data:image/png;base64,{REF_B64}"

prompt = (
    "Directly preserve the exact visual art style, warm terracotta floor, lush green balcony plants, and lighting from the reference image. "
    "CRITICAL MODIFICATIONS: "
    "1. ALL BOARDS ARE COMPLETELY BLANK: The large chalkboard in the upper center is a smooth, blank, clean dark green chalkboard with NO text, NO writing, NO words at all. "
    "2. THE CLASSROOM HAS EXACTLY 30 SEATS CLEARLY VISIBLE: There are 4 spacious, neat rows of wooden student desks clearly showing 30 student seats with a central aisle. "
    "3. ZERO PEOPLE: Completely empty classroom, NO students, NO teacher on the podium, absolutely NO characters. "
    "Clean 2D anime game background asset, high resolution, 9:16 vertical ratio."
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

print("[*] Generating new style background based on bg_i2i_from_reference with 30 clear seats and blank boards...")
start = time.time()
res = requests.post(API_EDIT_URL, json=payload, headers=headers, timeout=180)
res.raise_for_status()
data = res.json()
b64_str = data["data"][0]["b64_json"]
with open(OUT_PATH, "wb") as f:
    f.write(base64.b64decode(b64_str))
elapsed = round(time.time() - start, 2)
print(f"[+] Successfully saved: {OUT_PATH} ({elapsed}s)")
