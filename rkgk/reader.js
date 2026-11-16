(() => {
  const list = document.getElementById('comic-days');
  const older = document.getElementById('comic-older');
  if (!list) return;
  function publicLinks(container) {
    if (location.protocol !== 'https:' && location.protocol !== 'http:') return;
    for (const link of container.querySelectorAll('a.comic-permalink')) {
      const href = link.getAttribute('href');
      if (href.endsWith('/index.html')) link.setAttribute('href', href.slice(0, -'index.html'.length));
    }
  }
  publicLinks(list);
  if (!older) return;
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => { script.remove(); resolve(); };
      script.onerror = () => { script.remove(); reject(new Error('batch')); };
      document.head.append(script);
    });
  }
  function plainClick(event) {
    return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
  }
  if (list.hasAttribute('data-tag-list')) {
    let loading = false;
    older.addEventListener('click', async event => {
      if (!plainClick(event)) return;
      event.preventDefault();
      if (loading || older.hidden) return;
      loading = true;
      const destination = older.href;
      try {
        window.amicaComicBatch = null;
        await loadScript(destination.replace(/\.html$/, '.js'));
        const batch = window.amicaComicBatch;
        if (!batch || typeof batch.html !== 'string') throw new Error('batch');
        const template = document.createElement('template');
        template.innerHTML = batch.html;
        publicLinks(template.content);
        const heading = template.content.querySelector('.comic-day>h2');
        list.append(template.content);
        if (batch.next) older.setAttribute('href', batch.next);
        else older.hidden = true;
        heading?.focus({preventScroll:true});
      } catch (_) { window.location.assign(destination); }
      finally { window.amicaComicBatch = null; loading = false; }
    });
    return;
  }
  const days = list.dataset.remaining.split(' ').filter(Boolean);
  const cache = window.amicaComicMonths = Object.create(null);
  let position = 0, busy = false;
  async function dayContent(date) {
    const local = document.getElementById('batch-' + date);
    if (local) return local.content.cloneNode(true);
    const month = date.slice(0, 7);
    if (!cache[month]) {
      await loadScript(month + '.js');
    }
    if (!cache[month] || typeof cache[month][date] !== 'string') throw new Error('day');
    const template = document.createElement('template');
    template.innerHTML = cache[month][date];
    return template.content;
  }
  async function appendTo(end, focusFirst) {
    if (busy) return;
    busy = true;
    const first = days[position], batch = document.createDocumentFragment();
    const fallback = older.href;
    try {
      const limit = Math.min(end, days.length);
      for (let i = position; i < limit; i++) batch.append(await dayContent(days[i]));
      publicLinks(batch);
      list.append(batch);
      position = limit;
      older.hidden = position === days.length;
      if (!older.hidden) {
        const next = days[position];
        older.href = next.slice(0, 7) + '.html#day-' + next;
      }
      if (focusFirst) document.querySelector('#day-' + first + '>h2').focus({preventScroll:true});
    } catch (_) { window.location.assign(fallback); }
    finally { busy = false; }
  }
  older.addEventListener('click', event => {
    if (!plainClick(event)) return;
    event.preventDefault();
    appendTo(position + 3, true);
  });
  async function revealAnchor() {
    const id = location.hash.slice(1);
    const match = /^(?:day|comic)-(\d{4}-\d{2}-\d{2})(?:$|-[a-f0-9-]+$)/.exec(id);
    if (!match || document.getElementById(id)) return;
    const at = days.indexOf(match[1]);
    if (at < position) return;
    await appendTo(Math.ceil((at + 1)/3) * 3, false);
    document.getElementById(id)?.scrollIntoView();
  }
  window.addEventListener('hashchange', revealAnchor);
  revealAnchor();
})();