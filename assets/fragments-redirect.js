(function () {
  'use strict';
  const destination = new URL('fragments/index.html', window.location.href);
  destination.search = window.location.search;
  destination.hash = window.location.hash;
  const link = document.getElementById('fragments-destination');
  if (link) link.href = destination.href;
  // Replace keeps Back from returning to the old entrance in a loop.
  try { window.location.replace(destination.href); } catch (_) { /* The link remains usable. */ }
})();