"""Build the additive "Lớp học quê xưa" art pack from its source sheets."""
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "nhan-vat" / "que-xua"
PUBLIC = ROOT / "public" / "assets"
POSES = [
    "01-dung",
    "02-giong-tay",
    "03-suy-nghi",
    "04-tra-loi",
    "05-vui-mung",
    "06-buon",
    "07-ngac-nhien",
    "08-vay-chao",
]


def cells(path: Path) -> list[Image.Image]:
    sheet = Image.open(path).convert("RGBA")
    width, height = sheet.size
    if width % 4 or height % 2:
        raise ValueError(f"Expected a 4×2 sheet: {path} ({sheet.size})")
    cell_w, cell_h = width // 4, height // 2
    return [
        sheet.crop((col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h))
        for row in range(2)
        for col in range(4)
    ]


def content_box(images: list[Image.Image], threshold: int = 24) -> tuple[int, int, int, int]:
    boxes = []
    for image in images:
        alpha = image.getchannel("A").point(lambda value: 255 if value > threshold else 0)
        box = alpha.getbbox()
        if box:
            boxes.append(box)
    if len(boxes) != len(images):
        raise ValueError("A pose cell has no visible character")
    left = min(box[0] for box in boxes)
    top = min(box[1] for box in boxes)
    right = max(box[2] for box in boxes)
    bottom = max(box[3] for box in boxes)
    return left, top, right, bottom


def export_pose_group(front_sheet: Path, back_sheet: Path, output: Path) -> None:
    front, back = cells(front_sheet), cells(back_sheet)
    if len(front) != 8 or len(back) != 8:
        raise ValueError("Student sheets must contain eight poses")

    # Share one crop across front and back poses so sprites keep a stable scale.
    source_box = content_box(front + back)
    pad_x, pad_y = 12, 8
    left = max(0, source_box[0] - pad_x)
    top = max(0, source_box[1] - pad_y)
    right = min(front[0].width, source_box[2] + pad_x)
    bottom = min(front[0].height, source_box[3] + pad_y)
    box = (left, top, right, bottom)

    for folder, poses, prefix in (
        (output, front, ""),
        (output, back, "sau-"),
    ):
        folder.mkdir(parents=True, exist_ok=True)
        for name, pose in zip(POSES, poses):
            crop = pose.crop(box)
            width = round(crop.width * 560 / crop.height)
            crop.resize((width, 560), Image.Resampling.LANCZOS).save(
                folder / f"{prefix}{name}.webp", "WEBP", quality=91, method=6
            )


def export_teacher() -> dict[str, Image.Image]:
    poses = cells(SOURCE / "co-giao-tu-the.png")
    box = content_box(poses)
    pad_x, pad_y = 12, 8
    box = (
        max(0, box[0] - pad_x),
        max(0, box[1] - pad_y),
        min(poses[0].width, box[2] + pad_x),
        min(poses[0].height, box[3] + pad_y),
    )
    output = PUBLIC / "nv" / "co-giao-que-xua"
    output.mkdir(parents=True, exist_ok=True)
    saved: dict[str, Image.Image] = {}
    teacher_names = [
        "01-dung",
        "02-giang-bai",
        "03-chi-trai",
        "04-chi-phai",
        "05-vui",
        "07-suy-nghi",
        "06-buon",
        "08-vay-chao",
    ]
    for name, pose in zip(teacher_names, poses):
        crop = pose.crop(box)
        width = round(crop.width * 560 / crop.height)
        crop = crop.resize((width, 560), Image.Resampling.LANCZOS)
        crop.save(output / f"{name}.webp", "WEBP", quality=91, method=6)
        saved[name] = crop
    return saved


def export_gif(frames: list[Image.Image], path: Path, durations: list[int]) -> None:
    # Use one shared palette and reserve palette index 0 for transparency.
    rgb_frames = [frame.convert("RGB") for frame in frames]
    sample = Image.new("RGB", (sum(frame.width for frame in rgb_frames), max(frame.height for frame in rgb_frames)))
    x = 0
    for frame in rgb_frames:
        sample.paste(frame, (x, 0))
        x += frame.width
    palette = sample.quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    palette_data = palette.getpalette() or []
    palette_data = [255, 0, 255] + palette_data[: 255 * 3]
    palette_data += [0] * (768 - len(palette_data))

    indexed = []
    for rgba in frames:
        frame = rgba.convert("RGB").quantize(palette=palette)
        frame = frame.point(lambda value: min(255, value + 1))
        frame.putpalette(palette_data)
        alpha = rgba.getchannel("A")
        frame.paste(0, mask=alpha.point(lambda value: 255 if value < 96 else 0))
        indexed.append(frame)

    path.parent.mkdir(parents=True, exist_ok=True)
    indexed[0].save(
        path,
        save_all=True,
        append_images=indexed[1:],
        duration=durations,
        loop=0,
        transparency=0,
        disposal=2,
        optimize=False,
    )


def build() -> None:
    background = Image.open(SOURCE / "nen-lop-que-xua.png").convert("RGB")
    background = background.resize((1080, 1920), Image.Resampling.LANCZOS)
    bg_dir = PUBLIC / "bg"
    thumb_dir = bg_dir / "thumbs"
    thumb_dir.mkdir(parents=True, exist_ok=True)
    background.save(bg_dir / "lop-que-xua.webp", "WEBP", quality=92, method=6)
    background.resize((270, 480), Image.Resampling.LANCZOS).save(
        thumb_dir / "lop-que-xua.webp", "WEBP", quality=86, method=6
    )

    student_root = PUBLIC / "nv" / "hoc-sinh-que-xua"
    export_pose_group(
        SOURCE / "hoc-sinh-nam-tu-the.png",
        SOURCE / "hoc-sinh-nam-sau-lung.png",
        student_root / "nam",
    )
    export_pose_group(
        SOURCE / "hoc-sinh-nu-tu-the.png",
        SOURCE / "hoc-sinh-nu-sau-lung.png",
        student_root / "nu",
    )
    teacher = export_teacher()
    teacher_dir = PUBLIC / "nv" / "co-giao-que-xua"
    neutral = teacher["01-dung"]
    teaching = teacher["02-giang-bai"]
    point_left = teacher["03-chi-trai"]
    point_right = teacher["04-chi-phai"]

    idle_frames = []
    for dy in (0, -2, -3, -2, 0, 2, 3, 2):
        frame = Image.new("RGBA", neutral.size)
        frame.alpha_composite(neutral, (0, dy))
        idle_frames.append(frame)
    export_gif(idle_frames, teacher_dir / "idle.gif", [100] * len(idle_frames))
    export_gif(
        [neutral, teaching, point_right, teaching, neutral],
        teacher_dir / "walk.gif",
        [180, 180, 220, 180, 180],
    )
    export_gif(
        [teaching, point_right, teaching, point_right],
        teacher_dir / "point.gif",
        [300, 300, 300, 300],
    )
    export_gif(
        [point_left, teaching, point_left, teaching],
        teacher_dir / "wipe.gif",
        [320, 320, 320, 320],
    )
    print("Đã xuất nền, 32 tư thế học sinh, 8 tư thế cô giáo và 4 GIF.")


if __name__ == "__main__":
    build()
