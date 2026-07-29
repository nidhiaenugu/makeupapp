'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { MatchScore } from '@/components/MatchScore';
import { SaveButton } from '@/components/SaveButton';
import { CATEGORIES, CATEGORY_LABELS } from '@/lib/domain/taxonomy';
import type { Category } from '@/lib/domain/taxonomy';
import type { Routine, UserProfile } from '@/lib/domain/types';
import { loadProfile } from '@/lib/profile/storage';

const SLOT_TITLES: Record<string, string> = {
  am: 'Morning',
  pm: 'Evening',
  'wash-day': 'Wash day',
};

export function RoutineView() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [category, setCategory] = useState<Category>('skincare');
  const [routines, setRoutines] = useState<Routine[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = loadProfile();
    setProfile(stored);
    if (stored && stored.categories.length > 0) {
      setCategory(stored.categories[0]!);
    }
    setLoading(false);
  }, []);

  const build = useCallback(async (currentProfile: UserProfile, currentCategory: Category) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: currentProfile, category: currentCategory }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message ?? `Request failed (${response.status})`);
      }
      const body = (await response.json()) as { data: Routine[] };
      setRoutines(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile && profile.categories.length > 0) void build(profile, category);
  }, [profile, category, build]);

  if (!profile || profile.categories.length === 0) {
    return (
      <div className="gm-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ marginTop: 0 }}>Build a routine</h1>
        <p style={{ color: 'var(--muted)' }}>
          Take the quiz first and we will turn your matches into an ordered routine.
        </p>
        <Link href="/quiz" className="gm-btn" style={{ textDecoration: 'none' }}>
          Start the quiz
        </Link>
      </div>
    );
  }

  // Only offer categories the user actually asked about.
  const available = CATEGORIES.filter((c) => profile.categories.includes(c));

  return (
    <div style={{ display: 'grid', gap: '2rem' }}>
      <header>
        <h1 style={{ margin: '0 0 0.4rem', fontSize: 'clamp(1.7rem, 4vw, 2.4rem)' }}>
          Your routine
        </h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>
          One product per step, in the order you should apply them, with how often to use each.
        </p>
      </header>

      {available.length > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {available.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={category === option}
              onClick={() => setCategory(option)}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: 999,
                border: `1px solid ${category === option ? 'var(--accent)' : 'var(--border)'}`,
                background: category === option ? 'var(--accent-soft)' : 'var(--surface)',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              {CATEGORY_LABELS[option]}
            </button>
          ))}
        </div>
      )}

      {loading && <p style={{ color: 'var(--muted)' }}>Building your routine…</p>}
      {error && <p style={{ color: 'var(--warning)' }}>{error}</p>}

      {!loading &&
        routines?.map((routine) => (
          <section key={`${routine.category}-${routine.time}`}>
            <h2 style={{ margin: '0 0 0.9rem', fontSize: '1.3rem' }}>
              {SLOT_TITLES[routine.time] ?? routine.time}
            </h2>

            {routine.steps.length === 0 ? (
              <div className="gm-card" style={{ padding: '1.5rem' }}>
                <p style={{ margin: 0, color: 'var(--muted)' }}>
                  We could not build this routine within your filters. Try raising your budget or
                  removing a dealbreaker.
                </p>
              </div>
            ) : (
              <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.85rem' }}>
                {routine.steps.map((step, index) => (
                  <li key={step.type} className="gm-card" style={{ padding: '1.1rem' }}>
                    <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
                      <span
                        aria-hidden="true"
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          background: 'var(--accent-soft)',
                          color: 'var(--accent)',
                          display: 'grid',
                          placeItems: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          flexShrink: 0,
                        }}
                      >
                        {index + 1}
                      </span>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            color: 'var(--muted)',
                          }}
                        >
                          {step.type.replace(/-/g, ' ')}
                        </p>
                        <h3 style={{ margin: '0.15rem 0 0.2rem', fontSize: '1.05rem' }}>
                          <Link
                            href={`/product/${step.recommendation.product.id}`}
                            style={{ textDecoration: 'none' }}
                          >
                            {step.recommendation.product.brand}{' '}
                            {step.recommendation.product.name}
                          </Link>
                        </h3>
                        <p style={{ margin: '0 0 0.5rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
                          ${step.recommendation.product.price}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>{step.guidance}</p>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <MatchScore score={step.recommendation.score} size={44} />
                        <SaveButton productId={step.recommendation.product.id} />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {routine.notes.length > 0 && (
              <ul
                style={{
                  margin: '0.9rem 0 0',
                  paddingLeft: '1.1rem',
                  color: 'var(--muted)',
                  fontSize: '0.88rem',
                }}
              >
                {routine.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
    </div>
  );
}
