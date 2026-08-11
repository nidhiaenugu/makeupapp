'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ChoiceGroup } from '@/components/form/Choice';
import { DepthPicker } from '@/components/form/DepthPicker';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  COVERAGE_LEVELS,
  EXPERIENCE_LEVELS,
  FINISHES,
  GENDERS,
  GENDER_LABELS,
  HAIR_TEXTURES,
  HAIR_TYPES,
  POROSITIES,
  PREFERENCES,
  PRICE_TIERS,
  PRICE_TIER_RANGES,
  SCALP_TYPES,
  SKIN_TYPES,
  UNDERTONES,
  WEIGHTS,
  concernsForCategory,
} from '@/lib/domain/taxonomy';
import type { Category, PreferenceId, Undertone } from '@/lib/domain/taxonomy';
import type { UserProfile } from '@/lib/domain/types';
import { EMPTY_PROFILE } from '@/lib/profile/defaults';
import { loadProfile, saveProfile } from '@/lib/profile/storage';

/**
 * The quiz.
 *
 * Steps are computed from the categories the user picked, so someone who only
 * wants haircare is never asked about their undertone. The profile is saved to
 * localStorage on every change, so closing the tab mid-quiz loses nothing.
 */

type StepId = 'categories' | 'gender' | 'skin' | 'hair' | 'concerns' | 'preferences' | 'budget';

interface Step {
  id: StepId;
  title: string;
  subtitle: string;
}

const ALL_STEPS: Record<StepId, Step> = {
  categories: {
    id: 'categories',
    title: 'What are you shopping for?',
    subtitle: 'Pick everything you want recommendations for. You can change this later.',
  },
  gender: {
    id: 'gender',
    title: 'Who are these for?',
    subtitle: 'Most skincare and haircare works for anyone — this mainly narrows out products a brand markets specifically to one audience.',
  },
  skin: {
    id: 'skin',
    title: 'Tell us about your skin',
    subtitle: 'This drives which formulas we put in front of you — and which we hold back.',
  },
  hair: {
    id: 'hair',
    title: 'Tell us about your hair',
    subtitle: 'Texture and porosity matter more than hair type for picking the right products.',
  },
  concerns: {
    id: 'concerns',
    title: 'What would you like to work on?',
    subtitle: 'Pick in order of importance — the first thing you choose carries the most weight.',
  },
  preferences: {
    id: 'preferences',
    title: 'Any preferences or dealbreakers?',
    subtitle: 'Mark anything non-negotiable and we will exclude everything that fails it.',
  },
  budget: {
    id: 'budget',
    title: 'Budget and finish',
    subtitle: 'Last step — then we will show you your matches.',
  },
};

