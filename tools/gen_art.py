import base64
import requests
import time
import os
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

API_GEN_URL = "http://47.131.241.228:8317/v1/images/generations"
API_EDIT_URL = "http://47.131.241.228:8317/v1/images/edits"
API_KEY = os.environ["IMAGE_API_KEY"]

def generate_image(prompt, filename, ref_image=None, size="1024x1792", model="gpt-image-2.5"):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }

    if ref_image and os.path.exists(ref_image):
        print(f"[*] Calling Image-to-Image (images/edits) with reference: {ref_image} -> {filename}...")
        with open(ref_image, "rb") as f:
            b64_img = base64.b64encode(f.read()).decode("utf-8")
        data_url = f"data:image/png;base64,{b64_img}"
        api_url = API_EDIT_URL
        payload = {
            "model": model,
            "prompt": prompt,
            "images": [{"image_url": data_url}],
            "size": size
        }
    else:
        print(f"[*] Calling Text-to-Image (images/generations) -> {filename}...")
        api_url = API_GEN_URL
        payload = {
            "model": model,
            "prompt": prompt,
            "n": 1,
            "size": size
        }

    start = time.time()
    try:
        res = requests.post(api_url, json=payload, headers=headers, timeout=180)
        res.raise_for_status()
        data = res.json()
        b64_str = data["data"][0]["b64_json"]
        img_bytes = base64.b64decode(b64_str)
        out_path = os.path.join("public", "assets", "generated", filename)
        with open(out_path, "wb") as f:
            f.write(img_bytes)
        elapsed = round(time.time() - start, 2)
        print(f"[+] Success! Saved: {out_path} ({elapsed}s, {len(img_bytes)} bytes)")
        return out_path
    except Exception as e:
        print(f"[-] Error: {e}")
        if 'res' in locals():
            print("Response text:", res.text[:300])
        return None

if __name__ == "__main__":
    ref_file = "C:/Users/nguye/.gemini/antigravity/brain/2e8001f4-5c27-4756-8f7b-68e28524ae34/user_ref_clean.png"
    prompt_i2i = (
        "Strictly preserve the exact camera perspective, angle, and structural layout of the reference image: "
        "high-angle straight-on perspective looking down into the classroom with the central aisle, "
        "the exact 5 columns of student desks, the front teacher podium and chalkboard. "
        "Redesign and remix the classroom to be significantly cuter, charming, and distinctive: "
        "warm cozy pastel anime aesthetic, soft natural morning sunbeams streaming through windows, "
        "delicate clean wooden textures, cute aesthetic details. "
        "In the center on the podium, place an adorable cute chibi anime Vietnamese female teacher wearing an elegant pristine white Ao Dai, "
        "sweet smiling expression with soft blushing cheeks, big expressive anime eyes, looking directly forward. "
        "Vibrant, clean, high resolution 2D game illustration, 9:16 vertical ratio."
    )
    generate_image(prompt_i2i, "bg_i2i_from_reference.png", ref_image=ref_file, size="1024x1792")
