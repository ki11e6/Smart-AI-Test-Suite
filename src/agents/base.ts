/**
 * Smart AI Test Suit - Base Agent
 * Abstract base class for all agents.
 */

import type {
  Agent,
  AgentContext,
  AgentResult,
  AgentError,
  AgentMetrics,
} from './types.js';
import { toAgentError } from '../utils/errors.js';

export abstract class BaseAgent<TInput, TOutput> implements Agent<TInput, TOutput> {
  abstract readonly name: string;

  /**
   * Execute the agent's task with metrics tracking
   */
  async execute(input: TInput, context: AgentContext): Promise<AgentResult<TOutput>> {
    const startTime = Date.now();

    try {
      const data = await this.run(input, context);
      const endTime = Date.now();

      return {
        success: true,
        data,
        metrics: this.createMetrics(startTime, endTime),
      };
    } catch (error) {
      const endTime = Date.now();

      return {
        success: false,
        error: toAgentError(error),
        metrics: this.createMetrics(startTime, endTime),
      };
    }
  }

  /**
   * Abstract method that subclasses must implement
   */
  protected abstract run(input: TInput, context: AgentContext): Promise<TOutput>;

  /**
   * Create metrics object
   */
  protected createMetrics(startTime: number, endTime: number, tokensUsed?: number): AgentMetrics {
    return {
      startTime,
      endTime,
      duration: endTime - startTime,
      tokensUsed,
    };
  }

  /**
   * Create an error result
   */
  protected errorResult(
    message: string,
    code: string,
    recoverable: boolean,
    startTime: number
  ): AgentResult<TOutput> {
    const endTime = Date.now();
    const error: AgentError = {
      code,
      message,
      recoverable,
    };

    return {
      success: false,
      error,
      metrics: this.createMetrics(startTime, endTime),
    };
  }
}
