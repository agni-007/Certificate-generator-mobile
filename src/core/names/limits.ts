/**
 * Name-count limits (implementation.md: max 2,000 by default). Pure.
 */

import { LIMITS } from "../constants";

export function enforceLimit(names: readonly string[], max: number = LIMITS.maxNames): string[] {
  return names.slice(0, Math.max(0, max));
}

export function isWithinLimit(names: readonly string[], max: number = LIMITS.maxNames): boolean {
  return names.length <= max;
}

/** How many names would be dropped by `enforceLimit`. */
export function excessCount(names: readonly string[], max: number = LIMITS.maxNames): number {
  return Math.max(0, names.length - max);
}
