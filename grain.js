// 메인 배경의 빛 그림: 고른 작품에 맞는 모양을 이름과 대표 영상 사이에 부드러운 빛으로 그린다.
// 작품을 바꾸면 그림이 빛 알갱이로 풀려서 휘어 돌며 새 모양의 자리로 가고, 다시 그림으로 맺힌다.
// 이 스크립트가 없거나 실패하면 넓은 화면에서는 기존의 단색 도형이 그대로 보인다.
const host = document.querySelector(".portfolio-profile");
const stage = document.querySelector(".featured-stage");
const nameEl = document.querySelector(".profile-identity h1");
const tabs = [...document.querySelectorAll(".featured-more a[data-work]")];
const wide = window.matchMedia("(min-width: 80rem)");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// 모양 그림은 400x240칸이고 모양의 중심이 (200, 120)칸에 있다. 한 칸은 대표 영상 너비의 약 1/104이다.
const MAP_W = 400, MAP_H = 240, VIDEO_X = 200, VIDEO_Y = 120, VIDEO_W = 156;
const BAYER = [0,32,8,40,2,34,10,42,48,16,56,24,50,18,58,26,12,44,4,36,14,46,6,38,60,28,52,20,62,30,54,22,
  3,35,11,43,1,33,9,41,51,19,59,27,49,17,57,25,15,47,7,39,13,45,5,37,63,31,55,23,61,29,53,21];
const MOVE = 620, MOVE_LAG = 200, FUSE = 420; // 밀리초: 알갱이가 새 자리로 가는 시간, 알갱이마다 출발을 늦추는 최대 폭, 알갱이가 그림으로 넘어가는 시간

let seed = 1;
const random = () => (seed = seed * 16807 % 2147483647) / 2147483647;
const clamp01 = u => Math.min(1, Math.max(0, u));

