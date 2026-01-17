/**
 * Smart AI Test Suit - OpenAI Provider
 * Cloud inference using OpenAI API (GPT-4, etc).
 */

import OpenAI from 'openai';
import type { LLMProvider, GenerateOptions } from './types.js';
import {
  DEFAULT_OPENAI_MODEL,
  DEFAULT_TIMEOUT_MS,
  type OpenAIConfig,
} from './types.js';
import { ProviderError, ProviderNotAvailableError, withTimeout } from '../utils/errors.js';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'OpenAI';
  private client: OpenAI;
  private defaultModel: string;
  private timeout: number;
  private apiKey: string;

  constructor(config?: Partial<OpenAIConfig>) {
    this.apiKey = config?.apiKey || process.env.OPENAI_API_KEY || '';
    this.defaultModel = config?.model || DEFAULT_OPENAI_MODEL;
    this.timeout = config?.timeout || DEFAULT_TIMEOUT_MS;

    this.client = new OpenAI({
      apiKey: this.apiKey || 'missing',
      baseURL: config?.baseUrl,
    });
  }

  /**
   * Check if OpenAI is available (API key is set)
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
   * Generate text using OpenAI
   */
  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const model = options?.model || this.defaultModel;
    const timeout = options?.timeout || this.timeout;

    if (!this.apiKey) {
      throw new ProviderNotAvailableError('OpenAI');
    }

    try {
      const response = await withTimeout(
        this.client.chat.completions.create({
          model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens,
        }),
        timeout,
        'OpenAI generation'
      );

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new ProviderError('OpenAI', 'Empty response from model');
      }

      return content;
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);

      // Check for common API errors
      if (message.includes('401') || message.includes('Unauthorized') || message.includes('invalid_api_key')) {
        throw new ProviderError('OpenAI', 'Invalid API key. Check OPENAI_API_KEY.', {
          cause: error instanceof Error ? error : undefined,
        });
      }

      if (message.includes('429') || message.includes('rate_limit')) {
        throw new ProviderError('OpenAI', 'Rate limit exceeded. Try again later.', {
          cause: error instanceof Error ? error : undefined,
        });
      }

      if (message.includes('insufficient_quota')) {
        throw new ProviderError('OpenAI', 'Insufficient quota. Check your billing.', {
          cause: error instanceof Error ? error : undefined,
        });
      }

      if (message.includes('model') && (message.includes('not found') || message.includes('does not exist'))) {
        throw new ProviderError('OpenAI', `Model "${model}" not available.`, {
          cause: error instanceof Error ? error : undefined,
        });
      }

      throw new ProviderError('OpenAI', `Generation failed: ${message}`, {
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
