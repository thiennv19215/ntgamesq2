import base64
import requests
import time
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

API_EDIT_URL = "http://47.131.241.228:8317/v1/images/edits"
API_KEY = os.environ["IMAGE_API_KEY"]

REF_PATH = "public/assets/generated/bg_i2i_from_reference.png"
OUT_PATH = "public/assets/generated/bg_i2i_empty_no_students.png"

with open(REF_PATH, "rb") as f:
    REF_B64 = base64.b64encode(f.read()).decode("utf-8")
DATA_URL = f"data:image/png;base64,{REF_B64}"

prompt = (
    "Strictly preserve the exact same classroom interior, art style, colors, lighting, chalkboard, "
    "and layout from the reference image. "
    "CRITICAL MODIFICATION: REMOVE ALL STUDENTS AND PEOPLE COMPLETELY. "
    "All wooden student desks and chairs must be completely empty, with nobody sitting at them. "
    "Empty classroom, zero students, zero people, clean empty student desks facing forward, "
    "empty teacher podium. Completely empty 2D anime classroom background, high resolution 9:16 vertical."
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

print("[*] Sending request to remove all students from bg_i2i_from_reference...")
start = time.time()
res = requests.post(API_EDIT_URL, json=payload, headers=headers, timeout=180)
res.raise_for_status()
data = res.json()
b64_str = data["data"][0]["b64_json"]
with open(OUT_PATH, "wb") as f:
    f.write(base64.b64decode(b64_str))
elapsed = round(time.time() - start, 2)
print(f"[+] Successfully generated empty background: {OUT_PATH} ({elapsed}s)")
