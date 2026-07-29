'use client';

import { DEPTH_LABELS, DEPTH_MAX, DEPTH_MIN } from '@/lib/domain/taxonomy';
import type { Undertone } from '@/lib/domain/taxonomy';

/**
 * Depth picker for shade matching.
 *
 * Swatches are tinted by the selected undertone so the scale looks like the
 * user's own skin rather than a generic beige ramp — an undertone choice the
 * user has already made should visibly change what they are choosing between.
 */

const BASE_RAMP: Record<number, string> = {
  1: '#f5ddd0',
  2: '#efd0bd',
  3: '#e8c1a6',
  4: '#ddb193',
  5: '#cf9b7b',
  6: '#bd8562',
  7: '#a66c4a',
  8: '#8b5539',
  9: '#6d412b',
  10: '#4e2c1c',
};

/** Per-channel nudges, applied to the neutral ramp. */
const UNDERTONE_SHIFT: Record<Undertone, [number, number, number]> = {
  cool: [4, -3, 6],
  neutral: [0, 0, 0],
  warm: [6, 2, -8],
  olive: [-4, 3, -6],
};

function tint(hex: string, undertone: Undertone | undefined): string {
  if (!undertone) return hex;
  const shift = UNDERTONE_SHIFT[undertone];
  const channels = [1, 3, 5].map((start, index) => {
    const value = parseInt(hex.slice(start, start + 2), 16) + shift[index]!;
    return Math.min(255, Math.max(0, value)).toString(16).padStart(2, '0');
  });
  return `#${channels.join('')}`;
}

export function DepthPicker({
  value,
  undertone,
  onChange,
}: {
  value: number | undefined;
  undertone: Undertone | undefined;
  onChange: (depth: number) => void;
}) {
  const steps = Array.from({ length: DEPTH_MAX - DEPTH_MIN + 1 }, (_, i) => DEPTH_MIN + i);

  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend style={{ fontWeight: 600, marginBottom: '0.2rem' }}>Skin depth</legend>
      <p style={{ margin: '0 0 0.7rem', color: 'var(--muted)', fontSize: '0.87rem' }}>
        Pick the swatch closest to your jawline in daylight. Only used to match foundation and
        concealer shades.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {steps.map((depth) => {
          const isSelected = value === depth;
          return (
            <button
              key={depth}
              type="button"
              aria-pressed={isSelected}
              aria-label={`Depth ${depth} — ${DEPTH_LABELS[depth]}`}
              title={DEPTH_LABELS[depth]}
              onClick={() => onChange(depth)}
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: tint(BASE_RAMP[depth]!, undertone),
                border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                boxShadow: isSelected ? '0 0 0 3px var(--accent-soft)' : 'none',
                cursor: 'pointer',
              }}
            />
          );
        })}
      </div>
      {value !== undefined && (
        <p style={{ margin: '0.6rem 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
          Selected: <strong style={{ color: 'var(--text)' }}>{DEPTH_LABELS[value]}</strong>
        </p>
      )}
    </fieldset>
  );
}
