// 메인 배경의 입자 그림: 고른 작품에 맞는 모양을 점으로 그린다.
// 작품을 바꾸면 점들이 별처럼 흩어졌다가 새 모양으로 모인다.
// 모양은 화면 가운데에 크게 놓는다.
// 넓은 화면에서만 켠다. 이 스크립트가 없거나 실패하면 기존의 단색 도형이 그대로 보인다.
const host = document.querySelector(".portfolio-profile");
const stage = document.querySelector(".featured-stage");
const tabs = [...document.querySelectorAll(".featured-more a[data-work]")];
const wide = window.matchMedia("(min-width: 80rem)");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// 모양 그림은 437x260칸이고 모양의 중심이 (257, 84)칸에 있다. 한 칸은 대표 영상 너비의 1/104이다.
const MAP_W = 437, MAP_H = 260, VIDEO_X = 257, VIDEO_Y = 84, VIDEO_W = 156;
const BAYER = [0,32,8,40,2,34,10,42,48,16,56,24,50,18,58,26,12,44,4,36,14,46,6,38,60,28,52,20,62,30,54,22,
  3,35,11,43,1,33,9,41,51,19,59,27,49,17,57,25,15,47,7,39,13,45,5,37,63,31,55,23,61,29,53,21];
const MOVE = 600, MOVE_LAG = 160; // 밀리초: 점이 새 자리로 가는 시간, 점마다 출발을 늦추는 최대 폭

let seed = 1;
const random = () => (seed = seed * 16807 % 2147483647) / 2147483647;
const settle = u => 1 - (1 - u) ** 2.4; // 바로 출발해서 끝에서 천천히 자리에 앉는다
const clamp01 = u => Math.min(1, Math.max(0, u));

async function loadShape(slug) {
  const image = new Image();
  image.src = `./assets/grain/${slug}.png?v=3`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = MAP_W; canvas.height = MAP_H;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const data = context.getImageData(0, 0, MAP_W, MAP_H).data;
  const points = [];
  // 밝기를 점의 밀도로 바꾼다(규칙 무늬에 불규칙을 조금 섞은 문턱값)
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const threshold = (BAYER[(y & 7) * 8 + (x & 7)] + .5) / 64 * .7 + random() * .3;
    if (data[(y * MAP_W + x) * 4] / 255 > threshold) points.push(x, y);
  }
  // 점의 순서를 섞어 두어야 모양이 바뀔 때 점들이 고르게 흩어진다
  for (let i = points.length / 2 - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [points[i * 2], points[j * 2]] = [points[j * 2], points[i * 2]];
    [points[i * 2 + 1], points[j * 2 + 1]] = [points[j * 2 + 1], points[i * 2 + 1]];
  }
  return Float32Array.from(points);
}

// 별 자리: 작품 영역 안에서 몇 군데 뭉치게, 영상 뒤는 비운다
function makeStars() {
  const clusters = [[190, 30, 60, 26], [330, 40, 70, 30], [395, 150, 40, 50], [250, 205, 90, 22], [170, 150, 26, 40]];
  const spread = () => random() + random() + random() + random() - 2;
  const stars = [];
  while (stars.length < 150) {
    let x, y;
    if (random() < .75) { const c = clusters[Math.floor(random() * clusters.length)]; x = c[0] + spread() * c[2]; y = c[1] + spread() * c[3]; }
    else { x = 165 + random() * 270; y = random() * 215; }
    if (x < 160 || x > 435 || y < 2 || y > 218) continue;
    if (x > 176 && x < 338 && y > 38 && y < 130) continue;
    stars.push({ x, y, size: random() });
  }
  return stars;
}

