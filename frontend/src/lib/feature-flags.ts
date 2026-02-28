/**
 * Feature flags & A/B testing utility.
 *
 * Flags are resolved using the following priority (highest first):
 *   1. Runtime overrides stored in localStorage (useful for QA / manual testing)
 *   2. Remote config fetched from the backend  (/v1/feature-flags)
 *   3. Default values defined in DEFAULT_FLAGS below
 *
 * Usage:
 *   import { isEnabled, getVariant } from '@/lib/feature-flags';
 *
 *   if (isEnabled('new_dashboard')) { ... }
 *   const variant = getVariant('pricing_page'); // 'control' | 'variant_a' | ...
 */

export type FlagValue = boolean | string | number;

export type FeatureFlag = {
  key: string;
  value: FlagValue;
  /** Optional A/B variant label */
  variant?: string;
};

// Default flag values – override via remote config or localStorage
const DEFAULT_FLAGS: Record<string, FlagValue> = {
  analytics_dashboard: true,
  new_dashboard_layout: false,
  performance_monitoring: true,
  user_feedback_widget: false,
  ab_pricing_page: 'control',
};

const _remoteFlags: Record<string, FlagValue> = {};
let _fetched = false;

/**
 * Fetch flag values from the backend and cache them in memory.
 * Safe to call multiple times – subsequent calls are no-ops until the page reloads.
 */
export async function fetchFeatureFlags(): Promise<void> {
  if (_fetched) { return; }
  _fetched = true;
  try {
    const { default: api } = await import('./api');
    const res = await api.get<{ flags: FeatureFlag[] }>('/v1/feature-flags');
    const flags = res?.data?.flags ?? [];
    for (const f of flags) {
      _remoteFlags[f.key] = f.value;
    }
  } catch {
    // Non-critical – fall back to defaults
  }
}

function getLocalOverride(key: string): FlagValue | undefined {
  if (typeof window === 'undefined') { return undefined; }
  try {
    const raw = localStorage.getItem(`ff_override_${key}`);
    if (raw === null) { return undefined; }
    try { return JSON.parse(raw) as FlagValue; } catch { return raw; }
  } catch {
    return undefined;
  }
}

/**
 * Returns the resolved value for a feature flag.
 */
export function getFlagValue(key: string): FlagValue {
  const override = getLocalOverride(key);
  if (override !== undefined) { return override; }
  if (key in _remoteFlags) { return _remoteFlags[key]; }
  return DEFAULT_FLAGS[key] ?? false;
}

/**
 * Returns true when a boolean flag is enabled.
 */
export function isEnabled(key: string): boolean {
  return Boolean(getFlagValue(key));
}

/**
 * Returns the variant string for an A/B test flag (defaults to 'control').
 */
export function getVariant(key: string): string {
  const val = getFlagValue(key);
  return typeof val === 'string' ? val : 'control';
}

/**
 * Manually override a flag value in localStorage (for QA purposes).
 */
export function setLocalOverride(key: string, value: FlagValue) {
  if (typeof window === 'undefined') { return; }
  try {
    localStorage.setItem(`ff_override_${key}`, JSON.stringify(value));
  } catch { /* ignore */ }
}

/**
 * Remove a localStorage override.
 */
export function clearLocalOverride(key: string) {
  if (typeof window === 'undefined') { return; }
  try {
    localStorage.removeItem(`ff_override_${key}`);
  } catch { /* ignore */ }
}

const featureFlags = { getFlagValue, isEnabled, getVariant, fetchFeatureFlags, setLocalOverride, clearLocalOverride };
export default featureFlags;
