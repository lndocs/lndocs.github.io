import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/introduction',
        'getting-started/installation',
        'getting-started/quick-start',
        'getting-started/first-wallet',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      collapsed: true,
      items: [
        'architecture/overview',
        'architecture/wallets',
        'architecture/payments',
        'architecture/users',
        'architecture/funding-sources',
      ],
    },
    {
      type: 'category',
      label: 'Configuration',
      collapsed: true,
      items: [
        'configuration/environment',
        'configuration/database',
        'configuration/authentication',
        'configuration/admin-ui',
        'configuration/security',
      ],
    },
    {
      type: 'category',
      label: 'Funding Sources',
      collapsed: true,
      items: [
        'funding-sources/overview',
        'funding-sources/lnd',
        'funding-sources/cln',
        'funding-sources/phoenixd',
        'funding-sources/custodial',
        'funding-sources/fake-wallet',
      ],
    },
    {
      type: 'category',
      label: 'Extensions',
      collapsed: true,
      items: [
        'extensions/overview',
        'extensions/installing',
        'extensions/development',
        'extensions/manifest',
        'extensions/api-integration',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      collapsed: true,
      items: [
        'api/overview',
        'api/authentication',
        'api/wallets',
        'api/payments',
        'api/users',
        'api/lnurl',
        'api/webhooks',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      collapsed: true,
      items: [
        'deployment/docker',
        'deployment/manual',
        'deployment/reverse-proxy',
        'deployment/systemd',
        'deployment/cloud',
      ],
    },
    {
      type: 'category',
      label: 'Development',
      collapsed: true,
      items: [
        'development/contributing',
        'development/setup',
        'development/testing',
        'development/code-style',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      collapsed: true,
      items: [
        'guides/shared-wallets',
        'guides/service-fees',
        'guides/backup-restore',
        'guides/migration',
        'guides/troubleshooting',
      ],
    },
    'faq',
  ],
};

export default sidebars;
