// 아래 메뉴가 본문과 영상 조작 막대를 가리지 않도록, 아래로 스크롤하면 숨기고 위로 스크롤하면 다시 보여준다.
const dock = document.querySelector(".portfolio-dock");
let last = window.scrollY;

if (dock) {
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    if (Math.abs(y - last) < 8) return;
    dock.classList.toggle("is-away", y > last && y > 120);
    last = y;
  }, { passive: true });
}
