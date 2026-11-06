"""Create high-resolution classroom background variants without changing composition."""

from pathlib import Path

from PIL import Image, ImageFile, ImageFilter


# Một số PNG lịch sử trong repo thiếu phần đuôi chunk nhưng vẫn giải mã được.
ImageFile.LOAD_TRUNCATED_IMAGES = True


ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "public" / "assets" / "generated"
OUTPUT_SIZE = (1620, 2880)
SOURCE_NAMES = (
    "classroom-blossom-clean-v5.png",
    "classroom-evening-v1.png",
    "classroom-modern-v1.png",
    "classroom-tet-v1.png",
    "classroom-wood-v1.png",
)
SOURCES = [SOURCE_DIR / name for name in SOURCE_NAMES]


def upscale(source: Path) -> Path:
    output = source.with_name(f"{source.stem}-1620x2880.webp")
    with Image.open(source) as image:
        rgb = image.convert("RGB")
        resized = rgb.resize(OUTPUT_SIZE, Image.Resampling.LANCZOS)
        sharpened = resized.filter(ImageFilter.UnsharpMask(radius=1.15, percent=118, threshold=3))
        sharpened.save(output, format="WEBP", quality=90, method=6)
    return output


def main() -> None:
    missing = [source.name for source in SOURCES if not source.exists()]
    if missing:
        raise SystemExit(f"Missing sources: {', '.join(missing)}")
    for source in SOURCES:
        output = upscale(source)
        print(f"{source.name} -> {output.name}")


if __name__ == "__main__":
    main()
