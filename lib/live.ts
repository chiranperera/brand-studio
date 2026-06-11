/**
 * Live multi-device session protocol (Phase 3).
 *
 * Transport: Supabase Realtime broadcast + presence, on one channel per session
 * keyed by the join code. The HOST (authenticated, on a laptop) is the source of
 * truth and persists everything; the CLIENT (on their phone, no login) mirrors
 * the host's current step and sends back taps. Every selection is attributed to
 * an actor so the two sides can be colour-coded.
 */
export type Actor = "host" | "client";

export type LiveValue = string | string[] | number | null;

export interface LiveLogo {
  page: number;
  selected: string[]; // logo-type slugs
}

export interface LiveScope {
  kinds: string[];
  sections: string[];
  features: string[];
  needs: string[];
  deliverables: string[];
  level: string;
  workflows: string;
  notes: string;
}

export type ScopeKey = "kinds" | "sections" | "features" | "needs" | "deliverables";

/** The current step the host is on, pushed to the client. */
export interface HostState {
  kind: "question" | "scope" | "logo" | "done";
  // question steps
  question?: {
    section: string;
    question: string;
    help?: string;
    inputType: string;
    options?: string[];
    field?: string;
  };
  value?: LiveValue;
  clientPicks?: string[]; // values the client selected (for colouring)
  index?: number;
  total?: number;
  // visual steps
  logo?: LiveLogo;
  scope?: LiveScope;
  // non-question steps carry a friendly label
  title?: string;
}

/** A question selection from the client's phone. */
export interface ClientSelect {
  value: LiveValue;
}

/** Client toggled a logo type. */
export interface ClientLogo {
  slug: string;
}

/** Client toggled a scope chip. */
export interface ClientScope {
  key: ScopeKey;
  value: string;
}

/** Client chose the automation level. */
export interface ClientScopeLevel {
  level: string;
}

/** Client edited a free-text scope field. */
export interface ClientScopeText {
  key: "workflows" | "notes";
  value: string;
}

export const liveChannel = (code: string) => `live:${code}`;

/** Short, unguessable join code (e.g. "k7p-3qf"). */
export function makeJoinCode(): string {
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 7; i++) {
    if (i === 3) s += "-";
    // crypto when available (browser/node 19+), else Math.random fallback
    const r =
      typeof crypto !== "undefined" && crypto.getRandomValues
        ? crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32
        : Math.random();
    s += a[Math.floor(r * a.length)];
  }
  return s;
}
