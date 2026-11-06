(function () {
  'use strict';
  const slots = Array.from(document.querySelectorAll('.manga-page'));
  function release(slot) {
    const img = slot.querySelector('img');
    if (img) { img.onload = null; img.onerror = null; img.removeAttribute('src'); }
    slot.replaceChildren();
  }
  function mount(slot) {
    if (slot.querySelector('img, button')) return;
    const img = new Image();
    img.alt = slot.dataset.alt;
    img.decoding = 'async';
    img.onerror = function () {
      if (!slot.contains(img)) return;
      const retry = document.createElement('button');
      retry.className = 'manga-retry';
      retry.textContent = slot.dataset.page + 'ページ目を再読み込み';
      retry.onclick = function () { release(slot); mount(slot); };
      slot.replaceChildren(retry);
    };
    slot.replaceChildren(img);
    img.src = slot.dataset.src;
  }
  if ('IntersectionObserver' in window) {
    let observer, resizeFrame;
    function observe() {
      if (observer) observer.disconnect();
      const margin = Math.max(400, window.innerHeight);
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) mount(entry.target); else release(entry.target);
        });
      }, {rootMargin: margin + 'px 0px', threshold: 0});
      slots.forEach(function (slot) { observer.observe(slot); });
    }
    observe();
    window.addEventListener('resize', function () {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(observe);
    });
  } else {
    let pending = false;
    function update() {
      pending = false;
      const height = window.innerHeight;
      slots.forEach(function (slot) {
        const rect = slot.getBoundingClientRect();
        if (rect.bottom >= -height && rect.top <= 2 * height) mount(slot); else release(slot);
      });
    }
    function schedule() {
      if (!pending) { pending = true; requestAnimationFrame(update); }
    }
    window.addEventListener('scroll', schedule, {passive: true});
    window.addEventListener('resize', schedule);
    update();
  }
}());