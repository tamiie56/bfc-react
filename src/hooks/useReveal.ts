import { useEffect } from "react";

/**
 * Adds `.is-visible` to every `.reveal` element when it scrolls into view.
 * Re-runs on route change and also picks up elements added later (menu filters etc.).
 */
export function useReveal(routeKey: string) {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io =
      reduce || !("IntersectionObserver" in window)
        ? null
        : new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  entry.target.classList.add("is-visible");
                  io?.unobserve(entry.target);
                }
              });
            },
            { threshold: 0.08, rootMargin: "0px 0px -6% 0px" }
          );

    const watch = (el: HTMLElement) => {
      if (el.classList.contains("is-visible")) return;
      if (io) io.observe(el);
      else el.classList.add("is-visible");
    };

    document.querySelectorAll<HTMLElement>(".reveal").forEach(watch);

    const mo = new MutationObserver((mutations) => {
      mutations.forEach((m) =>
        m.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.classList.contains("reveal")) watch(node);
          node.querySelectorAll<HTMLElement>(".reveal").forEach(watch);
        })
      );
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io?.disconnect();
      mo.disconnect();
    };
  }, [routeKey]);
}
