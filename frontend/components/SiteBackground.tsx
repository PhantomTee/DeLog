/**
 * One continuous backdrop behind every page (fixed, so it never scrolls or
 * repeats per-section) - carries the hero video's purple/cream mood
 * everywhere instead of pages abruptly switching to a flat color.
 */
export function SiteBackground() {
  return <div className="site-glow fixed inset-0 -z-10 h-full w-full" aria-hidden />;
}
