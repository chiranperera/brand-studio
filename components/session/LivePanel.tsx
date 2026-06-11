"use client";

import { useState } from "react";

export function LivePanel({
  live,
  joinUrl,
  clientName,
  onGoLive,
  onStop,
  busy,
}: {
  live: boolean;
  joinUrl: string | null;
  clientName: string | null;
  onGoLive: () => void;
  onStop: () => void;
  busy: boolean;
}) {
  const [copied, setCopied] = useState(false);

  if (!live) {
    return (
      <button className="btn-ghost" onClick={onGoLive} disabled={busy}>
        📲 Go live with client
      </button>
    );
  }

  const qr = joinUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=0&data=${encodeURIComponent(joinUrl)}`
    : null;

  return (
    <div className="card border-accent/40">
      <div className="flex items-center justify-between gap-2">
        <span className="label mb-0">Live session</span>
        <span className="flex items-center gap-1.5 text-xs">
          <span className={`h-2 w-2 shrink-0 rounded-full ${clientName ? "bg-accent" : "bg-ink-4"}`} />
          <span className="truncate">{clientName ? `${clientName} connected` : "Waiting…"}</span>
        </span>
      </div>

      <p className="mt-2 text-sm text-ink-3">Share with the client — they open it on their phone (no login) and tap along.</p>

      {qr && (
        <div className="mt-3 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Join QR code" width={140} height={140} className="rounded-lg border border-line bg-white p-1.5" />
        </div>
      )}

      <div className="mono mt-3 truncate rounded-lg border border-line bg-panel2 px-3 py-2 text-xs text-ink-2">
        {joinUrl}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          className="btn-ghost text-xs"
          onClick={async () => {
            if (joinUrl) {
              try {
                await navigator.clipboard.writeText(joinUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                /* ignore */
              }
            }
          }}
        >
          {copied ? "Copied ✓" : "Copy link"}
        </button>
        <button className="btn-ghost text-xs" onClick={onStop}>
          End live
        </button>
      </div>

      <p className="mt-3 border-t border-line pt-3 text-xs text-ink-4">
        The client sees whatever step you&apos;re on. Run the questions, or open <b className="text-ink-3">Scope</b> /{" "}
        <b className="text-ink-3">Logo types</b> — they&apos;ll tap along.
      </p>
    </div>
  );
}
