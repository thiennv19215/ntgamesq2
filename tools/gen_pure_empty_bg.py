import base64
import requests
import time
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

API_EDIT_URL = "http://47.131.241.228:8317/v1/images/edits"
API_KEY = os.environ["IMAGE_API_KEY"]

REF_PATH = "public/assets/generated/bg_i2i_empty_no_students.png"
OUT_PATH = "public/assets/generated/bg_pure_empty_boards.png"

with open(REF_PATH, "rb") as f:
    REF_B64 = base64.b64encode(f.read()).decode("utf-8")
DATA_URL = f"data:image/png;base64,{REF_B64}"

prompt = (
    "Strictly preserve the exact classroom architecture, 5 columns of empty wooden desks, perspective, lighting, and wooden hallway from the reference image. "
    "CRITICAL MODIFICATIONS FOR A CLEAN GAME BACKGROUND ASSET: "
    "1. ALL BOARDS MUST BE COMPLETELY EMPTY AND BLANK: The large central chalkboard must be a clean, blank dark green surface with NO text, NO letters, NO words, NO chalk markings. "
    "2. THE PODIUM MUST BE EMPTY: Zero people, NO teacher standing on the podium, absolutely NO characters anywhere in the scene. "
    "3. REMOVE all side signs, scoreboards, and banners on the walls - keep the walls and boards clean and blank. "
    "A 100% clean, empty 2D anime classroom background ready for game UI overlay, 9:16 vertical ratio."
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

print("[*] Generating pure empty classroom background with BLANK boards and NO people...")
start = time.time()
res = requests.post(API_EDIT_URL, json=payload, headers=headers, timeout=180)
res.raise_for_status()
data = res.json()
b64_str = data["data"][0]["b64_json"]
with open(OUT_PATH, "wb") as f:
    f.write(base64.b64decode(b64_str))
elapsed = round(time.time() - start, 2)
print(f"[+] Pure empty background saved: {OUT_PATH} ({elapsed}s)")
