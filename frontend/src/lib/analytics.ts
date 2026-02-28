/**
 * Analytics service – provider-agnostic event tracking.
 *
 * Events are buffered in memory and flushed to the backend via the existing
 * API layer.  Optional third-party integrations (PostHog, GA4, Mixpanel) can
 * be enabled by setting the corresponding NEXT_PUBLIC_* environment variable.
 */

export type AnalyticsEvent = {
  name: string;
  properties?: Record<string, unknown>;
  userId?: string;
  timestamp?: number;
};

// ---- provider helpers (no-op when env var is absent) --------------------

function sendToGA4(name: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') { return; }
  const gtag = (window as any).gtag;
  if (typeof gtag === 'function') {
    gtag('event', name, properties ?? {});
  }
}

function sendToPostHog(name: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') { return; }
  const posthog = (window as any).posthog;
  if (posthog && typeof posthog.capture === 'function') {
    posthog.capture(name, properties ?? {});
  }
}

// ---- internal queue & flush --------------------------------------------

const _queue: AnalyticsEvent[] = [];
let _flushTimeout: ReturnType<typeof setTimeout> | null = null;
let _flushing = false;
const FLUSH_DELAY_MS = 2000;
const MAX_QUEUE_SIZE = 50;

function scheduleFlush() {
  if (_flushTimeout !== null) { return; }
  _flushTimeout = setTimeout(() => {
    flushQueue();
  }, FLUSH_DELAY_MS);
}

async function flushQueue() {
  if (_flushing) { return; }
  _flushTimeout = null;
  if (_queue.length === 0) { return; }
  _flushing = true;
  const batch = _queue.splice(0, _queue.length);
  try {
    // Lazy-import to avoid circular dependency at module load time
    const { default: api } = await import('./api');
    await api.post('/v1/analytics/events', { events: batch });
  } catch {
    // Non-critical – silently drop events rather than surfacing errors to users
  } finally {
    _flushing = false;
  }
}

// ---- public API -------------------------------------------------------

/**
 * Track a named event with optional properties.
 */
export function trackEvent(name: string, properties?: Record<string, unknown>, userId?: string) {
  const event: AnalyticsEvent = {
    name,
    properties,
    userId,
    timestamp: Date.now(),
  };

  _queue.push(event);
  if (_queue.length >= MAX_QUEUE_SIZE) {
    flushQueue();
  } else {
    scheduleFlush();
  }

  // Forward to optional third-party providers
  if (process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID) { sendToGA4(name, properties); }
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) { sendToPostHog(name, properties); }
}

/**
 * Track a page view.
 */
export function trackPageView(path: string, userId?: string) {
  trackEvent('page_view', { path }, userId);
}

/**
 * Track a user funnel step.
 *
 * Example funnels:
 *   login → onboarding → analysis_started → analysis_completed
 */
export function trackFunnelStep(funnelName: string, step: string, properties?: Record<string, unknown>, userId?: string) {
  trackEvent('funnel_step', { funnel: funnelName, step, ...properties }, userId);
}

/**
 * Identify the current user (sets userId for subsequent events).
 * Also forwards to provider SDKs when available.
 */
export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (typeof window === 'undefined') { return; }
  const posthog = (window as any).posthog;
  if (posthog && typeof posthog.identify === 'function') {
    posthog.identify(userId, traits ?? {});
  }
  trackEvent('user_identified', { userId, ...traits }, userId);
}

// Flush remaining events when the page is about to unload
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushQueue();
    }
  });
}

const analytics = { trackEvent, trackPageView, trackFunnelStep, identifyUser };
export default analytics;
