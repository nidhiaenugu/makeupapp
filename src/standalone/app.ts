/**
 * Standalone single-file build of GlowMatch.
 *
 * This is a vanilla-DOM front end over the *real* engine and catalog — it
 * imports them directly rather than reimplementing anything, so the hosted
 * single-file version can never drift from the Next.js app. `scripts/
 * build-standalone.ts` bundles this with esbuild and inlines the result into
 * one self-contained HTML file with no network dependencies.
 */
import { bundledCatalog } from '@/lib/data/json-provider';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CONCERN_BY_ID,
  COVERAGE_LEVELS,
  DEPTH_LABELS,
  DEPTH_MIN,
  EXPERIENCE_LEVELS,
  FINISHES,
  HAIR_TEXTURES,
  HAIR_TYPES,
  POROSITIES,
  PREFERENCES,
  PREFERENCE_BY_ID,
  PRICE_TIERS,
  PRICE_TIER_RANGES,
  SCALP_TYPES,
  SKIN_TYPES,
  UNDERTONES,
  WEIGHTS as TEXTURE_WEIGHTS,
  concernsForCategory,
  priceTierFor,
} from '@/lib/domain/taxonomy';
import type { Category, Undertone } from '@/lib/domain/taxonomy';
import { bestShadeFor, buildRoutine, describeShadeMatch, recommend, scoreProduct } from '@/lib/engine';
import type { Product, Recommendation, UserProfile } from '@/lib/domain/types';
import { userProfileSchema } from '@/lib/domain/schemas';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const PROFILE_KEY = 'gm-profile';
const SAVED_KEY = 'gm-saved';
const THEME_KEY = 'gm-theme';

const EMPTY: UserProfile = {
  categories: [],
  sensitive: false,
  colourTreated: false,
  concerns: [],
  preferences: [],
  mustHave: [],
  avoidIngredients: [],
  budget: { max: 1000 },
  experience: 'beginner',
};

const profile: UserProfile = loadProfile();
let saved: string[] = loadSaved();
let quizStep = 0;

function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return EMPTY;
    const parsed = userProfileSchema.safeParse(JSON.parse(raw));
    return parsed.success ? (parsed.data as UserProfile) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function persist() {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* private browsing — the session still works */
  }
}

