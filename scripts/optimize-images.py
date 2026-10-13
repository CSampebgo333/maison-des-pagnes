"""Generate versioned display assets; retain original photos for zoom and PDFs.
Run after importing photos: python scripts/optimize-images.py (requires Pillow).
"""
from pathlib import Path
from PIL import Image, ImageOps
import hashlib, io, json
root=Path(__file__).resolve().parents[1]
out=root/'public/media';out.mkdir(exist_ok=True)
manifest={}; keep=set(); total=0
for src in sorted((root/'public/pagnes').glob('*.webp'))+[root/'public/pagne-default.png']:
    im=ImageOps.exif_transpose(Image.open(src)).convert('RGB')
    entry={'width':im.width,'height':im.height}
    for kind,size,quality in [('thumbnail',200,72),('scene',650,78),('display',1000,82)]:
        photo=im.copy();photo.thumbnail((size,size),Image.Resampling.LANCZOS)
        data=io.BytesIO();photo.save(data,'WEBP',quality=quality,method=6)
        content=data.getvalue();name=f'{src.stem}-{kind}-{hashlib.sha256(content).hexdigest()[:12]}.webp'
        (out/name).write_bytes(content);keep.add(name);entry[kind]='media/'+name;total+=len(content)
    manifest[str(src.relative_to(root/'public'))]=entry
for old in out.glob('*.webp'):
    if old.name not in keep:old.unlink()
(root/'src/image-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'{len(manifest)} images, {total:,} bytes of optimized variants')
