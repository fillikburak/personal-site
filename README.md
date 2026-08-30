# Burak's Notes

A personal notes/write-up site, built with [Docusaurus](https://docusaurus.io/)
in blog-only mode. Every post is one topic learned (async/await, outbox
pattern, etc.) — dated, tagged, and searchable.

## Adding a new post

1. Create a new folder under `blog/`, named `YYYY-MM-DD-slug/`, with an
   `index.md` inside (copy `blog/2026-08-30-async-await/index.md` as a
   starting point).
2. Fill in the frontmatter:
   ```yaml
   ---
   title: My topic
   authors: [burak]
   tags: [dotnet, architecture]   # see blog/tags.yml for existing tags,
                                   # or just add a new one inline
   ---
   ```
   The **first** tag is the post's primary topic — that's what the
   "Grouped" homepage view sorts it under. Any extra tags still work for
   the tag pages and search, they just don't create extra topic groups.
3. Put a `{/* truncate */}` after the intro paragraph(s) — everything above
   it is the excerpt shown on the homepage list.
4. Write the post in Markdown/MDX below.
5. Add the Turkish translation at
   `i18n/tr/docusaurus-plugin-content-blog/YYYY-MM-DD-slug/index.md` —
   same frontmatter (the `tags`/`authors` ids stay the same; only their
   labels are translated, in `i18n/tr/docusaurus-plugin-content-blog/tags.yml`
   / `authors.yml`), translated title and body. If a post only exists in
   one language, Docusaurus just falls back to showing nothing there for
   now — it doesn't break the build.

New tags or authors need an entry in **both** `blog/tags.yml` /
`blog/authors.yml` (English) and their `i18n/tr/...` counterparts.

## Language switcher

The site is bilingual (English default at `/`, Turkish at `/tr/`), switched
via the globe icon in the navbar. Content translations live under `i18n/tr/`
mirroring the English source paths — see `i18n/tr/docusaurus-plugin-content-blog/`
and `i18n/tr/docusaurus-plugin-content-pages/about.mdx`. UI strings (nav,
footer, the List/Grouped/Grid toggle) are in `i18n/tr/code.json` and
`i18n/tr/docusaurus-theme-classic/`. After adding new custom UI text wrapped
in `<Translate>`, run `npm run write-translations -- --locale tr` to pick up
new keys in `i18n/tr/code.json`, then fill in the Turkish `message` values.

## Local development

```bash
npm install
npm start          # dev server at http://localhost:3000, live reload
```

Note: search is a **build-time** index, so it won't show results under
`npm start`. To test search locally:

```bash
npm run build
npm run serve       # serves the production build at http://localhost:3000
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the
site and deploys it to GitHub Pages automatically. In the repo's
**Settings → Pages**, set the source to **GitHub Actions** (one-time setup).

Live site: https://fillikburak.github.io/personal-site/
