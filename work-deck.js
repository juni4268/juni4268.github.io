// 메인의 참여 작품 카드: 목록에서 작품을 고르면 카드가 바뀐다.
// 마우스는 올리면 선택되고 누르면 그 작품으로 이동한다. 터치는 한 번 누르면 선택, 선택된 것을 다시 누르면 이동한다.
// 이 스크립트가 없어도 목록과 카드는 각 작품 페이지로 가는 링크로 동작한다.
const stage = document.querySelector(".featured-stage");
const tilt = stage?.querySelector(".featured-tilt");
const cards = [...(tilt?.querySelectorAll(".featured-card") ?? [])];
const tabs = [...document.querySelectorAll(".featured-more a[data-work]")];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let active = Math.max(0, cards.findIndex(card => card.classList.contains("is-active")));

function playActive() {
  cards.forEach((card, index) => {
    const video = card.querySelector("video");
    if (!video) return;
    if (index === active && !reduceMotion.matches) video.play().catch(() => {});
    else video.pause();
  });
}

function select(index) {
  if (index === active || !cards[index]) return;
  cards[active].classList.remove("is-active");
  cards[active].inert = true;
  tabs[active]?.removeAttribute("aria-current");
  active = index;
  cards[active].inert = false;
  cards[active].classList.add("is-active");
  tabs[active]?.setAttribute("aria-current", "true");
  playActive();
  browse();
}

// 작품을 연달아 빠르게 넘기는 동안에는 영상을 덮개로 가리고 작품 이름만 바꿔 보여 준다.
// 넘기기를 멈추면 덮개를 걷고, 고른 작품의 영상이 펼쳐진다. (배경 그림이 고리로 모였다가 모양을 잡는 것과 같은 박자)
const cover = document.createElement("span");
cover.className = "featured-cover";
cover.setAttribute("aria-hidden", "true");
let lastSelect = -Infinity, settleTimer = 0;

function browse() {
  const now = performance.now(), quick = now - lastSelect < 450;
  lastSelect = now;
  if (reduceMotion.matches || !(quick || stage.classList.contains("is-browsing"))) return;
  cover.textContent = cards[active].querySelector("strong")?.textContent ?? "";
  stage.classList.add("is-browsing");
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => {
    // 덮개를 걷을 때 영상만 다시 펼치고, 이미 보이던 글은 다시 올라오지 않게 잠깐 표시해 둔다
    stage.classList.add("is-settling");
    stage.classList.remove("is-browsing");
    setTimeout(() => stage.classList.remove("is-settling"), 700);
  }, 170);
}

if (stage && cards.length) {
  tilt.append(cover);
  cards.forEach((card, index) => { card.inert = index !== active; });
  tabs.forEach((tab, index) => {
    tab.addEventListener("pointerenter", event => { if (event.pointerType === "mouse") select(index); });
    // 누르는 순간 포커스가 먼저 옮겨져 선택되므로, 누르기 전에 선택돼 있었는지를 따로 기억한다
    let pressedWhileInactive = false;
    tab.addEventListener("pointerdown", () => { pressedWhileInactive = index !== active; });
    tab.addEventListener("focus", () => select(index));
    tab.addEventListener("click", event => {
      if (pressedWhileInactive) { event.preventDefault(); select(index); }
      pressedWhileInactive = false;
    });
  });

  // 마우스 위치에 따라 카드를 살짝 기울인다
  stage.addEventListener("pointermove", event => {
    if (event.pointerType !== "mouse" || reduceMotion.matches) return;
    const box = stage.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - .5;
    const y = (event.clientY - box.top) / box.height - .5;
    tilt.style.setProperty("--tilt-y", (x * 5).toFixed(2) + "deg");
    tilt.style.setProperty("--tilt-x", (-y * 4).toFixed(2) + "deg");
  });
  stage.addEventListener("pointerleave", () => {
    tilt.style.removeProperty("--tilt-x");
    tilt.style.removeProperty("--tilt-y");
  });

  playActive();
}
