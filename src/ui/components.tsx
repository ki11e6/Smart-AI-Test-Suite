/**
 * Smart AI Test Suit - TUI Components
 * Ink-based terminal UI components for progress display.
 */

import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import type { ProgressPhase, ProgressUpdate, TestGenerationResult } from '../types.js';

// =============================================================================
// Agent Icons
// =============================================================================

const AGENT_ICONS: Record<ProgressPhase, string> = {
  analyzing: '🔍',
  generating: '✍️',
  validating: '🧪',
  running: '▶️',
  fixing: '🔧',
  complete: '✅',
  error: '❌',
};

const AGENT_NAMES: Record<ProgressPhase, string> = {
  analyzing: 'Analyzer',
  generating: 'Writer',
  validating: 'Validator',
  running: 'Runner',
  fixing: 'Fixer',
  complete: 'Complete',
  error: 'Error',
};

// =============================================================================
// Spinner Component
// =============================================================================

interface SpinnerTextProps {
  text: string;
  color?: string;
}

export function SpinnerText({ text, color = 'cyan' }: SpinnerTextProps): React.ReactElement {
  return (
    <Box>
      <Text color={color}>
        <Spinner type="dots" />
      </Text>
      <Text> {text}</Text>
    </Box>
  );
}

// =============================================================================
// Progress Bar Component
// =============================================================================

interface ProgressBarProps {
  current: number;
  total: number;
  width?: number;
  showPercentage?: boolean;
}

export function ProgressBar({
  current,
  total,
  width = 30,
  showPercentage = true,
}: ProgressBarProps): React.ReactElement {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const filled = Math.round((current / total) * width);
  const empty = width - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  return (
    <Box>
      <Text color="green">[{bar}]</Text>
      {showPercentage && <Text> {percentage}%</Text>}
      <Text dimColor> ({current}/{total})</Text>
    </Box>
  );
}

// =============================================================================
// Agent Status Component
// =============================================================================

interface AgentStatusProps {
  phase: ProgressPhase;
  message: string;
  isActive?: boolean;
}

export function AgentStatus({
  phase,
  message,
  isActive = true,
}: AgentStatusProps): React.ReactElement {
  const icon = AGENT_ICONS[phase];
  const name = AGENT_NAMES[phase];

  return (
    <Box>
      <Text>{icon} </Text>
      <Text bold color={isActive ? 'cyan' : 'gray'}>
        {name}:
      </Text>
      <Text> {message}</Text>
      {isActive && phase !== 'complete' && phase !== 'error' && (
        <Text color="cyan">
          {' '}
          <Spinner type="dots" />
        </Text>
      )}
    </Box>
  );
}

// =============================================================================
// Progress Display Component
// =============================================================================

interface ProgressDisplayProps {
  update: ProgressUpdate;
  showProgress?: boolean;
}

export function ProgressDisplay({
  update,
  showProgress = true,
}: ProgressDisplayProps): React.ReactElement {
  const { phase, file, message, current, total } = update;

  return (
    <Box flexDirection="column">
      <AgentStatus phase={phase} message={message} isActive={phase !== 'complete' && phase !== 'error'} />

      {file && (
        <Box marginLeft={2}>
          <Text dimColor>File: {file}</Text>
        </Box>
      )}

      {showProgress && current !== undefined && total !== undefined && total > 0 && (
        <Box marginLeft={2} marginTop={1}>
          <ProgressBar current={current} total={total} />
        </Box>
      )}
    </Box>
  );
}

// =============================================================================
// Self-Healing Progress Component
// =============================================================================

interface HealingProgressProps {
  attempt: number;
  maxAttempts: number;
  failedTests: number;
  totalTests: number;
  currentAction: string;
}

export function HealingProgress({
  attempt,
  maxAttempts,
  failedTests,
  totalTests,
  currentAction,
}: HealingProgressProps): React.ReactElement {
  return (
    <Box flexDirection="column" marginY={1}>
      <Box>
        <Text>🔧 </Text>
        <Text bold color="yellow">
          Self-Healing Attempt {attempt}/{maxAttempts}
        </Text>
      </Box>

      <Box marginLeft={3}>
        <Text>
          Tests: <Text color="green">{totalTests - failedTests} passing</Text>
          {failedTests > 0 && (
            <Text color="red"> / {failedTests} failing</Text>
          )}
        </Text>
      </Box>

      <Box marginLeft={3}>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text> {currentAction}</Text>
      </Box>
    </Box>
  );
}