async function loadShape(slug) {
  const image = new Image();
  image.src = `./assets/grain/${slug}.png?v=7`;
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

async function start() {
  const slugs = tabs.map(tab => tab.dataset.work);
  const shapes = Object.fromEntries(await Promise.all(slugs.map(async slug => [slug, await loadShape(slug)])));

  // 멈춰 있을 때는 또렷한 빛 그림(still)을, 바뀌는 동안에는 움직이는 빛 알갱이(canvas)를 보여 준다.
  // 멈춘 화면용 그림은 점 지도보다 세 배 촘촘한 것을 따로 쓴다(선이 또렷하게 보이도록).
  const HI = 3, tints = {};
  await Promise.all(slugs.map(async slug => {
    const image = new Image(); image.src = `./assets/grain/${slug}-hi.png?v=1`; await image.decode();
    const source = document.createElement("canvas"); source.width = MAP_W * HI; source.height = MAP_H * HI;
    const g = source.getContext("2d", { willReadFrequently: true }); g.drawImage(image, 0, 0, source.width, source.height);
    tints[slug] = { levels: g.getImageData(0, 0, source.width, source.height).data, canvas: document.createElement("canvas") };
    tints[slug].canvas.width = source.width; tints[slug].canvas.height = source.height;
  }));
  const still = document.createElement("canvas");
  still.className = "profile-grain";
  still.style.cssText = "image-rendering:auto;";
  still.setAttribute("aria-hidden", "true");
  host.prepend(still);
  let cellSize = 6;
  function drawStill(slug) {
    const { levels, canvas: tint } = tints[slug], tc = tint.getContext("2d"), image = tc.createImageData(tint.width, tint.height);
    for (let i = 0; i < tint.width * tint.height; i++) { image.data[i*4] = color[0]; image.data[i*4+1] = color[1]; image.data[i*4+2] = color[2]; image.data[i*4+3] = Math.min(255, levels[i*4] * 1.3); }
    tc.putImageData(image, 0, 0);
    const box = host.getBoundingClientRect(), g = still.getContext("2d"), ratio = Math.min(2, window.devicePixelRatio || 1);
    still.width = Math.ceil(box.width * ratio); still.height = Math.ceil(box.height * ratio);
    g.scale(ratio, ratio); g.imageSmoothingQuality = "high";
    const args = [tint, offsetX * cellSize, offsetY * cellSize, MAP_W * cellSize, MAP_H * cellSize];
    g.filter = "blur(18px)"; g.globalAlpha = .45; g.drawImage(...args);   // 옅게 번지는 빛
    g.filter = "blur(1.4px)"; g.globalAlpha = .95; g.drawImage(...args);  // 선(살짝만 풀어서 너무 날카롭지 않게)
  }


  const canvas = document.createElement("canvas");
  canvas.className = "profile-grain";
  canvas.style.cssText = "image-rendering:auto;filter:blur(2px) brightness(1.45) saturate(1.25);opacity:0;";
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
    // 넓은 화면: 모양의 중심을 이름과 대표 영상 사이의 빈 곳에 둔다.
    // 좁은 화면: 대표 영상을 중심으로 두고, 모양이 영상 밖으로 보이도록 입자를 키운다.
    const cell = wide.matches ? video.width / VIDEO_W * 1.5 : box.width / 90;
    cellSize = cell;
    canvas.width = Math.ceil(box.width / cell);
    canvas.height = Math.ceil(box.height / cell);
    if (wide.matches) {
      const name = nameEl.getBoundingClientRect();
      offsetX = Math.round((name.right + (video.left - name.right) * .72 - box.left) / cell) - VIDEO_X;
      offsetY = Math.round(box.height * .53 / cell) - VIDEO_Y;
    } else {
      offsetX = Math.round((video.left - box.left + video.width / 2) / cell) - VIDEO_X;
      offsetY = Math.round((video.top - box.top + video.width * 9 / 32) / cell) - VIDEO_Y;
    }
  }

  let trail = new Uint8ClampedArray(0);
  function paint(points, count) {
    const { width, height } = canvas;
    if (trail.length !== width * height) trail = new Uint8ClampedArray(width * height);
    for (let i = 0; i < trail.length; i++) trail[i] = trail[i] * .7; // 지나간 자리에 꼬리가 남는다
    for (let n = 0; n < count; n++) {
      if (n % 5 === 4) continue; // 알갱이를 조금 덜어낸다
      const x = Math.round(points[n * 2]) + offsetX, y = Math.round(points[n * 2 + 1]) + offsetY;
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      trail[y * width + x] = 255;
    }
    const image = context.createImageData(width, height), pixels = image.data;
    for (let i = 0; i < trail.length; i++) { pixels[i*4] = color[0]; pixels[i*4+1] = color[1]; pixels[i*4+2] = color[2]; pixels[i*4+3] = trail[i]; }
    context.putImageData(image, 0, 0);
  }

  // 작품을 연달아 빠르게 넘기는 동안 알갱이가 잡는 모양: 천천히 도는 고리.
  // 넘기기를 멈추면 그 고리에서 고른 작품의 모양으로 간다.
  const RING = 2400, ringAngle = new Float32Array(RING), ringRadius = new Float32Array(RING);
  for (let i = 0; i < RING; i++) { ringAngle[i] = random() * Math.PI * 2; ringRadius[i] = 44 + (random() + random() + random() - 1.5) * 5; }
  let busy = false, circling = false, settleTimer = 0;

  function circle() {
    if (circling) return;
    circling = true; busy = true;
    cancelAnimationFrame(frame);
    const from = current, fromCount = from.length / 2, count = Math.max(fromCount, RING);
    const moving = new Float32Array(count * 2), began = performance.now();
    const stillFrom = parseFloat(still.style.opacity || 1), canvasFrom = parseFloat(canvas.style.opacity || 0);
    const step = now => {
      const time = now - began, v = clamp01(time / 260), gather = v * v * (3 - 2 * v), spin = time * .0016;
      for (let i = 0; i < count; i++) {
        const k = i % RING, a = fromCount ? (i % fromCount) * 2 : -1;
        const x = VIDEO_X + Math.cos(ringAngle[k] + spin) * ringRadius[k], y = VIDEO_Y + Math.sin(ringAngle[k] + spin) * ringRadius[k];
        moving[i * 2] = a < 0 ? x : from[a] + (x - from[a]) * gather;
        moving[i * 2 + 1] = a < 0 ? y : from[a + 1] + (y - from[a + 1]) * gather;
      }
      paint(moving, count);
      current = moving;
      const loosen = clamp01(time / 150);
      still.style.opacity = stillFrom * (1 - loosen);
      canvas.style.opacity = canvasFrom + (1 - canvasFrom) * loosen;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  }

  function show(slug, animate) {
    const target = shapes[slug];
    if (!target) return;
    cancelAnimationFrame(frame);
    circling = false;
    if (!animate || reduceMotion.matches) { busy = false; current = target; drawStill(slug); still.style.opacity = 1; canvas.style.opacity = 0; return; }
    busy = true;
    if (parseFloat(canvas.style.opacity || 0) === 0) trail.fill(0);
    const stillFrom = parseFloat(still.style.opacity || 1), canvasFrom = parseFloat(canvas.style.opacity || 0);

    const from = current, fromCount = from.length / 2, toCount = target.length / 2;
    const count = Math.max(fromCount, toCount, 1);
    const moving = new Float32Array(count * 2);
    const began = performance.now();
    let redrawn = false;

    // 점 하나하나가 지금 자리에서 새 모양의 자리로 곧장 날아간다.
    // 두 모양의 점 개수가 다르면, 남는 점은 다른 점과 같은 자리로 겹쳐 들어가고 모자란 점은 겹쳐 있던 자리에서 갈라져 나온다.
    const step = now => {
      const time = now - began;
      for (let i = 0; i < count; i++) {
        const a = fromCount ? (i % fromCount) * 2 : (i % toCount) * 2, b = (i % toCount) * 2;
        const source = fromCount ? from : target;
        const lag = ((i * 2654435761) >>> 0) / 4294967296; // 점마다 조금씩 다른 출발 시간
        const v = clamp01((time - lag * MOVE_LAG) / (MOVE - MOVE_LAG)), u = v * v * (3 - 2 * v); // 천천히 출발해 가운데서 빠르고 끝에서 감속
        const dx = target[b] - source[a], dy = target[b + 1] - source[a + 1], bend = Math.sin(Math.PI * u) * .3; // 곧장 가지 않고 한쪽으로 휘어 돈다
        moving[i * 2] = source[a] + dx * u - dy * bend;
        moving[i * 2 + 1] = source[a + 1] + dy * u + dx * bend;
      }
      paint(moving, count);
      current = moving;
      // 처음 0.15초: 또렷한 그림이 알갱이로 풀린다. 알갱이가 자리에 거의 온 뒤 0.5초: 알갱이가 또렷한 그림으로 천천히 넘어간다.
      // (겹쳐서 넘기기 때문에 바뀌는 순간이 눈에 띄지 않는다)
      const loosen = clamp01(time / 150), fuse = clamp01((time - MOVE * .62) / FUSE), fused = fuse * fuse * (3 - 2 * fuse);
      if (!redrawn && loosen >= 1) { redrawn = true; drawStill(slug); }
      still.style.opacity = redrawn ? fused : stillFrom * (1 - loosen);
      canvas.style.opacity = (canvasFrom + (1 - canvasFrom) * loosen) * (1 - fused);
      if (time < MOVE * .62 + FUSE) frame = requestAnimationFrame(step);
      else { busy = false; current = target; still.style.opacity = 1; canvas.style.opacity = 0; }
    };
    frame = requestAnimationFrame(step);
  }

  const activeSlug = () => (tabs.find(tab => tab.hasAttribute("aria-current")) ?? tabs[0]).dataset.work;
  let shown = activeSlug();

  function enable() {
    host.classList.add("has-grain");
    readColor(); layout(); show(shown, false);
  }

  // 작품 목록의 선택 표시가 바뀌면 모양도 바꾼다
  new MutationObserver(() => {
    const slug = activeSlug();
    if (slug === shown) return;
    shown = slug;
    clearTimeout(settleTimer);
    // 앞의 전환이 끝나기 전에 또 넘기면 고리로 모아 두었다가, 넘기기가 멈추면 모양을 잡는다
    if (busy && !reduceMotion.matches) { circle(); settleTimer = setTimeout(() => show(shown, true), 170); }
    else show(slug, true);
  }).observe(document.querySelector(".featured-more"), { attributes: true, subtree: true, attributeFilter: ["aria-current"] });

  // 테마가 바뀌면 점의 색을 다시 읽는다
  new MutationObserver(() => { readColor(); show(shown, false); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { layout(); show(shown, false); }, 120);
  });
  enable();
  // 글꼴이 적용되면 배치가 달라지므로 한 번 더 맞춘다
  document.fonts?.ready.then(() => { layout(); show(shown, false); });
}

if (host && stage && nameEl && tabs.length) start().catch(() => host.classList.remove("has-grain"));
