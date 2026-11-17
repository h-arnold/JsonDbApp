/**
 * BackoffUtils.test.js - Vitest tests for BackoffUtils
 */

describe('BackoffUtils.calculateBackoff', () => {
  const PRODUCTION_MIN_MS = 500;
  const PRODUCTION_MAX_MS = 5000;

  // Arrange: bounded cases pin growth, the production floor/cap and the attempt minus one exponent.
  const boundedCases = [
    {
      label: 'returns baseDelayMs unchanged on the first attempt when it sits above the floor',
      attempt: 1,
      baseDelayMs: 1000,
      base: 2,
      expected: 1000
    },
    {
      label: 'grows the delay exponentially between the floor and cap on a later attempt',
      attempt: 2,
      baseDelayMs: 1000,
      base: 2,
      expected: 2000
    },
    {
      label: 'applies the 500 ms production floor when the raw value is below it',
      attempt: 1,
      baseDelayMs: 100,
      base: 2,
      expected: PRODUCTION_MIN_MS
    },
    {
      label: 'applies the 5000 ms production cap when the raw value exceeds it',
      attempt: 5,
      baseDelayMs: 1000,
      base: 2,
      expected: PRODUCTION_MAX_MS
    },
    {
      label: 'uses an attempt minus one exponent to keep a third attempt mid-range',
      attempt: 3,
      baseDelayMs: 1000,
      base: 2,
      expected: 4000
    }
  ];

  it.each(boundedCases)('$label', ({ attempt, baseDelayMs, base, expected }) => {
    // Act
    const result = BackoffUtils.calculateBackoff(
      attempt,
      baseDelayMs,
      base,
      PRODUCTION_MIN_MS,
      PRODUCTION_MAX_MS
    );

    // Assert
    expect(result).toBe(expected);
  });

  it('leaves the raw exponential result unclamped with infinite bounds', () => {
    // Arrange
    const attempt = 4;
    const baseDelayMs = 100;
    const base = 3;

    // Act
    const result = BackoffUtils.calculateBackoff(attempt, baseDelayMs, base, -Infinity, Infinity);

    // Assert
    expect(result).toBe(2700);
  });
});
