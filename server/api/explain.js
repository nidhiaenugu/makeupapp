import { AI_MODEL, anthropic, fail, firstText, guard } from './_shared.js';
import { EXPLAIN_SYSTEM_PROMPT } from './_prompts.js';

export default async function handler(request, response) {
  const body = guard(request, response);
  if (!body) return;

  const product = body.product;
  if (!product?.brand || !product?.name) {
    response.status(400).json({ error: 'A product is required.' });
    return;
  }

  const profile = body.profile ?? {};
  const reasons = Array.isArray(body.reasons) ? body.reasons.slice(0, 6) : [];

  try {
    const message = await anthropic().messages.create({
      model: AI_MODEL,
      max_tokens: 300,
      output_config: { effort: 'low' },
      system: EXPLAIN_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            `Product: ${product.brand} ${product.name} (${product.subcategory})`,
            `Key ingredients: ${(product.keyIngredients ?? []).join(', ')}`,
            `Benefits: ${(product.benefits ?? []).join('; ')}`,
            `Why our engine matched it: ${reasons.join('; ')}`,
            '',
            'About them:',
            profile.skin?.type ? `- Skin: ${profile.skin.type}` : '',
            profile.skin?.concerns?.length
              ? `- Skin concerns: ${profile.skin.concerns.join(', ')}`
              : '',
            profile.hair?.type ? `- Hair: ${profile.hair.type}` : '',
            profile.hair?.concerns?.length
              ? `- Hair concerns: ${profile.hair.concerns.join(', ')}`
              : '',
            profile.budget ? `- Budget: ${profile.budget}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
    });

    if (message.stop_reason === 'refusal') {
      response.status(200).json({ text: null });
      return;
    }

    response.status(200).json({ text: firstText(message) ?? null });
  } catch (error) {
    fail(response, error);
  }
}
