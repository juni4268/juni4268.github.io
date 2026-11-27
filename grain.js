// 메인 배경의 입자 그림: 고른 작품에 맞는 모양을 점으로 그린다.
// 모양의 중심은 이름과 대표 영상 사이에 두고, 글자가 있는 자리와 중심에서 먼 곳은 점을 덜어낸다.
// 작품을 바꾸면 점들이 새 모양의 자리로 곧장 이동한다.
// 넓은 화면에서만 켠다. 이 스크립트가 없거나 실패하면 기존의 단색 도형이 그대로 보인다.
const host = document.querySelector(".portfolio-profile");
const stage = document.querySelector(".featured-stage");
const identity = document.querySelector(".profile-identity");
const tabs = [...document.querySelectorAll(".featured-more a[data-work]")];
const wide = window.matchMedia("(min-width: 80rem)");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// 모양 그림은 480x270칸이고 모양의 중심이 (176, 100)칸에 있다. 한 칸은 대표 영상 너비의 1/156이다.
const MAP_W = 480, MAP_H = 270, CENTER_X = 176, CENTER_Y = 100, VIDEO_W = 156;
// 작은 글자가 있는 자리: 이 요소들 뒤는 점을 덜어낸다 (큰 이름은 점 위에서도 잘 읽혀서 뺐다)
const QUIET = ".profile-tagline, .profile-contact, .featured-copy, .featured-more, .profile-education, .profile-skills, #featured-title";
const QUIET_LEVEL = .4;
const BAYER = [0,32,8,40,2,34,10,42,48,16,56,24,50,18,58,26,12,44,4,36,14,46,6,38,60,28,52,20,62,30,54,22,
  3,35,11,43,1,33,9,41,51,19,59,27,49,17,57,25,15,47,7,39,13,45,5,37,63,31,55,23,61,29,53,21];
const MOVE = 600, MOVE_LAG = 160; // 밀리초: 점이 새 자리로 가는 시간, 점마다 출발을 늦추는 최대 폭

let seed = 1;
const random = () => (seed = seed * 16807 % 2147483647) / 2147483647;
const settle = u => 1 - (1 - u) ** 2.4; // 바로 출발해서 끝에서 천천히 자리에 앉는다
const clamp01 = u => Math.min(1, Math.max(0, u));

async function loadShape(slug) {
  const image = new Image();
  image.src = `./assets/grain/${slug}.png?v=2`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = MAP_W; canvas.height = MAP_H;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const data = context.getImageData(0, 0, MAP_W, MAP_H).data;
  const levels = new Float32Array(MAP_W * MAP_H);
  for (let i = 0; i < levels.length; i++) levels[i] = data[i * 4] / 255;
  return levels;
}

// 밝기를 점의 밀도로 바꾼다(규칙 무늬에 불규칙을 조금 섞은 문턱값). dim은 칸마다 밀도를 줄이는 비율이다.
function toPoints(levels, dim) {
  seed = 7;
  const points = [];
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const threshold = (BAYER[(y & 7) * 8 + (x & 7)] + .5) / 64 * .7 + random() * .3;
    if (levels[y * MAP_W + x] * dim(x, y) > threshold) points.push(x, y);
  }
  // 점의 순서를 섞어 두어야 모양이 바뀔 때 점들이 고르게 흩어진다
  for (let i = points.length / 2 - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [points[i * 2], points[j * 2]] = [points[j * 2], points[i * 2]];
    [points[i * 2 + 1], points[j * 2 + 1]] = [points[j * 2 + 1], points[i * 2 + 1]];
  }
  return Float32Array.from(points);
}

