# Unit Test Generation Prompt

You are an expert test engineer. Generate comprehensive unit tests for the following source code.

## Source Code

```{{language}}
{{source_code}}
```

## Dependencies Context

The following dependencies are imported and should be mocked:

{{dependencies}}

{{#if mock_instructions}}
## Mock Setup Example

{{mock_instructions}}
{{/if}}

## Test Framework

Use **{{framework}}** testing framework with the following patterns:

{{#if vitest}}
- Use `import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';`
- Use `vi.mock()` for mocking modules (place before any imports)
- Use `vi.mocked()` for typed mocks
- Use `vi.fn()` for function mocks
- Use `mockResolvedValue` and `mockRejectedValue` for async mocks
- Use `vi.resetAllMocks()` in `beforeEach` to reset mock state
{{/if}}

{{#if jest}}
- Use `import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';`
- Use `jest.mock()` for mocking modules (place before any imports)
- Use `jest.mocked()` for typed mocks (Jest 27.4+)
- Use `jest.fn()` for function mocks
- Use `mockResolvedValue` and `mockRejectedValue` for async mocks
- Use `jest.resetAllMocks()` in `beforeEach` to reset mock state
{{/if}}

{{#if mocha}}
- Use `import { describe, it, before, beforeEach, afterEach } from 'mocha';`
- Use `import { expect } from 'chai';`
- Use `import sinon from 'sinon';` for mocking
- Use `sinon.stub()` for stubbing functions
- Use `sinon.restore()` in `afterEach` to clean up stubs
{{/if}}

## Requirements

1. **Mock all external dependencies** - No real API calls, file operations, or external services
2. **Include at least {{min_edge_cases}} edge cases:**
   - Null/undefined inputs (for optional parameters)
   - Empty arrays/objects
   - Boundary values (0, -1, empty string)
   - Error conditions and exception handling
   - Async rejections (for async functions)
3. **Use proper import paths** - Include `.js` extension for ESM compatibility
4. **Type safety** - Ensure mocks return correctly typed values
5. **Descriptive test names** - Use format: `it('should [action] when [condition]')`
6. **Test isolation** - Each test should be independent, reset mocks between tests
7. **Arrange-Act-Assert pattern** - Structure tests clearly

{{#if edge_case_instructions}}
{{edge_case_instructions}}
{{/if}}

## Output Format

Return ONLY the test code in a TypeScript code block. No explanations before or after.

```typescript
// Your generated tests here
```
