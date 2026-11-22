/* 파란색 호버 — 이미지·흰 배경과 자연스럽게 섞이도록
   - 요소 전체 위에 연한 파랑을 '곱하기(multiply)'로 덮음 → 흰 배경 아이콘도 주변과 똑같이 물들어 티 나지 않음
   - 테두리 선은 원래 디자인에 상자(배경색·테두리·그림자)가 있는 요소에만 표시 → 선 없던 이미지·글자에는 선을 넣지 않음 */
(function () {
  const SEL = window.HOVER_SEL;
  const done = new WeakSet();
  const transparent = (c) => !c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c);
  function mark(el) {
    if (done.has(el) || el.tagName === 'svg' || el.tagName === 'IMG' || el.tagName === 'INPUT') return;
    done.add(el);
    const cs = getComputedStyle(el);
    if (cs.position === 'static') el.style.position = 'relative';
    const bg = cs.backgroundImage, img = bg.includes('url(');
    const grad = bg !== 'none' && bg.includes('gradient') && /rgb\(|rgba\([^)]*,\s*(0?\.\d*[1-9]|1)\)/.test(bg);
    const box = !img && (!transparent(cs.backgroundColor) || grad ||
      (cs.boxShadow && cs.boxShadow !== 'none') || parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderBottomWidth) > 0);
    // 흰색 단색 배경은 상자로 보지 않음(흰 화면과 섞이도록 만든 요소)
    const white = /rgb\(255, 255, 255\)/.test(cs.backgroundColor) && (cs.boxShadow === 'none') && !(parseFloat(cs.borderTopWidth) > 0);
    el.classList.add('hv');
    // 그림자 필터가 있는 이미지 묶음: 상자 대신 이미지 모양을 따라 파랗게 빛나게
    if (cs.filter && cs.filter !== 'none' && !el.textContent.trim()) { el.classList.add('fx'); el.style.setProperty('--f', cs.filter); }
    if (box && !white) el.classList.add('bx');
    const r = cs.borderRadius;
    el.style.setProperty('--hvr', r && r !== '0px' ? r : '6px');
  }
  function scan(root) { root.querySelectorAll(SEL).forEach(mark); }
  let q = false;
  const obs = new MutationObserver(() => { if (q) return; q = true; requestAnimationFrame(() => { q = false; scan(document); }); });
  window.addEventListener('DOMContentLoaded', () => { scan(document); obs.observe(document.body, { childList: true, subtree: true }); });
})();
