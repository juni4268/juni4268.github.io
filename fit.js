// 넓은 화면의 메인을 창 높이 한 장에 맞춘다.
// 내용이 창보다 길면 먼저 위아래 여백과 줄 사이 간격을 줄이고, 그래도 모자라면 대표 영상을 줄인다.
// 창이 충분히 높으면 아무것도 바꾸지 않는다.
const profile = document.querySelector(".portfolio-profile");
const stage = document.querySelector(".featured-stage");
const wide = window.matchMedia("(min-width: 80rem)");
const MIN_TOP = 14, MIN_BOTTOM = 12, MIN_GAP = 14, MIN_STAGE = 300; // 줄일 수 있는 한계(px)

function fit() {
  for (const name of ["padding-top", "padding-bottom", "row-gap", "min-height"]) profile.style.removeProperty(name);
  stage.style.removeProperty("max-width");
  if (!wide.matches) return;

  const natural = () => { profile.style.minHeight = "0"; const height = profile.getBoundingClientRect().height; profile.style.removeProperty("min-height"); return height; };
  let over = natural() - window.innerHeight;
  if (over <= 0) return;

  // 여백과 간격에서 줄일 수 있는 만큼을 같은 비율로 덜어낸다
  const style = getComputedStyle(profile);
  const top = parseFloat(style.paddingTop), bottom = parseFloat(style.paddingBottom), gap = parseFloat(style.rowGap);
  const room = [Math.max(0, top - MIN_TOP), Math.max(0, bottom - MIN_BOTTOM), Math.max(0, gap - MIN_GAP)];
  const total = room[0] + room[1] + room[2], share = total ? Math.min(1, over / total) : 0;
  profile.style.paddingTop = `${top - room[0] * share}px`;
  profile.style.paddingBottom = `${bottom - room[1] * share}px`;
  profile.style.rowGap = `${gap - room[2] * share}px`;

  // 그래도 넘치면 대표 영상의 너비를 줄인다(영상은 16:9라서 너비를 줄인 만큼의 9/16이 높이에서 빠진다)
  for (let tries = 0; tries < 4; tries++) {
    over = natural() - window.innerHeight;
    if (over <= .5) break;
    const width = stage.getBoundingClientRect().width;
    if (width <= MIN_STAGE) break;
    stage.style.maxWidth = `${Math.max(MIN_STAGE, width - over * 16 / 9 - 1)}px`;
  }
}

if (profile && stage) {
  let applying = false;
  const run = () => {
    if (applying) return;
    applying = true;
    fit();
    window.dispatchEvent(new Event("resize")); // 배경 그림(grain.js)이 바뀐 배치에 다시 맞추게 한다
    applying = false;
  };
  fit();
  window.addEventListener("resize", () => { if (!applying) run(); });
  document.fonts?.ready.then(run);
}
