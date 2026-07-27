/**
 * Standalone catalog validator.
 *
 * Run with `npm run validate:catalog`. Contributors adding products get a
 * readable report of what is wrong without having to boot the whole app, and
 * CI runs the same check on every pull request.
 */
import { bundledCatalog } from '../src/lib/data/json-provider';
import { CATEGORIES, CONCERN_IDS, PRODUCT_TYPE_CATEGORY } from '../src/lib/domain/taxonomy';

const problems: string[] = [];
const warnings: string[] = [];

function problem(message: string) {
  problems.push(message);
}

function warn(message: string) {
  warnings.push(message);
}

// The zod schema already ran at import time — reaching here means every product
// is structurally valid. What follows are the semantic checks a schema cannot
// express.

const seenIds = new Set<string>();
for (const item of bundledCatalog) {
  if (seenIds.has(item.id)) problem(`Duplicate id: ${item.id}`);
  seenIds.add(item.id);

  if (PRODUCT_TYPE_CATEGORY[item.type] !== item.category) {
    problem(`${item.id}: type "${item.type}" does not belong to category "${item.category}"`);
  }

  const contradictions = item.targets.filter((t) => item.aggravates.includes(t));
  if (contradictions.length > 0) {
    problem(`${item.id}: both targets and aggravates ${contradictions.join(', ')}`);
  }

  if (item.category !== 'makeup' && item.targets.length === 0) {
    problem(`${item.id}: skincare and hair products must target at least one concern`);
  }

  if (
    item.attributes.includes('pregnancy-safe') &&
    item.keyIngredients.some((i) => /retin(ol|al|oid)|adapalene|tretinoin/i.test(i))
  ) {
    problem(`${item.id}: marked pregnancy-safe but contains a retinoid`);
  }

  if (item.shades && item.shades.length > 0) {
    const depths = item.shades.map((s) => s.depth);
    const spread = Math.max(...depths) - Math.min(...depths);
    if (spread < 4) {
      warn(`${item.id}: shade range spans only ${spread} depth steps — is it complete?`);
    }
  }

  if (item.keyIngredients.length === 0) {
    warn(`${item.id}: no key ingredients listed`);
  }
}

// Every concern must be treatable by something, or users can select a concern
// the engine can never satisfy.
for (const concern of CONCERN_IDS) {
  const count = bundledCatalog.filter((p) => p.targets.includes(concern)).length;
  if (count === 0) {
    problem(`No product targets the concern "${concern}"`);
  } else if (count === 1) {
    warn(`Only one product targets "${concern}" — results will be thin`);
  }
}

// --- report -----------------------------------------------------------------

console.log(`Validated ${bundledCatalog.length} products.`);
for (const category of CATEGORIES) {
  const count = bundledCatalog.filter((p) => p.category === category).length;
  console.log(`  ${category.padEnd(10)} ${count}`);
}

if (warnings.length > 0) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const message of warnings) console.log(`  ! ${message}`);
}

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):`);
  for (const message of problems) console.error(`  ✗ ${message}`);
  process.exit(1);
}

console.log('\nNo problems found.');
