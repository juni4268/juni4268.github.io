import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const projects = JSON.parse(readFileSync(new URL('projects.json', import.meta.url), 'utf8'));
const firstProject = projects[0].slug;
const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const html = value => value.replace(/[&<>"']/g, character => entities[character]);
const slugs = new Set(['projects']);

for (const project of projects) {
  const { slug, image, width, height, customDetail } = project;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug) || slugs.has(slug)) {
    throw new Error('Invalid or duplicate project slug: ' + slug);
  }
  if (!/^[a-z0-9-]+\.webp$/.test(image) || !existsSync(new URL('assets/' + image, root)) ||
      ![width, height].every(value => Number.isInteger(value) && value > 0)) {
    throw new Error('Invalid cover for ' + slug);
  }
  if (project.clip && (!/^[a-z0-9/-]+\.mp4$/.test(project.clip) || !existsSync(new URL('assets/' + project.clip, root)))) {
    throw new Error('Invalid clip for ' + slug);
  }
  if (!existsSync(new URL('assets/og/' + slug + '.jpg', root))) {
    throw new Error('Missing share image assets/og/' + slug + '.jpg (1200x630)');
  }
  if (project.repo && !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(project.repo)) {
    throw new Error('Invalid repo for ' + slug);
  }
  if (customDetail && !existsSync(new URL(slug + '/index.html', root))) {
    throw new Error('Missing custom detail page: ' + slug);
  }
  slugs.add(slug);
}

function page(project) {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script>try{if(localStorage.getItem("theme")==="light")document.documentElement.dataset.theme="light"}catch(e){}</script>
  <meta name="theme-color" content="#131417">
  <meta name="description" content="${html(project.description)}">
  <title>${html(project.name)} | 최준이</title>
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="최준이 포트폴리오">
  <meta property="og:title" content="${html(project.name)} | 최준이">
  <meta property="og:description" content="${html(project.description)}">
  <meta property="og:url" content="https://juni4268.github.io/${project.slug}/">
  <meta property="og:image" content="https://juni4268.github.io/assets/og/${project.slug}.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
  <link rel="stylesheet" href="../plain.css?v=space-1">
  <link rel="stylesheet" href="../portfolio.css?v=space-3">
  <script type="module" src="../dock.js?v=mail-1"></script>
</head>
<body class="home-page portfolio-page portfolio-nav-page portfolio-detail-page">
<div class="page">
  <header class="site-head">
    <a class="me" href="../">최준이</a>
  </header>
${projectRail(project.slug)}
${detail(project)}
</div>
${projectNavigation('../', project.slug)}
</body>
</html>
`;
}

function cover(project) {
  return `<img src="../assets/${project.image}" width="${project.width}" height="${project.height}" alt="${html(project.alt)}">`;
}

function projectRail(activeSlug) {
  const links = projects.map(project =>
    `      <li><a${project.upcoming ? ' class="is-upcoming"' : ''} href="../${project.slug}/"${project.slug === activeSlug ? ' aria-current="page"' : ''}>${html(project.name)}</a></li>`).join('\n');

  return `  <nav class="project-rail" aria-labelledby="project-rail-title">
    <p id="project-rail-title">참여 작품</p>
    <ul>
${links}
    </ul>
  </nav>`;
}

function projectNavigation(prefix, activeSlug) {
  return `  <nav class="portfolio-dock" aria-label="사이트 메뉴">
    <a href="${prefix}"${activeSlug ? '' : ' aria-current="page"'}>메인</a>
    <a href="${prefix}${activeSlug ?? firstProject}/" id="games"${activeSlug ? ' aria-current="page"' : ''}>작품 상세</a>
  </nav>
  <button type="button" class="theme-toggle" aria-label="밝은 화면으로 전환"><svg class="icon-sun" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg><svg class="icon-moon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg></button>`;
}