async function start() {
  const slugs = tabs.map(tab => tab.dataset.work);
  const shapes = Object.fromEntries(await Promise.all(slugs.map(async slug => [slug, await loadShape(slug)])));
  const stars = makeStars();

  const canvas = document.createElement("canvas");
  canvas.className = "profile-grain";
  canvas.setAttribute("aria-hidden", "true");
  host.prepend(canvas);
  const context = canvas.getContext("2d");

  let color = [42, 54, 82];
  let offsetX = 0, offsetY = 0;   // 모양 그림의 칸을 캔버스의 칸으로 옮기는 값
  let current = new Float32Array(0); // 지금 그려진 점들의 위치(모양 그림의 칸 기준)
  let frame = 0;

  function readColor() {
    const value = getComputedStyle(host).getPropertyValue("--grain").trim();
    const match = /^#([0-9a-f]{6})$/i.exec(value);
    if (match) color = [0, 2, 4].map(i => parseInt(match[1].slice(i, i + 2), 16));
  }

  // 캔버스의 한 칸 크기를 영상 너비에 맞춰 정하고, 모양의 중심을 화면 가운데(조금 아래)에 둔다
  function layout() {
    const box = host.getBoundingClientRect();
    const video = stage.getBoundingClientRect();
    const cell = video.width / VIDEO_W * 1.5;
    canvas.width = Math.ceil(box.width / cell);
    canvas.height = Math.ceil(box.height / cell);
    offsetX = Math.round(box.width * .5 / cell) - VIDEO_X;
    offsetY = Math.round(box.height * .52 / cell) - VIDEO_Y;
  }

  function paint(points, count, starGlow = 0) {
    const { width, height } = canvas;
    const image = context.createImageData(width, height);
    const pixels = image.data;
    const put = (x, y) => {
      x = Math.round(x) + offsetX; y = Math.round(y) + offsetY;
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const i = (y * width + x) * 4;
      pixels[i] = color[0]; pixels[i + 1] = color[1]; pixels[i + 2] = color[2]; pixels[i + 3] = 255;
    };
    for (let i = 0; i < count; i++) put(points[i * 2], points[i * 2 + 1]);
    if (starGlow > 0) for (const star of stars) {
      if (star.size > .55) { put(star.x + 1, star.y); put(star.x, star.y + 1); put(star.x + 1, star.y + 1); }
      if (star.size > .86 && starGlow > .5) { put(star.x - 1, star.y); put(star.x + 2, star.y); put(star.x, star.y - 1); put(star.x, star.y + 2); }
    }
    context.putImageData(image, 0, 0);
  }

  function show(slug, animate) {
    const target = shapes[slug];
    if (!target) return;
    cancelAnimationFrame(frame);
    if (!animate || reduceMotion.matches) { current = target; paint(current, current.length / 2); return; }

    const from = current, fromCount = from.length / 2, toCount = target.length / 2;
    const count = Math.max(fromCount, toCount, 1);
    const moving = new Float32Array(count * 2);
    const began = performance.now();

    // 점 하나하나가 지금 자리에서 새 모양의 자리로 곧장 날아간다.
    // 두 모양의 점 개수가 다르면, 남는 점은 다른 점과 같은 자리로 겹쳐 들어가고 모자란 점은 겹쳐 있던 자리에서 갈라져 나온다.
    const step = now => {
      const time = now - began;
      for (let i = 0; i < count; i++) {
        const a = fromCount ? (i % fromCount) * 2 : (i % toCount) * 2, b = (i % toCount) * 2;
        const source = fromCount ? from : target;
        const lag = ((i * 2654435761) >>> 0) / 4294967296; // 점마다 조금씩 다른 출발 시간
        const u = settle(clamp01((time - lag * MOVE_LAG) / (MOVE - MOVE_LAG)));
        moving[i * 2] = source[a] + (target[b] - source[a]) * u;
        moving[i * 2 + 1] = source[a + 1] + (target[b + 1] - source[a + 1]) * u;
      }
      paint(moving, count);
      current = moving;
      if (time < MOVE) frame = requestAnimationFrame(step);
      else { current = target; paint(current, toCount); }
    };
    frame = requestAnimationFrame(step);
  }

  const activeSlug = () => (tabs.find(tab => tab.hasAttribute("aria-current")) ?? tabs[0]).dataset.work;
  let shown = activeSlug();

  function enable() {
    host.classList.add("has-grain");
    readColor(); layout(); show(shown, false);
  }
  function disable() { cancelAnimationFrame(frame); host.classList.remove("has-grain"); }

  // 작품 목록의 선택 표시가 바뀌면 모양도 바꾼다
  new MutationObserver(() => {
    const slug = activeSlug();
    if (slug === shown) return;
    shown = slug;
    if (wide.matches) show(slug, true);
  }).observe(document.querySelector(".featured-more"), { attributes: true, subtree: true, attributeFilter: ["aria-current"] });

  // 테마가 바뀌면 점의 색을 다시 읽는다
  new MutationObserver(() => { if (wide.matches) { readColor(); show(shown, false); } })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (wide.matches) { layout(); show(shown, false); } }, 120);
  });
  wide.addEventListener("change", () => (wide.matches ? enable() : disable()));
  if (wide.matches) enable();
}

if (host && stage && tabs.length) start().catch(() => host.classList.remove("has-grain"));