async function start() {
  const slugs = tabs.map(tab => tab.dataset.work);
  const levels = Object.fromEntries(await Promise.all(slugs.map(async slug => [slug, await loadShape(slug)])));
  let shapes = {}; // 지금 화면 배치에 맞춰 만든 작품별 점 목록

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

  // 캔버스의 한 칸 크기를 영상 너비에 맞추고, 모양의 중심을 이름과 영상 사이에 둔다.
  // 화면 배치가 정해지면 글자 자리와 먼 곳을 덜어낸 점 목록을 작품마다 다시 만든다.
  function layout() {
    const box = host.getBoundingClientRect();
    const video = stage.getBoundingClientRect();
    const name = identity.getBoundingClientRect();
    const cell = video.width / VIDEO_W;
    canvas.width = Math.ceil(box.width / cell);
    canvas.height = Math.ceil(box.height / cell);
    const centerX = ((name.right + video.left) / 2 - box.left) / cell;
    const centerY = (video.top - box.top + video.width * 9 / 32) / cell + 16;
    offsetX = Math.round(centerX) - CENTER_X;
    offsetY = Math.round(centerY) - CENTER_Y;

    // 글자 자리를 표시한 뒤 가장자리를 흐려서, 덜어낸 자리의 경계가 네모로 드러나지 않게 한다
    const { width, height } = canvas;
    let quiet = new Float32Array(width * height).fill(1);
    for (const element of document.querySelectorAll(QUIET)) {
      if (element.closest(".featured-card:not(.is-active)")) continue;
      const rect = element.getBoundingClientRect();
      if (!rect.width) continue;
      const left = Math.max(0, Math.floor((rect.left - box.left) / cell) - 2), right = Math.min(width, Math.ceil((rect.right - box.left) / cell) + 2);
      const top = Math.max(0, Math.floor((rect.top - box.top) / cell) - 2), bottom = Math.min(height, Math.ceil((rect.bottom - box.top) / cell) + 2);
      for (let y = top; y < bottom; y++) quiet.fill(QUIET_LEVEL, y * width + left, y * width + right);
    }
    for (let pass = 0; pass < 2; pass++) quiet = soften(quiet, width, height, 4);

    const reach = Math.hypot(Math.max(centerX, width - centerX), Math.max(centerY, height - centerY));
    const dim = (x, y) => {
      const cx = x + offsetX, cy = y + offsetY;
      if (cx < 0 || cy < 0 || cx >= width || cy >= height) return 0;
      const far = clamp01((Math.hypot(x - CENTER_X, y - CENTER_Y) / reach - .38) / .62); // 중심에서 멀수록 옅게
      return quiet[cy * width + cx] * (1 - .8 * far * far * (3 - 2 * far));
    };
    shapes = Object.fromEntries(slugs.map(slug => [slug, toPoints(levels[slug], dim)]));
  }

  // 가로세로로 한 번씩 평균을 내서 흐린다
  function soften(source, width, height, radius) {
    const pass = (input, stepX, stepY) => {
      const output = new Float32Array(input.length);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        let sum = 0, count = 0;
        for (let k = -radius; k <= radius; k++) {
          const px = x + k * stepX, py = y + k * stepY;
          if (px < 0 || py < 0 || px >= width || py >= height) continue;
          sum += input[py * width + px]; count++;
        }
        output[y * width + x] = sum / count;
      }
      return output;
    };
    return pass(pass(source, 1, 0), 0, 1);
  }

  function paint(points, count) {
    const { width, height } = canvas;
    const image = context.createImageData(width, height);
    const pixels = image.data;
    for (let n = 0; n < count; n++) {
      const x = Math.round(points[n * 2]) + offsetX, y = Math.round(points[n * 2 + 1]) + offsetY;
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const i = (y * width + x) * 4;
      pixels[i] = color[0]; pixels[i + 1] = color[1]; pixels[i + 2] = color[2]; pixels[i + 3] = 255;
    }
    context.putImageData(image, 0, 0);
  }

  function show(slug, animate) {
    const target = shapes[slug];
    if (!target?.length) return;
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
  // 글꼴이 늦게 적용되면 글자 자리가 달라지므로 한 번 더 맞춘다
  document.fonts?.ready.then(() => { if (wide.matches) { layout(); show(shown, false); } });
  if (wide.matches) enable();
}

if (host && stage && tabs.length) start().catch(() => host.classList.remove("has-grain"));
