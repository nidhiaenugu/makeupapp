'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { CATEGORY_LABELS, CONCERN_BY_ID } from '@/lib/domain/taxonomy';
import type { Recommendation, UserProfile } from '@/lib/domain/types';
import { loadProfile } from '@/lib/profile/storage';

interface ResultsMeta {
  considered: number;
  eligible: number;
  returned: number;
  unmatchedConcerns: string[];
  notes: string[];
}

type State =
  | { status: 'loading' }
  | { status: 'no-profile' }
  | { status: 'error'; message: string }
  | { status: 'ready'; recommendations: Recommendation[]; meta: ResultsMeta; profile: UserProfile };

/**
 * Results are fetched from the public API rather than by importing the engine
 * directly. It keeps the client bundle free of the catalog, and it means the
 * page exercises the same endpoint third-party clients use.
 */
export function ResultsView() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [groupBy, setGroupBy] = useState<'score' | 'type'>('score');

  const fetchResults = useCallback(async (profile: UserProfile) => {
    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, limit: 36, maxPerType: 2 }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message ?? `Request failed (${response.status})`);
      }

      const body = (await response.json()) as { data: Recommendation[]; meta: ResultsMeta };
      setState({ status: 'ready', recommendations: body.data, meta: body.meta, profile });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Something went wrong.',
      });
    }
  }, []);

  useEffect(() => {
    const profile = loadProfile();
    if (!profile || profile.categories.length === 0) {
      setState({ status: 'no-profile' });
      return;
    }
    void fetchResults(profile);
  }, [fetchResults]);

  if (state.status === 'loading') {
    return <p style={{ color: 'var(--muted)' }}>Scoring the catalog against your profile…</p>;
  }

  if (state.status === 'no-profile') {
    return (
      <div className="gm-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ marginTop: 0 }}>No profile yet</h1>
        <p style={{ color: 'var(--muted)' }}>
          Take the quiz and we will match you against the whole catalog.
        </p>
        <Link href="/quiz" className="gm-btn" style={{ textDecoration: 'none' }}>
          Start the quiz
        </Link>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="gm-card" style={{ padding: '2rem' }}>
        <h1 style={{ marginTop: 0 }}>We could not load your matches</h1>
        <p style={{ color: 'var(--muted)' }}>{state.message}</p>
        <Link href="/quiz" className="gm-btn" style={{ textDecoration: 'none' }}>
          Back to the quiz
        </Link>
      </div>
    );
  }

  const { recommendations, meta, profile } = state;

  const grouped = new Map<string, Recommendation[]>();
  for (const rec of recommendations) {
    const list = grouped.get(rec.product.type);
    if (list) list.push(rec);
    else grouped.set(rec.product.type, [rec]);
  }

  return (
    <div style={{ display: 'grid', gap: '2rem' }}>
      <header style={{ display: 'grid', gap: '0.6rem' }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(1.7rem, 4vw, 2.4rem)' }}>Your matches</h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>
          {meta.returned} products from {meta.eligible} that passed your filters, scored against{' '}
          {profile.concerns.length > 0
            ? `${profile.concerns.length} concern${profile.concerns.length === 1 ? '' : 's'}`
            : 'your profile'}
          .
        </p>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {profile.categories.map((category) => (
            <span key={category} className="gm-chip">
              {CATEGORY_LABELS[category]}
            </span>
          ))}
          {profile.concerns.slice(0, 5).map((concern) => (
            <span key={concern} className="gm-chip">
              {CONCERN_BY_ID[concern]?.label ?? concern}
            </span>
          ))}
        </div>
      </header>

      {meta.notes.length > 0 && (
        <aside
          className="gm-card"
          style={{ padding: '1rem 1.25rem', borderLeft: '3px solid var(--accent)' }}
        >
          <h2 style={{ margin: '0 0 0.4rem', fontSize: '0.95rem' }}>Worth knowing</h2>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
            {meta.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </aside>
      )}

      {meta.unmatchedConcerns.length > 0 && (
        <aside
          className="gm-card"
          style={{ padding: '1rem 1.25rem', borderLeft: '3px solid var(--warning)' }}
        >
          <h2 style={{ margin: '0 0 0.4rem', fontSize: '0.95rem' }}>
            Not covered by these results
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
            Nothing here addresses{' '}
            {meta.unmatchedConcerns
              .map((c) => CONCERN_BY_ID[c]?.label?.toLowerCase() ?? c)
              .join(', ')}
            . Widening your budget or relaxing a dealbreaker usually helps.
          </p>
        </aside>
      )}

      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.87rem', color: 'var(--muted)' }}>View:</span>
        {(['score', 'type'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={groupBy === mode}
            onClick={() => setGroupBy(mode)}
            style={{
              padding: '0.35rem 0.8rem',
              borderRadius: 999,
              border: `1px solid ${groupBy === mode ? 'var(--accent)' : 'var(--border)'}`,
              background: groupBy === mode ? 'var(--accent-soft)' : 'var(--surface)',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            {mode === 'score' ? 'Best first' : 'By product type'}
          </button>
        ))}

        <Link
          href="/routine"
          className="gm-btn gm-btn-secondary"
          style={{ marginLeft: 'auto', textDecoration: 'none', padding: '0.45rem 1rem' }}
        >
          Build a routine →
        </Link>
        <Link
          href="/quiz"
          style={{ fontSize: '0.87rem', color: 'var(--muted)' }}
        >
          Edit answers
        </Link>
      </div>

      {recommendations.length === 0 ? (
        <div className="gm-card" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2 style={{ marginTop: 0 }}>Nothing cleared your filters</h2>
          <p style={{ color: 'var(--muted)' }}>
            Your dealbreakers or budget ruled out the entire catalog. Loosening one of them will
            open things up.
          </p>
          <Link href="/quiz" className="gm-btn" style={{ textDecoration: 'none' }}>
            Adjust your answers
          </Link>
        </div>
      ) : groupBy === 'score' ? (
        <Grid>
          {recommendations.map((rec) => (
            <ProductCard key={rec.product.id} recommendation={rec} />
          ))}
        </Grid>
      ) : (
        <div style={{ display: 'grid', gap: '2rem' }}>
          {[...grouped.entries()].map(([type, recs]) => (
            <section key={type}>
              <h2 style={{ margin: '0 0 0.8rem', fontSize: '1.15rem', textTransform: 'capitalize' }}>
                {type.replace(/-/g, ' ')}
              </h2>
              <Grid>
                {recs.map((rec) => (
                  <ProductCard key={rec.product.id} recommendation={rec} />
                ))}
              </Grid>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gap: '1rem',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      }}
    >
      {children}
    </div>
  );
}
