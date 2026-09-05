import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "Burak's Notes",
  tagline: 'Things I learn about software, written down.',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://fillikburak.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/personal-site/',

  // GitHub pages deployment config.
  organizationName: 'fillikburak', // Your GitHub org/user name.
  projectName: 'personal-site', // Your repo name.

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'tr'],
    localeConfigs: {
      en: {label: 'English'},
      tr: {label: 'Türkçe'},
    },
  },

  presets: [
    [
      'classic',
      {
        // Blog-only mode: this site is a stream of "topics I learned" posts,
        // not a versioned reference manual, so the docs plugin is unused —
        // it's kept registered (empty, unlinked from nav) only because
        // @easyops-cn/docusaurus-search-local's SearchBar unconditionally
        // calls the docs-plugin's useActiveVersion hook and crashes SSR if
        // no docs plugin instance exists at all.
        docs: {
          path: 'docs',
          routeBasePath: 'unlisted-docs',
          sidebarPath: undefined,
        },
        blog: {
          routeBasePath: '/',
          blogTitle: "Burak's Notes",
          blogDescription: 'Things I learn about software, written down.',
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl: 'https://github.com/fillikburak/personal-site/tree/main/',
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        indexBlog: true,
        indexPages: true,
        indexDocs: false,
        // The blog lives at the site root (blog-only mode), not the
        // plugin's default '/blog' — tell it where to actually look.
        blogRouteBasePath: '/',
        // Exclude the placeholder docs route (see the `docs` comment above).
        ignoreFiles: [/^unlisted-docs/],
        language: ['en', 'tr'],
      },
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "Burak's Notes",
      items: [
        {to: '/', label: 'Posts', position: 'left'},
        {to: '/about', label: 'About', position: 'left'},
        {
          href: 'https://github.com/fillikburak/personal-site',
          label: 'GitHub',
          position: 'right',
        },
        {type: 'localeDropdown', position: 'right'},
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Site',
          items: [
            {label: 'Posts', to: '/'},
            {label: 'About', to: '/about'},
            {label: 'RSS', href: 'pathname:///rss.xml'},
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/fillikburak/personal-site',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Burak. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
