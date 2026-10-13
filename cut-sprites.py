# Cuts chosen graphics out of the v2 sprite sheet onto a transparent background.
# Each graphic has a box on the sheet. Inside the box the navy background is
# measured and removed, and small stray marks (the sheet's index numbers) are dropped.
import numpy as np, os
from PIL import Image
from scipy import ndimage
SRC = r'C:\Users\kbingh\Downloads\costofsavingspritesheet.jpg'
OUT = r'C:\projects\worth-it\art'
im = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
H, W, _ = im.shape
BG = np.array([20.0, 33.0, 60.0])          # the sheet's navy, sampled at several points

BOX = {  # name: (x0, y0, x1, y1) on the sheet
    'bars': (20, 232, 76, 280), 'line-up': (232, 226, 290, 280), 'dip': (304, 226, 362, 280),
    'runaway2': (20, 298, 76, 348), 'balanced': (160, 298, 218, 348), 'crash': (20, 364, 76, 416), 'decline': (232, 364, 290, 416),
    'pie': (306, 294, 360, 348), 'pig-coin': (374, 286, 436, 350), 'growth': (304, 362, 362, 418), 'steps': (374, 360, 434, 418), 'rings': (446, 358, 506, 418),
    'flag': (22, 170, 51, 206), 'warn': (50, 170, 77, 198), 'alert': (83, 168, 116, 206), 'alert-red': (117, 168, 151, 206),
    'check': (157, 170, 188, 204), 'check-gold': (261, 172, 294, 202), 'up': (303, 170, 331, 204), 'down': (405, 170, 433, 204),
    'oring': (732, 308, 800, 342), 'ring': (816, 302, 860, 342),
    'targets': (590, 418, 650, 472), 'curve': (590, 367, 650, 416),
    'flow': (660, 372, 728, 472), 'in-out': (734, 379, 802, 472), 'distribution': (808, 379, 878, 472), 'multi': (890, 362, 1000, 472),
    'pig-save': (522, 422, 576, 488), 'chain-flat': (806, 500, 874, 530), 'dial': (736, 176, 794, 222), 'progress': (884, 181, 1000, 208),
}
tiles = []
for name, (x0, y0, x1, y1) in BOX.items():
    px = im[y0:y1, x0:x1]
    dist = np.sqrt(((px - BG) ** 2).sum(axis=2))
    solid = dist > 34
    lab, n = ndimage.label(ndimage.binary_dilation(solid, iterations=2))
    if n == 0: raise SystemExit(f'{name}: nothing found in its box')
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 0.12 * sizes.max()])      # drop the small index numbers
    a = np.clip((dist - 20) / 42, 0, 1) * ndimage.binary_dilation(keep, iterations=1)
    rgb = np.where(a[..., None] > 0.02, (px - BG * (1 - a[..., None])) / np.maximum(a[..., None], 0.02), px)   # take the navy back out of the edges
    out = Image.fromarray(np.dstack([np.clip(rgb, 0, 255), a * 255]).astype('uint8'), 'RGBA')
    box = out.getbbox()
    if box: out = out.crop(box)
    out = out.resize((out.width * 3, out.height * 3), Image.LANCZOS)
    out.save(os.path.join(OUT, name + '.png'), optimize=True)
    tiles.append((name, out)); print(f'{name:13} saved {out.width}x{out.height}  {os.path.getsize(os.path.join(OUT, name + ".png"))} bytes')

# A contact sheet on the site's card colour, to look at.
cols = 8; cell = 190
sheet = Image.new('RGB', (cols * cell, ((len(tiles) + cols - 1) // cols) * cell), (30, 41, 59))
for i, (name, t) in enumerate(tiles):
    s = t.copy(); s.thumbnail((cell - 30, cell - 30))
    sheet.paste(s, ((i % cols) * cell + 15, (i // cols) * cell + 15), s)
sheet.save('sprites_v2_contact.png')
