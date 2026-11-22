"""작은 화면용 이미지 만들기
PC 창에 맞춰 키오스크 전체(2521×1776)를 0.3~0.5배로 줄여 보면, 큰 원본 이미지를 브라우저가 거칠게 축소해
로고·작은 글자가 깨져 보입니다. 미리 고품질(Lanczos)로 1/2, 1/4, 1/8 크기 이미지를 만들어 두고
js/kres.js 가 화면 배율에 맞는 크기를 골라 씁니다.
실행: python3 tools/figma-kiosk/mkres.py   (kgen.py로 이미지를 다시 만든 뒤 한 번)
"""
import os, json
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
IMG = os.path.join(ROOT, 'assets', 'img')
RES = os.path.join(IMG, 'r')
os.makedirs(RES, exist_ok=True)
sizes = {}
for fn in sorted(os.listdir(IMG)):
    if not fn.endswith('.webp'): continue
    im = Image.open(os.path.join(IMG, fn)); im.load()
    w, h = im.size; sizes[fn] = [w, h]
    mode = 'RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB'
    im = im.convert(mode)
    for k in (2, 4, 8):
        if w // k < 16 or h // k < 16: break
        out = os.path.join(RES, f'{fn[:-5]}_{k}.webp')
        if os.path.exists(out) and os.path.getmtime(out) > os.path.getmtime(os.path.join(IMG, fn)): continue
        im.resize((max(1, round(w / k)), max(1, round(h / k))), Image.LANCZOS).save(out, 'WEBP', quality=88, method=6)
open(os.path.join(ROOT, 'js', 'imgsizes.js'), 'w').write('window.KIOSK_IMGSZ = ' + json.dumps(sizes, separators=(',', ':')) + ';\n')
print(len(sizes), 'images')
