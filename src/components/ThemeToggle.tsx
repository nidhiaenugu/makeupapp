'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

/**
 * Explicit light/dark switch. Until the user picks one we leave `data-theme`
 * unset so the OS preference wins through the media query in globals.css.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem('gm-theme');
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
    } else {
      setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      window.localStorage.setItem('gm-theme', next);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      style={{
        padding: '0.4rem 0.7rem',
        borderRadius: 999,
        border: '1px solid var(--border)',
        background: 'var(--surface-2)',
        cursor: 'pointer',
        fontSize: '0.85rem',
      }}
    >
      {/* Render nothing until mounted so server and client markup agree. */}
      {theme === null ? ' ' : theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}