// =============================================================================
// Generation Summary Component
// =============================================================================

interface GenerationSummaryProps {
  result: TestGenerationResult;
  duration: number;
  healingAttempts?: number;
}

export function GenerationSummary({
  result,
  duration,
  healingAttempts,
}: GenerationSummaryProps): React.ReactElement {
  const icon = result.success ? '✅' : '❌';
  const statusColor = result.success ? 'green' : 'red';
  const statusText = result.success ? 'Generated tests' : 'Generation failed';

  return (
    <Box flexDirection="column" marginY={1}>
      <Box>
        <Text>{icon} </Text>
        <Text bold color={statusColor}>
          {statusText} for {result.sourceFile}
        </Text>
      </Box>

      <Box marginLeft={3} flexDirection="column">
        <Text>
          → Output: <Text color="cyan">{result.testFile}</Text>
        </Text>

        <Text>
          → Tests: <Text bold>{result.testCount}</Text>
          {result.edgeCases.length > 0 && (
            <Text dimColor> ({result.edgeCases.length} edge cases)</Text>
          )}
        </Text>

        {healingAttempts !== undefined && healingAttempts > 0 && (
          <Text>
            → Self-healed: <Text color="yellow">{healingAttempts} fix(es) applied</Text>
          </Text>
        )}

        <Text>
          → Time: <Text dimColor>{formatDuration(duration)}</Text>
        </Text>

        {result.validationPassed && (
          <Text color="green">→ Validation: Passed</Text>
        )}

        {result.error && (
          <Text color="red">→ Error: {result.error}</Text>
        )}
      </Box>
    </Box>
  );
}

// =============================================================================
// Batch Summary Component
// =============================================================================

interface BatchSummaryProps {
  totalFiles: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  totalTests: number;
  totalEdgeCases: number;
  duration: number;
}

export function BatchSummary({
  totalFiles,
  successCount,
  failedCount,
  skippedCount,
  totalTests,
  totalEdgeCases,
  duration,
}: BatchSummaryProps): React.ReactElement {
  const allSuccess = failedCount === 0 && skippedCount === 0;

  return (
    <Box flexDirection="column" marginY={1} borderStyle="round" borderColor="gray" paddingX={2} paddingY={1}>
      <Box>
        <Text bold>📊 Batch Generation Summary</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text>
          Files: <Text bold>{totalFiles}</Text>
          {' '}(<Text color="green">{successCount} success</Text>
          {failedCount > 0 && <Text color="red">, {failedCount} failed</Text>}
          {skippedCount > 0 && <Text color="yellow">, {skippedCount} skipped</Text>})
        </Text>

        <Text>
          Tests Generated: <Text bold color="cyan">{totalTests}</Text>
          {totalEdgeCases > 0 && <Text dimColor> ({totalEdgeCases} edge cases)</Text>}
        </Text>

        <Text>
          Duration: <Text dimColor>{formatDuration(duration)}</Text>
        </Text>
      </Box>

      <Box marginTop={1}>
        {allSuccess ? (
          <Text color="green" bold>✅ All files processed successfully!</Text>
        ) : (
          <Text color="yellow">⚠️ Some files had issues. Check verbose output for details.</Text>
        )}
      </Box>
    </Box>
  );
}

// =============================================================================
// Verbose Output Component
// =============================================================================

interface VerboseOutputProps {
  title: string;
  content: string;
  color?: string;
}

export function VerboseOutput({
  title,
  content,
  color = 'gray',
}: VerboseOutputProps): React.ReactElement {
  return (
    <Box flexDirection="column" marginY={1}>
      <Box borderStyle="single" borderColor={color} paddingX={1}>
        <Text bold color={color}>
          {title}
        </Text>
      </Box>
      <Box marginLeft={2}>
        <Text dimColor>{content}</Text>
      </Box>
    </Box>
  );
}

// =============================================================================
// Error Display Component
// =============================================================================

interface ErrorDisplayProps {
  error: string;
  details?: string;
}

export function ErrorDisplay({ error, details }: ErrorDisplayProps): React.ReactElement {
  return (
    <Box flexDirection="column" marginY={1}>
      <Box>
        <Text color="red" bold>
          ❌ Error: {error}
        </Text>
      </Box>
      {details && (
        <Box marginLeft={2}>
          <Text dimColor>{details}</Text>
        </Box>
      )}
    </Box>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}
