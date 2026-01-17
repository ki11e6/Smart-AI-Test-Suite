/**
 * Smart AI Test Suit - LLM Provider Types
 * Type definitions specific to LLM providers.
 */

// Re-export common types from main types module
export type {
  LLMProvider,
  GenerateOptions,
  ProviderConfig,
  ProviderType,
} from '../types.js';

// =============================================================================
// Provider-Specific Configuration
// =============================================================================

export interface OllamaConfig {
  host: string;
  model: string;
  timeout?: number;
}

export interface GroqConfig {
  apiKey: string;
  model: string;
  timeout?: number;
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeout?: number;
}

export interface AnthropicConfig {
  apiKey: string;
  model: string;
  timeout?: number;
  maxTokens?: number;
}

// =============================================================================
// Provider Response Types
// =============================================================================

export interface ProviderResponse {
  content: string;
  model: string;
  usage?: TokenUsage;
  finishReason?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// =============================================================================
// Provider Status
// =============================================================================

export interface ProviderStatus {
  name: string;
  available: boolean;
  model?: string;
  error?: string;
}

// =============================================================================
// Default Configuration Values
// =============================================================================

export const DEFAULT_OLLAMA_HOST = 'http://localhost:11434';
export const DEFAULT_OLLAMA_MODEL = 'codellama';

export const DEFAULT_GROQ_MODEL = 'llama-3.1-70b-versatile';

export const DEFAULT_OPENAI_MODEL = 'gpt-4';

export const DEFAULT_ANTHROPIC_MODEL = 'claude-3-opus-20240229';
export const DEFAULT_ANTHROPIC_MAX_TOKENS = 4096;

export const DEFAULT_TIMEOUT_MS = 120000; // 2 minutes

// =============================================================================
// Provider Priority Order for Auto-Detection
// =============================================================================

export const PROVIDER_PRIORITY: readonly string[] = [
  'groq',
  'openai',
  'anthropic',
  'ollama',
] as const;
