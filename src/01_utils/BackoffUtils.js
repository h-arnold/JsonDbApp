/**
 * BackoffUtils - Shared exponential backoff calculation utility
 *
 * Centralises the clamped exponential-backoff formula used by lock acquisition and
 * file-operation retry paths so both callers share one implementation.
 */
/* exported BackoffUtils */
/**
 * Static helper for calculating exponential backoff with caller-supplied bounds.
 */
class BackoffUtils {
  /**
   * Calculate an exponential backoff for a one-based attempt index, bounded by minMs and maxMs.
   * @param {number} attempt - One-based index of the failed attempt.
   * @param {number} baseDelayMs - Backoff applied on the first attempt.
   * @param {number} base - Growth multiplier applied once per subsequent attempt.
   * @param {number} minMs - Lower bound applied to the result.
   * @param {number} maxMs - Upper bound applied to the result.
   * @returns {number} Delay in milliseconds, bounded by minMs and maxMs.
   */
  static calculateBackoff(attempt, baseDelayMs, base, minMs, maxMs) {
    return Math.max(minMs, Math.min(baseDelayMs * Math.pow(base, attempt - 1), maxMs));
  }
}
