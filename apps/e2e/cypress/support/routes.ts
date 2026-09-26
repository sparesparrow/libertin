/**
 * Module registry — the single place that maps the owner's module names to the
 * routes they actually live on.
 *
 * The names on the left are the ones used when the work is discussed ("zeď",
 * "bog", "kredit"); the paths on the right were verified against the running
 * deployment rather than assumed, because several of the obvious guesses
 * (`/zed`, `/bog`, `/kredit`, `/profily`) resolve to the framework 404.
 *
 * When a module moves, change it here — no spec hardcodes a path.
 */

export interface ModuleRoute {
  /** Stable id used in spec titles and in reported findings. */
  readonly id: string;
  /** The name the owner uses for this module. */
  readonly label: string;
  /** Primary route. */
  readonly path: string;
  /** Secondary routes that belong to the same module. */
  readonly also?: readonly string[];
  /** Heading the page is expected to render, when it has one. */
  readonly heading?: string;
  /** Copy that proves the module's own content rendered, not just the shell. */
  readonly marker?: string;
  /**
   * Whether the module redirects an anonymous visitor to `/login`.
   *
   * Measured, not assumed — the redirect happens on hydration, so it is
   * invisible to anything that only reads the server response.
   */
  readonly requiresAuth?: boolean;
}

export const MODULES = {
  homepage: {
    id: 'homepage',
    label: 'Homepage',
    path: '/',
    heading: 'Seznamte & spojte se se stejně smýšlejícími.',
    marker: 'O platformě',
  },
  wall: {
    id: 'wall',
    label: 'Zeď',
    path: '/wall',
    marker: 'Vytvořit příběh',
  },
  bog: {
    id: 'bog',
    label: 'Bog (messenger)',
    path: '/messages',
    // The messenger's tabs are Zprávy / Skupiny / Volání since September 2026
    // (Místnosti belonged to the previous design).
    marker: 'Volání',
    requiresAuth: true,
  },
  profiles: {
    id: 'profiles',
    label: 'Profily',
    path: '/people',
    also: ['/profile', '/profile/favorites', '/profile/friends'],
    heading: 'Lidé',
    requiresAuth: true,
  },
  trefa: {
    id: 'trefa',
    label: 'Trefa',
    path: '/trefa',
    marker: 'rychlé nastavení',
    requiresAuth: true,
  },
  chat: {
    id: 'chat',
    label: 'Chat',
    path: '/chat',
    heading: 'Chatujte s přáteli online',
    marker: 'Místnosti',
    requiresAuth: true,
  },
  marketplace: {
    id: 'marketplace',
    label: 'Marketplace',
    path: '/marketplace',
    heading: 'Marketplace',
    marker: 'Nový inzerát',
    requiresAuth: true,
  },
  media: {
    id: 'media',
    label: 'Média',
    path: '/media',
    heading: 'Média',
    marker: 'Fotky',
    requiresAuth: true,
  },
  credit: {
    id: 'credit',
    label: 'Kredit / platební brána',
    path: '/profile/credit',
    heading: 'Platby',
    marker: 'Členství',
    requiresAuth: true,
  },
  settings: {
    id: 'settings',
    label: 'Nastavení profilu',
    path: '/settings/osobni',
    also: ['/settings/ucet', '/settings/o-mne', '/settings/hledam'],
    marker: 'Nastavení profilu',
    requiresAuth: true,
  },
} as const satisfies Record<string, ModuleRoute>;

export type ModuleId = keyof typeof MODULES;

export const ALL_MODULES: readonly ModuleRoute[] = Object.values(MODULES);

/** Every route the suite touches, primary and secondary alike. */
export function routesOf(module: ModuleRoute): readonly string[] {
  return [module.path, ...(module.also ?? [])];
}

/**
 * Routes outside the nine modules that the suite still leans on — the global
 * shell is asserted against these so a shell regression is not misattributed
 * to whichever module happened to be under test.
 */
export const SUPPORT_ROUTES = {
  login: '/login',
  register: '/register',
  faq: '/faq',
  novinky: '/novinky',
  notifications: '/notifications',
  certification: '/certification',
} as const;

/**
 * The public, informational and legal surface — every route the footer and the
 * signed-out header link to.
 *
 * These are not "modules", which is exactly why they went uncovered: the module
 * registry describes the member-facing product, and nothing described the pages
 * the platform is legally and contractually judged on. A member never has to
 * log in to reach any of them, and several of them (GDPR, VOP, pravidla) are
 * the documents that make the product lawful to operate at all.
 *
 * `marker` is copy that proves the page rendered its own content rather than a
 * shell or a placeholder. Missing markers are reported, not asserted — the
 * wording is the owner's to choose — while existence and anonymous
 * reachability are asserted, because those are not matters of taste.
 */
