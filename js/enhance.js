/* =========================================================
   웹 보완 기능 — Figma 디자인에 없는 동작을 같은 스타일로 추가
   (생성기가 Figma 레이어 모양으로 판별해 data-ui 를 붙임)
   in: 입력칸 · sel: 드롭다운 · radio · chk · chip(칩/탭/버튼) · day(달력)
   ========================================================= */
(function () {
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const W = window.WEB;
  const TIME = /^\d{2}:\d{2}$/;

  /* ---------- 화면 렌더 후 입력칸을 실제 <input>으로 ---------- */
  W.on('*', (el, id) => {
    $$('[data-ui="in"]', el).forEach((t) => {
      const ph = t.textContent.trim();
      const bw = Number(t.dataset.bw) || t.offsetWidth;
      const right = getComputedStyle(t).textAlign === 'right';
      const num = /^0[0,]*$/.test(ph);
      t.style.width = Math.max(bw - 28, t.offsetWidth) + 'px';
      if (right) t.style.left = (parseFloat(t.style.left) - (Math.max(bw - 28, t.offsetWidth) - parseFloat(getComputedStyle(t).width || 0))) + 'px';
      const inp = document.createElement('input');
      inp.className = 'inp-real'; inp.placeholder = ph; inp.setAttribute('aria-label', ph);
      if (num) inp.inputMode = 'numeric';
      inp.style.cssText = `position:static;width:100%;font:inherit;letter-spacing:inherit;text-align:${right ? 'right' : 'left'};color:#111;background:transparent;border:0;outline:0;padding:0`;
      t.innerHTML = ''; t.appendChild(inp); t.style.pointerEvents = 'auto';
      // 입력칸을 감싼 테두리 상자 전체를 입력 영역으로
      let a = t;
      for (let i = 0; i < 3; i++) { a = a.parentElement; if (!a || a.classList.contains('in')) break; const cs = getComputedStyle(a); if (cs.boxShadow !== 'none' || parseFloat(cs.borderTopWidth) > 0) { a.dataset.inbox = '1'; a.style.cursor = 'text'; break; } }
      if (num) inp.addEventListener('input', () => {
        const v = inp.value.replace(/[^\d]/g, '').slice(0, 12);
        inp.value = ph.includes(',') && v ? Number(v).toLocaleString('ko-KR') : v;
      });
      if (t.dataset.search) inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(inp.value, id); });
    });
    // 이전에 고른 날짜/시간 반영 (Figma 상태 프레임 위에 선택값 유지)
    if (W.state.day) pickDay(el, W.state.day, true);
    if (W.state.time) pickTime(el, W.state.time);
  });

  function doSearch(q, id) {
    q = (q || '').trim();
    if (!q) return W.toast('검색어를 입력해 주세요.');
    W.state.q = q;
    if (id === '1:3723' || id === '74:1571') return W.toast(`‘${q}’ 주변 지점 검색은 실제 지점 데이터(서버)가 필요합니다.`, '테스트 동작');
    W.toast(`‘${q}’ 검색 결과 — 실제 검색은 서버 연동이 필요해 상품조회 화면으로 안내합니다.`, '테스트 동작');
    W.go('1:5710');
  }

  /* ---------- 클릭 (Figma 연결보다 먼저 처리) ---------- */
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#stage')) return;
    const dd = e.target.closest('.drop button');
    if (dd) { e.stopPropagation(); const box = W._dropFor; closeDrop(); if (box) setText(box, dd.textContent); return; }
    if (!e.target.closest('.drop')) closeDrop();
    if (e.target.closest('input')) { e.stopPropagation(); return; }
    // 검색 아이콘: 입력칸 옆 돋보기
    const sv = e.target.closest('svg.v, .b');
    const ib = e.target.closest('[data-inbox]');
    if (ib && !e.target.closest('[data-ui="sel"],[data-go],[data-act]')) { const i = $('[data-ui="in"] input', ib); if (i) { i.focus(); e.stopPropagation(); return; } }
    const u = e.target.closest('[data-ui]');
    if (!u) {
      if (sv) { const box = sv.closest('.b'); const inp = box && (box.parentElement || box).querySelector('[data-search] input'); if (inp && !e.target.closest('[data-go],[data-act]')) { e.stopPropagation(); doSearch(inp.value, W.cur); } }
      return;
    }
    const k = u.dataset.ui;
    if (k === 'in') { const i = $('input', u); if (i) i.focus(); e.stopPropagation(); return; }
    if (k === 'sel') { e.stopPropagation(); openDrop(u); return; }
    if (k === 'radio') { e.stopPropagation(); setRadio(u); return; }
    if (k === 'chk') { e.stopPropagation(); setChk(u, !u.dataset.on); return; }
    if (k === 'day') { e.stopPropagation(); onDay(u); return; }
    if (k === 'chip') { if (e.target.closest('[data-go],[data-act]') && !TIME.test(u.textContent.trim())) return; e.stopPropagation(); onChip(u); }
  }, true);

  /* ---------- 드롭다운 ---------- */
  function textEl(box) { return $('.t1 span, .t span', box); }
  function setText(box, v) { const t = textEl(box); if (t) { t.textContent = v; t.parentElement.style.color = '#111'; } W.toast(`‘${v}’ 선택`); }
  function closeDrop() { const d = $('#stage .drop'); if (d) d.remove(); W._dropFor = null; }
  function openDrop(box) {
    closeDrop();
    let opts = []; try { opts = JSON.parse(box.dataset.opts || '[]'); } catch (e) {}
    if (!opts.length) return W.toast(`‘${box.textContent.trim()}’ 화면은 디자인에 없습니다.`, '프로토타입 안내');
    const r = box.getBoundingClientRect(), s = $('#stage').getBoundingClientRect(), k = W.scale || 1;
    const d = document.createElement('div'); d.className = 'drop';
    d.style.cssText = `left:${(r.left - s.left) / k}px;top:${(r.bottom - s.top) / k + 4}px;min-width:${r.width / k}px`;
    d.innerHTML = opts.map((o) => `<button type="button">${o}</button>`).join('');
    $('#stage').appendChild(d); W._dropFor = box;
  }

  /* ---------- 라디오 / 체크 ---------- */
  function paintRadio(r, on) {
    r.dataset.on = on ? '1' : '';
    r.style.boxShadow = on ? 'inset 0 0 0 5px #0066b3' : 'inset 0 0 0 1px #d8d8d8';
    r.style.background = '#fff';
  }
  function setRadio(r) {
    $$(`[data-ui="radio"][data-grp="${r.dataset.grp}"]`, W.el).forEach((x) => paintRadio(x, x === r));
    // 기간 라디오 → 가입 요약의 '가입 기간'
    const lab = r.parentElement && $('.t1 span, .t span', r.parentElement);
    const months = lab && lab.textContent.trim().match(/^(\d+)개월$/);
    if (months) {
      const sp = $$('.t1 span, .t span', W.el).find((s) => /^\d+개월$/.test(s.textContent.trim()) && /0, 102, 179/.test(getComputedStyle(s.closest('.t1,.t')).color));
      if (sp) sp.textContent = months[0];
    }
    // 라디오가 든 카드(선택 박스) 테두리도 함께
    const card = r.closest('.b[style*="border-radius"]');
    if (card && card !== r) {
      const grpCards = $$(`[data-ui="radio"][data-grp="${r.dataset.grp}"]`, W.el).map((x) => x.parentElement);
      grpCards.forEach((c) => { if (!c._bs) c._bs = c.style.boxShadow; });
    }
  }
  function setChk(c, on) {
    c.dataset.on = on ? '1' : '';
    c.style.background = on ? '#0066b3' : '#fff';
    c.style.boxShadow = on ? 'none' : 'inset 0 0 0 1px #d8d8d8';
    $$('svg', c).forEach((v) => (v.style.visibility = on ? 'visible' : 'hidden'));
  }

  /* ---------- 칩/탭 선택: 크기·위치는 그대로 두고 '선택된 모양'(배경·테두리·글자색·굵기)만 옮김 ---------- */
  const SIDES = ['Top', 'Right', 'Bottom', 'Left'];
  function boxSig(b0) { const b = layer(b0); const cs = getComputedStyle(b); return [cs.backgroundImage, cs.backgroundColor, cs.boxShadow, ...SIDES.map((d) => cs['border' + d + 'Width'] + cs['border' + d + 'Color'])].join('|'); }
  function texts(b) { return $$('.t1, .t', b); }
  /* 실제로 색이 칠해진 층: 칩 자체가 투명하면 칩을 거의 다 덮는 안쪽 상자로 내려감 */
  const painted = (b) => { const cs = getComputedStyle(b); return cs.backgroundImage !== 'none' || !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor) || cs.boxShadow !== 'none' || SIDES.some((d) => parseFloat(cs['border' + d + 'Width']) > 0); };
  function layer(b) {
    let el = b;
    for (let i = 0; i < 3 && !painted(el); i++) {
      const W0 = el.offsetWidth, H0 = el.offsetHeight;
      const kid = $$(':scope > .b', el).find((k) => k.offsetWidth >= W0 * 0.85 && k.offsetHeight >= H0 * 0.85);
      if (!kid) break; el = kid;
    }
    return el;
  }
  function look(b0) {
    const b = layer(b0), cs = getComputedStyle(b), t = texts(b0)[0], ts = t && getComputedStyle(t);
    const L = { backgroundImage: cs.backgroundImage, backgroundColor: cs.backgroundColor, boxShadow: cs.boxShadow };
    SIDES.forEach((d) => { ['Width', 'Style', 'Color'].forEach((k) => (L['border' + d + k] = cs['border' + d + k])); });
    L.tc = ts ? ts.color : ''; L.tw = ts ? ts.fontWeight : '';
    return L;
  }
  function apply(b0, L) {
    const b = layer(b0);
    Object.keys(L).forEach((k) => { if (k !== 'tc' && k !== 'tw') b.style[k] = L[k]; });
    texts(b0).forEach((t) => { t.style.color = L.tc; t.style.fontWeight = L.tw; $$('span', t).forEach((sp) => { if (sp.style.color) sp.style.color = L.tc; if (sp.style.fontWeight) sp.style.fontWeight = L.tw; }); });
  }
  /* 선택 묶음: 같은 부모·같은 높이 칩 중 '모양이 다른 하나' = 선택된 것 */
  function group(c) {
    const sibs = $$(':scope > [data-ui="chip"], :scope > [data-go]', c.parentElement).filter((x) => x.classList.contains('b') && Math.abs(x.offsetHeight - c.offsetHeight) < 3);
    if (sibs.length < 2) return null;
    const sigs = sibs.map(boxSig), count = {};
    sigs.forEach((g) => (count[g] = (count[g] || 0) + 1));
    const major = Object.keys(count).sort((x, y) => count[y] - count[x])[0];
    let act = sibs.find((x, i) => sigs[i] !== major && count[sigs[i]] === 1);
    if (!act && sibs.length === 2 && sigs[0] !== sigs[1]) act = sibs.find((x) => x !== c);
    if (!act) return null;                       // 모양 차이가 없으면 선택 묶음이 아님(일반 글자 링크 등)
    return { act, major, normal: sibs.find((x, i) => sigs[i] === major) };
  }
  function select(c) {
    if (c.closest('.head') && !c.closest('#gnb2')) return false;   // 머리글 메뉴는 선택 표시 대상이 아님(이동 메뉴)
    const g = group(c); if (!g) return false;
    if (g.act === c) return true;
    if (boxSig(c) !== g.major) { W.toast('선택할 수 없는 항목입니다.'); return true; }   // 예: 마감된 시간
    const on = look(g.act), off = look(g.normal);
    apply(c, on); apply(g.act, off);
    return true;
  }
  /* 가입 금액 ↔ 금액 칩 ↔ 가입 요약 */
  function amountInput() { return $$('[data-ui="in"] input', W.el).find((i) => /가입 금액/.test(i.placeholder)); }
  function syncSummary() {
    const i = amountInput(); if (!i) return;
    const v = Number((i.value || '0').replace(/,/g, '')) * 10000;
    const sp = $$('.t1 span, .t span', W.el).find((s) => /^[\d,]+\s?원$/.test(s.textContent.trim()) && /0066b3|0, 102, 179/.test(getComputedStyle(s.closest('.t1,.t')).color));
    if (sp) sp.textContent = (v ? v.toLocaleString('ko-KR') : '00,000,0000') + ' 원';
  }
  W.on('1:3067', (el) => { const i = amountInput(); if (i) { i.placeholder = '가입 금액을 입력해 주세요. (만원)'; i.addEventListener('input', syncSummary); } });
  /* 상품상세 만기 계산기: 이 상품은 [개월] [금액]원으로 금리 연 [%]를 적용하면? → 결과보기 */
  function calc() {
    const ins = $$('[data-ui="in"] input', W.el).filter((i) => /^0[0,.]*$/.test(i.placeholder));
    const num = (i) => Number((i.value || '').replace(/,/g, '')) || 0;
    if (ins.length < 3) return false;
    const [m, a, r] = ins.map(num);
    if (!m || !a) { W.toast('개월 수와 금액을 입력해 주세요.'); return true; }
    const total = Math.round(a * (1 + (r / 100) * (m / 12)));
    const sp = $$('.t1 span, .t span', W.el).find((s) => /^0{3},0{3},0{3}$|^[\d,]{9,}$/.test(s.textContent.trim()));
    if (sp) sp.textContent = total.toLocaleString('ko-KR');
    W.toast(`세전 예상 수령액 ${total.toLocaleString('ko-KR')}원 (단리 단순 계산 · 테스트)`, '테스트 동작');
    return true;
  }
  function onChip(c) {
    const label = c.textContent.trim();
    if (label === '결과보기' && calc()) return;
    const m = label.match(/^([\d,]+)만원$|^(\d+)억 ?원$/);
    const ai = m && amountInput();
    if (ai) {
      const add = m[1] ? Number(m[1].replace(/,/g, '')) : Number(m[2]) * 10000;
      const cur = Number((ai.value || '0').replace(/,/g, ''));
      ai.value = (cur + add).toLocaleString('ko-KR'); syncSummary(); return;
    }
    // 예약 시간: Figma 흐름(시간 선택 → 시간 선택됨 화면) 유지
    if (TIME.test(label) && W.cur === '74:2315') { W.state.time = label; return W.swap('74:1909'); }
    if (TIME.test(label) && W.cur === '74:2715') { W.state.time = label; W.toast('먼저 상담 날짜를 선택해 주세요.'); }
    if (select(c)) { if (TIME.test(label)) W.state.time = label; return; }
    W.toast(`‘${label}’ 기능은 디자인에 연결된 화면이 없습니다.`, '프로토타입 안내');
  }
  function pickTime(el, label) {
    const chips = $$('[data-ui="chip"], [data-go]', el).filter((x) => x.textContent.trim() === label && x.classList.contains('b'));
    const c = chips[0]; if (!c) return;
    select(c);
  }

  /* ---------- 달력 날짜 ---------- */
  function onDay(t) {
    const col = getComputedStyle(t).color;
    if (/179, 179, 179|204, 204, 204|170, 170, 170|153, 153, 153/.test(col) && !t.dataset.sel) return W.toast('이번 달 날짜를 선택해 주세요.');
    const day = t.textContent.trim();
    if (W.cur === '74:2715') { W.state.day = day; return W.swap('74:2315'); }   // Figma: 날짜 선택 → 날짜 선택됨
    W.state.day = day; pickDay(W.el, day);
  }
  function pickDay(el, day, silent) {
    const cal = $('[data-ui="day"]', el); if (!cal) return;
    const box = cal.parentElement;
    const days = $$(':scope > [data-ui="day"]', box);
    const t = days.find((x) => x.textContent.trim() === day && !/179, 179, 179|204, 204, 204|170, 170, 170|153, 153, 153/.test(getComputedStyle(x).color));
    if (!t) return;
    let hl = $(':scope > [data-ui="dayhl"]', box);
    if (!hl) { hl = document.createElement('div'); hl.className = 'b'; hl.dataset.ui = 'dayhl'; hl.style.cssText = 'width:38px;height:38px;border-radius:50%;background:#0066b3'; box.insertBefore(hl, box.firstChild); }
    days.forEach((x) => { if (x.dataset.sel) { x.style.color = x.dataset.sel; delete x.dataset.sel; } });
    // Figma 상태 프레임에 원래 선택돼 있던 날짜(흰 글씨) 되돌리기
    $$('.t1, .t', box).forEach((x) => { if (x !== t && getComputedStyle(x).color === 'rgb(255, 255, 255)') x.style.color = '#121212'; });
    const L = parseFloat(t.style.left) + parseFloat(t.style.width) / 2, T = parseFloat(t.style.top) + parseFloat(t.style.height) / 2;
    hl.style.left = L - 19 + 'px'; hl.style.top = T - 19 + 'px';
    t.dataset.sel = t.style.color || getComputedStyle(t).color; t.style.color = '#fff';
    if (!silent) W.toast(`${day}일 선택`);
    // 요일: 날짜들의 가로 위치(열) 순서로 계산
    const xs = [...new Set(days.map((x) => Math.round(parseFloat(x.style.left) + parseFloat(x.style.width) / 2)))].sort((a, b) => a - b);
    const cols = []; xs.forEach((v) => { if (!cols.length || v - cols[cols.length - 1] > 30) cols.push(v); });
    const ci = cols.findIndex((v) => Math.abs(v - L) <= 30);
    W.state.wd = '일월화수목금토'[ci] || '';
    summary(el);
  }

  /* 오른쪽 '상담 일시' 요약을 선택값으로 */
  function summary(el) {
    $$('.t1 span, .t span', el).forEach((s) => {
      let h = s.innerHTML; const o = h;
      if (W.state.day) h = h.replace(/(\d{4}년 \d{1,2}월 )\d{1,2}일 \(.\)/, `$1${W.state.day}일 (${W.state.wd || '-'})`);
      if (W.state.time && /\d{4}년|^(오전|오후)/.test(s.textContent.trim())) { const hh = Number(W.state.time.slice(0, 2)); h = h.replace(/(오전|오후) \d{2}:\d{2}/, (hh < 12 ? '오전 ' : '오후 ') + W.state.time); }
      if (h !== o) s.innerHTML = h;
    });
  }
  W.on('*', (el) => { if (W.state.day || W.state.time) summary(el); });
})();
