import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'LNbits',
  tagline: 'Free and Open-Source Lightning Network Wallet & Accounts System',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  url: 'https://lndocs.github.io',
  baseUrl: '/',
  organizationName: 'lndocs',
  projectName: 'lndocs.github.io',

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  headTags: [
    // Open Graph Protocol
    {
      tagName: 'meta',
      attributes: {
        property: 'og:title',
        content: 'LNbits - Lightning Network Wallet System',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:description',
        content: 'Free, open-source Lightning Network accounts system with extensions. Create wallets, accept payments, and build Lightning apps.',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:type',
        content: 'website',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:image',
        content: 'https://lndocs.github.io/img/social-card.png',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:image:width',
        content: '1200',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:image:height',
        content: '630',
      },
    },
    // Twitter Card
    {
      tagName: 'meta',
      attributes: {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'twitter:title',
        content: 'LNbits - Lightning Network Wallet System',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'twitter:description',
        content: 'Free, open-source Lightning Network accounts system with extensions. Create wallets, accept payments, and build Lightning apps.',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'twitter:image',
        content: 'https://lndocs.github.io/img/social-card.png',
      },
    },
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/lnbits/lnbits-docs/tree/main/',
          routeBasePath: 'docs',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.png',

    metadata: [
      {name: 'keywords', content: 'LNbits, Lightning Network, Bitcoin, wallet, payments, LNURL, open-source'},
      {name: 'description', content: 'LNbits is a free, open-source Lightning Network accounts system with a powerful extension framework.'},
      {property: 'og:site_name', content: 'LNbits Documentation'},
    ],

    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },

    announcementBar: {
      id: 'star_us',
      content: '⚡ LNbits v1.4.1 is out! <a href="https://github.com/lnbits/lnbits/releases">Check the release notes</a>',
      backgroundColor: '#ffd93d',
      textColor: '#1a1a2e',
      isCloseable: true,
    },

    navbar: {
      title: 'LNbits',
      logo: {
        alt: 'LNbits Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/docs/getting-started/installation',
          label: 'Install',
          position: 'left',
        },
        {
          to: '/docs/extensions/overview',
          label: 'Extensions',
          position: 'left',
        },
        {
          to: '/docs/api/overview',
          label: 'API',
          position: 'left',
        },
        {
          type: 'dropdown',
          label: 'Community',
          position: 'left',
          items: [
            {label: 'Telegram', href: 'https://t.me/lnbits'},
            {label: 'GitHub Discussions', href: 'https://github.com/lnbits/lnbits/discussions'},
            {type: 'html', value: '<hr style="margin: 0.5rem 0;">'},
            {label: 'Demo Instance', href: 'https://demo.lnbits.com'},
            {label: 'LNbits Shop', href: 'https://shop.lnbits.com'},
          ],
        },
        {
          href: 'https://github.com/lnbits/lnbits',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },

    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {label: 'Getting Started', to: '/docs/getting-started/introduction'},
            {label: 'Installation', to: '/docs/getting-started/installation'},
            {label: 'Configuration', to: '/docs/configuration/environment'},
            {label: 'API Reference', to: '/docs/api/overview'},
          ],
        },
        {
          title: 'Developers',
          items: [
            {label: 'Extension Development', to: '/docs/extensions/development'},
            {label: 'Contributing', to: '/docs/development/contributing'},
            {label: 'Architecture', to: '/docs/architecture/overview'},
            {label: 'GitHub', href: 'https://github.com/lnbits/lnbits'},
          ],
        },
        {
          title: 'Community',
          items: [
            {label: 'Telegram', href: 'https://t.me/lnbits'},
            {label: 'GitHub Discussions', href: 'https://github.com/lnbits/lnbits/discussions'},
            {label: 'Twitter', href: 'https://twitter.com/lnlounge'},
          ],
        },
        {
          title: 'Resources',
          items: [
            {label: 'Demo Instance', href: 'https://demo.lnbits.com'},
            {label: 'LNbits Shop', href: 'https://shop.lnbits.com'},
            {label: 'my.lnbits.com', href: 'https://my.lnbits.com'},
            {label: 'Extensions', href: 'https://extensions.lnbits.com'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} LNbits. Built with Docusaurus. Licensed under MIT.`,
    },

    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'python', 'yaml', 'toml', 'nginx', 'ini'],
    },

    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 4,
    },

    mermaid: {
      theme: { light: 'neutral', dark: 'dark' },
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