export function QuizFlow() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [stepIndex, setStepIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  // Restore any in-progress or previously completed profile.
  useEffect(() => {
    const stored = loadProfile();
    if (stored) setProfile(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveProfile(profile);
  }, [profile, hydrated]);

  const steps = useMemo<Step[]>(() => {
    const wantsSkin =
      profile.categories.includes('skincare') || profile.categories.includes('makeup');
    const wantsHair = profile.categories.includes('hair');

    return [
      ALL_STEPS.categories,
      ALL_STEPS.gender,
      ...(wantsSkin ? [ALL_STEPS.skin] : []),
      ...(wantsHair ? [ALL_STEPS.hair] : []),
      ALL_STEPS.concerns,
      ALL_STEPS.preferences,
      ALL_STEPS.budget,
    ];
  }, [profile.categories]);

  // Deselecting a category can shorten the flow out from under us.
  const safeIndex = Math.min(stepIndex, steps.length - 1);
  const step = steps[safeIndex]!;
  const isLast = safeIndex === steps.length - 1;
  const canAdvance =
    (step.id !== 'categories' || profile.categories.length > 0) &&
    (step.id !== 'gender' || profile.gender !== undefined);

  function update(patch: Partial<UserProfile>) {
    setProfile((current) => ({ ...current, ...patch }));
  }

  /** Toggle within an array field, preserving selection order. */
  function toggleIn<K extends 'categories' | 'concerns' | 'preferences' | 'mustHave'>(
    key: K,
    value: UserProfile[K][number],
  ) {
    setProfile((current) => {
      const list = current[key] as UserProfile[K][number][];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...current, [key]: next };
    });
  }

  function finish() {
    saveProfile(profile);
    router.push('/results');
  }

  if (!hydrated) {
    return <p style={{ color: 'var(--muted)' }}>Loading your answers…</p>;
  }

  return (
    <div style={{ display: 'grid', gap: '1.75rem' }}>
      <ProgressBar current={safeIndex} total={steps.length} />

      <header>
        <p
          style={{
            margin: 0,
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--accent)',
          }}
        >
          Step {safeIndex + 1} of {steps.length}
        </p>
        <h1 style={{ margin: '0.3rem 0 0.4rem', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)' }}>
          {step.title}
        </h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>{step.subtitle}</p>
      </header>

      <div className="gm-card" style={{ padding: '1.5rem', display: 'grid', gap: '1.75rem' }}>
        {step.id === 'categories' && (
          <ChoiceGroup
            legend="Categories"
            options={CATEGORIES.map((id) => ({
              value: id,
              label: CATEGORY_LABELS[id],
              hint: CATEGORY_HINTS[id],
            }))}
            selected={profile.categories}
            onSelect={(value) => toggleIn('categories', value)}
            multiple
          />
        )}

        {step.id === 'gender' && (
          <ChoiceGroup
            legend="Gender"
            options={GENDERS.map((id) => ({ value: id, label: GENDER_LABELS[id] }))}
            selected={profile.gender ? [profile.gender] : []}
            onSelect={(value) => update({ gender: profile.gender === value ? undefined : value })}
          />
        )}

        {step.id === 'skin' && (
          <>
            <ChoiceGroup
              legend="Skin type"
              description="Judge it a few hours after cleansing, with nothing on."
              options={[
                { value: 'dry' as const, label: 'Dry', hint: 'Tight, sometimes flaky' },
                { value: 'oily' as const, label: 'Oily', hint: 'Shiny all over by midday' },
                {
                  value: 'combination' as const,
                  label: 'Combination',
                  hint: 'Oily T-zone, drier cheeks',
                },
                { value: 'normal' as const, label: 'Normal', hint: 'Comfortable, fairly balanced' },
              ].filter((option) => SKIN_TYPES.includes(option.value))}
              selected={profile.skinType ? [profile.skinType] : []}
              onSelect={(value) =>
                update({ skinType: profile.skinType === value ? undefined : value })
              }
            />

            <ChoiceGroup
              legend="Does your skin react easily?"
              description="Stinging, flushing or breaking out when you try something new."
              options={[
                { value: 'yes' as const, label: 'Yes, it is reactive' },
                { value: 'no' as const, label: 'No, it handles most things' },
              ]}
              selected={[profile.sensitive ? 'yes' : 'no']}
              onSelect={(value) => update({ sensitive: value === 'yes' })}
            />

            <ChoiceGroup
              legend="Undertone"
              description="Silver jewellery tends to suit cool tones, gold suits warm."
              options={UNDERTONES.map((id) => ({
                value: id,
                label: UNDERTONE_LABELS[id].label,
                hint: UNDERTONE_LABELS[id].hint,
              }))}
              selected={profile.undertone ? [profile.undertone] : []}
              onSelect={(value) =>
                update({ undertone: profile.undertone === value ? undefined : value })
              }
            />

            <DepthPicker
              value={profile.depth}
              undertone={profile.undertone}
              onChange={(depth) => update({ depth })}
            />
          </>
        )}

        {step.id === 'hair' && (
          <>
            <ChoiceGroup
              legend="Hair type"
              options={HAIR_TYPES.map((id) => ({ value: id, label: capitalise(id) }))}
              selected={profile.hairType ? [profile.hairType] : []}
              onSelect={(value) =>
                update({ hairType: profile.hairType === value ? undefined : value })
              }
            />
            <ChoiceGroup
              legend="Strand thickness"
              description="Roll a single hair between your fingers — can you feel it?"
              options={HAIR_TEXTURES.map((id) => ({
                value: id,
                label: capitalise(id),
                hint: TEXTURE_HINTS[id],
              }))}
              selected={profile.hairTexture ? [profile.hairTexture] : []}
              onSelect={(value) =>
                update({ hairTexture: profile.hairTexture === value ? undefined : value })
              }
            />
            <ChoiceGroup
              legend="Porosity"
              description="Drop a clean strand in water. Floating means low porosity; sinking means high."
              options={POROSITIES.map((id) => ({
                value: id,
                label: capitalise(id),
                hint: POROSITY_HINTS[id],
              }))}
              selected={profile.porosity ? [profile.porosity] : []}
              onSelect={(value) =>
                update({ porosity: profile.porosity === value ? undefined : value })
              }
            />
            <ChoiceGroup
              legend="Scalp"
              options={SCALP_TYPES.map((id) => ({ value: id, label: capitalise(id) }))}
              selected={profile.scalpType ? [profile.scalpType] : []}
              onSelect={(value) =>
                update({ scalpType: profile.scalpType === value ? undefined : value })
              }
            />
            <ChoiceGroup
              legend="Is your hair coloured or chemically treated?"
              options={[
                { value: 'yes' as const, label: 'Yes' },
                { value: 'no' as const, label: 'No' },
              ]}
              selected={[profile.colourTreated ? 'yes' : 'no']}
              onSelect={(value) => update({ colourTreated: value === 'yes' })}
            />
          </>
        )}

        {step.id === 'concerns' && (
          <ConcernPicker
            categories={profile.categories}
            selected={profile.concerns}
            onToggle={(id) => toggleIn('concerns', id)}
          />
        )}

        {step.id === 'preferences' && (
          <PreferenceStep
            preferences={profile.preferences}
            mustHave={profile.mustHave}
            avoid={profile.avoidIngredients}
            onTogglePreference={(id) => toggleIn('preferences', id)}
            onToggleMustHave={(id) => {
              setProfile((current) => {
                const isMust = current.mustHave.includes(id);
                return {
                  ...current,
                  mustHave: isMust
                    ? current.mustHave.filter((p) => p !== id)
                    : [...current.mustHave, id],
                  // Promoting to must-have implies wanting it.
                  preferences:
                    !isMust && !current.preferences.includes(id)
                      ? [...current.preferences, id]
                      : current.preferences,
                };
              });
            }}
            onAvoidChange={(avoidIngredients) => update({ avoidIngredients })}
          />
        )}

        {step.id === 'budget' && (
          <>
            <ChoiceGroup
              legend="Where do you usually shop?"
              description="A preference, not a limit — we will still show a standout outside it."
              options={PRICE_TIERS.map((id) => ({
                value: id,
                label: capitalise(id),
                hint: PRICE_TIER_RANGES[id].label,
              }))}
              selected={profile.budget.preferredTier ? [profile.budget.preferredTier] : []}
              onSelect={(value) =>
                update({
                  budget: {
                    ...profile.budget,
                    preferredTier: profile.budget.preferredTier === value ? undefined : value,
                  },
                })
              }
            />

            <div>
              <label htmlFor="budget-max" style={{ fontWeight: 600, display: 'block' }}>
                Hard limit per product
              </label>
              <p style={{ margin: '0.2rem 0 0.6rem', color: 'var(--muted)', fontSize: '0.87rem' }}>
                Nothing above this will be recommended at all. Currently $
                {profile.budget.max >= 1000 ? 'no limit' : profile.budget.max}.
              </p>
              <input
                id="budget-max"
                type="range"
                min={10}
                max={200}
                step={5}
                value={Math.min(profile.budget.max, 200)}
                onChange={(event) => {
                  const raw = Number(event.target.value);
                  update({ budget: { ...profile.budget, max: raw >= 200 ? 1000 : raw } });
                }}
                style={{ width: '100%', maxWidth: 420, accentColor: 'var(--accent)' }}
              />
            </div>

            <ChoiceGroup
              legend="How experienced are you with active ingredients?"
              description="We hold back the strongest formulas from beginners on purpose."
              options={EXPERIENCE_LEVELS.map((id) => ({
                value: id,
                label: capitalise(id),
                hint: EXPERIENCE_HINTS[id],
              }))}
              selected={[profile.experience]}
              onSelect={(value) => update({ experience: value })}
            />

            {profile.categories.includes('makeup') && (
              <>
                <ChoiceGroup
                  legend="Preferred finish"
                  options={FINISHES.map((id) => ({ value: id, label: capitalise(id) }))}
                  selected={profile.finishPreference ? [profile.finishPreference] : []}
                  onSelect={(value) =>
                    update({
                      finishPreference: profile.finishPreference === value ? undefined : value,
                    })
                  }
                />
                <ChoiceGroup
                  legend="Preferred coverage"
                  options={COVERAGE_LEVELS.map((id) => ({ value: id, label: capitalise(id) }))}
                  selected={profile.coveragePreference ? [profile.coveragePreference] : []}
                  onSelect={(value) =>
                    update({
                      coveragePreference: profile.coveragePreference === value ? undefined : value,
                    })
                  }
                />
              </>
            )}

            <ChoiceGroup
              legend="How do you like formulas to feel?"
              options={WEIGHTS.map((id) => ({
                value: id,
                label: capitalise(id),
                hint: TEXTURE_PREF_HINTS[id],
              }))}
              selected={profile.texturePreference ? [profile.texturePreference] : []}
              onSelect={(value) =>
                update({
                  texturePreference: profile.texturePreference === value ? undefined : value,
                })
              }
            />
          </>
        )}
      </div>

      <nav style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          className="gm-btn gm-btn-secondary"
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          disabled={safeIndex === 0}
        >
          Back
        </button>

        {isLast ? (
          <button type="button" className="gm-btn" onClick={finish} disabled={!canAdvance}>
            See my matches →
          </button>
        ) : (
          <button
            type="button"
            className="gm-btn"
            onClick={() => setStepIndex(safeIndex + 1)}
            disabled={!canAdvance}
          >
            Continue
          </button>
        )}

        {!canAdvance && (
          <span style={{ color: 'var(--muted)', fontSize: '0.87rem' }}>
            {step.id === 'categories'
              ? 'Pick at least one category to continue.'
              : 'Choose an option to continue.'}
          </span>
        )}

        {safeIndex > 0 && profile.categories.length > 0 && (
          <button
            type="button"
            onClick={finish}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 0,
              color: 'var(--muted)',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '0.87rem',
            }}
          >
            Skip the rest and show results
          </button>
        )}
      </nav>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressBar({ current, total }: { current: number; total: number }) {
  const percent = ((current + 1) / total) * 100;
  return (
    <div
      role="progressbar"
      aria-valuenow={current + 1}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label="Quiz progress"
      style={{ height: 6, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}
    >
      <div
        style={{
          width: `${percent}%`,
          height: '100%',
          background: 'var(--accent)',
          transition: 'width 0.25s ease',
        }}
      />
    </div>
  );
}

function ConcernPicker({
  categories,
  selected,
  onToggle,
}: {
  categories: Category[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: '1.75rem' }}>
      {selected.length > 0 && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 12,
            background: 'var(--accent-soft)',
            fontSize: '0.87rem',
          }}
        >
          <strong>Your priority order:</strong>{' '}
          {selected.map((id, index) => (
            <span key={id}>
              {index > 0 ? ' → ' : ''}
              {index + 1}. {concernLabel(id)}
            </span>
          ))}
        </div>
      )}

      {categories.map((category) => (
        <ChoiceGroup
          key={category}
          legend={`${CATEGORY_LABELS[category]} concerns`}
          options={concernsForCategory(category).map((concern) => ({
            value: concern.id,
            label: concern.label,
            hint: concern.hint,
          }))}
          selected={selected}
          onSelect={onToggle}
          multiple
        />
      ))}
    </div>
  );
}

