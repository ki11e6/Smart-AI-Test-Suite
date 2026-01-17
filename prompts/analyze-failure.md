# Failure Analysis Prompt

Analyze the following test failure and identify the root cause.

## Test Output

```
{{test_output}}
```

## Test Code

```typescript
{{test_code}}
```

## Source Code

```{{language}}
{{source_code}}
```

## Analysis Required

Provide a brief analysis of:

1. **Root Cause** - What is causing the test to fail?
2. **Error Type** - Is this a:
   - Mock setup issue
   - Type mismatch
   - Async/await issue
   - Import path issue
   - Logic error in test
   - Logic error in source
3. **Suggested Fix** - What specific change would fix this?

## Output Format

Respond in this exact JSON format:

```json
{
  "rootCause": "Brief description of the root cause",
  "errorType": "mock|type|async|import|test_logic|source_logic",
  "suggestedFix": "Specific change to make",
  "confidence": "high|medium|low"
}
```
