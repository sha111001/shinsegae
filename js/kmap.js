/* =========================================================
   지도 확대·이동 (Figma에서는 아이콘 그림뿐인 지도 버튼을 실제로 동작하게)
   - 층별안내(현재위치·1F·B1·2F): ? / + / − / 전체보기 / 현재위치 버튼
   - 평면지도 포함 모든 지도: 마우스 휠·두 번 탭으로 확대, 확대 상태에서 끌어서 이동
   ========================================================= */
(function () {
  const K = window.KIOSK;
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const sc = () => K.scale || 1;
  // 화면 id → [지도 버튼 줄 노드, 지도 노드(없으면 버튼 줄 옆의 가장 큰 요소)]
  const MAPS = { '8:295': ['8:9078', '8:9133'], '8:826': ['8:8065', '8:8079'], '8:831': ['8:9686', null], '8:836': ['8:9967', null], '16:16262': [null, '16:16341'] };
  const MAXZ = 2.6;
  let M = null;

  function setup(el, id) {
    M = null;
    const cfg = MAPS[id]; if (!cfg) return;
    const row = cfg[0] && el.querySelector(`[data-n="${cfg[0]}"]`);
    let map = cfg[1] && el.querySelector(`[data-n="${cfg[1]}"]`);
    if (!map && row) map = $$('.b', row.parentElement).filter((c) => !c.contains(row) && c.offsetWidth > 700 && c.offsetWidth < 1300 && c.offsetHeight > 450)
      .sort((a, b) => b.offsetWidth * b.offsetHeight - a.offsetWidth * a.offsetHeight)[0];
    if (!map) return;
    // 지도만 잘라 보이는 상자로 감싸기
    const box = document.createElement('div');
    box.className = 'kmapbox';
    box.style.cssText = `position:absolute;left:${map.offsetLeft}px;top:${map.offsetTop}px;width:${map.offsetWidth}px;height:${map.offsetHeight}px;overflow:hidden`;
    map.parentElement.insertBefore(box, map);
    map.style.left = '0px'; map.style.top = '0px';
    box.appendChild(map);
    map.style.transformOrigin = '50% 50%'; map.style.transition = 'transform .25s ease';
    // 지도 위에 따로 얹힌 작은 표시(현재 위치 점 등)도 지도와 함께 움직이도록 옮김
    const br = box.getBoundingClientRect(), s = sc();
    const extras = [], anc = new Set();
    for (let a = box.parentElement; a && a !== el; a = a.parentElement) anc.add(a);
    $$('.b, svg.v', el).forEach((e) => {
      if (box.contains(e) || e.contains(box) || e.offsetParent === null) return;
      if (!anc.has(e.parentElement) || (row && row.contains(e))) return;   // 다른 부품(버튼 줄 등)의 일부는 제외
      const r = e.getBoundingClientRect();
      if (r.width / s > 80 || r.height / s > 80) return;
      if (r.left < br.left || r.right > br.right || r.top < br.top || r.bottom > br.bottom) return;
      if (e.closest('[data-go],[data-act]') || e.parentElement.closest('.kmapbox')) return;
      if (extras.some((x) => x.contains(e))) return;
      e.style.left = (r.left - br.left) / s + 'px'; e.style.top = (r.top - br.top) / s + 'px';
      map.appendChild(e); extras.push(e);
    });
    M = { box, map, z: 1, x: 0, y: 0, W: map.offsetWidth, H: map.offsetHeight, dot: null };
    // 현재 위치: 지도 안의 밝은 빨간 점(Figma의 현재 위치 표시)
    const rgb = /rgb\((\d+),\s?(\d+),\s?(\d+)\)/;
    const red = (e) => { const m = (e.getAttribute('style') || '').match(rgb) || (e.getAttribute('fill') || '').match(rgb); return !!m && +m[1] > 215 && +m[2] < 70 && +m[3] < 70; };
    const cand = $$('.b, svg.v, path, ellipse, circle', map).filter((e) => red(e) && e.getBoundingClientRect().width / s < 60);
    M.dot = cand.length ? (cand[0].closest('svg.v, .b') || cand[0]) : null;
    if (M.dot) { const r = M.dot.getBoundingClientRect(); M.dp = [(r.left + r.width / 2 - br.left) / s, (r.top + r.height / 2 - br.top) / s]; }
    // 버튼(그림 한 장 위 다섯 개 원) → 투명 터치 영역
    if (row) {
      const ACT = [['help', '도움말'], ['in', '확대'], ['out', '축소'], ['fit', '전체 보기'], ['me', '현재 위치']];
      ACT.forEach(([a, t], i) => {
        const d = document.createElement('div');
        d.className = 'kmapbtn hv'; d.dataset.ui = 'mapbtn'; d.dataset.a = a; d.title = t;
        d.style.cssText = `position:absolute;left:${i * 65}px;top:0;width:52px;height:52px;border-radius:50%;z-index:3`;
        row.appendChild(d);
      });
      row.style.pointerEvents = 'auto';
    }
  }
  function apply(anim) {
    if (!M) return;
    const lx = (M.z - 1) * M.W / 2, ly = (M.z - 1) * M.H / 2;
    M.x = Math.max(-lx, Math.min(lx, M.x)); M.y = Math.max(-ly, Math.min(ly, M.y));
    M.map.style.transition = anim === false ? 'none' : 'transform .25s ease';
    M.map.style.transform = `translate(${M.x}px, ${M.y}px) scale(${M.z})`;
    M.box.classList.toggle('zoomed', M.z > 1.01);
    if (K.resImg) K.resImg(200);   // 확대 배율에 맞는 선명한 이미지로
  }
  // 지도 안 한 점(px,py: 지도 좌표)을 기준으로 배율 변경
  function zoomAt(nz, px, py) {
    if (!M) return;
    nz = Math.max(1, Math.min(MAXZ, nz));
    const cx = M.W / 2, cy = M.H / 2;
    // 화면상의 그 점이 그대로 있도록 이동량 보정
    const sx = (px - cx) * M.z + cx + M.x, sy = (py - cy) * M.z + cy + M.y;
    M.x = sx - ((px - cx) * nz + cx); M.y = sy - ((py - cy) * nz + cy); M.z = nz;
    apply();
  }
  function toMap(ev) {   // 화면 좌표 → 지도 좌표
    const r = M.box.getBoundingClientRect(), s = sc();
    const bx = (ev.clientX - r.left) / s, by = (ev.clientY - r.top) / s;
    const cx = M.W / 2, cy = M.H / 2;
    return [(bx - cx - M.x) / M.z + cx, (by - cy - M.y) / M.z + cy];
  }
  function act(a) {
    if (!M) return;
    if (a === 'in') zoomAt(M.z * 1.4, M.W / 2 - M.x / M.z, M.H / 2 - M.y / M.z);
    else if (a === 'out') { zoomAt(M.z / 1.4, M.W / 2 - M.x / M.z, M.H / 2 - M.y / M.z); }
    else if (a === 'fit') { M.z = 1; M.x = 0; M.y = 0; apply(); }
    else if (a === 'me') {
      if (!M.dot) return K.toast('현재 위치는 1F 명품관 입구입니다. 1F 지도에서 확인할 수 있어요.');
      const [px, py] = M.dp;
      M.z = 2; M.x = -(px - M.W / 2) * M.z; M.y = -(py - M.H / 2) * M.z; apply();
      M.dot.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.8)' }, { transform: 'scale(1)' }], { duration: 700, iterations: 2 });
    } else if (a === 'help') K.toast('+ / − 로 확대·축소, 확대한 뒤에는 지도를 끌어서 이동할 수 있어요. 두 번 누르면 그 자리를 확대합니다.', '지도 사용법');
  }

  /* ---------- 입력 ---------- */
  let D = null, lastTap = 0;
  document.addEventListener('pointerdown', (ev) => {
    if (!M || !M.box.contains(ev.target) || ev.button !== 0) return;
    const now = performance.now();
    if (now - lastTap < 320) { const [px, py] = toMap(ev); zoomAt(M.z > 1.9 ? 1 : M.z * 1.8, px, py); lastTap = 0; ev.stopPropagation(); return; }
    lastTap = now;
    if (M.z <= 1.01) return;
    D = { x: ev.clientX, y: ev.clientY, ox: M.x, oy: M.y, moved: false };
    ev.stopPropagation();   // 화면 넘김 제스처보다 지도 이동 우선
  }, true);
  document.addEventListener('pointermove', (ev) => {
    if (!D) return;
    const dx = (ev.clientX - D.x) / sc(), dy = (ev.clientY - D.y) / sc();
    if (Math.hypot(dx, dy) > 4) D.moved = true;
    M.x = D.ox + dx; M.y = D.oy + dy; apply(false);
  }, true);
  document.addEventListener('pointerup', (ev) => {
    if (!D) return;
    if (D.moved) { const kill = (e) => { e.stopPropagation(); e.preventDefault(); }; document.addEventListener('click', kill, { capture: true, once: true }); setTimeout(() => document.removeEventListener('click', kill, true), 0); }
    D = null; ev.stopPropagation();
  }, true);
  document.addEventListener('wheel', (ev) => {
    if (!M || !M.box.contains(ev.target)) return;
    ev.preventDefault(); ev.stopPropagation();
    const [px, py] = toMap(ev); zoomAt(M.z * (ev.deltaY < 0 ? 1.15 : 1 / 1.15), px, py);
  }, { passive: false, capture: true });
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-ui=mapbtn]');
    if (b && ev.target.closest('#stage')) { ev.stopPropagation(); act(b.dataset.a); }
  }, true);

  K.on('*', (el, id) => setTimeout(() => setup(el, id), 50));
  K.map = { act, get: () => M };
})();
