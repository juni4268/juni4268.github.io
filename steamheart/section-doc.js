const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// Elements after the section in document order; they slide to their new position during the swap.
const following = (section) => {
  const list = [];
  for (let node = section; node && node !== document.body; node = node.parentElement)
    for (let next = node.nextElementSibling; next; next = next.nextElementSibling)
      if (next.tagName !== "SCRIPT") list.push(next);
  return list.filter((el) => getComputedStyle(el).position !== "fixed");
};

for (const section of document.querySelectorAll(".project-section.has-doc")) {
  const toggle = section.querySelector(".doc-toggle");
  const summary = section.querySelector('[data-view="summary"]');
  const doc = section.querySelector('[data-view="doc"]');
  if (!toggle || !summary || !doc) continue;

  const swap = (showDoc) => {
    summary.hidden = showDoc;
    doc.hidden = !showDoc;
    section.classList.toggle("is-doc", showDoc);
    toggle.setAttribute("aria-pressed", String(showDoc));
    toggle.textContent = showDoc ? "요약으로" : "기술 문서";
    if (showDoc) section.querySelector("video")?.pause();
    if (section.getBoundingClientRect().top < 0) section.scrollIntoView({ block: "start", behavior: "instant" });
  };

  toggle.addEventListener("click", () => {
    const showDoc = doc.hidden;
    if (!document.startViewTransition || reduceMotion.matches) { swap(showDoc); return; }
    const root = document.documentElement;
    const moved = following(section);
    root.classList.add("is-swapping-section");
    section.style.viewTransitionName = "section-swap";
    moved.forEach((el, i) => { el.style.viewTransitionName = `section-after-${i}`; });
    const transition = document.startViewTransition(() => swap(showDoc));
    transition.finished.finally(() => {
      section.style.viewTransitionName = "";
      moved.forEach((el) => { el.style.viewTransitionName = ""; });
      root.classList.remove("is-swapping-section");
    });
  });
}
