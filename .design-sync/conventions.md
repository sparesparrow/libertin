## Libertin — how to build with these components

Libertin is a CZ/SK adult social platform (naturist / swingers / BDSM / shibari).
Two things follow from that and they are not stylistic preferences:

- **Copy is Czech first.** Every label comes from the bundled `cs`/`en`
  catalogue. Never hardcode a user-facing string; if you need new copy, write
  Czech.
- **Discretion is a product requirement.** Members risk real-world harm from
  being outed. Do not design screens that expose a member's identity, photos,
  or interests to anyone who has not been granted them, and do not invent
  "share to social" style affordances.

### Wrap the tree in `<LibertinRoot>`

Every component resolves its text through `react-i18next`. Without the root the
shared i18next instance is never initialised and each component renders its raw
key — `theme.toggle` instead of `Noční režim`.

```jsx
const { LibertinRoot, Hero, Button } = window.LibertinUI;

<LibertinRoot locale="cs">
  <Hero />
  <Button variant="primary">Vstoupit</Button>
</LibertinRoot>
```

`locale` is `"cs"` (default) or `"en"` — those are the two the platform ships.

### Styling: inline style objects over CSS custom properties. There are no classes.

This design system has **no class vocabulary at all** — no utility classes, no
CSS modules, no styled-components. Components style themselves with React
inline `style` objects whose values are `var(--token)` references, and
`tokens.css` is the only stylesheet. Style your own layout glue the same way;
inventing class names will produce unstyled output.

```jsx
<div style={{
  display: 'flex',
  gap: 'var(--space-4)',
  padding: 'var(--space-6)',
  background: 'var(--color-surface)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-sm)',
}}>
```

The complete token vocabulary (every name below is defined in `tokens.css`):

| Group | Tokens |
|---|---|
| Colour | `--color-primary` `--color-primary-text` `--color-on-primary` `--color-bg` `--color-surface` `--color-surface-dark` `--color-text` `--color-text-muted` `--color-border` `--color-info` `--color-success` `--color-error` |
| Space | `--space-1` `--space-2` `--space-3` `--space-4` `--space-6` `--space-8` `--space-12` `--space-16` |
| Radius | `--radius-sm` `--radius-md` `--radius-lg` `--radius-full` |
| Text size | `--text-xs` `--text-sm` `--text-base` `--text-lg` `--text-2xl` `--text-3xl` `--text-4xl` |
| Weight | `--font-normal` `--font-medium` `--font-semibold` `--font-bold` |
| Shadow | `--shadow-sm` `--shadow-md` |

Two colour rules worth stating outright, because getting them wrong is either an
accessibility failure or an off-brand one:

- `--color-primary` (`#F20B49`) is the brand raspberry, for **fills**. As text
  on a light surface it does not reach AA — use `--color-primary-text`
  (`#C40A3C`) for raspberry text.
- On a raspberry fill, the foreground is `--color-on-primary`, not
  `--color-text`.

No typeface is part of this system. `tokens.css` defines weights and sizes but
never a `font-family`, so components inherit whatever the page sets.

### The night theme is an attribute, not a prop

Setting `data-theme="private"` on an ancestor (the product sets it on `<html>`)
re-points `--color-bg`, `--color-surface`, `--color-surface-dark`,
`--color-text`, `--color-text-muted` and `--color-border` to the dark
authenticated palette. Anything built from the colour tokens follows
automatically; anything built from literal hex does not. `ThemeToggle` is the
control that flips it.

### Where the truth lives

- `styles.css` → `tokens/tokens.css` — the only stylesheet, and the whole token
  list. Read it before styling.
- `components/<group>/<Name>/<Name>.d.ts` — the real prop types.
- `components/<group>/<Name>/<Name>.prompt.md` — per-component usage.
- Components are grouped `ui/` (Avatar, Button, Card, Input — generic
  primitives) and `web/` (AgeGate, CategoryCard, Hero, LoginForm, SiteFooter,
  ThemeToggle — Libertin-specific surfaces).

### A composed example

```jsx
const { LibertinRoot, Card, Avatar, Button } = window.LibertinUI;

<LibertinRoot locale="cs">
  <div style={{ display: 'grid', gap: 'var(--space-4)', maxWidth: 480 }}>
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <Avatar initials="KP" size="md" />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: 'var(--color-text)', fontWeight: 'var(--font-semibold)' }}>
            Karolína P.
          </span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            Praha
          </span>
        </div>
      </div>
    </Card>
    <Button variant="secondary">Zobrazit profil</Button>
  </div>
</LibertinRoot>
```
