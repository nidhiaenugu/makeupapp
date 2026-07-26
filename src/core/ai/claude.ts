import Anthropic from '@anthropic-ai/sdk';

import type { DeepPartialProfile, UserProfile } from '../types/profile';
import type { Recommendation } from '../types/recommendation';
import {
  ADVISOR_SYSTEM_PROMPT,
  AI_MODEL,
  EXPLAIN_SYSTEM_PROMPT,
  INTENT_SCHEMA,
  INTENT_SYSTEM_PROMPT,
  advisorContextBlock,
  explainUserPrompt,
  intentResponseSchema,
  intentToProfilePatch,
  intentUserPrompt,
} from './prompts';
import type { AdvisorContext, AdvisorMessage, AiProvider } from './provider';

/**
 * Talks to the Anthropic API directly with a key the user supplied.
 *
 * `dangerouslyAllowBrowser` is required because this runs on-device: in this
 * mode the key belongs to the person holding the phone and never leaves it, so
 * there is no third party to leak it to. Anyone shipping Glowmatch to other
 * people should use `ProxyAiProvider` instead — see docs/DEPLOYING_PROXY.md.
 */
export class ClaudeAiProvider implements AiProvider {
  readonly mode = 'byo-key' as const;

  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  }

  get available(): boolean {
    return true;
  }

  async parseIntent(text: string, current: UserProfile): Promise<DeepPartialProfile> {
    const response = await this.client.messages.create({
      model: AI_MODEL,
      max_tokens: 2000,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: INTENT_SCHEMA },
      },
      system: INTENT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: intentUserPrompt(text, current) }],
    });

    // The classifiers can decline a request; that is a normal 200 response, not
    // an exception, so it has to be checked before touching content.
    if (response.stop_reason === 'refusal') return {};

    const raw = firstText(response);
    if (!raw) return {};

    const parsed = intentResponseSchema.safeParse(JSON.parse(raw));
    return parsed.success ? intentToProfilePatch(parsed.data) : {};
  }

  async explain(
    recommendation: Recommendation,
    profile: UserProfile
  ): Promise<string | undefined> {
    const response = await this.client.messages.create({
      model: AI_MODEL,
      max_tokens: 300,
      output_config: { effort: 'low' },
      system: EXPLAIN_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: explainUserPrompt(recommendation, profile) }],
    });

    if (response.stop_reason === 'refusal') return undefined;
    return firstText(response)?.trim();
  }

  async chat(messages: AdvisorMessage[], context: AdvisorContext): Promise<string> {
    const conversation = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    // The catalog excerpt is attached to the latest user turn rather than the
    // system prompt so the system prefix stays byte-identical and cacheable.
    const last = conversation[conversation.length - 1];
    if (last && last.role === 'user') {
      last.content = `${advisorContextBlock(context.candidates, context.profile)}\n\n${last.content}`;
    }

    const response = await this.client.messages.create({
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
      messages: conversation,
    });

    if (response.stop_reason === 'refusal') {
      return "I'm not able to help with that one. If it's a skin or scalp concern that's painful or getting worse, please see a doctor.";
    }

    return firstText(response) ?? "Sorry — I couldn't come up with an answer for that.";
  }
}

function firstText(response: Anthropic.Message): string | undefined {
  for (const block of response.content) {
    if (block.type === 'text') return block.text;
  }
  return undefined;
}
