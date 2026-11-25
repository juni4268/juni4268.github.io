// 섹션의 "기술 문서" 버튼: 같은 자리에서 요약 화면과 기술 문서 화면을 바꾼다.
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

for (const section of document.querySelectorAll(".project-section.has-doc")) {
  const toggle = section.querySelector(".doc-toggle");
  const summary = section.querySelector('[data-view="summary"]');
  const doc = section.querySelector('[data-view="doc"]');
  if (!toggle || !summary || !doc) continue;

  const swap = (showDoc) => {
    summary.hidden = showDoc;
    doc.hidden = !showDoc;
    toggle.setAttribute("aria-pressed", String(showDoc));
    toggle.textContent = showDoc ? "요약으로" : "기술 문서";
    if (showDoc) section.querySelector("video")?.pause();
  };

  toggle.addEventListener("click", () => {
    const showDoc = doc.hidden;
    if (!document.startViewTransition || reduceMotion.matches) { swap(showDoc); return; }

    // 바뀌는 섹션만 부드럽게 넘기고, 페이지의 나머지는 움직이지 않게 한다
    const root = document.documentElement;
    root.classList.add("is-swapping-section");
    section.style.viewTransitionName = "section-swap";
    const transition = document.startViewTransition(() => swap(showDoc));
    transition.finished.finally(() => {
      section.style.viewTransitionName = "";
      root.classList.remove("is-swapping-section");
    });
  });
}
