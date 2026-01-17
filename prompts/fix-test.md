# Test Fix Prompt

You are an expert test engineer. Fix the failing tests based on the error output.

## Original Test Code

```typescript
{{test_code}}
```

## Source Code Under Test

```{{language}}
{{source_code}}
```

## Test Failures

The following tests failed with these errors:

{{failures}}

## Attempt Number

This is attempt **{{attempt}}** of {{max_retries}}.

{{#if previous_fixes}}
## Previous Fix Attempts

The following fixes were tried but didn't fully resolve the issues:

{{previous_fixes}}
{{/if}}

## Requirements

1. **Fix all failing tests** - Address each error message
2. **Preserve passing tests** - Don't modify tests that were working
3. **Ensure mocks are correct:**
   - Mock return types must match expected types
   - Async mocks should use `mockResolvedValue` / `mockRejectedValue`
   - Reset mocks between tests if needed
4. **Fix import paths** - Ensure `.js` extension for ESM
5. **Handle edge cases properly** - The test might be wrong, not the implementation

## Common Issues to Check

- Missing `await` for async operations
- Mock not returning the expected type
- Mock not being reset between tests
- Incorrect import path (missing .js)
- Type mismatches in assertions

## Output Format

Return ONLY the complete fixed test code in a TypeScript code block. Include ALL tests (both fixed and unchanged).

```typescript
// Your fixed tests here
```
