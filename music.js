(function () {
  'use strict';
  const archive = document.getElementById('music-archive');
  if (!archive) return;
  const panel = document.getElementById('music-player-panel');
  const stage = panel.querySelector('.music-frame');
  const diary = panel.querySelector('.music-diary');
  const status = document.getElementById('music-selection');
  let selected = panel.previousElementSibling;
  archive.addEventListener('click', event => {
    const link = event.target.closest('a.music-select');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const {musicId, title, ratio, article} = link.dataset;
    const width = Number(link.dataset.width);
    if (!/^[0-9a-f-]{36}$/.test(musicId) || !Number.isFinite(width) || width < 280 || width > 1200 || !['100%', '56.25%'].includes(ratio)) return;
    event.preventDefault();
    if (link === selected) return;

    // Detach the live player before moving its container. Moving a live iframe can reload it.
    stage.replaceChildren();
    selected.setAttribute('aria-expanded', 'false');
    link.after(panel);
    panel.style.setProperty('--liner-width', width + 'px');
    panel.style.setProperty('--liner-height', ratio);
    diary.setAttribute('href', article);
    diary.setAttribute('aria-label', title + 'を掲載した日記へ');
    const frame = document.createElement('iframe');
    frame.name = 'music-player';
    frame.title = title + ' — LINER PLAYER';
    frame.allow = 'fullscreen'; frame.allowFullscreen = true;
    frame.src = 'apps/' + musicId + '/index.html';
    stage.appendChild(frame);
    link.setAttribute('aria-expanded', 'true');
    selected = link;
    status.textContent = title + 'を選択しました。プレイヤーの再生ボタンで再生できます。';

    // The previously expanded row may have been above this one, even far outside the viewport.
    const row = link.getBoundingClientRect();
    if (row.top < 0 || row.bottom > window.innerHeight - 44) {
      link.scrollIntoView({block: 'start', behavior: 'instant'});
    }
  });
}());