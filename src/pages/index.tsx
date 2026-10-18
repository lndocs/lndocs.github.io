import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroLogo}>
          <span className={styles.lightningBolt}>⚡</span>
        </div>
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <p className={styles.heroDescription}>
          Build powerful Lightning Network applications with a modular,
          self-hosted wallet and accounts system. 20+ funding sources,
          60+ extensions, infinite possibilities.
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/docs/getting-started/introduction">
            Get Started
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="https://demo.lnbits.com">
            Try Demo
          </Link>
        </div>
      </div>
    </header>
  );
}

type FeatureItem = {
  title: string;
  icon: string;
  description: string;
  link: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Multiple Funding Sources',
    icon: '🔌',
    description: 'Connect to LND, Core Lightning, Phoenixd, Eclair, or about 20 other Lightning backends. Self-hosted or custodial - your choice.',
    link: '/docs/funding-sources/overview',
  },
  {
    title: 'Powerful Extensions',
    icon: '🧩',
    description: 'TPoS, LNURL, Paywall, Jukebox, and 60+ more. Install extensions to add functionality without touching code.',
    link: '/docs/extensions/overview',
  },
  {
    title: 'Multi-Wallet System',
    icon: '💰',
    description: 'Create unlimited wallets with isolated balances, separate API keys, and granular permissions. Share wallets with teammates.',
    link: '/docs/architecture/wallets',
  },
  {
    title: 'Developer Friendly',
    icon: '👩‍💻',
    description: 'Clean REST API, webhook support, LNURL compatibility. Build your own extensions with Python and Vue.js, or as sandboxed WASM.',
    link: '/docs/api/overview',
  },
  {
    title: 'Flexible Authentication',
    icon: '🔐',
    description: 'Username/password, Nostr NIP-98, OAuth 2.0 (Google, GitHub, Keycloak). API keys for programmatic access.',
    link: '/docs/configuration/authentication',
  },
  {
    title: 'Production Ready',
    icon: '🚀',
    description: 'Docker, systemd, or cloud deployment. PostgreSQL support. Admin UI for management. Audit logs for compliance.',
    link: '/docs/deployment/docker',
  },
];

function Feature({title, icon, description, link}: FeatureItem) {
  return (
    <div className={clsx('col col--4', styles.feature)}>
      <div className={styles.featureCard}>
        <div className={styles.featureIcon}>{icon}</div>
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
        <Link to={link} className={styles.featureLink}>
          Learn more →
        </Link>
      </div>
    </div>
  );
}

function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className={styles.statsSection}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          Trusted by the Lightning Community
        </Heading>
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>20+</span>
            <span className={styles.statLabel}>Funding Sources</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>60+</span>
            <span className={styles.statLabel}>Extensions</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>5k+</span>
            <span className={styles.statLabel}>GitHub Stars</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>MIT</span>
            <span className={styles.statLabel}>Open Source</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function UseCasesSection() {
  return (
    <section className={styles.useCases}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          What Can You Build?
        </Heading>
        <div className={styles.useCaseGrid}>
          <div className={styles.useCaseCard}>
            <span className={styles.useCaseIcon}>🏪</span>
            <Heading as="h3">Point of Sale</Heading>
            <p>Accept Bitcoin payments at your store with the TPoS extension. QR codes, NFC, and receipt printing.</p>
          </div>
          <div className={styles.useCaseCard}>
            <span className={styles.useCaseIcon}>🎵</span>
            <Heading as="h3">Jukebox</Heading>
            <p>Let customers pay sats to add songs to your Spotify queue. Perfect for bars and cafes.</p>
          </div>
          <div className={styles.useCaseCard}>
            <span className={styles.useCaseIcon}>📰</span>
            <Heading as="h3">Paywall</Heading>
            <p>Monetize content with Lightning paywalls. Unlock articles, videos, or downloads.</p>
          </div>
          <div className={styles.useCaseCard}>
            <span className={styles.useCaseIcon}>🎰</span>
            <Heading as="h3">Games & Lotteries</Heading>
            <p>Build provably fair games, tip jars, and community pools with instant settlement.</p>
          </div>
          <div className={styles.useCaseCard}>
            <span className={styles.useCaseIcon}>🏦</span>
            <Heading as="h3">Multi-Tenant Wallets</Heading>
            <p>Run a custodial service for your community. Each user gets isolated wallet accounts.</p>
          </div>
          <div className={styles.useCaseCard}>
            <span className={styles.useCaseIcon}>🔗</span>
            <Heading as="h3">LNURL Services</Heading>
            <p>Lightning Address, LNURL-pay, LNURL-withdraw. Full protocol support out of the box.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickStartSection() {
  return (
    <section className={styles.quickStart}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          Get Running in Minutes
        </Heading>
        <div className={styles.codeBlock}>
          <div className={styles.codeHeader}>
            <span className={styles.codeTitle}>Docker Quickstart</span>
          </div>
          <pre className={styles.code}>
            <code>{`# Pull and run LNbits
docker run -d --name lnbits \\
  -p 5000:5000 \\
  -v $(pwd)/data:/app/data \\
  lnbits/lnbits

# Open http://localhost:5000`}</code>
          </pre>
        </div>
        <div className={styles.quickStartLinks}>
          <Link
            className="button button--primary button--lg"
            to="/docs/getting-started/installation">
            Full Installation Guide
          </Link>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className={styles.ctaSection}>
      <div className="container">
        <Heading as="h2">Ready to Build with Lightning?</Heading>
        <p>Join thousands of developers building the future of money.</p>
        <div className={styles.ctaButtons}>
          <Link
            className="button button--primary button--lg"
            to="/docs/getting-started/introduction">
            Read the Docs
          </Link>
          <Link
            className="button button--secondary button--lg"
            href="https://github.com/lnbits/lnbits">
            View on GitHub
          </Link>
          <Link
            className="button button--secondary button--lg"
            href="https://t.me/lnbits">
            Join Community
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Lightning Network Wallet & Accounts System"
      description="LNbits is a free, open-source Lightning Network accounts system with extensions. Create wallets, accept payments, and build Lightning apps.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <StatsSection />
        <UseCasesSection />
        <QuickStartSection />
        <CTASection />
      </main>
    </Layout>
  );
}
