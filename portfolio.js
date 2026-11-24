const filters = document.querySelector('[data-project-filters]');

if (filters) {
  const buttons = [...filters.querySelectorAll('button[data-engine]')];
  const cards = [...document.querySelectorAll('li[data-engine]')];
  const count = document.querySelector('[data-project-count]');
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  const initial = new URL(location.href).searchParams.get('engine');

  function filterProjects(engine, animate) {
    let visible = 0;
    for (const card of cards) {
      card.hidden = engine !== 'all' && card.dataset.engine !== engine;
      if (card.hidden) continue;

      if (animate && motion.matches) {
        card.getAnimations().forEach(animation => animation.cancel());
        card.animate(
          [{ opacity: .4, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
          { duration: 270, delay: Math.min(visible, 5) * 40, easing: 'ease-out', fill: 'backwards' }
        );
      }
      visible += 1;
    }

    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button.dataset.engine === engine));
    }
    count.textContent = '작품 ' + visible + '개';
  }

  filterProjects(buttons.some(button => button.dataset.engine === initial) ? initial : 'all', false);
  filters.hidden = false;
  filters.addEventListener('click', event => {
    const button = event.target.closest('button[data-engine]');
    if (!button || button.getAttribute('aria-pressed') === 'true') return;

    const engine = button.dataset.engine;
    const url = new URL(location.href);
    if (engine === 'all') url.searchParams.delete('engine');
    else url.searchParams.set('engine', engine);
    history.replaceState(null, '', url);
    filterProjects(engine, true);
  });
}

const backLinks = document.querySelectorAll('a[data-work-list]');
if (backLinks.length && document.referrer) {
  const list = new URL(backLinks[0].href);
  const previous = new URL(document.referrer);

  // Preserve the selected filter when the visitor arrived from the works listing.
  if (previous.origin === list.origin && previous.pathname === list.pathname && previous.searchParams.has('engine')) {
    list.searchParams.set('engine', previous.searchParams.get('engine'));
    for (const link of backLinks) link.href = list.href;
  }
}
