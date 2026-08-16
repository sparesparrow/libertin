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
    marker: 'Místnosti',
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
];
