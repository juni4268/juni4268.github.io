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
  themeColor?.setAttribute("content", light ? "#f4f5f8" : "#111318");
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

// 작품 상세의 따라오는 위쪽 메뉴: 메뉴 높이를 CSS에 알려 주고, 지금 읽는 섹션의 목차 항목에 표시한다.
const head = document.querySelector(".portfolio-detail-page .site-head");
const sectionLinks = [...(head?.querySelectorAll('nav a[href^="#"]') ?? [])];
const sections = sectionLinks.map(link => document.getElementById(link.getAttribute("href").slice(1)));

if (head && sectionLinks.length) {
  const nav = head.querySelector("nav");
  const hero = document.querySelector(".project-hero");
  const measure = () => {
    root.style.setProperty("--head-h", `${Math.round(head.getBoundingClientRect().height)}px`);
    // 맨 위 작품 모양(portfolio.css)이 화면 폭에 맞춰 자리 잡는 데 쓰는 값
    if (hero) {
      const box = hero.getBoundingClientRect();
      hero.style.setProperty("--hero-left", `${box.left}px`);
      hero.style.setProperty("--hero-w", `${box.width}px`);
      hero.style.setProperty("--hero-h", `${box.height}px`);
      hero.style.setProperty("--hero-vw", `${root.clientWidth}px`);
    }
  };
  let marked = -1;
  const mark = () => {
    // 화면 위에서 40% 지점을 지난 섹션 가운데 가장 아래 것이 지금 읽는 섹션이다.
    // 페이지 맨 아래에 닿으면 마지막 섹션으로 친다(짧은 마지막 섹션은 그 지점까지 올라오지 못하므로).
    const line = Math.max(head.getBoundingClientRect().bottom + 24, window.innerHeight * .4);
    let current = -1;
    sections.forEach((section, index) => { if (section && section.getBoundingClientRect().top <= line) current = index; });
    if (window.scrollY + window.innerHeight >= root.scrollHeight - 4) current = sections.length - 1;
    if (current === marked) return;
    marked = current;
    sectionLinks.forEach((link, index) => {
      if (index === current) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
    // 좁은 화면에서는 목차가 옆으로 길어서, 표시된 항목이 보이도록 목차만 옆으로 민다
    const link = sectionLinks[current];
    if (link && nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: link.offsetLeft - nav.offsetLeft - 16, behavior: "smooth" });
  };
  measure(); mark();
  window.addEventListener("resize", () => { measure(); mark(); });
  window.addEventListener("scroll", mark, { passive: true });
  document.fonts?.ready.then(() => { measure(); mark(); });
}
