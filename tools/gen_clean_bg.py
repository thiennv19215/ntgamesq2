import base64
import requests
import time
import os
import sys
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

API_EDIT_URL = "http://47.131.241.228:8317/v1/images/edits"
API_KEY = os.environ["IMAGE_API_KEY"]

def generate_clean_bg():
    ref_path = "nhan-vat/nen-lop-hoc-rong-khong-nguoi-2d.png"
    print(f"[*] Preparing clean background reference: {ref_path}...")
    with open(ref_path, "rb") as f:
        b64_img = base64.b64encode(f.read()).decode("utf-8")
    data_url = f"data:image/png;base64,{b64_img}"

    prompt = (
        "Strictly preserve the exact camera perspective, angle, chalkboard position, front teacher podium, "
        "and the exact arrangement of student desks and benches from the reference image. "
        "IMPORTANT: Completely empty classroom, zero people, no teacher, no students, no text on boards. "
        "Upgrade the visual aesthetic to be charming and cute: warm cozy pastel anime lighting, "
        "clean polished wood textures, soft gentle sunbeams through side hallway, "
        "vibrant and sharp 2D vector game background art, 9:16 vertical aspect ratio"
    )

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }
    payload = {
        "model": "gpt-image-2.5",
        "prompt": prompt,
        "images": [{"image_url": data_url}],
        "size": "1024x1792"
    }

    print("[*] Sending request to VPS 3 CLIProxy (images/edits)...")
    res = requests.post(API_EDIT_URL, json=payload, headers=headers, timeout=180)
    res.raise_for_status()
    data = res.json()
    b64_str = data["data"][0]["b64_json"]
    img_bytes = base64.b64decode(b64_str)
    out_path = os.path.join("public", "assets", "generated", "bg_clean_empty_classroom.png")
    with open(out_path, "wb") as f:
        f.write(img_bytes)
    print(f"[+] Clean background saved successfully to: {out_path}")

if __name__ == "__main__":
    generate_clean_bg()
