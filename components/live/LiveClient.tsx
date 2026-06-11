"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { liveChannel, type HostState, type LiveValue, type ScopeKey } from "@/lib/live";
import { LOGO_TYPES } from "@/lib/logo-types";
import {
  WEBSITE_SECTIONS,
  WEBSITE_FEATURES,
  AUTOMATION_NEEDS,
  SURFACE_KINDS,
  AUTOMATION_LEVELS,
  DELIVERABLE_GROUPS,
} from "@/lib/scope-options";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function LiveClient({ code }: { code: string }) {
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [connected, setConnected] = useState(false);
  const [ended, setEnded] = useState(false);
  const [state, setState] = useState<HostState | null>(null);
  const [value, setValue] = useState<LiveValue>("");
  const [other, setOther] = useState("");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const autoJoined = useRef(false);
  const storeKey = `ds-live-${code}`;

  // Keep local value in sync with what the host shows.
  useEffect(() => {
    if (state?.kind === "question") setValue(state.value ?? "");
  }, [state?.value, state?.kind, state?.question?.field]);

  function join(n?: string) {
    const nm = (n ?? name).trim();
    if (!nm) return;
    try {
      localStorage.setItem(storeKey, nm); // remember so a refresh auto-rejoins
    } catch {
      /* ignore */
    }
    setName(nm);
    const supabase = createClient();
    const ch = supabase.channel(liveChannel(code), { config: { presence: { key: `client-${Math.floor(Date.now() % 1e6)}` } } });
    channelRef.current = ch;
    ch.on("broadcast", { event: "host_state" }, ({ payload }) => setState(payload as HostState));
    ch.on("broadcast", { event: "host_end" }, () => {
      setEnded(true);
      setConnected(false);
      setState(null);
      void supabase.removeChannel(ch);
    });
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setConnected(true);
        void ch.track({ role: "client", name: nm });
        // Ask the host to (re)send the current step — catches us up on join + reconnect.
        void ch.send({ type: "broadcast", event: "request_state", payload: {} });
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        setConnected(false);
      }
    });
    setJoined(true);
  }

  // Auto-rejoin on refresh if we joined before (a refresh must not kill the session).
  useEffect(() => {
    if (autoJoined.current) return;
    autoJoined.current = true;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(storeKey);
    } catch {
      /* ignore */
    }
    if (saved) {
      setName(saved);
      join(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function send(v: LiveValue) {
    setValue(v);
    void channelRef.current?.send({ type: "broadcast", event: "client_select", payload: { value: v } });
  }
  function sendLogo(slug: string) {
    void channelRef.current?.send({ type: "broadcast", event: "client_logo", payload: { slug } });
  }
  function sendScope(key: ScopeKey, value: string) {
    void channelRef.current?.send({ type: "broadcast", event: "client_scope", payload: { key, value } });
  }
  function sendScopeLevel(level: string) {
    void channelRef.current?.send({ type: "broadcast", event: "client_scope_level", payload: { level } });
  }
  function sendScopeText(key: "workflows" | "notes", value: string) {
    void channelRef.current?.send({ type: "broadcast", event: "client_scope_text", payload: { key, value } });
  }

  // Keep asking for the current step until we have it (covers missed broadcasts /
  // reconnects), and re-request when the tab regains focus.
  useEffect(() => {
    if (!joined || ended) return;
    const ask = () => void channelRef.current?.send({ type: "broadcast", event: "request_state", payload: {} });
    const t = state ? null : setInterval(ask, 2500);
    const onVis = () => document.visibilityState === "visible" && ask();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (t) clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [joined, ended, state]);

  if (ended) {
    return (
      <main className="relative flex min-h-screen items-center justify-center px-6">
        <div className="absolute right-5 top-5">
          <ThemeToggle />
        </div>
        <div className="card max-w-sm text-center">
          <h1 className="text-xl font-medium">Session ended</h1>
          <p className="mt-2 text-sm text-ink-3">Your designer has ended the live session. Thank you!</p>
        </div>
      </main>
    );
  }

  if (!joined) {
    return (
      <main className="relative flex min-h-screen items-center justify-center px-6">
        <div className="absolute right-5 top-5">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm text-center">
          <div className="mono text-xs uppercase tracking-widest text-ink-3">Discovery Studio · Live</div>
          <h1 className="mt-2 text-2xl font-semibold">Join the session</h1>
          <p className="mt-1 text-sm text-ink-3">Your designer will guide you. Just tap your answers.</p>
          <input
            className="input mt-5"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && join()}
          />
          <button className="btn-primary mt-3 w-full" onClick={() => join()} disabled={!name.trim()}>
            Join
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-8">
      <div className="mb-6 flex items-center justify-between text-xs text-ink-3">
        <span className="mono uppercase tracking-widest">Live session</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-accent" : "bg-ink-4"}`} />
            {connected ? "Connected" : "Connecting…"}
          </span>
          <ThemeToggle />
        </div>
      </div>

      {!state ? (
        <div className="card text-center text-ink-3">Waiting for your designer to start…</div>
      ) : state.kind === "question" && state.question ? (
        <ClientQuestion state={state} value={value} other={other} setOther={setOther} onChange={send} />
      ) : state.kind === "logo" && state.logo ? (
        <ClientLogo logo={state.logo} onSelect={sendLogo} />
      ) : state.kind === "scope" && state.scope ? (
        <ClientScope scope={state.scope} onToggle={sendScope} onLevel={sendScopeLevel} onText={sendScopeText} />
      ) : (
        <div className="card text-center">
          <h2 className="text-lg font-medium">{state.title}</h2>
          <p className="mt-2 text-sm text-ink-3">Your designer is working on this — follow along on the main screen.</p>
        </div>
      )}
    </main>
  );
}

function ClientQuestion({
  state,
  value,
  other,
  setOther,
  onChange,
}: {
  state: HostState;
  value: LiveValue;
  other: string;
  setOther: (s: string) => void;
  onChange: (v: LiveValue) => void;
}) {
  const q = state.question!;
  const base = q.options ?? [];
  const arr = Array.isArray(value) ? value : [];
  // Show options PLUS any already-selected values (some questions don't carry
  // their option list), so the client always sees the choices, not just "Add".
  const opts = [
    ...base,
    ...arr.filter((v) => !base.includes(v)),
    ...(typeof value === "string" && value && !base.includes(value) ? [value] : []),
  ];

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <span className="mono text-xs uppercase tracking-wide text-ink-3">{q.section}</span>
        {state.index != null && state.total != null && (
          <span className="mono text-xs text-ink-4">
            Q{state.index + 1} / {state.total}
          </span>
        )}
      </div>
      <h2 className="text-xl font-medium">{q.question}</h2>
      {q.help && <p className="mt-1 text-sm text-ink-4">{q.help}</p>}

      <div className="mt-5">
        {q.inputType === "multiselect" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {opts.map((o) => (
                <button
                  key={o}
                  className={`chip ${arr.includes(o) ? "chip-on" : ""}`}
                  onClick={() => onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o])}
                >
                  {o}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="Add your own…"
                value={other}
                onChange={(e) => setOther(e.target.value)}
              />
              <button
                className="btn-ghost shrink-0"
                onClick={() => {
                  if (other.trim()) {
                    onChange([...arr, other.trim()]);
                    setOther("");
                  }
                }}
              >
                Add
              </button>
            </div>
          </div>
        ) : q.inputType === "rating" ? (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className={`chip ${value === n ? "chip-on" : ""}`} onClick={() => onChange(n)}>
                {n}
              </button>
            ))}
          </div>
        ) : q.inputType === "select" ? (
          <div className="flex flex-wrap gap-2">
            {opts.map((o) => (
              <button key={o} className={`chip ${value === o ? "chip-on" : ""}`} onClick={() => onChange(o)}>
                {o}
              </button>
            ))}
          </div>
        ) : (
          <textarea
            className="input min-h-28"
            placeholder="Type your answer…"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </div>

      <p className="mt-4 text-center text-xs text-ink-4">Your designer sees your choices live and moves the session along.</p>
    </div>
  );
}

function ClientLogo({ logo, onSelect }: { logo: NonNullable<HostState["logo"]>; onSelect: (slug: string) => void }) {
  const info = LOGO_TYPES[logo.page] ?? LOGO_TYPES[0];
  const selected = logo.selected.includes(info.slug);
  return (
    <div className="card">
      <div className="text-center">
        <div className="mono text-xs uppercase tracking-widest text-ink-3">
          Logo type {logo.page + 1} of {LOGO_TYPES.length}
        </div>
        <h2 className="mt-1 text-2xl font-semibold">{info.plain}</h2>
        <p className="mono text-xs text-ink-3">{info.name}</p>
      </div>
      <p className="mt-3 text-sm text-ink-2">{info.summary}</p>

      <span className="label mt-4">Example logos</span>
      <div className="grid grid-cols-3 gap-2">
        {info.examples.map((e) => (
          <div key={e.brand} className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-line bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={e.logo} alt={e.brand} className="h-full w-full object-contain p-2" />
          </div>
        ))}
      </div>

      <span className="label mt-3">In real use</span>
      <div className="grid grid-cols-3 gap-2">
        {info.examples.map((e) => (
          <div key={`${e.brand}-m`} className="aspect-[4/3] overflow-hidden rounded-lg border border-line bg-panel2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={e.mockup} alt={`${e.brand} in use`} className="h-full w-full object-cover" />
          </div>
        ))}
      </div>

      <button
        onClick={() => onSelect(info.slug)}
        className={`mt-4 w-full rounded-lg border px-4 py-3 text-sm font-medium ${
          selected ? "border-accent bg-accent/10 text-ink" : "border-line text-ink-2"
        }`}
      >
        {selected ? `✓ Selected — ${info.plain}` : `Tap to choose — ${info.plain}`}
      </button>
      <p className="mt-3 text-center text-xs text-ink-4">Your designer flips through the types; tap the ones you like.</p>
    </div>
  );
}

function ClientChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [custom, setCustom] = useState("");
  const all = Array.from(new Set([...options, ...selected]));
  const add = () => {
    const v = custom.trim();
    if (v && !selected.includes(v)) onToggle(v);
    setCustom("");
  };
  return (
    <div className="card">
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-2">
        {all.map((o) => (
          <button key={o} className={`chip ${selected.includes(o) ? "chip-on" : ""}`} onClick={() => onToggle(o)}>
            {o}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          className="input text-sm"
          placeholder="Add your own…"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button className="btn-ghost shrink-0" onClick={add}>
          Add
        </button>
      </div>
    </div>
  );
}

function ClientScope({
  scope,
  onToggle,
  onLevel,
  onText,
}: {
  scope: NonNullable<HostState["scope"]>;
  onToggle: (key: ScopeKey, value: string) => void;
  onLevel: (level: string) => void;
  onText: (key: "workflows" | "notes", value: string) => void;
}) {
  // Local text state so realtime echoes don't reset the cursor while typing.
  const [wf, setWf] = useState(scope.workflows);
  const [nt, setNt] = useState(scope.notes);
  const groups: { key: ScopeKey; label: string; options: string[] }[] = [
    { key: "kinds", label: "What are we building?", options: SURFACE_KINDS },
    { key: "sections", label: "Sections / pages", options: WEBSITE_SECTIONS },
    { key: "features", label: "Features", options: WEBSITE_FEATURES },
    { key: "needs", label: "AI automation", options: AUTOMATION_NEEDS },
  ];
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold">What should we build?</h2>
        <p className="text-sm text-ink-3">Tap what you&apos;d like — add your own too.</p>
      </div>

      {groups.map((g) => (
        <ClientChipGroup
          key={g.key}
          label={g.label}
          options={g.options}
          selected={scope[g.key]}
          onToggle={(v) => onToggle(g.key, v)}
        />
      ))}

      <div className="card">
        <span className="label">What can we design &amp; deliver?</span>
        <div className="space-y-3">
          {DELIVERABLE_GROUPS.map((g) => (
            <div key={g.label}>
              <div className="mb-1 text-xs text-ink-4">{g.label}</div>
              <div className="flex flex-wrap gap-2">
                {g.options.map((o) => (
                  <button
                    key={o}
                    className={`chip ${scope.deliverables.includes(o) ? "chip-on" : ""}`}
                    onClick={() => onToggle("deliverables", o)}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <span className="label">How much automation?</span>
        <div className="space-y-2">
          {AUTOMATION_LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => onLevel(l)}
              className={`block w-full rounded-lg border px-3 py-2 text-left text-sm ${
                scope.level === l ? "border-accent bg-accent/10 text-ink" : "border-line text-ink-2"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <span className="label">Biggest time-sinks to automate (one per line)</span>
        <textarea
          className="input min-h-20"
          placeholder="e.g. answering the same questions all day"
          value={wf}
          onChange={(e) => {
            setWf(e.target.value);
            onText("workflows", e.target.value);
          }}
        />
      </div>

      <div className="card">
        <span className="label">Anything else about scope?</span>
        <input
          className="input"
          placeholder="Optional"
          value={nt}
          onChange={(e) => {
            setNt(e.target.value);
            onText("notes", e.target.value);
          }}
        />
      </div>
    </div>
  );
}
