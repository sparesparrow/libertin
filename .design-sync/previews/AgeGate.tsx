// Owned preview for AgeGate.
//
// AgeGate's root is `position: fixed; inset: 0` — a full-viewport scrim with a
// centred dialog. The preview card wraps each story in `.ds-single`, which
// carries `transform: translateZ(0)` so overlay components cannot paint over
// the rest of the card. That transform makes the wrapper the containing block
// for any `position: fixed` descendant, and since the wrapper derives its own
// height from its content, the scrim collapsed to a thin strip and the dialog
// heading was pushed out of frame.
//
// The fix is to give the fixed overlay a real box to fill: this wrapper
// establishes its OWN containing block (nearer than `.ds-single`) at an
// explicit size, so the gate renders as it does in Storybook — full scrim,
// centred dialog, heading visible.
import * as React from 'react';
import * as S from "@ds-stories/packages/ui/src/AgeGate/AgeGate.stories";

/** Viewport stand-in: matches the card's declared 900x700 grading viewport. */
function Stage({ children }: { children?: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 560,
        overflow: 'hidden',
        borderRadius: 'var(--radius-md)',
        // Establishes the containing block for the gate's `position: fixed`
        // root, so `inset: 0` resolves to THIS box rather than a zero-height one.
        transform: 'translateZ(0)',
      }}
    >
      {children}
    </div>
  );
}

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
  const composed = decorators.reduce((inner: any, dec: any) => () => {
    const out = dec(inner, ctx);
    return out === undefined ? inner() : out;
  }, render);
  return () => React.createElement(Stage, null, composed());
}

export const Default = /* Default */ compose(S, "Default");
export const CookiesBlocked = /* Cookies Blocked */ compose(S, "CookiesBlocked");
