/**
 * The rewrite target for unconfirmed visitors — deliberately empty.
 *
 * The gate itself is rendered by the root layout, which withholds `children`
 * until the consent cookie is present. This route exists only to give
 * `middleware.ts` somewhere to send a request *instead of* the page that was
 * asked for, and its emptiness is the entire point: whatever Next seeds into
 * the RSC payload for this segment, there is nothing here to seed.
 *
 * That is why this returns `null` rather than rendering the gate a second time.
 * Rendering it here as well would put two dialogs in the tree — the layout
 * already renders one for every unconfirmed request, this route included.
 *
 * Not reachable with consent: the middleware redirects confirmed visitors who
 * land here to `/`. Without the middleware (a deploy that drops it, or a broken
 * matcher) a confirmed visitor typing `/gate` gets a blank page, which is the
 * harmless direction to fail in.
 */
export default function GatePage() {
  return null;
}
