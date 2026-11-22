/* Flows 패널 반응형 동작 (넓게 펼침 / 번호 띠 / 서랍) — 창 크기에 따라 자동 전환 */
(function () {
  const B = document.body;
  const cfg = window.FLOWCFG || { wide: 1200, rail: 700 };
  const host = window.App || window.WEB;
  let mode = null, hidden = false;
  const calc = () => (innerWidth >= cfg.wide ? 'wide' : innerWidth >= cfg.rail ? 'rail' : 'drawer');
  const refit = () => { if (host && host.fit) host.fit(); setTimeout(() => host && host.fit && host.fit(), 200); };
  function apply() {
    const m = calc();
    if (m !== mode) {
      B.classList.remove('fl-wide', 'fl-rail', 'fl-drawer', 'fl-open');
      B.classList.add('fl-' + m); mode = m;
    }
    B.classList.toggle('flowsHidden', hidden && m !== 'drawer');
    refit();
  }
  function close() { B.classList.remove('fl-open'); }
  window.addEventListener('resize', apply);
  window.addEventListener('DOMContentLoaded', () => {
    B.classList.remove('flowsOpen', 'flowsHidden');
    apply();
    document.getElementById('btnFlows').addEventListener('click', () => {
      if (mode === 'wide' || hidden) { hidden = !hidden; if (!hidden && mode !== 'wide') B.classList.add('fl-open'); apply(); return; }
      B.classList.toggle('fl-open');
    });
    document.getElementById('flowClose').addEventListener('click', () => {
      if (mode === 'wide') { hidden = true; apply(); } else close();
    });
    document.getElementById('flowDim').addEventListener('click', close);
    document.getElementById('flowList').addEventListener('click', (e) => { if (e.target.closest('[data-flow]') && mode !== 'wide') close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    // 띠 모드에서 펼친 패널 바깥(무대)을 누르면 접힘 — 화면 이동은 일어나지 않음
    document.addEventListener('mousedown', (e) => { if (mode === 'rail' && B.classList.contains('fl-open') && !e.target.closest('#flows, #btnFlows')) close(); });
  });
})();
