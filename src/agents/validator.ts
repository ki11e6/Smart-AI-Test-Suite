/**
 * Smart AI Test Suit - Validator Agent
 * Validates generated test code for lint errors, import issues, and mock completeness.
 */

import type {
  AgentContext,
  ValidatorInput,
  ValidatorOutput,
} from './types.js';
import { BaseAgent } from './base.js';
import {
  createQualityAssuranceService,
  type QualityReport,
} from '../services/quality-assurance.js';

export class ValidatorAgent extends BaseAgent<ValidatorInput, ValidatorOutput> {
  readonly name = 'Validator';

  constructor() {
    super();
  }

  /**
   * Validate the generated test code
   */
  protected async run(input: ValidatorInput, context: AgentContext): Promise<ValidatorOutput> {
    const { testCode, sourceFile, dependencies } = input;

    // Create QA service instance
    const qaService = createQualityAssuranceService();

    // Run comprehensive validation
    const report = await qaService.validate(testCode, {
      sourceFile,
      dependencies,
      framework: context.framework,
      autoFix: true,
      strictMode: false,
    });

    // Log quality report if verbose
    if (context.options.verbose) {
      // Format report is available via qaService.formatReport(report)
      // The formatted output would be logged to console in CLI
    }

    return this.convertReportToOutput(report);
  }

  /**
   * Convert QualityReport to ValidatorOutput
   */
  private convertReportToOutput(report: QualityReport): ValidatorOutput {
    return {
      isValid: report.isValid,
      lintErrors: report.lintErrors,
      importErrors: report.importErrors,
      mockIssues: report.mockIssues,
      fixedCode: report.fixedCode,
    };
  }

  /**
   * Get formatted quality report for display
   */
  formatReport(report: QualityReport): string {
    const qaService = createQualityAssuranceService();
    return qaService.formatReport(report);
  }
}
