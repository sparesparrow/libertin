/**
 * Visual-exposure helpers shared by the discretion specs.
 *
 * Plain synchronous functions over the DOM — no `cy.*` in here — so a spec can
 * call them inside a `.then()` and assert on the result in the same callback.
 */

/**
 * Whether an element is visually blurred, by itself or by any ancestor.
 *
 * The blur has to be looked for up the tree: decent mode on the deployed
 * client applies `filter: blur(…)` to wrapper elements, not to the `<img>`,
 * so a check that only inspected the image reported "nothing blurred" on a
 * page where the post plainly was.
 */
export function isBlurred(el: Element, win: Window): boolean {
  for (let node: Element | null = el; node; node = node.parentElement) {
    const style = win.getComputedStyle(node);
    if (/blur\(/.test(style.filter) || /blur\(/.test(style.backdropFilter)) return true;
  }
  return false;
}

/** Rendered, on screen, and not hidden by opacity or visibility. */
export function isShown(el: HTMLElement, win: Window): boolean {
  if (el.offsetParent === null) return false;
  const style = win.getComputedStyle(el);
  if (style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Images that show a member's face.
 *
 * Matched on the source path rather than on alt text, because member avatars
 * on the deployed client carry no alt text that says so.
 *
 * Callers must report only *counts* of what this returns, never a `src`: a
 * photo URL carries the member's ID, and test reports end up in CI artifacts
 * and run summaries.
 */
const MEMBER_PHOTO = /user_profile_photo|\/avatars?\/|profile[_-]?photo/i;

export function memberPhotos(root: ParentNode): HTMLImageElement[] {
  return Array.from(root.querySelectorAll('img')).filter((img) =>
    MEMBER_PHOTO.test(img.currentSrc || img.src || ''),
  );
}

export function countBlurredElements(doc: Document, win: Window): number {
  return Array.from(doc.querySelectorAll('*')).filter((el) => {
    const style = win.getComputedStyle(el);
    return /blur\(/.test(style.filter) || /blur\(/.test(style.backdropFilter);
  }).length;
}
