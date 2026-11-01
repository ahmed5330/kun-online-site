"""Regressions for non-destructive published image WebP recovery."""
import hashlib
import importlib.util
import tempfile
import unittest
from pathlib import Path

from PIL import Image

GENERATOR = Path(__file__).resolve().parents[1] / "scripts" / "generate-approved-covers.py"
spec = importlib.util.spec_from_file_location("kun_cover_generator", GENERATOR)
cover = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cover)


class ResponsiveBackfillTests(unittest.TestCase):
    def test_only_missing_files_are_created_and_png_is_unchanged(self):
        with tempfile.TemporaryDirectory() as temp:
            png = Path(temp) / "approved-article.png"
            Image.new("RGB", (1200, 630), (18, 62, 74)).save(png, "PNG")
            original = hashlib.sha256(png.read_bytes()).hexdigest()
            generated = cover.ensure_responsive_variants(png)
            self.assertCountEqual(
                generated, ["approved-article.webp", "approved-article-640.webp"])
            self.assertEqual(hashlib.sha256(png.read_bytes()).hexdigest(), original)
            first = png.with_suffix(".webp")
            small = png.with_name("approved-article-640.webp")
            for file, size in [(first, (1200, 630)), (small, (640, 336))]:
                with Image.open(file) as im:
                    self.assertEqual(im.format, "WEBP")
                    self.assertEqual(im.size, size)
            existing = hashlib.sha256(first.read_bytes()).hexdigest()
            self.assertEqual(cover.ensure_responsive_variants(png), [])
            self.assertEqual(hashlib.sha256(first.read_bytes()).hexdigest(), existing)
            small.unlink()
            self.assertEqual(cover.ensure_responsive_variants(png), [small.name])
            self.assertEqual(hashlib.sha256(first.read_bytes()).hexdigest(), existing)
            self.assertEqual(hashlib.sha256(png.read_bytes()).hexdigest(), original)

    def test_invalid_missing_source_fails_closed(self):
        with tempfile.TemporaryDirectory() as temp:
            png = Path(temp) / "missing.png"
            with self.assertRaises(FileNotFoundError):
                cover.ensure_responsive_variants(png)
            Image.new("RGB", (500, 500)).save(png, "PNG")
            with self.assertRaises(ValueError):
                cover.ensure_responsive_variants(png)


if __name__ == "__main__":
    unittest.main()
