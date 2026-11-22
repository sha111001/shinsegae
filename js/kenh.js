/* =========================================================
   키오스크 보완 기능: 화면 키보드(한글 조합) · 검색창 · 결과 필터
   ========================================================= */
(function () {
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const K = window.KIOSK;

  /* ---------- 한글 두벌식 조합 ---------- */
  const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ', JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ', JONG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';
  const VCOMB = { 'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ', 'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ', 'ㅡㅣ': 'ㅢ' };
  const CCOMB = { 'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ', 'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ', 'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ', 'ㅂㅅ': 'ㅄ' };
  const SPLIT = Object.fromEntries(Object.entries(CCOMB).map(([k, v]) => [v, k]));
  const isV = (c) => JUNG.includes(c), isC = (c) => CHO.includes(c) || JONG.trim().includes(c);
  const compose = (c, v, j) => String.fromCharCode(0xac00 + (CHO.indexOf(c) * 21 + JUNG.indexOf(v)) * 28 + (j ? JONG.indexOf(j) : 0));
  function decompose(ch) {
    const k = ch.charCodeAt(0) - 0xac00; if (k < 0 || k > 11171) return null;
    return [CHO[Math.floor(k / 588)], JUNG[Math.floor((k % 588) / 28)], JONG[k % 28] === ' ' ? '' : JONG[k % 28]];
  }
  function typeJamo(text, ch) {
    const last = text.slice(-1), d = last && decompose(last), head = text.slice(0, -1);
    if (isV(ch)) {
      if (d && !d[2] && VCOMB[d[1] + ch]) return head + compose(d[0], VCOMB[d[1] + ch]);
      if (d && d[2]) {                                   // 받침을 다음 글자 초성으로
        const sp = SPLIT[d[2]];
        if (sp) return head + compose(d[0], d[1], sp[0]) + compose(sp[1], ch);
        if (CHO.includes(d[2])) return head + compose(d[0], d[1]) + compose(d[2], ch);
      }
      if (last && CHO.includes(last)) return head + compose(last, ch);
      return text + ch;
    }
    if (d && !d[2] && JONG.includes(ch) && ch !== ' ') return head + compose(d[0], d[1], ch);
    if (d && d[2] && CCOMB[d[2] + ch]) return head + compose(d[0], d[1], CCOMB[d[2] + ch]);
    return text + ch;
  }
  function backspace(text) {
    const last = text.slice(-1), d = last && decompose(last), head = text.slice(0, -1);
    if (!d) return head;
    if (d[2]) { const sp = SPLIT[d[2]]; return head + compose(d[0], d[1], sp ? sp[0] : ''); }
    const vs = Object.entries(VCOMB).find(([, v]) => v === d[1]);
    if (vs) return head + compose(d[0], vs[0][0]);
    return head + d[0];
  }

  /* ---------- 화면 키보드 인식 ---------- */
  const SHIFT = { 'ㅂ': 'ㅃ', 'ㅈ': 'ㅉ', 'ㄷ': 'ㄸ', 'ㄱ': 'ㄲ', 'ㅅ': 'ㅆ', 'ㅐ': 'ㅒ', 'ㅔ': 'ㅖ' };
  const EN = { 'ㅂ': 'q', 'ㅈ': 'w', 'ㄷ': 'e', 'ㄱ': 'r', 'ㅅ': 't', 'ㅛ': 'y', 'ㅕ': 'u', 'ㅑ': 'i', 'ㅐ': 'o', 'ㅔ': 'p', 'ㅁ': 'a', 'ㄴ': 's', 'ㅇ': 'd', 'ㄹ': 'f', 'ㅎ': 'g', 'ㅗ': 'h', 'ㅓ': 'j', 'ㅏ': 'k', 'ㅣ': 'l', 'ㅋ': 'z', 'ㅌ': 'x', 'ㅊ': 'c', 'ㅍ': 'v', 'ㅠ': 'b', 'ㅜ': 'n', 'ㅡ': 'm' };
  const label = (b) => b.textContent.trim();
  function setup(el) {
    const sc = K.scale || 1;
    // 검색창: 안내 문구 하나만 든 가장 작은 상자
    const field = $$('.b', el).filter((b) => /검색해\s?주세요$/.test(label(b)) && !/안내/.test(label(b)) && b.offsetHeight < 100 && b.offsetWidth > 300)
      .sort((x, y) => x.offsetWidth * x.offsetHeight - y.offsetWidth * y.offsetHeight)[0];
    if (!field) return;
    const ph = $$('.t1, .t', field).find((t) => /검색/.test(t.textContent));
    field.dataset.ui = 'ksearch'; field.removeAttribute('data-opts'); field.style.cursor = 'text';
    const st = { text: '', en: false, shift: false, ph: ph ? ph.textContent.trim() : '', phEl: ph, phColor: ph ? getComputedStyle(ph).color : '' };
    el._kb = st;
    // 화면 키보드는 그림 한 장(Figma) → 그림 위에 키 위치대로 투명 터치 영역을 깔아 실제로 누를 수 있게
    const KEYS = [[0.258,0.000,5.556,30.822,'ㅂ'],[6.202,0.000,5.556,30.822,'ㅈ'],[12.016,0.000,5.556,30.822,'ㄷ'],[17.829,0.000,5.556,30.822,'ㄱ'],[23.643,0.000,5.556,30.822,'ㅅ'],[29.587,0.000,5.556,30.822,'ㅛ'],[35.659,0.000,5.556,30.822,'ㅕ'],[41.602,0.000,5.685,30.822,'ㅑ'],[47.674,0.000,5.685,30.822,'ㅐ'],[53.747,0.000,5.685,30.822,'ㅔ'],[59.819,0.000,7.623,30.822,'BS'],[69.251,0.000,5.943,30.822,'1'],[75.581,0.000,5.814,30.822,'2'],[81.783,0.000,5.814,30.822,'3'],[87.984,0.000,5.814,30.822,'4'],[94.186,0.000,5.814,30.822,'5'],[0.258,34.247,7.235,32.192,'SHIFT'],[7.881,34.247,5.685,32.192,'ㅁ'],[13.953,34.247,5.814,32.192,'ㄴ'],[20.026,34.247,5.685,32.192,'ㅇ'],[26.098,34.247,5.685,32.192,'ㄹ'],[32.041,34.247,5.685,32.192,'ㅎ'],[38.114,34.247,5.685,32.192,'ㅗ'],[44.186,34.247,5.685,32.192,'ㅓ'],[50.258,34.247,5.685,32.192,'ㅏ'],[56.331,34.247,5.685,32.192,'ㅣ'],[69.251,34.247,5.943,32.192,'6'],[75.581,34.247,5.814,32.192,'7'],[81.783,34.247,5.814,32.192,'8'],[87.984,34.247,5.814,32.192,'9'],[94.186,34.247,5.814,32.192,'0'],[0.258,68.493,10.465,31.507,'LANG'],[11.111,68.493,5.556,31.507,'ㅋ'],[17.054,68.493,5.685,31.507,'ㅌ'],[22.997,68.493,5.685,31.507,'ㅊ'],[29.070,68.493,5.685,31.507,'ㅍ'],[35.013,68.493,5.685,31.507,'ㅠ'],[41.085,68.493,5.556,31.507,'ㅜ'],[47.028,68.493,5.685,31.507,'ㅡ'],[52.972,68.493,14.470,31.507,'SPACE'],[81.783,68.493,18.217,31.507,'GO']];
    $$('.b', el).filter((b) => getComputedStyle(b).backgroundImage.includes('d71cb96844cccab2')).forEach((img) => {
      KEYS.forEach(([x, y, w, h, k]) => {
        const d = document.createElement('div'); d.className = 'kkey'; d.dataset.ui = 'kkey'; d.dataset.k = k; d.dataset.ko = k;
        d.style.cssText = `position:absolute;left:${x}%;top:${y}%;width:${w}%;height:${h}%;border-radius:4px`;
        img.appendChild(d);
      });
    });
  }
  K.on('*', (el) => setTimeout(() => setup(el), 30));

  function paint(el) {
    const st = el._kb; if (!st || !st.phEl) return;
    const sp = $('span', st.phEl) || st.phEl;
    if (st.text) { sp.textContent = st.text; st.phEl.style.color = '#111'; } else { sp.textContent = st.ph; st.phEl.style.color = st.phColor; }
    st.phEl.classList.toggle('kcaret', true);
  }
  function relabel(el) {
    const st = el._kb;
    // 그림 속 글자는 바꿀 수 없으므로, 영문/쌍자음 상태일 때만 키 위에 작은 덮개 글자를 표시
    $$('.kkey', el).forEach((t) => {
      const ko = t.dataset.ko; if (!ko || !/^[ㄱ-ㅣ]$/.test(ko)) return;
      let v = st.en ? EN[ko] || ko : ko;
      if (st.shift) v = st.en ? v.toUpperCase() : SHIFT[ko] || ko;
      t.dataset.k = v; t.textContent = v === ko ? '' : v; t.classList.toggle('alt', v !== ko);
    });
  }
  function press(k) {
    const el = K.el, st = el._kb; if (!st) return;
    const v = k.dataset.k;
    if (v === 'BS') st.text = backspace(st.text);
    else if (v === 'SHIFT') { st.shift = !st.shift; relabel(el); k.classList.toggle('kon', st.shift); return; }
    else if (v === 'LANG') { st.en = !st.en; st.shift = false; relabel(el); K.toast(st.en ? '영문 입력' : '한글 입력'); return; }
    else if (v === 'SPACE') st.text += ' ';
    else if (v === 'GO') return search(el);
    else { st.text = /^[ㄱ-ㅣ]$/.test(v) ? typeJamo(st.text, v) : st.text + v; if (st.shift) { st.shift = false; relabel(el); $$('[data-k="SHIFT"]', el).forEach((x) => x.classList.remove('kon')); } }
    paint(el); search(el, true);
  }

  /* ---------- 검색: 매장/식당 카드 걸러내기 ---------- */
  const ALIAS = { '프라다': 'prada', '구찌': 'gucci', '까르띠에': 'cartier', '설화수': 'sulwhasoo', '디올': 'dior', '에스티로더': 'estee lauder', '입생로랑': 'yves saint laurent', '반클리프': 'van cleef', '롤렉스': 'rolex', '젠틀몬스터': 'gentle monster' };
  function cards(el) {
    // offsetWidth는 화면 배율과 무관한 원래 크기 → 배율을 곱하지 않음
    const inner = $$('.b', el).filter((b) => /상세보기|Tel/.test(label(b)) && b.offsetWidth > 120 && b.offsetHeight > 90 && b.offsetHeight < 420)
      .filter((b, i, arr) => !arr.some((o) => o !== b && b.contains(o)));
    // 카드 전체(사진·로고 포함)까지 넓힘: 다른 카드를 품지 않는 가장 바깥 상자
    return inner.map((c) => {
      let o = c;
      while (o.parentElement && o.parentElement !== el && o.parentElement.offsetHeight < 480 && !inner.some((x) => x !== c && o.parentElement.contains(x))) o = o.parentElement;
      return o;
    });
  }
  function search(el, live) {
    const st = el._kb; const q = st.text.replace(/\s+/g, '').toLowerCase();
    const cs = cards(el);
    let n = 0;
    cs.forEach((c) => {
      const t = label(c).replace(/\s+/g, '').toLowerCase();
      const alias = Object.entries(ALIAS).filter(([ko]) => t.includes(ko)).map(([, en]) => en.replace(/\s+/g, '')).join(' ');
      const hit = !q || t.includes(q) || alias.includes(q);
      c.style.visibility = hit ? '' : 'hidden'; if (hit) n++;
    });
    noResult(el, cs, q && !n ? st.text : '');
    if (!live) K.toast(q ? (n ? `‘${st.text}’ 검색 결과 ${n}곳` : `‘${st.text}’ 검색 결과가 없습니다`) : '검색어를 입력해 주세요', q ? '테스트 데이터 기준' : '');
  }
  // 결과가 없으면 빈 화면 대신 카드 자리 가운데에 안내 문구
  function noResult(el, cs, text) {
    let m = el.querySelector('.knores');
    if (!text || !cs.length) { if (m) m.parentNode.removeChild(m); return; }
    const s = K.scale || 1, o = el.getBoundingClientRect();
    const R = cs.map((c) => c.getBoundingClientRect());
    const l = Math.min(...R.map((r) => r.left)), t = Math.min(...R.map((r) => r.top)), r = Math.max(...R.map((x) => x.right)), b = Math.max(...R.map((x) => x.bottom));
    if (!m) { m = document.createElement('div'); m.className = 'knores'; el.appendChild(m); }
    m.style.cssText = `left:${(l - o.left) / s}px;top:${(t - o.top) / s}px;width:${(r - l) / s}px;height:${(b - t) / s}px`;
    m.innerHTML = `<b>‘${text.replace(/[<>&]/g, '')}’ 검색 결과가 없습니다</b><span>매장 이름(예: 프라다, 구찌, 롤렉스)이나 영문 브랜드명으로 검색해 보세요</span>`;
  }
  // 다른 화면(매거진 '매장 찾기' 등)에서 검색어를 넣어 바로 검색
  K.ksearch = function (text) {
    const el = K.el; if (!el || !el._kb) return false;
    el._kb.text = text; paint(el); search(el);
    return true;
  };

  /* ---------- 클릭 / 실제 키보드 ---------- */
  document.addEventListener('click', (e) => {
    const k = e.target.closest('[data-ui="kkey"]');
    if (k && e.target.closest('#stage')) { e.stopPropagation(); press(k); return; }
    const f = e.target.closest('[data-ui="ksearch"]');
    if (f) { e.stopPropagation(); K.toast('아래 화면 키보드로 입력하세요. (PC 키보드도 가능)'); }
  }, true);
  document.addEventListener('keydown', (e) => {
    const el = K.el; if (!el || !el._kb || e.target.closest('input,textarea')) return;
    const st = el._kb;
    if (e.key === 'Backspace') { st.text = backspace(st.text); paint(el); search(el, true); e.preventDefault(); }
    else if (e.key === 'Enter') search(el);
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { st.text = /^[ㄱ-ㅣ]$/.test(e.key) ? typeJamo(st.text, e.key) : st.text + e.key; paint(el); search(el, true); }
  });
  /* ---------- 매거진 '매장 찾기' → 매장조회 검색으로 연결 (매장 데이터에 없는 브랜드는 막음) ---------- */
  function storeFind(el) {
    $$('.b', el).filter((b) => label(b) === '매장 찾기').forEach((btn) => {
      const item = btn.parentElement, t = item.textContent.replace(/\s+/g, '').toLowerCase();
      const hit = Object.entries(ALIAS).find(([ko, en]) => t.includes(ko) || t.includes(en.replace(/\s+/g, '')));
      btn.removeAttribute('data-ui'); btn.classList.remove('on');
      if (hit) { btn.dataset.find = hit[0]; btn.dataset.ui = 'storefind'; btn.classList.add('hv'); btn.title = `매장조회에서 ‘${hit[0]}’ 검색`; }
      else { btn.dataset.find = ''; btn.classList.remove('hv'); btn.classList.add('kdisabled'); btn.title = '매장 정보가 없는 브랜드입니다'; }
    });
  }
  K.on('*', (el) => setTimeout(() => storeFind(el), 40));
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-find]'); if (!b || !e.target.closest('#stage')) return;
    e.stopPropagation(); e.preventDefault();
    if (!b.dataset.find) return K.toast('이 브랜드는 매장 안내 데이터에 없어 매장 찾기를 할 수 없습니다', '프로토타입 안내');
    const q = b.dataset.find;
    K.go('8:9740');
    let n = 0; const tryIt = () => { if (K.cur === '8:9740' && K.el && K.el._kb) K.ksearch(q); else if (n++ < 30) setTimeout(tryIt, 60); };
    setTimeout(tryIt, 80);
  }, true);

  K.hangul = { typeJamo, backspace };
})();