function loadSaved(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function persistSaved() {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const esc = (value: unknown): string =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

const titleCase = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');

const byId = new Map(bundledCatalog.map((p) => [p.id, p]));

/** Score band drives colour and label — 71 and 74 should not look different. */
function band(score: number): 'strong' | 'good' | 'partial' {
  return score >= 80 ? 'strong' : score >= 60 ? 'good' : 'partial';
}

function scoreRing(score: number, size = 52): string {
  const stroke = Math.max(3, size * 0.095);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * c;
  const label = { strong: 'Strong match', good: 'Good match', partial: 'Partial match' }[
    band(score)
  ];
  return `<span class="ring ring--${band(score)}" style="width:${size}px;height:${size}px"
      role="img" aria-label="${label}: ${score} out of 100" title="${label}">
    <svg width="${size}" height="${size}" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--rule)" stroke-width="${stroke}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="currentColor"
        stroke-width="${stroke}" stroke-linecap="round"
        stroke-dasharray="${filled} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    </svg>
    <b style="font-size:${Math.round(size * 0.31)}px">${score}</b>
  </span>`;
}

function heart(id: string): string {
  const on = saved.includes(id);
  return `<button class="heart${on ? ' is-on' : ''}" data-save="${esc(id)}"
    aria-pressed="${on}" aria-label="${on ? 'Remove from saved' : 'Save this product'}">
    ${on ? '&#9829;' : '&#9825;'}</button>`;
}

/** The swatch motif: a pigment chip, used for shades and the depth ladder. */
function swatch(hex: string, size = 22, on = false): string {
  return `<span class="chip-swatch${on ? ' is-on' : ''}" style="width:${size}px;height:${size}px;background:${esc(hex)}"></span>`;
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

type Route = { name: string; param?: string };

function route(): Route {
  const hash = location.hash.replace(/^#\/?/, '');
  const [name = '', param] = hash.split('/');
  return { name: name || 'home', param };
}

function go(path: string) {
  location.hash = `#/${path}`;
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

function viewHome(): string {
  const counts = CATEGORIES.map(
    (c) => `${bundledCatalog.filter((p) => p.category === c).length} ${CATEGORY_LABELS[c].toLowerCase()}`,
  ).join(' · ');

  const started = profile.categories.length > 0;

  return `
  <section class="hero">
    <p class="eyebrow">Makeup · Skincare · Hair</p>
    <h1>Stop guessing which products suit you.</h1>
    <p class="lede">Answer a few questions about your skin, hair and what you actually care about.
      GlowMatch scores ${bundledCatalog.length} products against your profile and shows you
      the reasoning behind every match — including the trade-offs.</p>
    <div class="row">
      <a class="btn" href="#/quiz">${started ? 'Continue the quiz' : 'Start the quiz'}</a>
      ${started ? '<a class="btn btn--ghost" href="#/results">See my matches</a>' : '<a class="btn btn--ghost" href="#/browse">Browse products</a>'}
    </div>
    <p class="micro">${counts}. Everything stays on your phone.</p>
  </section>

  <section class="stack">
    ${[
      ['It shows its working', 'Every match lists the specific reasons it scored where it did — no black box.'],
      ['It tells you the bad news', 'If something treats your acne but will worsen your dryness, that is on the card.'],
      ['Dealbreakers are absolute', 'Mark fragrance-free as a dealbreaker and failing products are removed, not just ranked lower.'],
      ['Shade matching that admits defeat', 'It says plainly when a foundation range does not extend to your skin.'],
    ]
      .map(
        ([t, b]) => `<article class="card card--tight">
          <h3>${esc(t)}</h3><p class="muted">${esc(b)}</p></article>`,
      )
      .join('')}
  </section>`;
}

// --- quiz -------------------------------------------------------------------

type StepId = 'categories' | 'skin' | 'hair' | 'concerns' | 'prefs' | 'budget';

function steps(): StepId[] {
  const skin = profile.categories.includes('skincare') || profile.categories.includes('makeup');
  const hair = profile.categories.includes('hair');
  return [
    'categories',
    ...(skin ? (['skin'] as StepId[]) : []),
    ...(hair ? (['hair'] as StepId[]) : []),
    'concerns',
    'prefs',
    'budget',
  ];
}

const STEP_COPY: Record<StepId, [string, string]> = {
  categories: ['What are you shopping for?', 'Pick everything you want recommendations for.'],
  skin: ['About your skin', 'This decides which formulas we show you — and which we hold back.'],
  hair: ['About your hair', 'Texture and porosity matter more than hair type for picking products.'],
  concerns: [
    'What would you like to work on?',
    'Tap in order of importance — the first one you pick counts for the most.',
  ],
  prefs: ['Preferences and dealbreakers', 'Mark anything non-negotiable and we exclude what fails it.'],
  budget: ['Budget and finish', 'Last step, then we will show you your matches.'],
};

/** Pill group. `k` names the profile field the pill writes to. */
function pills(
  k: string,
  options: Array<{ v: string; label: string; hint?: string }>,
  selected: string[],
  multi = false,
): string {
  return `<div class="pills">
    ${options
      .map(
        (o) => `<button class="pill${selected.includes(o.v) ? ' is-on' : ''}" data-set="${k}" data-v="${esc(o.v)}"
        aria-pressed="${selected.includes(o.v)}">
        <span class="pill__mark${multi ? ' pill__mark--box' : ''}" aria-hidden="true"></span>
        <span><b>${esc(o.label)}</b>${o.hint ? `<i>${esc(o.hint)}</i>` : ''}</span>
      </button>`,
      )
      .join('')}
  </div>`;
}

function field(legend: string, help: string, body: string): string {
  return `<fieldset class="field">
    <legend>${esc(legend)}</legend>
    ${help ? `<p class="muted small">${esc(help)}</p>` : ''}
    ${body}
  </fieldset>`;
}

/** Neutral skin ramp, nudged per undertone so the ladder looks like real skin. */
const RAMP = [
  '#f5ddd0', '#efd0bd', '#e8c1a6', '#ddb193', '#cf9b7b',
  '#bd8562', '#a66c4a', '#8b5539', '#6d412b', '#4e2c1c',
];
const SHIFT: Record<Undertone, [number, number, number]> = {
  cool: [4, -3, 6],
  neutral: [0, 0, 0],
  warm: [6, 2, -8],
  olive: [-4, 3, -6],
};

function tint(hex: string, u: Undertone | undefined): string {
  if (!u) return hex;
  const s = SHIFT[u];
  return (
    '#' +
    [1, 3, 5]
      .map((start, i) =>
        Math.min(255, Math.max(0, parseInt(hex.slice(start, start + 2), 16) + s[i]!))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

function viewQuiz(): string {
  const list = steps();
  const idx = Math.min(quizStep, list.length - 1);
  const step = list[idx]!;
  const [title, sub] = STEP_COPY[step];
  let body = '';

  if (step === 'categories') {
    body = pills(
      'categories',
      CATEGORIES.map((c) => ({
        v: c,
        label: CATEGORY_LABELS[c],
        hint: {
          skincare: 'Cleansers, serums, SPF',
          makeup: 'Base, colour, shade matching',
          hair: 'Wash day, styling, scalp',
        }[c],
      })),
      profile.categories,
      true,
    );
  }

  if (step === 'skin') {
    body =
      field(
        'Skin type',
        'Judge it a few hours after cleansing, with nothing on.',
        pills(
          'skinType',
          SKIN_TYPES.map((s) => ({
            v: s,
            label: titleCase(s),
            hint: {
              dry: 'Tight, sometimes flaky',
              oily: 'Shiny all over by midday',
              combination: 'Oily T-zone, drier cheeks',
              normal: 'Comfortable and balanced',
            }[s],
          })),
          profile.skinType ? [profile.skinType] : [],
        ),
      ) +
      field(
        'Does your skin react easily?',
        'Stinging, flushing or breaking out when you try something new.',
        pills(
          'sensitive',
          [
            { v: 'yes', label: 'Yes, it is reactive' },
            { v: 'no', label: 'No, it handles most things' },
          ],
          [profile.sensitive ? 'yes' : 'no'],
        ),
      ) +
      field(
        'Undertone',
        'Silver jewellery tends to suit cool tones; gold suits warm.',
        pills(
          'undertone',
          UNDERTONES.map((u) => ({
            v: u,
            label: titleCase(u),
            hint: {
              cool: 'Pink cast, veins look blue',
              neutral: 'Neither obviously pink nor gold',
              warm: 'Golden cast, veins look green',
              olive: 'A green or grey cast with warmth',
            }[u],
          })),
          profile.undertone ? [profile.undertone] : [],
        ),
      ) +
      field(
        'Skin depth',
        'Pick the chip closest to your jawline in daylight. Only used for foundation and concealer shades.',
        `<div class="ladder">${RAMP.map((hex, i) => {
          const depth = DEPTH_MIN + i;
          const on = profile.depth === depth;
          return `<button class="ladder__chip${on ? ' is-on' : ''}" data-set="depth" data-v="${depth}"
            aria-pressed="${on}" aria-label="Depth ${depth}, ${DEPTH_LABELS[depth]}"
            title="${esc(DEPTH_LABELS[depth]!)}" style="background:${tint(hex, profile.undertone)}"></button>`;
        }).join('')}</div>
        ${profile.depth ? `<p class="muted small">Selected: <b>${esc(DEPTH_LABELS[profile.depth]!)}</b></p>` : ''}`,
      );
  }

  if (step === 'hair') {
    body =
      field('Hair type', '', pills('hairType', HAIR_TYPES.map((h) => ({ v: h, label: titleCase(h) })), profile.hairType ? [profile.hairType] : [])) +
      field(
        'Strand thickness',
        'Roll one hair between your fingers — can you feel it?',
        pills(
          'hairTexture',
          HAIR_TEXTURES.map((t) => ({
            v: t,
            label: titleCase(t),
            hint: { fine: 'Barely detectable', medium: 'You can just feel it', coarse: 'Thick and wiry' }[t],
          })),
          profile.hairTexture ? [profile.hairTexture] : [],
        ),
      ) +
      field(
        'Porosity',
        'Drop a clean strand in water. Floating is low; sinking is high.',
        pills(
          'porosity',
          POROSITIES.map((p) => ({
            v: p,
            label: titleCase(p),
            hint: { low: 'Repels water', medium: 'Holds moisture well', high: 'Soaks up product, dries fast' }[p],
          })),
          profile.porosity ? [profile.porosity] : [],
        ),
      ) +
      field('Scalp', '', pills('scalpType', SCALP_TYPES.map((s) => ({ v: s, label: titleCase(s) })), profile.scalpType ? [profile.scalpType] : [])) +
      field(
        'Coloured or chemically treated?',
        '',
        pills('colourTreated', [{ v: 'yes', label: 'Yes' }, { v: 'no', label: 'No' }], [profile.colourTreated ? 'yes' : 'no']),
      );
  }

  if (step === 'concerns') {
    const order =
      profile.concerns.length > 0
        ? `<div class="priority"><b>Priority order</b>${profile.concerns
            .map((c, i) => `<span>${i + 1}. ${esc(CONCERN_BY_ID[c]?.label ?? c)}</span>`)
            .join('')}</div>`
        : '';
    body =
      order +
      profile.categories
        .map((c) =>
          field(
            `${CATEGORY_LABELS[c]} concerns`,
            '',
            pills(
              'concerns',
              concernsForCategory(c).map((x) => ({ v: x.id, label: x.label, hint: x.hint })),
              profile.concerns,
              true,
            ),
          ),
        )
        .join('');
  }

  if (step === 'prefs') {
    const groups: Array<[string, string]> = [
      ['sensitivity', 'Skin sensitivity'],
      ['ethics', 'Ethics and packaging'],
      ['formulation', 'Formulation'],
    ];
    body =
      groups
        .map(([g, label]) =>
          field(
            label,
            '',
            `<div class="prefs">${PREFERENCES.filter((p) => p.group === g)
              .map((p) => {
                const want = profile.preferences.includes(p.id);
                const must = profile.mustHave.includes(p.id);
                return `<div class="pref${want ? ' is-on' : ''}">
                  <button class="pref__main" data-set="preferences" data-v="${p.id}" aria-pressed="${want}">
                    <b>${esc(p.label)}</b><i>${esc(p.hint)}</i>
                  </button>
                  <button class="pref__must${must ? ' is-on' : ''}" data-must="${p.id}" aria-pressed="${must}"
                    title="Exclude everything that fails this">${must ? 'Dealbreaker' : '+ Dealbreaker'}</button>
                </div>`;
              })
              .join('')}</div>`,
          ),
        )
        .join('') +
      field(
        'Ingredients to avoid',
        'Comma-separated. Anything listing these is removed entirely — useful for allergies.',
        `<input class="input" id="avoid" value="${esc(profile.avoidIngredients.join(', '))}"
          placeholder="e.g. coconut oil, essential oils">`,
      );
  }

  if (step === 'budget') {
    const cap = profile.budget.max >= 1000 ? 200 : profile.budget.max;
    body =
      field(
        'Where do you usually shop?',
        'A preference, not a limit.',
        pills(
          'preferredTier',
          PRICE_TIERS.map((t) => ({ v: t, label: titleCase(t), hint: PRICE_TIER_RANGES[t].label })),
          profile.budget.preferredTier ? [profile.budget.preferredTier] : [],
        ),
      ) +
      field(
        'Hard limit per product',
        'Nothing above this is recommended at all.',
        `<input type="range" id="cap" min="10" max="200" step="5" value="${cap}" class="range">
         <p class="muted small">Currently <b>${profile.budget.max >= 1000 ? 'no limit' : '$' + profile.budget.max}</b></p>`,
      ) +
      field(
        'How experienced are you with active ingredients?',
        'We hold the strongest formulas back from beginners on purpose.',
        pills(
          'experience',
          EXPERIENCE_LEVELS.map((e) => ({
            v: e,
            label: titleCase(e),
            hint: {
              beginner: 'New to retinoids and acids',
              intermediate: 'Comfortable with one or two',
              advanced: 'Happy with strong actives',
            }[e],
          })),
          [profile.experience],
        ),
      ) +
      (profile.categories.includes('makeup')
        ? field('Preferred finish', '', pills('finishPreference', FINISHES.map((f) => ({ v: f, label: titleCase(f) })), profile.finishPreference ? [profile.finishPreference] : [])) +
          field('Preferred coverage', '', pills('coveragePreference', COVERAGE_LEVELS.map((c) => ({ v: c, label: titleCase(c) })), profile.coveragePreference ? [profile.coveragePreference] : []))
        : '') +
      field(
        'How do you like formulas to feel?',
        '',
        pills(
          'texturePreference',
          TEXTURE_WEIGHTS.map((w) => ({
            v: w,
            label: titleCase(w),
            hint: { light: 'Gels and waters', medium: 'Lotions and creams', rich: 'Balms and butters' }[w],
          })),
          profile.texturePreference ? [profile.texturePreference] : [],
        ),
      );
  }

  const blocked = step === 'categories' && profile.categories.length === 0;

  return `
  <div class="progress" role="progressbar" aria-valuenow="${idx + 1}" aria-valuemin="1"
    aria-valuemax="${list.length}" aria-label="Quiz progress">
    <span style="width:${((idx + 1) / list.length) * 100}%"></span>
  </div>
  <header class="head">
    <p class="eyebrow">Step ${idx + 1} of ${list.length}</p>
    <h1>${esc(title)}</h1>
    <p class="muted">${esc(sub)}</p>
  </header>
  <div class="card">${body}</div>
  <nav class="quiznav">
    <button class="btn btn--ghost" data-step="-1" ${idx === 0 ? 'disabled' : ''}>Back</button>
    ${
      idx === list.length - 1
        ? `<button class="btn" data-finish ${blocked ? 'disabled' : ''}>See my matches</button>`
        : `<button class="btn" data-step="1" ${blocked ? 'disabled' : ''}>Continue</button>`
    }
    ${blocked ? '<span class="muted small">Pick at least one category.</span>' : ''}
    ${idx > 0 && profile.categories.length > 0 ? '<button class="linkish" data-finish>Skip to results</button>' : ''}
  </nav>`;
}

// --- results ----------------------------------------------------------------

function card(rec: Recommendation): string {
  const p = rec.product;
  const pos = rec.reasons.filter((r) => r.polarity === 'positive').slice(0, 2);
  const neg = rec.reasons.find((r) => r.polarity === 'negative');

  return `<article class="card card--rec">
    <div class="rec__top">
      ${scoreRing(rec.score)}
      <div class="rec__id">
        <p class="brand">${esc(p.brand)}</p>
        <h3><a href="#/product/${esc(p.id)}">${esc(p.name)}</a></h3>
        <p class="muted small mono">${esc(titleCase(p.type))} · $${p.price}${p.size ? ' · ' + esc(p.size) : ''}</p>
      </div>
      ${heart(p.id)}
    </div>
    ${
      pos.length
        ? `<ul class="reasons">${pos.map((r) => `<li class="good"><span aria-hidden="true">✓</span>${esc(r.message)}</li>`).join('')}</ul>`
        : ''
    }
    ${neg ? `<p class="warn"><span aria-hidden="true">!</span>${esc(neg.message)}</p>` : ''}
    ${
      rec.shadeMatch
        ? `<p class="shadeline">${swatch(rec.shadeMatch.shade.hex, 20)}<span class="muted small">Best shade: <b>${esc(rec.shadeMatch.shade.name)}</b></span></p>`
        : ''
    }
  </article>`;
}

function viewResults(): string {
  if (!profile.categories.length) return empty('No profile yet', 'Take the quiz and we will match you against the whole catalog.', 'quiz', 'Start the quiz');

  const res = recommend(bundledCatalog, profile, { limit: 36, maxPerType: 2 });

  const notes = res.notes.length
    ? `<aside class="note"><b>Worth knowing</b><ul>${res.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></aside>`
    : '';

  const gaps = res.unmatchedConcerns.length
    ? `<aside class="note note--warn"><b>Not covered by these results</b>
        <p>Nothing here addresses ${esc(res.unmatchedConcerns.map((c) => CONCERN_BY_ID[c]?.label?.toLowerCase() ?? c).join(', '))}.
        Widening your budget or relaxing a dealbreaker usually helps.</p></aside>`
    : '';

  if (!res.recommendations.length) {
    return `<header class="head"><h1>Your matches</h1></header>${notes}
      ${empty('Nothing cleared your filters', 'Your dealbreakers or budget ruled out the whole catalog.', 'quiz', 'Adjust answers')}`;
  }

  return `
  <header class="head">
    <h1>Your matches</h1>
    <p class="muted">${
      res.recommendations.length >= res.eligible
        ? `All ${res.eligible} products that passed your filters, best first.`
        : `Top ${res.recommendations.length} of ${res.eligible} products that passed your filters.`
    }</p>
    <div class="chips">${profile.concerns
      .slice(0, 6)
      .map((c) => `<span class="chip">${esc(CONCERN_BY_ID[c]?.label ?? c)}</span>`)
      .join('')}</div>
  </header>
  ${notes}${gaps}
  <div class="row row--wrap">
    <a class="btn btn--ghost" href="#/routine">Build a routine</a>
    <a class="linkish" href="#/quiz">Edit answers</a>
  </div>
  <div class="stack">${res.recommendations.map(card).join('')}</div>`;
}

// --- routine ----------------------------------------------------------------

let routineCategory: Category | null = null;

function viewRoutine(): string {
  if (!profile.categories.length)
    return empty('Build a routine', 'Take the quiz first and we will turn your matches into an ordered routine.', 'quiz', 'Start the quiz');

  const cat: Category =
    routineCategory && profile.categories.includes(routineCategory)
      ? routineCategory
      : profile.categories[0]!;

  const routines =
    cat === 'skincare'
      ? [buildRoutine(bundledCatalog, profile, { category: cat, time: 'am' }), buildRoutine(bundledCatalog, profile, { category: cat, time: 'pm' })]
      : [buildRoutine(bundledCatalog, profile, { category: cat })];

  const tabs =
    profile.categories.length > 1
      ? `<div class="pills pills--inline">${profile.categories
          .map((c) => `<button class="pill pill--slim${c === cat ? ' is-on' : ''}" data-routine="${c}" aria-pressed="${c === cat}">${CATEGORY_LABELS[c]}</button>`)
          .join('')}</div>`
      : '';

  const titles: Record<string, string> = { am: 'Morning', pm: 'Evening', 'wash-day': 'Wash day' };

  return `
  <header class="head">
    <h1>Your routine</h1>
    <p class="muted">One product per step, in the order you apply them, with how often to use each.</p>
  </header>
  ${tabs}
  ${routines
    .map(
      (r) => `<section class="stack">
      <h2 class="slot">${esc(titles[r.time] ?? r.time)}</h2>
      ${
        r.steps.length
          ? `<ol class="routine">${r.steps
              .map(
                (s, i) => `<li class="card card--step">
                <span class="stepno" aria-hidden="true">${i + 1}</span>
                <div class="step__body">
                  <p class="muted small mono">${esc(titleCase(s.type))}</p>
                  <h3><a href="#/product/${esc(s.recommendation.product.id)}">${esc(s.recommendation.product.brand)} ${esc(s.recommendation.product.name)}</a></h3>
                  <p class="muted small mono">$${s.recommendation.product.price}</p>
                  <p class="guidance">${esc(s.guidance)}</p>
                </div>
                <div class="step__aside">${scoreRing(s.recommendation.score, 42)}${heart(s.recommendation.product.id)}</div>
              </li>`,
              )
              .join('')}</ol>`
          : `<div class="card"><p class="muted">We could not build this routine within your filters. Try raising your budget or removing a dealbreaker.</p></div>`
      }
      ${r.notes.length ? `<aside class="note"><ul>${r.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></aside>` : ''}
    </section>`,
    )
    .join('')}`;
}

// --- browse -----------------------------------------------------------------

const browseQuery = { search: '', category: '', sort: 'curation' };

function viewBrowse(): string {
  let items = bundledCatalog.slice();
  const q = browseQuery.search.trim().toLowerCase();

  if (browseQuery.category) items = items.filter((p) => p.category === browseQuery.category);
  if (q) {
    items = items.filter((p) =>
      [p.name, p.brand, p.type, p.description, ...p.keyIngredients, ...p.tags]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }

  items.sort((a, b) =>
    browseQuery.sort === 'price-asc'
      ? a.price - b.price
      : browseQuery.sort === 'price-desc'
        ? b.price - a.price
        : browseQuery.sort === 'name'
          ? a.name.localeCompare(b.name)
          : b.curationScore - a.curationScore,
  );

  return `
  <header class="head">
    <h1>Browse</h1>
    <p class="muted">${items.length} product${items.length === 1 ? '' : 's'}. For personalised scoring, <a href="#/quiz">take the quiz</a>.</p>
  </header>
  <div class="card card--filters">
    <input class="input" id="q" type="search" placeholder="Name, brand or ingredient…" value="${esc(browseQuery.search)}">
    <div class="row row--wrap">
      <select class="input input--sm" id="cat">
        <option value="">All categories</option>
        ${CATEGORIES.map((c) => `<option value="${c}"${browseQuery.category === c ? ' selected' : ''}>${CATEGORY_LABELS[c]}</option>`).join('')}
      </select>
      <select class="input input--sm" id="sort">
        <option value="curation"${browseQuery.sort === 'curation' ? ' selected' : ''}>Most recommended</option>
        <option value="price-asc"${browseQuery.sort === 'price-asc' ? ' selected' : ''}>Price: low to high</option>
        <option value="price-desc"${browseQuery.sort === 'price-desc' ? ' selected' : ''}>Price: high to low</option>
        <option value="name"${browseQuery.sort === 'name' ? ' selected' : ''}>Name</option>
      </select>
    </div>
  </div>
  ${
    items.length
      ? `<div class="stack">${items
          .map(
            (p) => `<article class="card card--tight">
        <div class="rec__top">
          <div class="rec__id">
            <p class="brand">${esc(p.brand)}</p>
            <h3><a href="#/product/${esc(p.id)}">${esc(p.name)}</a></h3>
            <p class="muted small mono">${esc(titleCase(p.type))} · $${p.price}</p>
          </div>
          ${heart(p.id)}
        </div>
        <p class="muted small">${esc(p.description)}</p>
      </article>`,
          )
          .join('')}</div>`
      : `<div class="card"><p class="muted">No products match that search. Try a shorter term.</p></div>`
  }`;
}

// --- product ----------------------------------------------------------------

function viewProduct(id: string | undefined): string {
  const p = id ? byId.get(id) : undefined;
  if (!p) return empty('Product not found', 'That link points at something not in the catalog.', 'browse', 'Browse products');

  const personal = profile.categories.length ? personalFit(p) : '';
  const strength = ['', 'Gentle', 'Moderate', 'Strong'][p.potency];

  const rows: Array<[string, string]> = [];
  if (p.skinTypes.length) rows.push(['Skin types', p.skinTypes.join(', ')]);
  if (p.hairTypes.length) rows.push(['Hair types', p.hairTypes.join(', ')]);
  if (p.hairTextures.length) rows.push(['Textures', p.hairTextures.join(', ')]);
  if (p.porosities.length) rows.push(['Porosity', p.porosities.join(', ')]);
  if (p.scalpTypes.length) rows.push(['Scalp', p.scalpTypes.join(', ')]);
  if (p.finish) rows.push(['Finish', p.finish]);
  if (p.coverage) rows.push(['Coverage', p.coverage]);
  if (p.weight) rows.push(['Texture', p.weight]);
  if (p.spf !== undefined) rows.push(['SPF', String(p.spf)]);

  return `
  <p class="crumb"><a href="#/browse">Browse</a> · ${esc(CATEGORY_LABELS[p.category])} · ${esc(titleCase(p.type))}</p>
  <header class="head">
    <p class="eyebrow">${esc(p.brand)}</p>
    <h1>${esc(p.name)}</h1>
    <p class="price mono">$${p.price}${p.size ? ` · ${esc(p.size)}` : ''} · ${esc(titleCase(priceTierFor(p.price)))}</p>
    <p class="muted">${esc(p.description)}</p>
    <div class="row">${heart(p.id)}<span class="muted small">${saved.includes(p.id) ? 'Saved' : 'Save for later'}</span></div>
  </header>
  ${personal}
  <section class="card">
    <h2>What it targets</h2>
    ${
      p.targets.length
        ? `<div class="chips">${p.targets.map((t) => `<span class="chip">${esc(CONCERN_BY_ID[t]?.label ?? t)}</span>`).join('')}</div>`
        : '<p class="muted">Not aimed at a specific concern — this is a colour or finish product.</p>'
    }
    ${
      p.aggravates.length
        ? `<h3 class="subhead subhead--warn">May make worse</h3>
           <p class="muted small">${esc(p.aggravates.map((t) => CONCERN_BY_ID[t]?.label?.toLowerCase() ?? t).join(', '))}.</p>`
        : ''
    }
  </section>
  <section class="card">
    <h2>Key ingredients</h2>
    <ul class="bullets">${p.keyIngredients.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
    <p class="muted small">Strength: <b>${strength}</b>${p.potency >= 3 ? ' — introduce slowly and patch-test first.' : '.'}</p>
  </section>
  ${
    rows.length
      ? `<section class="card"><h2>Suits</h2><dl class="rows">${rows
          .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(titleCase(v))}</dd></div>`)
          .join('')}</dl></section>`
      : ''
  }
  ${
    p.attributes.length
      ? `<section class="card"><h2>Formulation claims</h2><div class="chips">${p.attributes
          .map((a) => `<span class="chip">${esc(PREFERENCE_BY_ID[a]?.label ?? a)}</span>`)
          .join('')}</div></section>`
      : ''
  }
  ${
    p.shades?.length
      ? `<section class="card"><h2>Shade range</h2>
         <p class="muted small">A representative selection, not the brand's full range. Swatches are approximate — check in daylight.</p>
         <div class="shades">${p.shades
           .map(
             (s) => `<div class="shade">${swatch(s.hex, 30)}<div><b>${esc(s.name)}</b><i>${esc(DEPTH_LABELS[s.depth] ?? '')} · ${esc(s.undertone)}</i></div></div>`,
           )
           .join('')}</div></section>`
      : ''
  }`;
}

function personalFit(p: Product): string {
  const b = scoreProduct(p, profile);
  const match = bestShadeFor(p, profile);
  const pos = b.reasons.filter((r) => r.polarity === 'positive');
  const neg = b.reasons.filter((r) => r.polarity === 'negative');

  return `<section class="card card--fit">
    <div class="fit__top">${scoreRing(b.score, 64)}
      <div><h2>How this scores for you</h2><p class="muted small">Based on your quiz answers. <a href="#/quiz">Update them</a>.</p></div>
    </div>
    ${pos.length ? `<ul class="reasons">${pos.map((r) => `<li class="good"><span aria-hidden="true">✓</span>${esc(r.message)}<em class="mono">+${r.impact}</em></li>`).join('')}</ul>` : ''}
    ${neg.length ? `<ul class="reasons">${neg.map((r) => `<li class="bad"><span aria-hidden="true">!</span>${esc(r.message)}<em class="mono">${r.impact}</em></li>`).join('')}</ul>` : ''}
    ${match ? `<p class="shadeline shadeline--big">${swatch(match.shade.hex, 34, true)}<span>${esc(describeShadeMatch(match, profile))}</span></p>` : ''}
  </section>`;
}

// --- saved ------------------------------------------------------------------

function viewSaved(): string {
  const items = saved.map((id) => byId.get(id)).filter((p): p is Product => !!p);
  if (!items.length) return empty('Nothing saved yet', 'Tap the heart on any product to keep it here.', 'browse', 'Browse products');

  const total = items.reduce((sum, p) => sum + p.price, 0);
  return `
  <header class="head">
    <h1>Saved</h1>
    <p class="muted mono">${items.length} product${items.length === 1 ? '' : 's'} · $${total} for the lot</p>
  </header>
  <div class="stack">${items
    .map(
      (p) => `<article class="card card--tight">
      <div class="rec__top">
        <div class="rec__id">
          <p class="brand">${esc(p.brand)}</p>
          <h3><a href="#/product/${esc(p.id)}">${esc(p.name)}</a></h3>
          <p class="muted small mono">${esc(titleCase(p.type))} · $${p.price}</p>
        </div>
        ${heart(p.id)}
      </div>
    </article>`,
    )
    .join('')}</div>`;
}

function empty(title: string, body: string, to: string, cta: string): string {
  return `<div class="card card--empty">
    <h2>${esc(title)}</h2><p class="muted">${esc(body)}</p>
    <a class="btn" href="#/${to}">${esc(cta)}</a></div>`;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

/** Five tabs is what fits a 390px phone without the bar scrolling. Home is
 *  reachable from the wordmark, so it does not need to spend a slot. */
const TABS: Array<[string, string]> = [
  ['quiz', 'Quiz'],
  ['results', 'Matches'],
  ['routine', 'Routine'],
  ['browse', 'Browse'],
  ['saved', 'Saved'],
];

function render() {
  const r = route();
  const main = document.getElementById('view')!;

  const views: Record<string, () => string> = {
    home: viewHome,
    quiz: viewQuiz,
    results: viewResults,
    routine: viewRoutine,
    browse: viewBrowse,
    saved: viewSaved,
    product: () => viewProduct(r.param),
  };

  main.innerHTML = (views[r.name] ?? viewHome)();
  main.scrollTop = 0;

  document.querySelectorAll<HTMLAnchorElement>('.tab').forEach((tab) => {
    const on = tab.dataset.tab === r.name || (r.name === 'product' && tab.dataset.tab === 'browse');
    tab.classList.toggle('is-on', on);
    if (on) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });

  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------------------
// Events — delegated, so re-rendering never leaves stale listeners behind
// ---------------------------------------------------------------------------

/** Single-choice fields toggle off when re-tapped; arrays append in tap order. */
function applySet(key: string, value: string) {
  const arrays: Record<string, 'categories' | 'concerns' | 'preferences'> = {
    categories: 'categories',
    concerns: 'concerns',
    preferences: 'preferences',
  };

  if (arrays[key]) {
    const field = arrays[key]!;
    const list = profile[field] as string[];
    (profile[field] as string[]) = list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  } else if (key === 'sensitive' || key === 'colourTreated') {
    (profile as unknown as Record<string, boolean>)[key] = value === 'yes';
  } else if (key === 'depth') {
    profile.depth = profile.depth === Number(value) ? undefined : Number(value);
  } else if (key === 'preferredTier') {
    profile.budget.preferredTier =
      profile.budget.preferredTier === value ? undefined : (value as UserProfile['budget']['preferredTier']);
  } else if (key === 'experience') {
    profile.experience = value as UserProfile['experience'];
  } else {
    const rec = profile as unknown as Record<string, unknown>;
    rec[key] = rec[key] === value ? undefined : value;
  }

  persist();
  render();
}

document.addEventListener('click', (event) => {
  const el = (event.target as HTMLElement).closest<HTMLElement>('[data-set],[data-must],[data-save],[data-step],[data-finish],[data-routine],[data-theme-toggle]');
  if (!el) return;

  if (el.dataset.themeToggle !== undefined) {
    const root = document.documentElement;
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
    return;
  }

  if (el.dataset.save) {
    const id = el.dataset.save;
    saved = saved.includes(id) ? saved.filter((s) => s !== id) : [...saved, id];
    persistSaved();
    render();
    return;
  }

  if (el.dataset.must) {
    const id = el.dataset.must as (typeof PREFERENCES)[number]['id'];
    const isMust = profile.mustHave.includes(id);
    profile.mustHave = isMust ? profile.mustHave.filter((m) => m !== id) : [...profile.mustHave, id];
    // Promoting to a dealbreaker implies wanting it.
    if (!isMust && !profile.preferences.includes(id)) profile.preferences = [...profile.preferences, id];
    persist();
    render();
    return;
  }

  if (el.dataset.routine) {
    routineCategory = el.dataset.routine as Category;
    render();
    return;
  }

  if (el.dataset.step) {
    captureInputs();
    quizStep = Math.max(0, Math.min(quizStep + Number(el.dataset.step), steps().length - 1));
    render();
    return;
  }

  if (el.dataset.finish !== undefined) {
    captureInputs();
    persist();
    go('results');
    return;
  }

  if (el.dataset.set) applySet(el.dataset.set, el.dataset.v ?? '');
});

/** Free-text and range inputs are read on navigation rather than every keystroke. */
function captureInputs() {
  const avoid = document.getElementById('avoid') as HTMLInputElement | null;
  if (avoid) {
    profile.avoidIngredients = avoid.value.split(',').map((s) => s.trim()).filter(Boolean);
  }
  const cap = document.getElementById('cap') as HTMLInputElement | null;
  if (cap) {
    const raw = Number(cap.value);
    profile.budget.max = raw >= 200 ? 1000 : raw;
  }
  persist();
}

document.addEventListener('input', (event) => {
  const el = event.target as HTMLElement;
  if (el.id === 'cap') {
    const raw = Number((el as HTMLInputElement).value);
    profile.budget.max = raw >= 200 ? 1000 : raw;
    const out = el.parentElement?.querySelector('.muted b');
    if (out) out.textContent = raw >= 200 ? 'no limit' : `$${raw}`;
    persist();
  }
  if (el.id === 'q') {
    browseQuery.search = (el as HTMLInputElement).value;
    const scroll = window.scrollY;
    render();
    (document.getElementById('q') as HTMLInputElement | null)?.focus();
    window.scrollTo(0, scroll);
  }
});

document.addEventListener('change', (event) => {
  const el = event.target as HTMLElement;
  if (el.id === 'cat') {
    browseQuery.category = (el as HTMLSelectElement).value;
    render();
  }
  if (el.id === 'sort') {
    browseQuery.sort = (el as HTMLSelectElement).value;
    render();
  }
});

window.addEventListener('hashchange', () => {
  if (route().name === 'quiz') quizStep = Math.min(quizStep, steps().length - 1);
  render();
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

function boot() {
  const nav = document.getElementById('tabs')!;
  nav.innerHTML = TABS.map(
    ([id, label]) => `<a class="tab" data-tab="${id}" href="#/${id}">${label}</a>`,
  ).join('');

  if (!location.hash) location.hash = '#/home';
  render();
}

boot();
