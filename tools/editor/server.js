// Local-only draft editor for the blog. Not part of the built site.
// Run with `npm run editor`, then open http://localhost:4300

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const PORT = 4300;
const ROOT = path.resolve(__dirname, '..', '..');
const EN_TAGS_PATH = path.join(ROOT, 'blog', 'tags.yml');
const EN_BLOG_DIR = path.join(ROOT, 'blog');
const TR_BLOG_DIR = path.join(ROOT, 'i18n', 'tr', 'docusaurus-plugin-content-blog');

function parseTagsYaml(text) {
  // Naive parser for this project's flat "key:\n  label: ...\n  permalink: ...\n" format.
  const tags = [];
  const blocks = text.split(/\n(?=\S)/).map((b) => b.trim()).filter(Boolean);
  for (const block of blocks) {
    const keyMatch = block.match(/^([\w-]+):/);
    const labelMatch = block.match(/label:\s*(.+)/);
    if (keyMatch && labelMatch) {
      tags.push({ key: keyMatch[1], label: labelMatch[1].trim() });
    }
  }
  return tags;
}

function slugify(title) {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/\p{Mn}/gu, '') // strip accents/Turkish diacritics
    .replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ö/g, 'o').replace(/ü/g, 'u') // Turkish letters without a canonical NFD decomposition
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;
  const [, fmText, body] = match;
  const frontmatter = {};
  fmText.split('\n').forEach((line) => {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) frontmatter[m[1]] = m[2];
  });
  return { frontmatter, body };
}

function listPosts({ onlyDrafts }) {
  const results = [];
  for (const [language, dir] of [['en', EN_BLOG_DIR], ['tr', TR_BLOG_DIR]]) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const filePath = path.join(dir, entry.name, 'index.md');
      if (!fs.existsSync(filePath)) continue;
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = parseFrontmatter(raw);
      if (!parsed) continue;
      const isDraft = parsed.frontmatter.draft === 'true';
      if (onlyDrafts !== isDraft) continue;
      const dateMatch = entry.name.match(/^(\d{4}-\d{2}-\d{2})-/);
      results.push({
        path: path.relative(ROOT, filePath).split(path.sep).join('/'),
        language,
        title: parsed.frontmatter.title || entry.name,
        tags: (parsed.frontmatter.tags || '').replace(/^\[|\]$/g, ''),
        content: parsed.body.trim(),
        date: dateMatch ? dateMatch[1] : null,
      });
    }
  }
  results.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return results;
}

function findDrafts() {
  return listPosts({ onlyDrafts: true });
}

function findPublished() {
  return listPosts({ onlyDrafts: false });
}

function git(args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  } catch (err) {
    throw new Error(`git ${args.join(' ')} başarısız:\n${err.stderr || err.message}`);
  }
}

function isInsideBlogDirs(abs) {
  return abs.startsWith(EN_BLOG_DIR + path.sep) || abs.startsWith(TR_BLOG_DIR + path.sep);
}

function updateDraft(relPath, { title, tags, content }) {
  const abs = path.normalize(path.join(ROOT, relPath));
  if (!isInsideBlogDirs(abs)) throw new Error('Geçersiz dosya yolu.');
  if (!fs.existsSync(abs)) throw new Error('Dosya bulunamadı.');

  const existing = parseFrontmatter(fs.readFileSync(abs, 'utf8'));
  if (!existing || existing.frontmatter.draft !== 'true') {
    throw new Error('Sadece taslaklar düzenlenebilir.');
  }
  if (!title || !title.trim()) throw new Error('Başlık boş olamaz.');
  if (!content || !content.trim()) throw new Error('İçerik boş olamaz.');
  if (!Array.isArray(tags) || tags.length === 0) throw new Error('En az bir etiket seç.');

  const frontmatter = [
    '---',
    `title: ${title.replace(/:/g, ' -')}`,
    `authors: ${existing.frontmatter.authors || '[burak]'}`,
    `tags: [${tags.join(', ')}]`,
    'draft: true',
    '---',
    '',
  ].join('\n');

  fs.writeFileSync(abs, frontmatter + content.trim() + '\n');
}

function publishDraft(relPath) {
  const abs = path.normalize(path.join(ROOT, relPath));
  if (!isInsideBlogDirs(abs)) throw new Error('Geçersiz dosya yolu.');
  if (!fs.existsSync(abs)) throw new Error('Dosya bulunamadı.');

  let raw = fs.readFileSync(abs, 'utf8');
  if (!/\ndraft:\s*true\n/.test(raw)) throw new Error('Bu dosya zaten taslak değil.');
  raw = raw.replace(/\ndraft:\s*true\n/, '\n');
  fs.writeFileSync(abs, raw);

  const parsed = parseFrontmatter(raw);
  const title = parsed?.frontmatter?.title || 'yeni yazı';

  git(['add', relPath]);
  git(['commit', '-m', `Add "${title}" post\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`]);
  git(['push', 'origin', 'main']);
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (req.method === 'GET' && req.url === '/api/tags') {
    const tags = parseTagsYaml(fs.readFileSync(EN_TAGS_PATH, 'utf8'));
    sendJson(res, 200, tags);
    return;
  }

  if (req.method === 'GET' && req.url === '/api/drafts') {
    try {
      sendJson(res, 200, findDrafts());
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  if (req.method === 'GET' && req.url === '/api/published') {
    try {
      sendJson(res, 200, findPublished());
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/api/update-draft') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { path: relPath, title, tags, content } = JSON.parse(body);
        if (!relPath) throw new Error('path gerekli.');
        updateDraft(relPath, { title, tags, content });
        sendJson(res, 200, { ok: true });
      } catch (err) {
        sendJson(res, 400, { error: err.message });
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/create-draft') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { title, language, tags, content } = JSON.parse(body);

        if (!title || !title.trim()) throw new Error('Başlık boş olamaz.');
        if (!content || !content.trim()) throw new Error('İçerik boş olamaz.');
        if (!Array.isArray(tags) || tags.length === 0) throw new Error('En az bir etiket seç.');
        if (language !== 'en' && language !== 'tr') throw new Error('Geçersiz dil.');

        const slug = slugify(title);
        if (!slug) throw new Error('Başlıktan geçerli bir slug üretilemedi.');

        const folderName = `${todayIso()}-${slug}`;
        const targetDir = language === 'en'
          ? path.join(EN_BLOG_DIR, folderName)
          : path.join(TR_BLOG_DIR, folderName);

        if (fs.existsSync(targetDir)) {
          throw new Error(`Bu isimde bir taslak zaten var: ${folderName}`);
        }

        const frontmatter = [
          '---',
          `title: ${title.replace(/:/g, ' -')}`,
          'authors: [burak]',
          `tags: [${tags.join(', ')}]`,
          'draft: true',
          '---',
          '',
        ].join('\n');

        fs.mkdirSync(targetDir, { recursive: true });
        fs.writeFileSync(path.join(targetDir, 'index.md'), frontmatter + content.trim() + '\n');

        sendJson(res, 200, { path: `${language === 'en' ? 'blog' : 'i18n/tr/docusaurus-plugin-content-blog'}/${folderName}/index.md` });
      } catch (err) {
        sendJson(res, 400, { error: err.message });
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/publish') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { path: relPath } = JSON.parse(body);
        if (!relPath) throw new Error('path gerekli.');
        publishDraft(relPath);
        sendJson(res, 200, { ok: true });
      } catch (err) {
        sendJson(res, 400, { error: err.message });
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Draft editor running at http://localhost:${PORT}`);
});
