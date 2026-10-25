(function () {
  'use strict';
  const box = document.getElementById('music-player-box');
  if (!box) return;
  const choices = Array.from(document.querySelectorAll('a[data-music-id]'));
  const status = document.getElementById('music-selection');
  let selected = choices.find(link => link.getAttribute('aria-current') === 'true');
  for (const link of choices) {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const id = link.dataset.musicId;
      const width = Number(link.dataset.width);
      const ratio = link.dataset.ratio;
      if (!/^[0-9a-f-]{36}$/.test(id) || !Number.isFinite(width) || width < 280 || width > 1200 || !['100%', '56.25%'].includes(ratio)) return;
      event.preventDefault();
      if (selected === link) return;
      const old = document.getElementById('music-player');
      if (!old) return;
      const frame = document.createElement('iframe');
      frame.id = 'music-player'; frame.name = 'music-player';
      frame.title = link.dataset.title + ' — LINER PLAYER';
      frame.allow = 'fullscreen'; frame.allowFullscreen = true;
      frame.src = 'apps/' + id + '/index.html';
      box.style.setProperty('--liner-width', width + 'px');
      box.style.setProperty('--liner-height', ratio);
      // Removing the old browsing context stops its audio and animation, including on file://.
      old.replaceWith(frame);
      selected = link;
      choices.forEach(choice => {
        if (choice === selected) choice.setAttribute('aria-current', 'true');
        else choice.removeAttribute('aria-current');
        const marker = choice.querySelector('.music-indicator');
        marker.textContent = choice === selected ? '▶' : marker.dataset.number;
      });
      status.textContent = link.dataset.title + 'を選択しました。プレイヤーの再生ボタンで再生できます。';
    });
  }
}());