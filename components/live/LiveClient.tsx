"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { liveChannel, type HostState, type LiveValue } from "@/lib/live";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function LiveClient({ code }: { code: string }) {
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<HostState | null>(null);
  const [value, setValue] = useState<LiveValue>("");
  const [other, setOther] = useState("");
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Keep local value in sync with what the host shows.
  useEffect(() => {
    if (state?.kind === "question") setValue(state.value ?? "");
  }, [state?.value, state?.kind, state?.question?.field]);

  function join() {
    if (!name.trim()) return;
    const supabase = createClient();
    const ch = supabase.channel(liveChannel(code), { config: { presence: { key: `client-${Math.floor(Date.now() % 1e6)}` } } });
    channelRef.current = ch;
    ch.on("broadcast", { event: "host_state" }, ({ payload }) => setState(payload as HostState));
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setConnected(true);
        void ch.track({ role: "client", name: name.trim() });
      }
    });
    setJoined(true);
  }

  function send(v: LiveValue) {
    setValue(v);
    void channelRef.current?.send({ type: "broadcast", event: "client_select", payload: { value: v } });
  }

  if (!joined) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
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
          <button className="btn-primary mt-3 w-full" onClick={join} disabled={!name.trim()}>
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
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-accent" : "bg-ink-4"}`} />
          {connected ? "Connected" : "Connecting…"}
        </span>
      </div>

      {!state ? (
        <div className="card text-center text-ink-3">Waiting for your designer to start…</div>
      ) : state.kind === "question" && state.question ? (
        <ClientQuestion state={state} value={value} other={other} setOther={setOther} onChange={send} />
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
  const opts = q.options ?? [];
  const arr = Array.isArray(value) ? value : [];

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
