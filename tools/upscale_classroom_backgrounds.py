"""Create high-resolution classroom background variants without changing composition."""

from pathlib import Path

from PIL import Image, ImageFile, ImageFilter


# Một số PNG lịch sử trong repo thiếu phần đuôi chunk nhưng vẫn giải mã được.
ImageFile.LOAD_TRUNCATED_IMAGES = True


ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "public" / "assets" / "generated"
OUTPUT_SIZE = (1620, 2880)
SOURCES = sorted(
    path for path in SOURCE_DIR.glob("classroom-*.png") if not path.stem.endswith("-1620x2880")
)


def upscale(source: Path) -> Path:
    output = source.with_name(f"{source.stem}-1620x2880.png")
    with Image.open(source) as image:
        rgb = image.convert("RGB")
        resized = rgb.resize(OUTPUT_SIZE, Image.Resampling.LANCZOS)
        sharpened = resized.filter(ImageFilter.UnsharpMask(radius=1.15, percent=118, threshold=3))
        sharpened.save(output, format="PNG", optimize=True)
    return output


def main() -> None:
    if not SOURCES:
        raise SystemExit("No classroom-*.png sources found")
    for source in SOURCES:
        output = upscale(source)
        print(f"{source.name} -> {output.name}")


if __name__ == "__main__":
    main()
