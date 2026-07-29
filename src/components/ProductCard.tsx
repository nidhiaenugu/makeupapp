import Link from 'next/link';
import { CONCERN_BY_ID } from '@/lib/domain/taxonomy';
import type { Recommendation } from '@/lib/domain/types';
import { MatchScore } from './MatchScore';
import { SaveButton } from './SaveButton';
import { ShadeSwatch } from './ShadeSwatch';

/**
 * A recommendation card.
 *
 * The score and the top reason sit together at the top: the whole point of the
 * app is that a user can see *why* something was picked without clicking in.
 */
export function ProductCard({ recommendation }: { recommendation: Recommendation }) {
  const { product, score, reasons, shadeMatch } = recommendation;
  const positives = reasons.filter((r) => r.polarity === 'positive').slice(0, 2);
  const tradeOff = reasons.find((r) => r.polarity === 'negative');

  return (
    <article
      className="gm-card"
      style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
    >
      <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
        <MatchScore score={score} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--muted)',
            }}
          >
            {product.brand}
          </p>
          <h3 style={{ margin: '0.15rem 0 0', fontSize: '1.05rem' }}>
            <Link href={`/product/${product.id}`} style={{ textDecoration: 'none' }}>
              {product.name}
            </Link>
          </h3>
          <p style={{ margin: '0.3rem 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
            {product.type.replace(/-/g, ' ')} · ${product.price}
            {product.size ? ` · ${product.size}` : ''}
          </p>
        </div>
        <SaveButton productId={product.id} />
      </div>

      {positives.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.3rem' }}>
          {positives.map((reason, index) => (
            <li
              key={`${reason.factor}-${index}`}
              style={{ fontSize: '0.87rem', display: 'flex', gap: '0.45rem' }}
            >
              <span aria-hidden="true" style={{ color: 'var(--positive)' }}>
                ✓
              </span>
              <span>{reason.message}</span>
            </li>
          ))}
        </ul>
      )}

      {tradeOff && (
        <p
          style={{
            margin: 0,
            fontSize: '0.83rem',
            color: 'var(--warning)',
            display: 'flex',
            gap: '0.45rem',
          }}
        >
          <span aria-hidden="true">!</span>
          <span>{tradeOff.message}</span>
        </p>
      )}

      {shadeMatch && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.83rem' }}>
          <ShadeSwatch shade={shadeMatch.shade} size={20} />
          <span style={{ color: 'var(--muted)' }}>
            Best shade: <strong style={{ color: 'var(--text)' }}>{shadeMatch.shade.name}</strong>
          </span>
        </div>
      )}

      {recommendation.addressesConcerns.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: 'auto' }}>
          {recommendation.addressesConcerns.slice(0, 3).map((concern) => (
            <span key={concern} className="gm-chip">
              {CONCERN_BY_ID[concern]?.label ?? concern}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
