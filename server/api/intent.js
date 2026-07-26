import { AI_MODEL, anthropic, fail, firstText, guard } from './_shared.js';
import { INTENT_SCHEMA, INTENT_SYSTEM_PROMPT } from './_prompts.js';

export default async function handler(request, response) {
  const body = guard(request, response);
  if (!body) return;

  const text = typeof body.text === 'string' ? body.text.slice(0, 2000) : '';
  if (!text.trim()) {
    response.status(400).json({ error: 'Nothing to interpret.' });
    return;
  }

  const profile = body.profile ?? {};

  try {
    const message = await anthropic().messages.create({
      model: AI_MODEL,
      max_tokens: 2000,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: INTENT_SCHEMA },
      },
      system: INTENT_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            'Here is what they already told us (do not repeat it back unless they are changing it):',
            JSON.stringify(
              {
                interests: profile.interests,
                budget: profile.budget,
                skinType: profile.skin?.type,
                skinConcerns: profile.skin?.concerns,
                hairType: profile.hair?.type,
              },
              null,
              2
            ),
            '',
            'And this is what they just wrote:',
            text.trim(),
          ].join('\n'),
        },
      ],
    });

    if (message.stop_reason === 'refusal') {
      response.status(200).json({ intent: null });
      return;
    }

    const raw = firstText(message);
    response.status(200).json({ intent: raw ? JSON.parse(raw) : null });
  } catch (error) {
    fail(response, error);
  }
}
