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
  <meta name="theme-color" content="#f8f6ee">
  <meta name="description" content="${html(project.description)}">
  <title>${html(project.name)} | 최준이</title>
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
  <link rel="stylesheet" href="../plain.css?v=projects-2">
  <link rel="stylesheet" href="../portfolio.css?v=detail-colors">
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
    `      <li><a href="../${project.slug}/"${project.slug === activeSlug ? ' aria-current="page"' : ''}>${html(project.name)}</a></li>`).join('\n');

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
    <a href="${prefix}${activeSlug ?? firstProject}/" id="games"${activeSlug ? ' aria-current="page"' : ''}>작품</a>
  </nav>`;
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
          <div><dt>담당</dt><dd>${html(project.role)}</dd></div>
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
    return `          <a class="featured-card${index ? '' : ' is-active'}" href="./${project.slug}/" data-work="${project.slug}">
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
    `        <li><a href="./${project.slug}/" data-work="${project.slug}"${index ? '' : ' aria-current="true"'}><strong>${html(project.name)}</strong><span>${html(project.tech)}</span></a></li>`).join('\n');

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
