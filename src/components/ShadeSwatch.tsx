import type { Shade } from '@/lib/domain/types';

/** A single shade circle. Title carries the detail for hover and screen readers. */
export function ShadeSwatch({
  shade,
  size = 28,
  highlighted = false,
}: {
  shade: Shade;
  size?: number;
  highlighted?: boolean;
}) {
  return (
    <span
      title={`${shade.name} — depth ${shade.depth}, ${shade.undertone} undertone`}
      aria-label={`${shade.name}, ${shade.undertone} undertone`}
      role="img"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: shade.hex,
        border: highlighted ? '2px solid var(--accent)' : '1px solid var(--border)',
        boxShadow: highlighted ? '0 0 0 3px var(--accent-soft)' : 'none',
        flexShrink: 0,
      }}
    />
  );
}
