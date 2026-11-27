// 아래 메뉴가 본문과 영상 조작 막대를 가리지 않도록, 아래로 스크롤하면 숨기고 위로 스크롤하면 다시 보여준다.
const dock = document.querySelector(".portfolio-dock");
const toggle = document.querySelector(".theme-toggle");
let last = window.scrollY;
// 좁은 화면에서는 페이지 맨 위에 있을 때 메뉴를 숨긴다. 첫 화면의 내용을 가리지 않기 위해서다.
const narrow = window.matchMedia("(max-width: 680px)");
const hideAtTop = () => narrow.matches && window.scrollY < 80;

if (dock) {
  dock.classList.toggle("is-away", hideAtTop());
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    if (Math.abs(y - last) < 8) return;
    const down = y > last && y > 120;
    dock.classList.toggle("is-away", down || hideAtTop());
    toggle?.classList.toggle("is-away", down);
    last = y;
  }, { passive: true });
}

// 밝은 화면 / 어두운 화면 전환. 기본은 어두운 화면이고, 고른 값은 이 브라우저에 기억해 둔다.
const root = document.documentElement;
const themeColor = document.querySelector('meta[name="theme-color"]');

function showTheme() {
  const light = root.dataset.theme === "light";
  // 버튼 그림(해, 달)은 CSS가 테마에 맞춰 바꾼다. 여기서는 읽어 주는 이름만 맞춘다.
  toggle?.setAttribute("aria-label", light ? "어두운 화면으로 전환" : "밝은 화면으로 전환");
  themeColor?.setAttribute("content", light ? "#f6f5f1" : "#131417");
}

toggle?.addEventListener("click", () => {
  const light = root.dataset.theme !== "light";
  if (light) root.dataset.theme = "light";
  else delete root.dataset.theme;
  try { localStorage.setItem("theme", light ? "light" : "dark"); } catch (error) { /* 저장이 막힌 브라우저에서는 이번 방문에만 적용된다 */ }
  showTheme();
});

showTheme();

// 메인의 이메일 주소: 누르면 주소를 복사한다.
// 메일 프로그램이 없는 컴퓨터에서는 mailto 링크가 빈 창만 열기 때문이다. 복사할 수 없는 브라우저에서는 원래대로 mailto로 넘어간다.
const mail = document.querySelector('.profile-contact a[href^="mailto:"]');
const mailLabel = mail?.querySelector("span");

if (mail && mailLabel && navigator.clipboard) {
  const original = mailLabel.textContent;
  let timer;
  mail.addEventListener("click", event => {
    event.preventDefault();
    navigator.clipboard.writeText(mail.href.replace("mailto:", "")).then(() => {
      mailLabel.textContent = "복사됨";
      mail.classList.add("is-copied");
      clearTimeout(timer);
      timer = setTimeout(() => {
        mailLabel.textContent = original;
        mail.classList.remove("is-copied");
      }, 1800);
    }).catch(() => { window.location.href = mail.href; });
  });
}
