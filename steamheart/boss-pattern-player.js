// 패턴 표: 패턴 이름을 누르면 같은 섹션의 영상이 그 패턴 영상으로 바뀌어 반복 재생된다.
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// 움직임 줄이기를 켠 사용자에게는 자동 재생 영상을 멈춘다
if (reduceMotion.matches) {
  for (const auto of document.querySelectorAll("video[autoplay]")) { auto.removeAttribute("autoplay"); auto.pause(); }
}

for (const section of document.querySelectorAll(".project-section")) {
  const video = section.querySelector("[data-pattern-video]");
  const caption = section.querySelector("[data-pattern-caption]");
  const reset = section.querySelector(".boss-pattern-reset");
  const buttons = section.querySelectorAll(".boss-pattern-play");
  if (!video || !caption || !reset || !buttons.length) continue;

  const full = {
    src: video.querySelector("source").getAttribute("src"),
    caption: caption.textContent,
    label: video.getAttribute("aria-label"),
  };
  let selectedButton;

  for (const button of buttons) {
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
        video.scrollIntoView({ block: "center", behavior: reduceMotion.matches ? "instant" : "smooth" });
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
}
