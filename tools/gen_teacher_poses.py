import os
import sys
import time
import base64
import requests
from PIL import Image
from rembg import remove

sys.stdout.reconfigure(encoding='utf-8')

API_EDIT_URL = "http://47.131.241.228:8317/v1/images/edits"
API_KEY = os.environ["IMAGE_API_KEY"]

REF_PATH = "public/assets/generated/teacher_white_aodai_cute_transparent.png"
OUT_DIR = "public/assets/generated/teacher_poses"
os.makedirs(OUT_DIR, exist_ok=True)

with open(REF_PATH, "rb") as f:
    REF_B64 = base64.b64encode(f.read()).decode("utf-8")
DATA_URL = f"data:image/png;base64,{REF_B64}"

def generate_pose(pose_id, prompt_desc):
    out_file = os.path.join(OUT_DIR, f"{pose_id}.webp")
    raw_file = os.path.join(OUT_DIR, f"{pose_id}_raw.png")
    print(f"\n[*] Generating pose: {pose_id}...")
    
    prompt = (
        "Strictly preserve the exact same cute chibi anime Vietnamese female teacher character from the reference image: "
        "same face, round glasses, dark hair with flower hairpin, and pristine white Ao Dai. "
        f"Change only her pose: {prompt_desc}. "
        "Clean isolated solid pure white background, full body 2D vector game sprite, sticker style, sharp outlines."
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

    start = time.time()
    res = requests.post(API_EDIT_URL, json=payload, headers=headers, timeout=180)
    res.raise_for_status()
    data = res.json()
    b64_str = data["data"][0]["b64_json"]
    with open(raw_file, "wb") as f:
        f.write(base64.b64decode(b64_str))
    
    # Remove background with rembg
    print(f"[*] Removing background with rembg for {pose_id}...")
    raw_img = Image.open(raw_file)
    nobg = remove(raw_img)
    
    # Crop tight bbox and fit onto standard canvas 330x560
    bbox = nobg.getbbox()
    if bbox:
        tight = nobg.crop(bbox)
        target_h = 555
        target_w = int(tight.width * target_h / tight.height)
        scaled = tight.resize((target_w, target_h), Image.LANCZOS)
        
        canvas = Image.new('RGBA', (330, 560), (0, 0, 0, 0))
        x = (330 - target_w) // 2
        y = 560 - target_h - 2
        canvas.paste(scaled, (x, y), scaled)
        canvas.save(out_file, 'WEBP', quality=95)
    else:
        nobg.resize((330, 560), Image.LANCZOS).save(out_file, 'WEBP', quality=95)

    elapsed = round(time.time() - start, 2)
    print(f"[+] Pose {pose_id} completed and saved to {out_file} ({elapsed}s)")
    return out_file

if __name__ == "__main__":
    # Test pose: chi-bang
    generate_pose("03-chi-bang", "She is holding a cute wooden pointer stick pointing towards the right side with a confident smiling face")