export interface PublicPage {
  readonly path: string;
  readonly label: string;
  /** Why this page has to exist. Shown in the finding when it does not. */
  readonly why: string;
  readonly marker?: readonly string[];
  /**
   * A form page is mostly inputs, so it is legitimately short — the
   * thin-content check would fire on every one of them and train readers to
   * skim past findings. Documents are the pages where thin means empty.
   */
  readonly kind?: 'document' | 'form';
}

export const PUBLIC_PAGES: readonly PublicPage[] = [
  { path: '/o-nas', label: 'O nás', why: 'odkazováno z patičky' },
  { path: '/kontakt', label: 'Kontakt', why: 'odkazováno z patičky' },
  { path: '/faq', label: 'Časté dotazy', why: 'odkazováno z patičky' },
  { path: '/pomoc', label: 'Nápověda', why: 'odkazováno z patičky' },
  { path: '/support', label: 'Podpora', why: 'odkazováno z patičky' },
  { path: '/novinky', label: 'Novinky', why: 'odkazováno z patičky' },
  { path: '/clenstvi', label: 'Členství', why: 'ceník a rozsah placené služby' },
  {
    path: '/vop',
    label: 'Všeobecné obchodní podmínky',
    why: 'smluvní vztah s členem; bez nich nelze provozovat placenou službu',
    marker: ['podmín'],
  },
  {
    path: '/gdpr',
    label: 'Ochrana osobních údajů',
    why: 'GDPR čl. 13 — informační povinnost; u citlivých údajů podle čl. 9 o to víc',
    marker: ['osobní údaj'],
  },
  { path: '/pravidla', label: 'Pravidla webu', why: 'pravidla komunity a moderace' },
  {
    path: '/impresum',
    label: 'Impresum',
    why: 'identifikace provozovatele — povinný údaj',
  },
  { path: '/prohlaseni', label: 'Prohlášení', why: 'odkazováno z patičky' },
  { path: '/reklama', label: 'Reklama', why: 'odkazováno z patičky' },
  { path: '/marketing', label: 'Marketing', why: 'odkazováno z patičky' },
  {
    path: '/forgot-password',
    label: 'Zapomenuté heslo',
    why: 'obnova přístupu k účtu',
    kind: 'form',
  },
] as const;

/**
 * Czech copy that must never appear. CLAUDE.md calls these out by name: they
 * were fixed once in `packages/i18n/locales.json` and must not come back.
 * `wrong` is what must not render, `right` is the correction to report.
 */
export const CZECH_TYPO_BLOCKLIST: readonly { wrong: string; right: string }[] = [
  { wrong: 'Zapomenute', right: 'Zapomenuté' },
  { wrong: 'svůj učet', right: 'svůj účet' },
  { wrong: 'Mate ', right: 'Máte ' },
  { wrong: 'svoji heslo', right: 'své heslo' },
  // Found in the "unknown network" modal that appears after signing in.
  { wrong: 'nenámé', right: 'neznámé' },
  // Poll copy in the member sidebar.
  { wrong: 'se vám libí', right: 'se vám líbí' },
  // Homepage "O platformě Libertin" block, 2026-09-16. The same paragraph
  // writes "kteří tě chápou" correctly one line earlier, so this is a slip in
  // a single string rather than a systematic encoding problem.
  { wrong: 'Kde te ', right: 'Kde tě ' },
];

/**
 * Czech words whose diacritic-stripped form is not a word in Czech at all.
 *
 * The blocklist above only catches typos someone has already seen. This list
 * catches the *class*: a string that lost its diacritics somewhere between the
 * catalogue and the page. Each entry is a whole-word match, so `te` does not
 * match inside `internet` and does not match `tě` (which is `t` + `ě`, never
 * `t` + `e`).
 *
 * Reported as findings rather than asserted: a member's display name or a
 * foreign word could legitimately produce one of these, and a check that can
 * fire on user-generated content must not gate a merge.
 */
export const MISSING_DIACRITIC_FORMS: readonly { bare: string; correct: string }[] = [
  { bare: 'te', correct: 'tě' },
  { bare: 'vam', correct: 'vám' },
  { bare: 'vas', correct: 'vás' },
  { bare: 'nam', correct: 'nám' },
  { bare: 'nas', correct: 'nás' },
  { bare: 'muze', correct: 'může' },
  { bare: 'muzete', correct: 'můžete' },
  { bare: 'jeste', correct: 'ještě' },
  { bare: 'prosim', correct: 'prosím' },
  { bare: 'dekujeme', correct: 'děkujeme' },
  { bare: 'ucet', correct: 'účet' },
  { bare: 'svuj', correct: 'svůj' },
  { bare: 'prihlasit', correct: 'přihlásit' },
  { bare: 'heslo je prilis', correct: 'heslo je příliš' },
];
