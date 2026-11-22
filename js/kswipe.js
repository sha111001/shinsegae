/* =========================================================
   터치·슬라이드 보완 (Figma에 없는 제스처 동작)
   - 스크롤 영역: 손가락/마우스로 끌어서 스크롤(관성), 가로 영역은 휠로도 이동
   - 행사조회: 카드 캐러셀을 좌우로 밀어 돌리기
   - 행사 팝업 3종: 좌우로 밀어 다른 소식 팝업으로
   - 목록 화면(1/22): 좌우로 밀거나 '이전/다음'을 눌러 페이지 넘김 (테스트 데이터)
   - 글자 맞춤: 브라우저 글자 폭 차이로 Figma보다 줄이 늘어나면 자간을 살짝 줄여 맞춤
   ========================================================= */
(function () {
  const K = window.KIOSK;
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const sc = () => K.scale || 1;
  const txt = (e) => e.textContent.replace(/\s+/g, ' ').trim();
  const POPS = ['16:14925', '16:14914', '16:14920'];   // 캐러셀 순서: 오징어게임 → 전시회 → 프라다

  /* ---------- 글자 맞춤 ---------- */
  function fitText(el) {
    // 한 줄 글자가 대체 글꼴 때문에 상자보다 넓어지면 살짝 줄여 Figma 폭에 맞춤 (최대 12%)
    $$('.t, .t1', el).forEach((t) => {
      const s = t.firstElementChild; if (!s || getComputedStyle(s).whiteSpace !== 'nowrap') return;
      const W = t.offsetWidth, w = s.offsetWidth;
      if (W && w > W * 1.02) { const fs = parseFloat(getComputedStyle(t).fontSize); t.style.fontSize = fs * Math.max(0.88, W / w) + 'px'; }
    });
    $$('.t', el).forEach((t) => {
      const s = t.firstElementChild; if (!s || getComputedStyle(s).whiteSpace === 'nowrap') return;
      const H = t.offsetHeight; if (!H || s.offsetHeight <= H + 2) return;
      const fs = parseFloat(getComputedStyle(t).fontSize) || 16;
      let ls = parseFloat(getComputedStyle(t).letterSpacing) || 0;
      for (let i = 0; i < 8 && s.offsetHeight > H + 2; i++) { ls -= fs * 0.012; t.style.letterSpacing = ls + 'px'; }
      if (s.offsetHeight > H + 2) t.style.letterSpacing = '';     // 맞지 않으면 원래대로
    });
  }

  /* ---------- 화면별 준비 ---------- */
  let CF = null, PG = null;
  function screenEl() { return K.el ? $$('.head > .b', K.el).slice(1) : []; }
  function setup(el, id) {
    CF = null; PG = null;
    // 1) 행사조회 캐러셀
    const center = el.querySelector('[data-go="16:14914"]');
    if (id === '8:458' && center) {
      const par = center.parentElement;
      const cards = Array.from(par.children).filter((c) => c.offsetWidth > 200 && c.offsetHeight > 250);
      if (cards.length >= 3) {
        cards.sort((a, b) => a.offsetLeft - b.offsetLeft);
        const S = cards.map((c) => ({ l: c.offsetLeft, t: c.offsetTop, w: c.offsetWidth }));
        CF = { par, cards, S, o: 0, mid: Math.floor(cards.length / 2) };
        par.classList.add('kswipe');
        cards.forEach((c) => { c.style.transformOrigin = '0 0'; c.style.transition = 'transform .45s cubic-bezier(.2,.7,.2,1)'; });
        // 가로 스크롤로 잘못 잡힌 카드 내부 스크롤 해제
        cards.forEach((c) => { if (c.style.overflowX === 'auto') { c.style.overflowX = 'hidden'; } });
      }
    }
    // 2) 목록 페이지 넘김
    const cnt = $$('.t1, .t', el).find((t) => /^\d+\/\d+$/.test(txt(t)));
    if (cnt) {
      const cy = cnt.offsetTop + cnt.offsetHeight / 2, same = (t) => t.parentElement === cnt.parentElement || Math.abs(t.getBoundingClientRect().top - cnt.getBoundingClientRect().top) < 60 * sc();
      const next = $$('.t1, .t', el).find((t) => /^다음\s*→$/.test(txt(t)) && same(t));
      const prev = $$('.t1, .t', el).find((t) => /^←\s*이전$/.test(txt(t)) && same(t));
      const [n, tot] = txt(cnt).split('/').map(Number);
      PG = { cnt, next, prev, n, tot };
      [next, prev].forEach((b) => { if (b && !b.dataset.go && !b.dataset.act) { b.dataset.ui = 'pager'; b.classList.add('hv'); b.style.pointerEvents = 'auto'; } });
      void cy;
    }
  }

  function placeCF(anim) {
    const { cards, S, o, mid } = CF, n = cards.length;
    cards.forEach((c, i) => {
      const j = ((i - o) % n + n) % n, a = S[i], b = S[j];
      if (!anim) c.style.transition = 'none';
      c.style.transform = `translate(${b.l - a.l}px, ${b.t - a.t}px) scale(${b.w / a.w})`;
      c.style.zIndex = 10 - Math.abs(j - mid);
      if (!anim) { void c.offsetWidth; c.style.transition = 'transform .45s cubic-bezier(.2,.7,.2,1)'; }
    });
  }
  function stepCF(d) { CF.o += d; placeCF(true); }

  function cards(el) {
    const c = $$('.b', el).filter((b) => /상세보기|Tel/.test(b.textContent) && b.offsetWidth > 120 && b.offsetWidth < 700 && b.offsetHeight > 90 && b.offsetHeight < 420);
    return c.filter((b) => !c.some((o) => o !== b && o.contains(b)));
  }
  let pgTold = false;
  function page(d) {
    if (!PG) return;
    const n = PG.n + d;
    if (n < 1 || n > PG.tot) return K.toast(n < 1 ? '첫 페이지입니다' : '마지막 페이지입니다');
    PG.n = n;
    const leaf = (e) => { const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let x, last; while ((x = w.nextNode())) if (x.nodeValue.trim()) last = x; return last; };
    const tn = leaf(PG.cnt); if (tn) tn.nodeValue = `${n}/${PG.tot}`;
    if (!PG.cs) {   // 처음 한 번: 카드와 원래 자리(변환 없는 상태) 기억
      PG.cs = cards(K.el).filter((c) => c.offsetParent);
      PG.cs.forEach((c) => (c.style.transform = ''));
      const o = K.el.getBoundingClientRect(), s0 = sc();   // 화면 배율과 무관한 원래 좌표
      PG.R = PG.cs.map((c) => { const r = c.getBoundingClientRect(); return { left: (r.left - o.left) / s0, top: (r.top - o.top) / s0 }; });
    }
    const cs = PG.cs, R = PG.R;
    if (cs.some((c) => !c.offsetParent)) return;   // 검색으로 걸러진 상태면 번호만 바꿈
    const k = ((n - 1) * 3) % Math.max(cs.length, 1);
    cs.forEach((c, i) => {
      const j = (i + k) % cs.length, a = R[i], b = R[j];
      c.style.transition = 'none';
      c.style.transform = `translate(${b.left - a.left}px, ${b.top - a.top}px)`;
      c.animate([{ opacity: 0, translate: `${d * 80}px 0` }, { opacity: 1, translate: '0 0' }], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' });
    });
    if (!pgTold) { pgTold = true; K.toast('다른 페이지는 디자인에 없어 같은 매장을 순서만 바꿔 보여줍니다', '테스트 데이터'); }
  }

  function swapPop(d) {
    const i = POPS.indexOf(K.cur); if (i < 0) return;
    const id = POPS[(i + d + POPS.length) % POPS.length];
    K.swap(id);
    setTimeout(() => screenEl().forEach((e) => e.animate([{ opacity: 0.2, transform: `translateX(${d * 60}px)` }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'ease-out' })), 0);
  }

  /* ---------- 제스처 ---------- */
  function scroller(t) {
    for (let e = t; e && e !== K.el; e = e.parentElement) {
      if (!(e instanceof HTMLElement)) continue;
      const st = e.getAttribute('style') || '';
      const x = /overflow-x:\s*auto/.test(st) && e.scrollWidth > e.clientWidth + 2;
      const y = /overflow-y:\s*auto|overflow:\s*auto/.test(st) && e.scrollHeight > e.clientHeight + 2;
      if (x || y) return { e, x, y };
    }
    return null;
  }
  let G = null, killClick = false;
  document.addEventListener('pointerdown', (ev) => {
    if (!K.el || !ev.target.closest('#stage') || ev.button !== 0 || ev.target.closest('.kov,[data-ui=kkey],.kmapbox.zoomed,[data-ui=mapbtn]')) return;
    G = { x: ev.clientX, y: ev.clientY, t: performance.now(), sc: scroller(ev.target), dir: null, vx: 0, vy: 0, lx: ev.clientX, ly: ev.clientY, lt: performance.now() };
  }, true);
  document.addEventListener('pointermove', (ev) => {
    if (!G) return;
    const dx = ev.clientX - G.x, dy = ev.clientY - G.y;
    if (!G.dir && Math.hypot(dx, dy) > 10) G.dir = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (!G.dir) return;
    const now = performance.now(), mx = ev.clientX - G.lx, my = ev.clientY - G.ly, dt = Math.max(now - G.lt, 1);
    G.vx = mx / dt; G.vy = my / dt; G.lx = ev.clientX; G.ly = ev.clientY; G.lt = now;
    const s = G.sc;
    if (s && ((G.dir === 'x' && s.x) || (G.dir === 'y' && s.y))) { G.used = true; s.e.scrollLeft -= mx / sc(); s.e.scrollTop -= my / sc(); }
    else if (G.dir === 'x' && CF) { G.used = true; CF.cards.forEach((c) => (c.style.translate = `${dx / sc() * 0.6}px 0`)); }
  }, true);
  document.addEventListener('pointerup', (ev) => {
    if (!G) return;
    const g = G; G = null;
    const dx = ev.clientX - g.x, dy = ev.clientY - g.y, moved = Math.hypot(dx, dy) > 10;
    if (moved) { killClick = true; setTimeout(() => (killClick = false), 0); }
    if (CF) CF.cards.forEach((c) => (c.style.translate = ''));
    if (!moved) return;
    const s = g.sc;
    if (g.used && s) {   // 관성 스크롤
      let vx = g.dir === 'x' ? g.vx : 0, vy = g.dir === 'y' ? g.vy : 0;
      const tick = () => { if (Math.abs(vx) + Math.abs(vy) < 0.02) return; s.e.scrollLeft -= vx * 16 / sc(); s.e.scrollTop -= vy * 16 / sc(); vx *= 0.92; vy *= 0.92; requestAnimationFrame(tick); };
      requestAnimationFrame(tick); return;
    }
    if (g.dir !== 'x') return;
    const d = dx < 0 ? 1 : -1;
    if (CF) return Math.abs(dx) > 25 ? stepCF(d) : placeCF(true);
    if (Math.abs(dx) < 50) return;
    if (POPS.includes(K.cur)) return swapPop(d);
    if (PG) {
      const b = d > 0 ? PG.next : PG.prev;
      if (b && b.dataset.go) return K.go(b.dataset.go);
      return page(d);
    }
    // 그 밖의 화면: '다음 →' / '← 이전'이 다른 화면에 연결돼 있으면 그쪽으로
    const link = $$('[data-go]', K.el).find((e) => (d > 0 ? /^다음\s*→$/ : /^←\s*이전$/).test(txt(e)));
    if (link) K.go(link.dataset.go);
  }, true);
  document.addEventListener('pointercancel', () => { G = null; if (CF) CF.cards.forEach((c) => (c.style.translate = '')); }, true);
  // 끌기 뒤에 따라오는 클릭은 무시 (밀다가 카드가 눌리지 않게)
  document.addEventListener('click', (ev) => {
    if (killClick && ev.target.closest('#stage')) { ev.stopPropagation(); ev.preventDefault(); killClick = false; return; }
    const p = ev.target.closest('[data-ui=pager]');
    if (p && PG) { ev.stopPropagation(); page(p === PG.next ? 1 : -1); }
  }, true);
  // 가로 스크롤 영역은 마우스 휠로도 이동
  document.addEventListener('wheel', (ev) => {
    const s = ev.target.closest && ev.target.closest('#stage') && scroller(ev.target);
    if (s && s.x && !s.y && Math.abs(ev.deltaY) > Math.abs(ev.deltaX)) { s.e.scrollLeft += ev.deltaY / sc(); ev.preventDefault(); }
  }, { passive: false, capture: true });
  document.addEventListener('dragstart', (ev) => { if (ev.target.closest && ev.target.closest('#stage')) ev.preventDefault(); });

  // 가로 스크롤 영역 옆의 진행 막대(회색 바 + 빨간 막대)가 스크롤 위치를 따라가도록
  function progressBars(el) {
    $$('[style*="overflow-x:auto"]', el).forEach((sc) => {
      const bar = Array.from(sc.parentElement.children).find((b) => b !== sc && b.children.length === 1 && b.offsetHeight < 20 && b.offsetWidth > 100 && b.firstElementChild.offsetWidth < b.offsetWidth * 0.6);
      if (!bar) return;
      const red = bar.firstElementChild;
      const upd = () => { const m = sc.scrollWidth - sc.clientWidth; red.style.transform = `translateX(${m > 0 ? (sc.scrollLeft / m) * (bar.offsetWidth - red.offsetWidth) : 0}px)`; };
      sc.addEventListener('scroll', upd, { passive: true }); upd();
    });
  }
  K.on('*', (el, id) => {
    setTimeout(() => { setup(el, id); if (CF) placeCF(false); progressBars(el); }, 40);
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(() => fitText(el), 60));
  });
  K.swipe = { stepCF: (d) => CF && stepCF(d), page, swapPop };
})();
