// Owned preview for ThemeToggle.
//
// Why this is owned rather than generated: the `Night Mode` story seeds its
// stored theme through a Storybook `loaders` hook, which the generated wrapper
// does not run — so the preview rendered the light/off state while the
// reference storybook rendered dark/on. This wrapper mirrors Storybook by
// executing each story's (synchronous) loaders before the story mounts.
import * as React from 'react';
import * as S from "@ds-stories/packages/ui/src/ThemeToggle/ThemeToggle.stories";

function compose(S: any, key: string) {
  const meta: any = S.default ?? {};
  const st: any = S[key];
  const args: any = { ...(meta.args ?? {}), ...(st && st.args ? st.args : {}) };
  const at: any = { ...(meta.argTypes ?? {}), ...(st && st.argTypes ? st.argTypes : {}) };
  for (const k of Object.keys(args)) {
    const m = at[k] && at[k].mapping;
    if (m && typeof m === 'object' && args[k] in m) args[k] = m[args[k]];
  }
  const title: string = typeof meta.title === 'string' ? meta.title : '';
  const ctx: any = {
    args, name: key, title, kind: title, id: '', componentId: '',
    globals: {}, viewMode: 'story',
    parameters: (st && st.parameters) ?? meta.parameters ?? {},
  };
  // Storybook runs meta- then story-level loaders before the first render.
  // Only synchronous loaders can be honoured here (the preview mounts
  // synchronously); an async one would need the story pinned in this file.
  for (const load of ([] as any[]).concat(meta.loaders ?? []).concat((st && st.loaders) ?? [])) {
    try { load(ctx); } catch { /* a loader that needs a real browser API is a no-op here */ }
  }
  let render: (() => any) | null = null;
  if (st && typeof st.render === 'function') render = () => st.render(args, ctx);
  else if (typeof st === 'function') render = () => st(args, ctx);
  else if (typeof meta.render === 'function') render = () => meta.render(args, ctx);
  else {
    const C = (st && st.component) || meta.component;
    if (C) render = () => React.createElement(C, args);
  }
  if (!render) return () => null;
  const decorators: any[] = ([] as any[]).concat((st && st.decorators) ?? []).concat(meta.decorators ?? []);
  return decorators.reduce((inner: any, dec: any) => () => {
    const out = dec(inner, ctx);
    return out === undefined ? inner() : out;
  }, render);
}

export const Default = /* Default */ compose(S, "Default");
export const IconOnly = /* Icon Only */ compose(S, "IconOnly");
export const NightMode = /* Night Mode */ compose(S, "NightMode");
