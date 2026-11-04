from pathlib import Path
import json
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parent.parent
NV_DIR = ROOT / 'public' / 'assets' / 'nv'

def process_backs(folder: Path):
    # Lấy base 01-dung.webp để tính head.json chuẩn
    base = np.array(Image.open(folder / '01-dung.webp').convert('RGBA'))
    H, W = base.shape[:2]
    op_base = base[..., 3] > 32
    widths_base = op_base.sum(axis=1)
    lo, hi = int(H * 0.12), int(H * 0.38)
    neck_base = lo + int(np.argmin(widths_base[lo:hi]))
    
    # Mask đầu cho 01-dung
    top_base = op_base.copy()
    top_base[neck_base - int(H * 0.012):] = False
    head_base = ndimage.binary_fill_holes(ndimage.binary_dilation(top_base, iterations=2))
    ys, xs = np.where(head_base)
    
    box = {
        'x': float(W - 1 - xs.max()) / W,
        'y': float(ys.min()) / H,
        'w': float(xs.max() - xs.min()) / W,
        'h': float(ys.max() - ys.min()) / H
    }
    (folder / 'head.json').write_text(json.dumps(box))
    print(f"[{folder.name}] head.json: {box}")

    # Xử lý từng tư thế
    for f in sorted(folder.glob('0*.webp')):
        img = Image.open(f).convert('RGBA')
        arr = np.array(img)
        op = arr[..., 3] > 20
        widths = op.sum(axis=1)
        neck = lo + int(np.argmin(widths[lo:hi]))
        
        top_mask = op.copy()
        top_mask[neck - int(H * 0.01):] = False
        lab, n = ndimage.label(top_mask)
        
        # Tìm component đầu (component lớn nhất chiếm phần đầu)
        if n >= 1:
            sizes = [0] + [int((lab == i).sum()) for i in range(1, n + 1)]
            head_idx = int(np.argmax(sizes))
            # Mở rộng nhẹ mask đầu để xóa sạch viền tóc cũ mờ
            head_mask = ndimage.binary_dilation(lab == head_idx, iterations=2)
            arr[head_mask, 3] = 0
            
        # Lật ngang tạo thân nhìn từ sau
        back_img = Image.fromarray(arr, 'RGBA').transpose(Image.FLIP_LEFT_RIGHT)
        out_path = folder / f'sau-{f.name}'
        back_img.save(out_path, quality=92)
        print(f"  -> Đã tạo {out_path.name}")

def main():
    print("Bắt đầu xử lý chính xác thân sau lưng cho học sinh...")
    process_backs(NV_DIR / 'nam')
    process_backs(NV_DIR / 'nu')
    print("Hoàn tất!")

if __name__ == '__main__':
    main()
