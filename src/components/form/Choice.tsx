'use client';

/**
 * Selectable pills used throughout the quiz.
 *
 * Rendered as real <button> elements with `aria-pressed` rather than styled
 * checkboxes: it keeps keyboard and screen-reader behaviour correct without
 * fighting native input styling.
 */

export interface ChoiceOption<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
}

export function ChoiceGroup<T extends string | number>({
  legend,
  description,
  options,
  selected,
  onSelect,
  multiple = false,
  columns,
}: {
  legend: string;
  description?: string;
  options: ChoiceOption<T>[];
  selected: T[];
  onSelect: (value: T) => void;
  multiple?: boolean;
  columns?: number;
}) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend style={{ fontWeight: 600, marginBottom: description ? '0.2rem' : '0.6rem' }}>
        {legend}
      </legend>
      {description && (
        <p style={{ margin: '0 0 0.7rem', color: 'var(--muted)', fontSize: '0.87rem' }}>
          {description}
        </p>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: columns
            ? `repeat(auto-fit, minmax(${Math.floor(600 / columns)}px, 1fr))`
            : 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.55rem',
        }}
      >
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(option.value)}
              style={{
                textAlign: 'left',
                padding: '0.7rem 0.9rem',
                borderRadius: 12,
                border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                background: isSelected ? 'var(--accent-soft)' : 'var(--surface)',
                cursor: 'pointer',
                transition: 'border-color 0.12s ease, background 0.12s ease',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: isSelected ? 600 : 500,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: multiple ? 4 : '50%',
                    border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                    background: isSelected ? 'var(--accent)' : 'transparent',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--accent-text)',
                    fontSize: 11,
                    flexShrink: 0,
                  }}
                >
                  {isSelected ? '✓' : ''}
                </span>
                {option.label}
              </span>
              {option.hint && (
                <span
                  style={{
                    display: 'block',
                    marginTop: '0.25rem',
                    marginLeft: '2.05rem',
                    fontSize: '0.8rem',
                    color: 'var(--muted)',
                  }}
                >
                  {option.hint}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
