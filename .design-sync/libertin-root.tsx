/**
 * Preview/runtime root for the Libertin design system.
 *
 * Every Libertin component resolves its user-facing copy through
 * `react-i18next` (`useTranslation()`), so the shared i18next instance must be
 * initialised before any of them mount — otherwise labels render as raw keys
 * (`theme.toggle` instead of `Noční režim`).
 *
 * This module is merged into the shipped bundle via `cfg.extraEntries` so the
 * `i18next` instance it initialises is the *same* copy the components import.
 * Initialising from Storybook's `.storybook/preview` decorator does not work:
 * that bundle carries its own `i18next`, so it initialises an instance nothing
 * else reads.
 *
 * In the product apps the equivalent is calling `initI18n()` once at startup.
 */
import React from 'react';
import { initI18n } from '@libertin/i18n';

// Module scope: the catalogue is bundled inline (no async backend), so this
// settles before the first component renders.
void initI18n('cs');

export interface LibertinRootProps {
  /** `cs` (default) or `en` — the two locales the contract funds (B13). */
  locale?: 'cs' | 'en';
  children?: React.ReactNode;
}

/** Wrap the tree so Libertin components render real copy, not i18n keys. */
export function LibertinRoot({ locale = 'cs', children }: LibertinRootProps) {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    void Promise.resolve(initI18n(locale)).then(() => setReady(true));
  }, [locale]);
  // `ready` only forces a re-render after a locale switch; the first paint is
  // already correct because the module-scope init above ran at load.
  void ready;
  return <>{children}</>;
}
