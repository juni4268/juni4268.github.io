const video = document.querySelector("#boss-pattern-video");
const caption = document.querySelector("#boss-pattern-caption");
const reset = document.querySelector(".boss-pattern-reset");
const full = {
  src: video.querySelector("source").getAttribute("src"),
  caption: caption.textContent,
  label: video.getAttribute("aria-label"),
};
let selectedButton;

for (const button of document.querySelectorAll(".boss-pattern-play")) {
  button.addEventListener("click", () => {
    selectedButton?.setAttribute("aria-pressed", "false");
    selectedButton = button;
    button.setAttribute("aria-pressed", "true");

    const title = `${button.textContent.trim()} 플레이 영상`;
    caption.textContent = `${title} · 반복 재생 · 무음`;
    video.setAttribute("aria-label", `${title}, 무음`);
    video.loop = true;
    video.src = button.dataset.clip;
    reset.hidden = false;
    video.play().catch((error) => {
      if (selectedButton === button && error.name !== "AbortError" && error.name !== "NotAllowedError") {
        caption.textContent = `${title}을 재생할 수 없습니다.`;
      }
    });

    const bounds = video.getBoundingClientRect();
    if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      video.scrollIntoView({ block: "center", behavior: reduceMotion ? "instant" : "smooth" });
    }
  });
}

reset.addEventListener("click", () => {
  selectedButton?.setAttribute("aria-pressed", "false");
  selectedButton = undefined;
  video.loop = false;
  video.src = full.src;
  video.setAttribute("aria-label", full.label);
  caption.textContent = full.caption;
  reset.hidden = true;
});
