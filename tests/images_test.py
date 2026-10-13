import unittest
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parent.parent

class OptimizedCovers(unittest.TestCase):
 def test_optimized_assets_preserve_geometry_and_reduce_total_size(self):
  originals=list((ROOT/'blog/images').glob('*.png'))
  self.assertGreaterEqual(len(originals),11)
  original_bytes=0;optimized_bytes=0
  for source in originals:
   full=source.with_suffix('.webp');small=source.with_name(source.stem+'-640.webp')
   self.assertTrue(full.exists(),str(full));self.assertTrue(small.exists(),str(small))
   with Image.open(source) as a,Image.open(full) as b,Image.open(small) as c:
    self.assertEqual(a.size,b.size)
    self.assertLessEqual(c.width,640)
    self.assertAlmostEqual(a.width/a.height,c.width/c.height,delta=.02)
   original_bytes+=source.stat().st_size;optimized_bytes+=full.stat().st_size
  self.assertLess(optimized_bytes,original_bytes)
  print(f'Cover compression: {original_bytes} -> {optimized_bytes} bytes')

if __name__=='__main__':unittest.main()
