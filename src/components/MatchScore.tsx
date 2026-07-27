'use client';

/**
 * The match score dial.
 *
 * Score is shown as a ring rather than a bare number so it reads at a glance,
 * and the colour is banded (strong / good / partial) rather than a continuous
 * gradient — a 71 and a 74 should not look meaningfully different.
 */
export function MatchScore({ score, size = 56 }: { score: number; size?: number }) {
  const band = score >= 80 ? 'strong' : score >= 60 ? 'good' : 'partial';
  const colour =
    band === 'strong' ? 'var(--positive)' : band === 'good' ? 'var(--accent)' : 'var(--muted)';

  const stroke = Math.max(3, size * 0.09);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.min(100, Math.max(0, score)) / 100) * circumference;

  const label =
    band === 'strong' ? 'Strong match' : band === 'good' ? 'Good match' : 'Partial match';

  return (
    <div
      style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}
      role="img"
      aria-label={`${label}: ${score} out of 100`}
      title={label}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colour}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
        />
      </svg>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          fontSize: size * 0.3,
          fontWeight: 700,
          color: colour,
        }}
      >
        {score}
      </span>
    </div>
  );
}
