import { AI_MODEL, anthropic, fail, firstText, guard } from './_shared.js';
import { ADVISOR_SYSTEM_PROMPT, advisorContextBlock } from './_prompts.js';

const MAX_TURNS = 20;

export default async function handler(request, response) {
  const body = guard(request, response);
  if (!body) return;

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const messages = incoming
    .filter(
      (message) =>
        (message?.role === 'user' || message?.role === 'assistant') &&
        typeof message.content === 'string'
    )
    .slice(-MAX_TURNS)
    .map((message) => ({ role: message.role, content: message.content.slice(0, 4000) }));

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    response.status(400).json({ error: 'The conversation must end with a user message.' });
    return;
  }

  // The catalog excerpt rides on the last user turn so the cached system prefix
  // stays byte-identical across every request.
  const last = messages[messages.length - 1];
  last.content = `${advisorContextBlock(body.candidates ?? [], body.profile ?? {})}\n\n${last.content}`;

  try {
    const message = await anthropic().messages.create({
      model: AI_MODEL,
      max_tokens: 1500,
      output_config: { effort: 'medium' },
      system: [
        {
          type: 'text',
          text: ADVISOR_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    });

    if (message.stop_reason === 'refusal') {
      response.status(200).json({
        text: "I'm not able to help with that one. If it's a skin or scalp concern that's painful or getting worse, please see a doctor.",
      });
      return;
    }

    response.status(200).json({ text: firstText(message) ?? null });
  } catch (error) {
    fail(response, error);
  }
}
