(() => {
  const list = document.querySelector('.tales-list');
  if (!list) return;
  const stories = list.querySelectorAll('details');
  // Older browsers support details without implementing named groups.
  list.addEventListener('click', event => {
    const heading = event.target.closest('summary');
    if (!heading || heading.parentElement.open) return;
    for (const other of stories) {
      if (other !== heading.parentElement && other.open) other.open = false;
    }
  });
  function openLinkedStory() {
    const story = document.getElementById(location.hash.slice(1));
    if (story && story.matches('.tales-list > details')) {
      for (const other of stories) other.open = other === story;
      story.scrollIntoView({block:'start'});
    }
  }
  openLinkedStory();
  window.addEventListener('hashchange', openLinkedStory);
})();