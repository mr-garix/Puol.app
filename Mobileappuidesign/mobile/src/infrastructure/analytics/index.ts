export type AnalyticsEvent = {
  name: string;
  properties?: Record<string, unknown>;
};

let logger: ((event: AnalyticsEvent) => void) | null = null;

export function configureAnalyticsLogger(callback: (event: AnalyticsEvent) => void) {
  logger = callback;
}

export function trackAnalyticsEvent(event: AnalyticsEvent) {
  if (logger) {
    logger(event);
    return;
  }
  if (__DEV__) {
    console.log('[Analytics]', event.name, event.properties);
  }
}
