/* =========================================================
   화면 배율에 맞는 이미지 고르기
   키오스크 전체(2521×1776)를 PC 창에 맞춰 크게 줄이면 큰 원본 이미지를 브라우저가 거칠게 축소해
   로고가 깨져 보임 → 미리 고품질로 줄여 둔 1/2·1/4·1/8 이미지(assets/img/r/) 중 알맞은 것으로 교체
   (지도를 확대하면 다시 큰 이미지로)
   ========================================================= */
(function () {
  const K = window.KIOSK, SZ = window.KIOSK_IMGSZ || {};
  const RE = /assets\/img\/(?:r\/)?([0-9a-z_]+?)(?:_(2|4|8))?\.webp/i;

  function layers(v) {   // 쉼표로 나뉜 배경 층 (괄호 안 쉼표 무시)
    const out = []; let d = 0, cur = '';
    for (const ch of v) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && !d) { out.push(cur.trim()); cur = ''; } else cur += ch; }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function dispW(el, idx, nw, nh) {   // 이미지가 실제로 그려지는 폭(원래 좌표, px)
    const bs = layers(getComputedStyle(el).backgroundSize)[idx] || 'auto';
    const m = bs.match(/^([\d.]+)px/);
    if (m) return parseFloat(m[1]);
    const ew = el.offsetWidth, eh = el.offsetHeight;
    if (bs === 'cover') return nw * Math.max(ew / nw, eh / nh);
    if (bs === 'contain') return nw * Math.min(ew / nw, eh / nh);
    if (/%/.test(bs)) return ew * parseFloat(bs) / 100;
    return nw;
  }
  function fix(root) {
    if (!root) return;
    const eff = (K.scale || 1) * (window.devicePixelRatio || 1);
    root.querySelectorAll('[style*="assets/img/"]').forEach((el) => {
      const bi = el.style.backgroundImage; if (!bi) return;
      const L = layers(bi), idx = L.findIndex((x) => RE.test(x)); if (idx < 0) return;
      const m = L[idx].match(RE), base = m[1], sz = SZ[base + '.webp']; if (!sz) return;
      const [nw, nh] = sz;
      const z = el.closest('.kmapbox') && K.map && K.map.get() ? K.map.get().z : 1;
      const need = dispW(el, idx, nw, nh) * eff * z * 1.15;   // 약간 여유
      let k = 1;
      for (const c of [8, 4, 2]) if (nw / c >= need && nw / c >= 16 && nh / c >= 16) { k = c; break; }
      const url = k === 1 ? `assets/img/${base}.webp` : `assets/img/r/${base}_${k}.webp`;
      if (L[idx].includes(url)) return;
      L[idx] = `url("${url}")`;
      el.style.backgroundImage = L.join(', ');
    });
  }
  let t;
  const later = (ms) => { clearTimeout(t); t = setTimeout(() => fix(K.el), ms); };
  K.on('*', () => later(70));
  window.addEventListener('resize', () => later(250));
  K.resImg = later;
})();
