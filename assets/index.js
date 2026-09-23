(function () {
  'use strict';
  const catalog = window.AmicaCatalog;
  const search = document.getElementById('diary-search');
  const status = document.getElementById('index-status');
  if (!Array.isArray(catalog)) { status.textContent = '一覧データを読み込めませんでした。ページを再読み込みしてください。'; return; }
  const list = document.getElementById('diary-results');
  const order = document.getElementById('diary-order');
  const previous = document.getElementById('index-prev');
  const next = document.getElementById('index-next');
  const pageLabel = document.getElementById('index-page');
  const pageSize = 200;
  let matches = catalog, page = 0, epoch = 0, timer, composing = false;
  let loading = false;
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase('ja');
  function element(tag, className, text) { const node = document.createElement(tag); node.className = className; if (text !== undefined) node.textContent = text; return node; }
  function render() {
    const sorted = order.value === 'oldest' ? matches.slice().reverse() : matches;
    const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
    page = Math.min(page, pages - 1);
    const fragment = document.createDocumentFragment();
    let year = '';
    sorted.slice(page * pageSize, (page + 1) * pageSize).forEach(row => {
      if (row.year !== year) { year = row.year; fragment.appendChild(element('h2', 'year', year)); }
      const item = element('div', 'work-item');
      const anchor = element('a', 'row'); anchor.href = row.url;
      const time = element('time', '', row.date); time.dateTime = row.date;
      const name = element('span', 'entry-name'); name.appendChild(element('span', 'entry-title', row.title));
      anchor.append(time, name); item.appendChild(anchor); fragment.appendChild(item);
    });
    if (!sorted.length) fragment.appendChild(element('p', '', search.value.trim() ? '一致する日記はありません。' : 'まだ公開された日記はありません。'));
    list.replaceChildren(fragment);
    previous.disabled = page === 0 || loading; next.disabled = page >= pages - 1 || loading;
    pageLabel.textContent = `${page + 1} / ${pages}`;
    if (!loading) status.textContent = search.value.trim() ? `${matches.length}件が見つかりました（全${catalog.length}件）` : `全${catalog.length}件`;
  }
  // Serialize classic script loads so even a replaced query cannot mix chunks.
  let queue = Promise.resolve();
  function chunk(number) {
    const work = () => new Promise((resolve, reject) => {
      const script = document.createElement('script');
      let finished = false;
      function finish(error) {
        if (finished) return; finished = true; clearTimeout(timeout); script.remove();
        const data = window.AmicaSearchChunks && window.AmicaSearchChunks[number];
        if (window.AmicaSearchChunks) delete window.AmicaSearchChunks[number];
        if (error || !Array.isArray(data)) reject(error || new Error('data'));
        else resolve(data);
      }
      const timeout = setTimeout(() => finish(new Error('timeout')), 20000);
      script.onload = () => finish(); script.onerror = () => finish(new Error('load'));
      script.src = `assets/search-${number}.js`; document.head.appendChild(script);
    });
    const result = queue.then(work); queue = result.catch(() => {}); return result;
  }
  async function filter(ticket) {
    const terms = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
    if (!terms.length) { matches = catalog; loading = false; page = 0; render(); return; }
    loading = true; list.setAttribute('aria-busy', 'true'); previous.disabled = next.disabled = true;
    status.textContent = '本文を検索しています…';
    const ids = new Set();
    try {
      for (let number = 0; number < window.AmicaSearchChunkCount; number++) {
        if (ticket !== epoch) return;
        const data = await chunk(number);
        if (ticket !== epoch) return;
        for (const row of data) { const text = normalize(row.text); if (terms.every(term => text.includes(term))) ids.add(row.id); }
        status.textContent = `検索中… ${number + 1} / ${window.AmicaSearchChunkCount}`;
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      matches = catalog.filter(row => ids.has(row.id)); page = 0; loading = false; render();
    } catch (_) {
      if (ticket !== epoch) return;
      loading = false; matches = []; list.replaceChildren(); previous.disabled = next.disabled = true; pageLabel.textContent = '—';
      status.textContent = '検索データを読み込めませんでした。assetsフォルダも一緒にアップロードされているか確認してください。';
    } finally { if (ticket === epoch) list.setAttribute('aria-busy', 'false'); }
  }
  function schedule() {
    clearTimeout(timer); const ticket = ++epoch;
    if (!search.value.trim()) { loading = false; list.setAttribute('aria-busy','false'); filter(ticket); }
    else timer = setTimeout(() => filter(ticket), 300);
  }
  search.addEventListener('compositionstart', () => { composing = true; clearTimeout(timer); ++epoch; });
  search.addEventListener('compositionend', () => { composing = false; schedule(); });
  search.addEventListener('input', () => { if (!composing) schedule(); });
  document.getElementById('index-clear').addEventListener('click', () => { search.value = ''; composing = false; schedule(); search.focus(); });
  order.addEventListener('change', () => { page = 0; render(); });
  previous.addEventListener('click', () => { if (!loading && page > 0) { page--; render(); list.scrollIntoView({block:'start'}); } });
  next.addEventListener('click', () => { if (!loading && (page + 1) * pageSize < matches.length) { page++; render(); list.scrollIntoView({block:'start'}); } });
  const random = document.getElementById('index-random');
  random.disabled = catalog.length === 0;
  random.addEventListener('click', () => {
    if (!catalog.length) return;
    const item = catalog[Math.floor(Math.random() * catalog.length)];
    window.location.assign(item.url);
  });
  document.getElementById('index-controls').hidden = false;
  document.getElementById('index-pagination').hidden = false;
  render();
})();