import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'GlowMatch — find products that actually suit you',
    template: '%s · GlowMatch',
  },
  description:
    'An explainable makeup, skincare and haircare recommender. Answer a short quiz and get matched products with the reasoning shown.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fdf9f7' },
    { media: '(prefers-color-scheme: dark)', color: '#171315' },
  ],
};

/**
 * Applied before first paint so a returning user never sees a flash of the
 * wrong theme while React hydrates.
 */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('gm-theme');if(t){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

const NAV = [
  { href: '/quiz', label: 'Quiz' },
  { href: '/browse', label: 'Browse' },
  { href: '/routine', label: 'Routine' },
  { href: '/saved', label: 'Saved' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a href="#main" className="gm-skip-link">
          Skip to content
        </a>

        <header
          style={{
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface)',
            position: 'sticky',
            top: 0,
            zIndex: 20,
          }}
        >
          <div
            style={{
              maxWidth: 1120,
              margin: '0 auto',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <Link
              href="/"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.3rem',
                fontWeight: 600,
                textDecoration: 'none',
                letterSpacing: '-0.02em',
              }}
            >
              Glow<span style={{ color: 'var(--accent)' }}>Match</span>
            </Link>

            <nav style={{ display: 'flex', gap: '0.35rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: 999,
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    color: 'var(--muted)',
                  }}
                >
                  {item.label}
                </Link>
              ))}
              <ThemeToggle />
            </nav>
          </div>
        </header>

        <main id="main" style={{ maxWidth: 1120, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
          {children}
        </main>

        <footer
          style={{
            borderTop: '1px solid var(--border)',
            padding: '2rem 1.25rem',
            color: 'var(--muted)',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gap: '0.5rem' }}>
            <p style={{ margin: 0 }}>
              GlowMatch gives cosmetic guidance only. It is not medical advice — see a dermatologist
              or GP for persistent skin and scalp conditions, and patch-test new actives.
            </p>
            <p style={{ margin: 0 }}>
              Prices and formulations are approximate and change often; check the retailer before
              buying. Open source under the MIT licence.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
