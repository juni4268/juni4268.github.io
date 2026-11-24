import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const projects = JSON.parse(readFileSync(new URL('projects.json', import.meta.url), 'utf8'));
const engineId = name => name.toLowerCase().replaceAll(' ', '-');
const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const html = value => value.replace(/[&<>"']/g, character => entities[character]);
const slugs = new Set(['projects']);
const engines = new Map([['all', '전체']]);

for (const project of projects) {
  const { slug, engine, image, width, height, customDetail } = project;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug) || slugs.has(slug)) {
    throw new Error('Invalid or duplicate project slug: ' + slug);
  }
  if (!/^[a-zA-Z][a-zA-Z0-9 -]*$/.test(engine) || engineId(engine) === 'all') {
    throw new Error('Invalid engine: ' + engine);
  }
  if (!/^[a-z0-9-]+\.webp$/.test(image) || !existsSync(new URL('assets/' + image, root)) ||
      ![width, height].every(value => Number.isInteger(value) && value > 0)) {
    throw new Error('Invalid cover for ' + slug);
  }
  if (customDetail && !existsSync(new URL(slug + '/index.html', root))) {
    throw new Error('Missing custom detail page: ' + slug);
  }
  slugs.add(slug);
  engines.set(engineId(engine), engine);
}

function page(title, description, content, isList = false) {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#fff7e8">
  <meta name="description" content="${html(description)}">
  <title>${html(title)} | 최준이</title>
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
  <link rel="stylesheet" href="../plain.css?v=projects-2">
  <link rel="stylesheet" href="../portfolio.css">
  <script type="module" src="../portfolio.js"></script>
</head>
<body class="home-page portfolio-page">
<div class="page">
  <header class="site-head">
    <a class="me" href="../">최준이</a>
    <nav aria-label="사이트 메뉴">
      <a href="../">메인</a>
      <a href="../projects/" aria-current="${isList ? 'page' : 'location'}"${isList ? '' : ' data-work-list'}>작품</a>
    </nav>
  </header>
${content}
</div>
</body>
</html>
`;
}

function cover(project, isCard) {
  return `<img src="../assets/${project.image}" width="${project.width}" height="${project.height}" alt="${isCard ? '' : html(project.alt)}"${isCard ? ' loading="lazy"' : ''}>`;
}

const filters = [...engines].map(([id, label]) =>
  `        <button type="button" data-engine="${id}" aria-pressed="${id === 'all'}">${html(label)}</button>`).join('\n');

const cards = projects.map(project => `      <li data-engine="${engineId(project.engine)}">
        <a class="portfolio-card" href="../${project.slug}/" aria-labelledby="title-${project.slug}">
          <div class="portfolio-card-media">
            ${cover(project, true)}
            <h2 id="title-${project.slug}">${html(project.name)}</h2>
          </div>
          <p>${html(project.tech)}</p>
          <p class="card-role">${html(project.role)}</p>
        </a>
      </li>`).join('\n');

const list = `  <main class="portfolio-list">
    <div class="portfolio-list-header">
      <h1>참여 작품</h1>
      <div class="portfolio-filters" data-project-filters role="group" aria-label="개발 엔진" hidden>
${filters}
      </div>
    </div>
    <p class="portfolio-count" data-project-count aria-live="polite">작품 ${projects.length}개</p>
    <ul class="portfolio-grid">
${cards}
    </ul>
  </main>`;

function detail(project) {
  return `  <main class="portfolio-work">
    <a class="work-back" href="../projects/" data-work-list><span aria-hidden="true">←&nbsp;</span>전체 작품</a>
    <div class="portfolio-work-header">
      <h1>${html(project.name)}</h1>
      <p class="work-tech">${html(project.tech)}</p>
    </div>
    <div class="portfolio-work-layout">
      ${cover(project, false)}
      <div class="portfolio-work-copy">
        <p>${html(project.description)}</p>
        <dl class="profile-records">
          <div><dt>담당</dt><dd>${html(project.role)}</dd></div>
        </dl>
      </div>
    </div>
  </main>`;
}

function write(slug, contents) {
  const directory = new URL(slug + '/', root);
  mkdirSync(directory, { recursive: true });
  writeFileSync(new URL('index.html', directory), contents, 'utf8');
}

write('projects', page('참여 작품', '게임 프로그래머 최준이가 참여한 게임과 작품별 담당 역할을 소개합니다.', list, true));
for (const project of projects) {
  if (!project.customDetail) write(project.slug, page(project.name, project.description, detail(project)));
}
