/* =========================================================
   신세계 백화점 키오스크 프로토타입 — 라우터 / 드롭다운 / 접근성 옵션
   화면 HTML: js/pages/*.js (Figma 레이어에서 자동 변환, 키오스크 기기 포함)
   화면 이동은 data-go / data-act 가 붙은 UI 요소로만 일어납니다.
   ========================================================= */
(function () {
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const K = (window.KIOSK = window.WEB = { pages: {}, stack: [], cur: null, hooks: {}, state: {}, overlays: {} });
  K.TITLES = {
    '5:7034': '인트로', '8:3': '목적선택', '8:295': '현재위치(층별안내)', '8:826': '층별안내 1F', '8:831': '층별안내 B1', '8:836': '층별안내 2F',
    '8:816': '근처 매장 팝업', '8:821': '근처 행사 팝업', '8:9740': '매장조회 · 통합검색', '8:9745': '매장조회 · 카테고리', '8:9750': '매장조회 · 층별',
    '8:9755': '매장상세', '16:12734': '길안내 · 위치선택', '16:13223': '길안내 · 가장 빠른 경로', '16:13229': '길안내 · 볼거리 추천 경로',
    '16:13234': '길안내 · 편의시설 우선 경로', '16:13239': '길안내 · 쾌적한 이동 경로', '16:13244': '길안내 · 앱으로 보내기', '16:16262': '길안내 · 평면지도',
    '8:448': 'F&B · 통합검색', '8:841': 'F&B · 카테고리', '16:11969': 'F&B · 식당 상세', '8:453': '편의시설 1/2', '8:851': '편의시설 2/2', '8:856': '편의시설 · 음수대',
    '8:458': '행사조회', '16:14914': '행사 · 전시회', '16:14920': '행사 · 프라다 팝업', '16:14925': '행사 · 오징어게임 팝업',
    '8:463': '매거진', '8:10994': '매거진 · 전체 이슈', '16:15149': '매거진 · 프라다 26SS',
  };
  // 플로우 목록은 Figma에서 자동 생성(js/flows.js)
  K.FLOWS = window.KIOSK_FLOWS && window.KIOSK_FLOWS.length ? window.KIOSK_FLOWS : [['시작페이지', '5:7034'], ['메인페이지', '8:295']];
  K.START = '5:7034'; K.flow = 0;

  K.page = (p) => { K.pages[p.id] = p; (K._wait[p.id] || []).forEach((f) => f()); delete K._wait[p.id]; };
  K._wait = {};
  function load(id, cb) {
    if (K.pages[id]) return cb();
    (K._wait[id] = K._wait[id] || []).push(cb);
    if (K._wait[id].length > 1) return;
    const s = document.createElement('script'); s.src = 'js/pages/p' + id.replace(':', '_') + '.js';
    s.onerror = () => toast('화면을 불러오지 못했습니다'); document.head.appendChild(s);
  }
  function render(id, o = {}) {
    const p = K.pages[id];
    const el = document.createElement('section');
    el.className = 'pg' + (o.anim === false ? '' : ' in'); el.dataset.id = id;
    el.innerHTML = `<div class="head">${p.head}</div>`;
    const st = $('#stage'); st.innerHTML = ''; st.appendChild(el);
    K.cur = id; K.el = el;
    document.title = (K.TITLES[id] || id) + ' · 키오스크 프로토타입';
    $('#curName').textContent = K.TITLES[id] || id;
    applyA11y();
    (K.hooks['*'] || []).forEach((f) => f(el, id)); (K.hooks[id] || []).forEach((f) => f(el, id));
  }
  K.go = function (id, o = {}) {
    if (!K.TITLES[id]) return toast('연결된 화면이 없습니다');
    load(id, () => { if (o.reset) K.stack = []; else if (K.cur && K.cur !== id) K.stack.push(K.cur); render(id, o); });
  };
  K.back = function () { const prev = K.stack.pop(); if (prev) load(prev, () => render(prev, {})); };
  K.on = (id, f) => { (K.hooks[id] = K.hooks[id] || []).push(f); };
  K.rerender = () => render(K.cur, { anim: false });
  K.swap = (id) => load(id, () => render(id, { anim: false }));

  let tt;
  function toast(msg, tag) { const t = $('#toast'); t.innerHTML = `<div>${tag ? `<small>${tag}</small>` : ''}${msg}</div>`; clearTimeout(tt); tt = setTimeout(() => (t.innerHTML = ''), 2600); }
  K.toast = toast;

  /* ---------- 드롭다운(Figma: Open overlay, 버튼 기준 위치) ---------- */
  function closeOv() { $$('#stage .kov').forEach((o) => o.remove()); }
  K.closeOv = closeOv;
  const A11Y = { '음성크기': 'vol', '음성속도': 'spd', '글씨크기': 'font', '고대비': 'contrast', '낮은 화면': 'low', 'language': 'lang' };
  K.a11y = { vol: '50', spd: 'x1', font: '보통', contrast: 'OFF', low: 'OFF', lang: '한국어' };
  function openOv(t) {
    const id = t.dataset.ov, ov = K.overlays[id]; if (!ov) return;
    if ($(`#stage .kov[data-ov="${id}"]`)) return closeOv();
    closeOv();
    const pr = K.el.getBoundingClientRect(), tr = t.getBoundingClientRect(), s = K.scale || 1;
    const x = (tr.left - pr.left) / s + Number(t.dataset.ox), y = (tr.top - pr.top) / s + Number(t.dataset.oy);
    const d = document.createElement('div'); d.className = 'kov'; d.dataset.ov = id;
    d.style.cssText = `left:${x}px;top:${y}px;width:${ov.w}px;height:${ov.h}px`;
    d.innerHTML = ov.html;
    // 옵션 글자를 선택 가능한 버튼으로 (첫 줄 제목 제외)
    const opts = $$('.t1, .t', d);
    const title = opts.find((o) => A11Y[o.textContent.trim()] !== undefined);
    const key = title ? A11Y[title.textContent.trim()] : null;
    K.el.appendChild(d);
    // 옵션 줄 전체(글자를 감싼 가장 작은 상자)를 누를 수 있게
    const boxes = $$('.b', d).filter((b) => b.offsetWidth < ov.w * 0.99 || b.offsetHeight < ov.h * 0.6);
    opts.forEach((o) => {
      if (o === title) return;
      const r = o.getBoundingClientRect(), cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
      const row = boxes.filter((b) => { const q = b.getBoundingClientRect(); return q.left <= cx && cx <= q.right && q.top <= cy && cy <= q.bottom && b.offsetHeight < ov.h * 0.5; })
        .sort((x, y) => x.offsetWidth * x.offsetHeight - y.offsetWidth * y.offsetHeight)[0];
      const tgt = row || o;
      tgt.classList.add('kopt'); tgt.dataset.opt = o.textContent.trim(); tgt.dataset.key = key || '';
      if (key && K.a11y[key] === tgt.dataset.opt) { tgt.classList.add('on'); o.classList.add('on'); }
    });
  }
  function pick(o) {
    const key = o.dataset.key, v = o.dataset.opt; closeOv();
    if (!key) return;
    K.a11y[key] = v; applyA11y();
    const msg = { contrast: `고대비 ${v}`, low: `낮은 화면 ${v}`, font: `글씨 크기: ${v}`, vol: `음성 크기: ${v}`, spd: `음성 속도: ${v}`, lang: `언어: ${v}` }[key];
    const real = key === 'contrast' || key === 'low' || key === 'font';
    toast(msg + (real ? '' : ' (음성 안내·번역은 실제 기기/서버 연동이 필요합니다)'), real ? '' : '테스트 동작');
    if (key === 'vol' || key === 'spd') speak('음성 안내 설정이 변경되었습니다');
  }
  function speak(text) {
    try { if (!window.speechSynthesis || K.a11y.vol === '0') return; const u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR';
      u.volume = Number(K.a11y.vol) / 100; u.rate = { x1: 1, x2: 1.4, x4: 1.8, x8: 2 }[K.a11y.spd] || 1; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
  }
  /* 접근성 옵션 실제 반영: 고대비 / 낮은 화면 / 글씨 크기 (디스플레이 영역에만) */
  function applyA11y() {
    const st = $('#stage'); if (!st) return;
    st.classList.toggle('hc', K.a11y.contrast === 'ON');
    st.classList.toggle('low', K.a11y.low === 'ON');
    st.dataset.font = K.a11y.font;
    // 낮은 화면: 디스플레이 내용 전체를 한 덩어리로 묶어 아래쪽 가운데로 축소 (하단 접근성 바는 그대로)
    if (K.el) $$('.pg .head > .b:nth-child(n+2)', st).forEach((scr) => {
      const box = scr.querySelector(':scope > .klow');
      if (K.a11y.low !== 'ON') {
        if (box) { while (box.firstChild) scr.insertBefore(box.firstChild, box); box.parentNode.removeChild(box); }
        return;
      }
      if (box) return;
      const W0 = scr.offsetWidth, H0 = scr.offsetHeight;
      const bar = Array.from(scr.children).find((c) => c.offsetTop >= H0 - 130 && c.offsetWidth >= W0 * 0.9 && c.offsetHeight < 130);
      const barH = bar ? H0 - bar.offsetTop : 0;
      const w = document.createElement('div'); w.className = 'klow';
      w.style.cssText = `width:${W0}px;height:${H0 - barH}px;transform-origin:${W0 / 2}px ${H0 - barH}px;background:${scr.style.background || '#fff'}`;
      Array.from(scr.children).forEach((c) => { if (c !== bar) w.appendChild(c); });
      scr.insertBefore(w, scr.firstChild);
    });
  }

  /* ---------- 클릭 위임 ---------- */
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#stage')) return;
    const o = e.target.closest('.kopt'); if (o) return pick(o);
    const t = e.target.closest('[data-go],[data-act],[data-todo]');
    if (!t) { if (!e.target.closest('.kov')) closeOv(); return; }
    if (t.dataset.todo != null) return toast(t.dataset.todo || '이 기능은 디자인에 연결된 화면이 없습니다.', '프로토타입 안내');
    if (t.dataset.act === 'ov') return openOv(t);
    if (t.dataset.go) { closeOv(); K.go(t.dataset.go); }
  });

  /* ---------- 플로우 / 화면 맞춤 ---------- */
  K.startFlow = function (i) {
    K.flow = i; K.state = {}; closeOv();
    K.a11y = { vol: '50', spd: 'x1', font: '보통', contrast: 'OFF', low: 'OFF', lang: '한국어' };
    K.go(K.FLOWS[i][1], { reset: true }); paintFlows();
  };
  function paintFlows() { $$('#flowList [data-flow]').forEach((b) => b.classList.toggle('on', Number(b.dataset.flow) === K.flow)); }
  function fit() {
    const r = $('#wrap').getBoundingClientRect();
    const s = Math.min((r.width - 24) / 2521, (r.height - 24) / 1776);
    K.scale = s;
    const el = $('#scaler');
    if (window.CSS && CSS.supports('zoom', '0.5')) { el.style.transform = 'none'; el.style.zoom = s; }
    else el.style.transform = `scale(${s})`;
  }
  window.addEventListener('resize', fit); K.fit = fit;
  window.addEventListener('DOMContentLoaded', () => {
    $('#flowList').innerHTML = K.FLOWS.map((f, i) => `<button data-flow="${i}" type="button" title="${f[0]}"><i>✓</i><b class="no">${i + 1}</b><span>${f[0]}</span></button>`).join('');
    $('#flowList').addEventListener('click', (e) => { const b = e.target.closest('[data-flow]'); if (b) K.startFlow(Number(b.dataset.flow)); });
    $('#btnStart').addEventListener('click', () => K.startFlow(0));
    $('#btnBack').addEventListener('click', () => K.back());
    $('#btnLinks').addEventListener('click', (e) => { $('#stage').classList.toggle('links'); e.currentTarget.classList.toggle('on'); $('#legend').style.display = $('#stage').classList.contains('links') ? 'flex' : 'none'; });
    fit();
    const q = new URLSearchParams(location.search).get('s');
    const first = q && K.TITLES[q] ? q : K.START;
    const fi = K.FLOWS.findIndex((f) => f[1] === first); if (fi >= 0) K.flow = fi;
    paintFlows(); K.go(first, { anim: false });
  });
})();