function PreferenceStep({
  preferences,
  mustHave,
  avoid,
  onTogglePreference,
  onToggleMustHave,
  onAvoidChange,
}: {
  preferences: PreferenceId[];
  mustHave: PreferenceId[];
  avoid: string[];
  onTogglePreference: (id: PreferenceId) => void;
  onToggleMustHave: (id: PreferenceId) => void;
  onAvoidChange: (values: string[]) => void;
}) {
  const groups = ['sensitivity', 'ethics', 'formulation'] as const;
  const groupLabels = {
    sensitivity: 'Skin sensitivity',
    ethics: 'Ethics and packaging',
    formulation: 'Formulation',
  };

  return (
    <div style={{ display: 'grid', gap: '1.75rem' }}>
      {groups.map((group) => (
        <fieldset key={group} style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600, marginBottom: '0.6rem' }}>{groupLabels[group]}</legend>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {PREFERENCES.filter((p) => p.group === group).map((pref) => {
              const wanted = preferences.includes(pref.id);
              const required = mustHave.includes(pref.id);
              return (
                <div
                  key={pref.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                    padding: '0.6rem 0.85rem',
                    borderRadius: 12,
                    border: `1px solid ${wanted ? 'var(--accent)' : 'var(--border)'}`,
                    background: wanted ? 'var(--accent-soft)' : 'var(--surface)',
                  }}
                >
                  <button
                    type="button"
                    aria-pressed={wanted}
                    onClick={() => onTogglePreference(pref.id)}
                    style={{
                      flex: 1,
                      minWidth: 180,
                      textAlign: 'left',
                      background: 'none',
                      border: 0,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <span style={{ fontWeight: wanted ? 600 : 500 }}>
                      {wanted ? '✓ ' : ''}
                      {pref.label}
                    </span>
                    <span
                      style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)' }}
                    >
                      {pref.hint}
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-pressed={required}
                    onClick={() => onToggleMustHave(pref.id)}
                    title="Exclude everything that fails this"
                    style={{
                      padding: '0.3rem 0.7rem',
                      borderRadius: 999,
                      border: `1px solid ${required ? 'var(--accent)' : 'var(--border)'}`,
                      background: required ? 'var(--accent)' : 'transparent',
                      color: required ? 'var(--accent-text)' : 'var(--muted)',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {required ? 'Dealbreaker' : 'Make dealbreaker'}
                  </button>
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div>
        <label htmlFor="avoid" style={{ fontWeight: 600, display: 'block' }}>
          Ingredients to avoid
        </label>
        <p style={{ margin: '0.2rem 0 0.6rem', color: 'var(--muted)', fontSize: '0.87rem' }}>
          Comma-separated. Anything listing these is removed entirely — useful for allergies.
        </p>
        <input
          id="avoid"
          className="gm-input"
          placeholder="e.g. coconut oil, essential oils, salicylic acid"
          defaultValue={avoid.join(', ')}
          onChange={(event) =>
            onAvoidChange(
              event.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          style={{ maxWidth: 520 }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

const CATEGORY_HINTS: Record<Category, string> = {
  skincare: 'Cleansers, serums, moisturisers, SPF',
  makeup: 'Base, colour, shade matching',
  hair: 'Wash day, styling, scalp care',
};

const UNDERTONE_LABELS: Record<Undertone, { label: string; hint: string }> = {
  cool: { label: 'Cool', hint: 'Pink or red cast; veins look blue' },
  neutral: { label: 'Neutral', hint: 'A mix; neither obviously pink nor gold' },
  warm: { label: 'Warm', hint: 'Golden or peachy; veins look green' },
  olive: { label: 'Olive', hint: 'A green or grey cast alongside warmth' },
};

const TEXTURE_HINTS: Record<string, string> = {
  fine: 'Barely detectable between your fingers',
  medium: 'You can just about feel it',
  coarse: 'Distinctly thick and wiry',
};

const POROSITY_HINTS: Record<string, string> = {
  low: 'Repels water; product sits on top',
  medium: 'Absorbs and holds moisture well',
  high: 'Soaks up product and dries quickly',
};

const EXPERIENCE_HINTS: Record<string, string> = {
  beginner: 'New to retinoids and acids',
  intermediate: 'Comfortable with one or two actives',
  advanced: 'Happy with strong retinoids and acids',
};

const TEXTURE_PREF_HINTS: Record<string, string> = {
  light: 'Gel and water textures',
  medium: 'Standard lotions and creams',
  rich: 'Balms, butters and thick creams',
};

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
}

function concernLabel(id: string): string {
  for (const category of CATEGORIES) {
    const found = concernsForCategory(category).find((c) => c.id === id);
    if (found) return found.label;
  }
  return id;
}
