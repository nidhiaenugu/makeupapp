'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MatchScore } from '@/components/MatchScore';
import { ShadeSwatch } from '@/components/ShadeSwatch';
import { checkExclusion, describeShadeMatch, scoreProduct } from '@/lib/engine';
import { bestShadeFor } from '@/lib/engine';
import type { MatchReason, Product, ShadeMatch, UserProfile } from '@/lib/domain/types';
import { loadProfile } from '@/lib/profile/storage';

interface Fit {
  score: number;
  reasons: MatchReason[];
  shadeMatch?: ShadeMatch;
  excluded?: string;
}

/**
 * "How this scores for you" on a product page.
 *
 * Fetches the single product from the API and scores it in the browser with
 * the same engine the server uses — importing the pure scoring module costs a
 * few kilobytes and avoids an endpoint that exists only for one card.
 */
export function PersonalFit({ productId }: { productId: string }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fit, setFit] = useState<Fit | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const stored = loadProfile();
    setProfile(stored);

    if (!stored || stored.categories.length === 0) {
      setChecked(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) throw new Error('not found');
        const body = (await response.json()) as { data: Product };
        if (cancelled) return;

        const product = body.data;
        const exclusion = checkExclusion(product, stored);
        const breakdown = scoreProduct(product, stored);

        setFit({
          score: breakdown.score,
          reasons: breakdown.reasons,
          shadeMatch: bestShadeFor(product, stored),
          // "Outside the categories you chose" is not a warning worth showing
          // on a page the user navigated to deliberately.
          excluded:
            exclusion.excluded && exclusion.reason !== 'category' ? exclusion.detail : undefined,
        });
      } catch {
        if (!cancelled) setFit(null);
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (!checked) return null;

  if (!profile || profile.categories.length === 0) {
    return (
      <aside
        className="gm-card"
        style={{ padding: '1.1rem 1.35rem', borderLeft: '3px solid var(--accent)' }}
      >
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          <Link href="/quiz">Take the quiz</Link> to see how well this scores for your skin, hair
          and priorities.
        </p>
      </aside>
    );
  }

  if (!fit) return null;

  const positives = fit.reasons.filter((r) => r.polarity === 'positive');
  const negatives = fit.reasons.filter((r) => r.polarity === 'negative');

  return (
    <section className="gm-card" style={{ padding: '1.35rem' }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <MatchScore score={fit.score} size={68} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ margin: '0 0 0.2rem', fontSize: '1.15rem' }}>How this scores for you</h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
            Based on the answers you gave in the quiz.{' '}
            <Link href="/quiz">Update them</Link>.
          </p>
        </div>
      </div>

      {fit.excluded && (
        <p
          style={{
            margin: '1rem 0 0',
            padding: '0.7rem 0.9rem',
            borderRadius: 10,
            background: 'var(--surface-2)',
            color: 'var(--warning)',
            fontSize: '0.9rem',
          }}
        >
          <strong>Filtered out of your results:</strong> {fit.excluded}.
        </p>
      )}

      {positives.length > 0 && (
        <ul style={{ margin: '1rem 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: '0.4rem' }}>
          {positives.map((reason, index) => (
            <li key={index} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.92rem' }}>
              <span aria-hidden="true" style={{ color: 'var(--positive)' }}>
                ✓
              </span>
              <span>{reason.message}</span>
              <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: '0.8rem' }}>
                +{reason.impact}
              </span>
            </li>
          ))}
        </ul>
      )}

      {negatives.length > 0 && (
        <ul style={{ margin: '0.6rem 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: '0.4rem' }}>
          {negatives.map((reason, index) => (
            <li
              key={index}
              style={{ display: 'flex', gap: '0.5rem', fontSize: '0.92rem', color: 'var(--warning)' }}
            >
              <span aria-hidden="true">!</span>
              <span>{reason.message}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>{reason.impact}</span>
            </li>
          ))}
        </ul>
      )}

      {fit.shadeMatch && (
        <div
          style={{
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.7rem',
          }}
        >
          <ShadeSwatch shade={fit.shadeMatch.shade} size={34} highlighted />
          <p style={{ margin: 0, fontSize: '0.92rem' }}>
            {describeShadeMatch(fit.shadeMatch, profile)}
          </p>
        </div>
      )}
    </section>
  );
}