// projects.json의 repo(선택)는 공개 코드 저장소 주소다. 있으면 상세 페이지에 '코드' 행을 붙인다.
function repoRecord(project) {
  if (!project.repo) return '';
  const label = project.repo.replace(/^https:\/\//, '');
  return `\n          <div><dt>코드</dt><dd><a href="${html(project.repo)}">${html(label)} <span aria-hidden="true">↗</span></a></dd></div>`;
}

function detail(project) {
  return `  <main class="portfolio-work">
    <div class="portfolio-work-header">
      <h1>${html(project.name)}</h1>
      <p class="work-tech">${html(project.tech)}</p>
    </div>
    <div class="portfolio-work-layout">
      ${cover(project)}
      <div class="portfolio-work-copy">
        <p>${html(project.description)}</p>
        <dl class="profile-records">
          <div><dt>담당</dt><dd>${html(project.role)}</dd></div>${repoRecord(project)}
        </dl>
      </div>
    </div>
  </main>`;
}

// 메인의 참여 작품: 작품 카드를 한 자리에 겹쳐 두고, 오른쪽 목록에서 고른 작품의 카드를 보여준다.
// projects.json의 clip(선택)은 카드가 선택됐을 때 재생할 무음 반복 영상이다.
function featured() {
  const cards = projects.map((project, index) => {
    const media = project.clip
      ? `<video muted loop playsinline preload="none" poster="./assets/${project.image}" width="${project.width}" height="${project.height}" aria-label="${html(project.alt)}"><source src="./assets/${project.clip}" type="video/mp4"></video>`
      : `<img src="./assets/${project.image}" width="${project.width}" height="${project.height}" alt="${html(project.alt)}"${index ? ' loading="lazy"' : ''}>`;
    return `          <a class="featured-card${index ? '' : ' is-active'}${project.upcoming ? ' is-upcoming' : ''}" href="./${project.slug}/" data-work="${project.slug}">
            ${media}
            <span class="featured-copy">
              <strong>${html(project.name)}</strong>
              <span class="featured-tech">${html(project.tech)}</span>
              <span class="featured-role">${html(project.role)}</span>
              <span class="featured-summary">${html(project.description)}</span>
            </span>
          </a>`;
  }).join('\n');
  const tabs = projects.map((project, index) =>
    `        <li><a${project.upcoming ? ' class="is-upcoming"' : ''} href="./${project.slug}/" data-work="${project.slug}"${index ? '' : ' aria-current="true"'}><strong>${html(project.name)}</strong><span>${html(project.tech)}</span></a></li>`).join('\n');

  return `      <div class="featured-stage">
        <div class="featured-tilt">
${cards}
        </div>
      </div>
      <ul class="featured-more">
${tabs}
      </ul>`;
}

function write(slug, contents) {
  const directory = new URL(slug + '/', root);
  mkdirSync(directory, { recursive: true });
  writeFileSync(new URL('index.html', directory), contents, 'utf8');
}

function updateSlot(contents, name, markup, file) {
  const start = `  <!-- portfolio-${name}:start -->`;
  const end = `  <!-- portfolio-${name}:end -->`;
  const from = contents.indexOf(start);
  const to = contents.indexOf(end);
  if (from < 0 || to < from) throw new Error('Missing portfolio slot ' + name + ' in ' + file);
  return contents.slice(0, from) + start + '\n' + markup + '\n' + contents.slice(to);
}

function updateCustomPage(file, prefix, activeSlug) {
  const target = new URL(file, root);
  let contents = readFileSync(target, 'utf8');
  contents = updateSlot(contents, 'navigation', projectNavigation(prefix, activeSlug), file);
  if (!activeSlug) contents = updateSlot(contents, 'featured', featured(), file);
  if (activeSlug) contents = updateSlot(contents, 'rail', projectRail(activeSlug), file);
  writeFileSync(target, contents, 'utf8');
}

write('projects', `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0; url=../${firstProject}/">
  <link rel="canonical" href="../${firstProject}/">
  <title>참여 작품 | 최준이</title>
</head>
<body>
  <a href="../${firstProject}/">참여 작품 보기</a>
</body>
</html>
`);

updateCustomPage('index.html', './');
for (const project of projects) {
  if (project.customDetail) updateCustomPage(project.slug + '/index.html', '../', project.slug);
  else write(project.slug, page(project));
}
