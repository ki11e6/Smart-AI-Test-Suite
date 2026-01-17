/**
 * Smart AI Test Suit - Agents Module
 * Re-exports all agents and provides communication infrastructure.
 */

// Types
export type {
  Agent,
  AgentContext,
  AgentResult,
  AgentError,
  AgentMetrics,
  OrchestratorInput,
  OrchestratorOutput,
  PipelineMetrics,
  PipelineState,
  PipelineError,
  CodebaseOrchestratorInput,
  CodebaseOrchestratorOutput,
  FileResult,
  CodebaseMetrics,
  PromptContext,
  FixPromptContext,
  AgentName,
} from './types.js';

// Base class
export { BaseAgent } from './base.js';

// Agent implementations
export { OrchestratorAgent, createOrchestrator, createAgentContext } from './orchestrator.js';
export { AnalyzerAgent } from './analyzer.js';
export { WriterAgent } from './writer.js';
export { ValidatorAgent } from './validator.js';
export { FixerAgent } from './fixer.js';

// =============================================================================
// Agent Communication - Shared State
// =============================================================================

import type { PipelineState, AgentMetrics, ProgressCallback, ProgressUpdate } from './types.js';

/**
 * Pipeline context that flows through all agents
 */
export class PipelineContext {
  private state: PipelineState;
  private metricsHistory: Map<string, AgentMetrics[]>;
  private progressCallback?: ProgressCallback;

  constructor(sourceFile: string, onProgress?: ProgressCallback) {
    this.state = {
      sourceFile,
      errors: [],
    };
    this.metricsHistory = new Map();
    this.progressCallback = onProgress;
  }

  /**
   * Get current pipeline state
   */
  getState(): Readonly<PipelineState> {
    return this.state;
  }

  /**
   * Update pipeline state
   */
  updateState(updates: Partial<PipelineState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Record metrics for an agent
   */
  recordMetrics(agentName: string, metrics: AgentMetrics): void {
    const existing = this.metricsHistory.get(agentName) ?? [];
    existing.push(metrics);
    this.metricsHistory.set(agentName, existing);
  }

  /**
   * Get metrics for an agent
   */
  getMetrics(agentName: string): AgentMetrics[] {
    return this.metricsHistory.get(agentName) ?? [];
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, AgentMetrics[]> {
    return new Map(this.metricsHistory);
  }

  /**
   * Add an error to the pipeline
   */
  addError(agent: string, phase: string, message: string, recoverable: boolean): void {
    this.state.errors.push({
      agent,
      phase,
      message,
      recoverable,
      timestamp: Date.now(),
    });
  }

  /**
   * Report progress
   */
  reportProgress(update: ProgressUpdate): void {
    if (this.progressCallback) {
      this.progressCallback(update);
    }
  }
}

// =============================================================================
// Agent Metrics Aggregator
// =============================================================================

export interface AggregatedMetrics {
  totalDuration: number;
  agentDurations: Record<string, number>;
  totalLLMCalls: number;
  totalTokensUsed: number;
  errorCount: number;
  successRate: number;
}

/**
 * Aggregate metrics from multiple agent executions
 */
export function aggregateMetrics(
  metricsMap: Map<string, AgentMetrics[]>
): AggregatedMetrics {
  let totalDuration = 0;
  let totalTokens = 0;
  let totalCalls = 0;
  let successCount = 0;
  let totalCount = 0;

  const agentDurations: Record<string, number> = {};

  for (const [agentName, metricsList] of metricsMap) {
    let agentTotal = 0;

    for (const metrics of metricsList) {
      agentTotal += metrics.duration;
      totalDuration += metrics.duration;
      totalTokens += metrics.tokensUsed ?? 0;
      totalCalls++;
      totalCount++;
      // Assume success if metrics were recorded
      successCount++;
    }

    agentDurations[agentName] = agentTotal;
  }

  return {
    totalDuration,
    agentDurations,
    totalLLMCalls: totalCalls,
    totalTokensUsed: totalTokens,
    errorCount: totalCount - successCount,
    successRate: totalCount > 0 ? successCount / totalCount : 0,
  };
}

/**
 * Format metrics for display
 */
export function formatMetrics(metrics: AggregatedMetrics): string {
  const lines: string[] = [
    `Total Duration: ${(metrics.totalDuration / 1000).toFixed(2)}s`,
    '',
    'Agent Durations:',
  ];

  for (const [agent, duration] of Object.entries(metrics.agentDurations)) {
    lines.push(`  ${agent}: ${(duration / 1000).toFixed(2)}s`);
  }

  lines.push('');
  lines.push(`LLM Calls: ${metrics.totalLLMCalls}`);

  if (metrics.totalTokensUsed > 0) {
    lines.push(`Tokens Used: ${metrics.totalTokensUsed}`);
  }

  lines.push(`Success Rate: ${(metrics.successRate * 100).toFixed(1)}%`);

  return lines.join('\n');
}

// =============================================================================
// Agent Registry (for dynamic agent lookup)
// =============================================================================

import { AnalyzerAgent } from './analyzer.js';
import { WriterAgent } from './writer.js';
import { ValidatorAgent } from './validator.js';
import { FixerAgent } from './fixer.js';

type AnyAgent = AnalyzerAgent | WriterAgent | ValidatorAgent | FixerAgent;

const agentRegistry = new Map<string, AnyAgent>();

/**
 * Register an agent instance
 */
export function registerAgent(name: string, agent: AnyAgent): void {
  agentRegistry.set(name, agent);
}

/**
 * Get a registered agent
 */
export function getAgent(name: string): AnyAgent | undefined {
  return agentRegistry.get(name);
}

/**
 * Create and register default agents
 */
export function createDefaultAgents(): {
  analyzer: AnalyzerAgent;
  writer: WriterAgent;
  validator: ValidatorAgent;
  fixer: FixerAgent;
} {
  const analyzer = new AnalyzerAgent();
  const writer = new WriterAgent();
  const validator = new ValidatorAgent();
  const fixer = new FixerAgent();

  registerAgent('analyzer', analyzer);
  registerAgent('writer', writer);
  registerAgent('validator', validator);
  registerAgent('fixer', fixer);

  return { analyzer, writer, validator, fixer };
}
