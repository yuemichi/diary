(function () {
  'use strict';
  const catalog = window.AmicaFragments;
  const status = document.getElementById('fragments-status');
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!Array.isArray(catalog) || !catalog.every(row => row && typeof row.id === 'string' && uuid.test(row.id) && typeof row.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.day) && typeof row.text === 'string' && typeof row.html === 'string' && Array.isArray(row.tags) && row.tags.every(tag => typeof tag === 'string'))) {
    status.textContent = '検索データを読み込めませんでした。assetsフォルダも一緒にアップロードしてください。';
    return;
  }
  const list = document.getElementById('fragments-results');
  const search = document.getElementById('fragments-search');
  const tagList = document.getElementById('fragments-tags');
  const previous = document.getElementById('fragments-prev');
  const next = document.getElementById('fragments-next');
  const pageLabel = document.getElementById('fragments-page');
  const pageSize = 100;
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase('ja');
  const indexed = catalog.map(row => ({row, searchable: normalize(row.text)}));
  function matchingRows(query, tag) {
    const terms = normalize(query.trim()).split(/\s+/).filter(Boolean);
    return indexed.filter(item => (!tag || item.row.tags.includes(tag)) && terms.every(term => item.searchable.includes(term))).map(item => item.row);
  }
  const counts = new Map();
  catalog.forEach(row => new Set(row.tags).forEach(tag => counts.set(tag, (counts.get(tag) || 0) + 1)));
  const tags = Array.from(counts.keys()).sort((a,b) => a.localeCompare(b, 'ja'));
  let selectedTag = '', page = 0, matches = catalog;
  const positions = new Map(catalog.map((row, index) => [row.id.toLowerCase(), index]));
  let timer, composing = false;
  const tagButtons = new Map();
  function addTagButton(tag, label) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = label;
    button.addEventListener('click', () => selectTag(tag));
    tagList.appendChild(button); tagButtons.set(tag, button);
  }
  addTagButton('', 'すべて');
  tags.forEach(tag => addTagButton(tag, `${tag} (${counts.get(tag)})`));
  function updateURL(clearTarget) {
    const url = new URL(window.location.href);
    if (clearTarget) url.hash = '';
    if (search.value) url.searchParams.set('q', search.value); else url.searchParams.delete('q');
    if (selectedTag) url.searchParams.set('tag', selectedTag); else url.searchParams.delete('tag');
    url.searchParams.set('page', String(page + 1));
    try { window.history.replaceState(null, '', url); } catch (_) { /* Some file:// browsers disallow this. */ }
  }
  function render(clearTarget = false) {
    const pages = Math.max(1, Math.ceil(matches.length / pageSize));
    page = Math.min(page, pages - 1);
    // Exported HTML contains escaped text and validated links, never raw user HTML.
    let currentDay = '';
    list.innerHTML = matches.slice(page * pageSize, (page + 1) * pageSize).map(row => {
      let heading = '';
      if (row.day !== currentDay) {
        currentDay = row.day;
        heading = `<h2 class="year fragment-day"><time datetime="${row.day}">${row.day}</time></h2>`;
      }
      return heading + row.html;
    }).join('');
    if (!matches.length) {
      const empty = document.createElement('p');
      empty.textContent = search.value.trim() || selectedTag ? '一致する断片はありません。' : 'まだ公開された断片はありません。';
      list.appendChild(empty);
    }
    tagButtons.forEach((button, tag) => button.setAttribute('aria-pressed', String(tag === selectedTag)));
    previous.disabled = page === 0; next.disabled = page === pages - 1;
    pageLabel.textContent = `${page + 1} / ${pages}`;
    status.textContent = search.value.trim() || selectedTag ? `${matches.length}件が見つかりました（全${catalog.length}件）` : `全${catalog.length}件`;
    updateURL(clearTarget);
  }
  function readLocation() {
    clearTimeout(timer); composing = false;
    const params = new URLSearchParams(window.location.search);
    search.value = params.get('q') || '';
    selectedTag = params.get('tag') || '';
    if (selectedTag && !tagButtons.has(selectedTag)) addTagButton(selectedTag, `${selectedTag} (0)`);
    page = Number.parseInt(params.get('page') || ((search.value || selectedTag) ? '1' : list.dataset.page), 10) - 1;
    if (!Number.isFinite(page) || page < 0) page = 0;
    matches = matchingRows(search.value, selectedTag);
    const hash = window.location.hash;
    const rawID = hash.startsWith('#fragment-') ? hash.slice(10) : '';
    const targetID = uuid.test(rawID) ? rawID.toLowerCase() : '';
    const targetPosition = positions.get(targetID);
    if (targetID) {
      // A permanent ID takes priority over old page numbers and filter parameters.
      search.value = ''; selectedTag = ''; matches = catalog;
      page = targetPosition === undefined ? 0 : Math.floor(targetPosition / pageSize);
    }
    render();
    if (!targetID) return;
    const target = document.getElementById('fragment-' + targetID);
    if (targetPosition === undefined || !target) {
      status.textContent = '指定された断片は見つかりません。非公開または削除された可能性があります。';
      return;
    }
    target.classList.add('is-target');
    target.focus({preventScroll: true});
    target.scrollIntoView({block: 'start'});
  }
  function filter() { matches = matchingRows(search.value, selectedTag); page = 0; render(true); }
  function selectTag(tag) {
    clearTimeout(timer); selectedTag = tag;
    if (tag && !tagButtons.has(tag)) addTagButton(tag, `${tag} (${counts.get(tag) || 0})`);
    filter();
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(filter, 200); }
  search.addEventListener('compositionstart', () => { composing = true; clearTimeout(timer); });
  search.addEventListener('compositionend', () => { composing = false; schedule(); });
  search.addEventListener('input', () => { if (!composing) schedule(); });
  document.getElementById('fragments-clear').addEventListener('click', () => {
    clearTimeout(timer); search.value = ''; selectedTag = ''; composing = false; filter(); search.focus();
  });
  // Some file:// browsers cannot replace the hash after filtering. Following
  // the same URL again must still restore its target, even without hashchange.
  list.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest('a[href]');
    if (!anchor || (anchor.target && anchor.target !== '_self')) return;
    const url = new URL(anchor.href, window.location.href);
    if (url.href === window.location.href && url.hash.startsWith('#fragment-') && uuid.test(url.hash.slice(10))) {
      event.preventDefault(); readLocation();
    }
  });
  previous.addEventListener('click', () => { if (page > 0) { page--; render(true); list.scrollIntoView({block:'start'}); } });
  next.addEventListener('click', () => { if ((page + 1) * pageSize < matches.length) { page++; render(true); list.scrollIntoView({block:'start'}); } });
  document.getElementById('fragments-controls').hidden = false;
  tagList.hidden = false;
  document.getElementById('fragments-pagination').hidden = false;
  document.getElementById('fragments-static-pages').hidden = true;
  window.addEventListener('hashchange', readLocation);
  window.addEventListener('popstate', readLocation);
  readLocation();
})();