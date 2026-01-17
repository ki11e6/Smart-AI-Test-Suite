/**
 * Smart AI Test Suit - Anthropic Provider
 * Cloud inference using Anthropic Claude API.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, GenerateOptions } from './types.js';
import {
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_ANTHROPIC_MAX_TOKENS,
  DEFAULT_TIMEOUT_MS,
  type AnthropicConfig,
} from './types.js';
import { ProviderError, ProviderNotAvailableError, withTimeout } from '../utils/errors.js';

export class AnthropicProvider implements LLMProvider {
  readonly name = 'Anthropic';
  private client: Anthropic;
  private defaultModel: string;
  private defaultMaxTokens: number;
  private timeout: number;
  private apiKey: string;

  constructor(config?: Partial<AnthropicConfig>) {
    this.apiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.defaultModel = config?.model || DEFAULT_ANTHROPIC_MODEL;
    this.defaultMaxTokens = config?.maxTokens || DEFAULT_ANTHROPIC_MAX_TOKENS;
    this.timeout = config?.timeout || DEFAULT_TIMEOUT_MS;

    this.client = new Anthropic({
      apiKey: this.apiKey || 'missing',
    });
  }

  /**
   * Check if Anthropic is available (API key is set)
   */
  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    // Optionally verify the API key works
    // For now, just check if the key exists
    return true;
  }

  /**
   * Generate text using Anthropic Claude
   */
  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const model = options?.model || this.defaultModel;
    const maxTokens = options?.maxTokens || this.defaultMaxTokens;
    const timeout = options?.timeout || this.timeout;

    if (!this.apiKey) {
      throw new ProviderNotAvailableError('Anthropic');
    }

    try {
      const response = await withTimeout(
        this.client.messages.create({
          model,
          max_tokens: maxTokens,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: options?.temperature ?? 0.7,
        }),
        timeout,
        'Anthropic generation'
      );

      // Anthropic returns content as an array of content blocks
      const textBlock = response.content.find((block) => block.type === 'text');

      if (!textBlock || textBlock.type !== 'text') {
        throw new ProviderError('Anthropic', 'Empty response from model');
      }

      return textBlock.text;
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);

      // Check for common API errors
      if (message.includes('401') || message.includes('authentication') || message.includes('invalid_api_key')) {
        throw new ProviderError('Anthropic', 'Invalid API key. Check ANTHROPIC_API_KEY.', {
          cause: error instanceof Error ? error : undefined,
        });
      }

      if (message.includes('429') || message.includes('rate_limit')) {
        throw new ProviderError('Anthropic', 'Rate limit exceeded. Try again later.', {
          cause: error instanceof Error ? error : undefined,
        });
      }

      if (message.includes('overloaded')) {
        throw new ProviderError('Anthropic', 'API is overloaded. Try again later.', {
          cause: error instanceof Error ? error : undefined,
        });
      }

      if (message.includes('model') && message.includes('not found')) {
        throw new ProviderError('Anthropic', `Model "${model}" not available.`, {
          cause: error instanceof Error ? error : undefined,
        });
      }

      throw new ProviderError('Anthropic', `Generation failed: ${message}`, {
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  /**
   * Get the default model name
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }
}
