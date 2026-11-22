import type { CSSProperties } from "react";

/** Build an inline style that sets CSS custom properties, e.g. cssVars({ "--d": "120ms" }) */
export function cssVars(vars: Record<string, string | number>): CSSProperties {
  return vars as unknown as CSSProperties;
}

/** Stagger delay helper for .reveal elements */
export const delay = (ms: number): CSSProperties => cssVars({ "--d": `${ms}ms` });
