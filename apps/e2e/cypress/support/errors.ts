/**
 * Runtime-error collector.
 *
 * Console errors and uncaught exceptions are gathered here instead of being
 * left to fail whichever assertion happened to run next. A module still under
 * construction throws; if every throw aborted the spec, the suite would report
 * "chat is broken" when the real news is one unhandled promise rejection in a
 * shared widget. The dedicated runtime-errors spec is what turns this into a
 * pass/fail verdict.
 */

export interface RuntimeError {
  readonly type: 'console.error' | 'uncaught' | 'unhandledrejection';
  readonly message: string;
}

let collected: RuntimeError[] = [];

export function resetRuntimeErrors(): void {
  collected = [];
}

export function pushRuntimeError(error: RuntimeError): void {
  collected.push(error);
}

export function runtimeErrors(): readonly RuntimeError[] {
  return collected;
}

/**
 * Noise that is not the client's fault and would otherwise mask real errors:
 * blocked third-party requests, extension chatter, and the hydration warnings
 * React emits for browser-extension-injected attributes.
 */
const IGNORED = [
  'ResizeObserver loop',
  'Failed to load resource',
  'net::ERR_BLOCKED_BY_CLIENT',
  'Download the React DevTools',
] as const;

export function isIgnorable(message: string): boolean {
  return IGNORED.some((needle) => message.includes(needle));
}
