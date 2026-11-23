(() => {
  const stage = document.getElementById('game-stage');
  if (!stage) return;
  const choices = [...document.querySelectorAll('.game-choice')];
  let selected = choices[0], started = false;
  const status = document.getElementById('game-status');
  function reset() {
    stage.replaceChildren(); started = false;
    const start = document.createElement('button'); start.type = 'button'; start.id = 'game-start';
    const title = document.createElement('span'); title.id = 'game-title'; title.textContent = selected.dataset.title;
    const hint = document.createElement('small'); hint.textContent = 'クリックしてプレイ';
    start.append(title, hint); stage.append(start);
    start.addEventListener('click', launch);
    document.getElementById('game-summary').textContent = selected.dataset.summary;
    document.getElementById('game-duration').textContent = selected.dataset.duration;
    choices.forEach(c => c.setAttribute('aria-pressed', String(c === selected)));
    status.textContent = '';
  }
  function launch() {
    if (started) return;
    started = true;
    const frame = document.createElement('iframe');
    frame.title = selected.dataset.title;
    frame.allow = 'autoplay; fullscreen'; frame.allowFullscreen = true;
    // Author-owned exports; keep same-origin storage for the game's own saves.
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-pointer-lock');
    frame.src = selected.dataset.src;
    stage.replaceChildren(frame); frame.focus();
    if (stage.classList.contains('game-expanded')) addClose();
  }
  choices.forEach(c => c.addEventListener('click', () => {
    if (c === selected) return;
    if (started && !window.confirm('現在のゲームを終了して切り替えますか？未保存の進行は失われます。')) return;
    selected = c; reset();
  }));
  function addClose() {
    const close = document.createElement('button'); close.type = 'button'; close.className = 'game-close'; close.textContent = '元に戻す';
    close.addEventListener('click', () => { stage.classList.remove('game-expanded'); close.remove(); }); stage.append(close);
  }
  document.getElementById('game-fullscreen').addEventListener('click', async () => {
    try {
      if (stage.requestFullscreen) { await stage.requestFullscreen(); return; }
      if (stage.webkitRequestFullscreen) { stage.webkitRequestFullscreen(); return; }
    } catch (_) { /* Browser fullscreen unavailable: expand within the page. */ }
    if (!stage.classList.contains('game-expanded')) { stage.classList.add('game-expanded'); addClose(); }
  });
  window.addEventListener('keydown', e => { if (e.key === 'Escape') { stage.classList.remove('game-expanded'); stage.querySelector('.game-close')?.remove(); } });
  reset();
})();