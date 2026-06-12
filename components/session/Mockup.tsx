"use client";

import type { MockupShape } from "@/lib/deliverables";

type Swatch = { hex: string; role: string };

function colors(palette?: Swatch[]) {
  const pick = (role: string, fb: string) => palette?.find((c) => c.role === role)?.hex ?? fb;
  return {
    primary: pick("primary", "#2563EB"),
    secondary: pick("secondary", "#0EA5E9"),
    accent: pick("accent", "#F59E0B"),
    line: "#D8DEE9",
    line2: "#EAEef4",
  };
}

/** A small, stylised "what this looks like" illustration, tinted by the brand palette. */
export function Mockup({ shape, palette }: { shape: MockupShape; palette?: Swatch[] }) {
  const c = colors(palette);
  const bar = (w: string, color = c.line, h = "h-1.5") => (
    <div className={`${h} rounded-full`} style={{ width: w, backgroundColor: color }} />
  );

  const inner = () => {
    switch (shape) {
      case "logo":
        return (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <div className="h-9 w-9 rounded-full" style={{ backgroundColor: c.primary }} />
            {bar("44%", c.line, "h-2")}
          </div>
        );
      case "doc":
        return (
          <div className="flex h-full gap-2 p-3">
            <div className="flex w-1/2 flex-col gap-1.5 rounded bg-white p-2 shadow-sm">
              <div className="h-2 w-2/3 rounded" style={{ backgroundColor: c.primary }} />
              {bar("90%")} {bar("80%")} {bar("85%")} {bar("60%")}
            </div>
            <div className="flex w-1/2 flex-col gap-1.5 rounded bg-white p-2 shadow-sm">
              <div className="flex gap-1">
                <div className="h-4 w-4 rounded" style={{ backgroundColor: c.primary }} />
                <div className="h-4 w-4 rounded" style={{ backgroundColor: c.secondary }} />
                <div className="h-4 w-4 rounded" style={{ backgroundColor: c.accent }} />
              </div>
              {bar("90%")} {bar("70%")}
            </div>
          </div>
        );
      case "moodboard":
        return (
          <div className="grid h-full grid-cols-3 grid-rows-2 gap-1.5 p-3">
            <div className="rounded" style={{ backgroundColor: c.primary }} />
            <div className="col-span-2 rounded" style={{ backgroundColor: c.line2 }} />
            <div className="rounded" style={{ backgroundColor: c.line2 }} />
            <div className="rounded" style={{ backgroundColor: c.accent }} />
            <div className="rounded" style={{ backgroundColor: c.secondary }} />
          </div>
        );
      case "card":
        return (
          <div className="flex h-full items-center justify-center p-4">
            <div className="relative h-20 w-32 rounded-md bg-white p-2 shadow-md">
              <div className="absolute right-0 top-0 h-full w-2 rounded-r-md" style={{ backgroundColor: c.primary }} />
              <div className="mb-1 h-4 w-4 rounded-full" style={{ backgroundColor: c.primary }} />
              {bar("70%")} <div className="mt-1" /> {bar("50%")}
            </div>
          </div>
        );
      case "pattern":
        return (
          <div className="grid h-full grid-cols-6 grid-rows-4 gap-1 p-3">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="rounded-full"
                style={{ backgroundColor: i % 3 === 0 ? c.primary : i % 3 === 1 ? c.secondary : c.line }}
              />
            ))}
          </div>
        );
      case "browser":
        return (
          <div className="flex h-full flex-col p-2">
            <div className="flex items-center gap-1 rounded-t bg-white px-2 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-300" />
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
              <span className="h-1.5 w-1.5 rounded-full bg-green-300" />
            </div>
            <div className="flex flex-1 flex-col gap-1.5 rounded-b bg-white p-2">
              <div className="h-6 rounded" style={{ backgroundColor: c.primary }} />
              <div className="flex gap-1.5">
                <div className="h-8 flex-1 rounded" style={{ backgroundColor: c.line2 }} />
                <div className="h-8 flex-1 rounded" style={{ backgroundColor: c.line2 }} />
                <div className="h-8 flex-1 rounded" style={{ backgroundColor: c.line2 }} />
              </div>
            </div>
          </div>
        );
      case "phone":
        return (
          <div className="flex h-full items-center justify-center p-2">
            <div className="flex h-full w-16 flex-col gap-1.5 rounded-xl bg-white p-1.5 shadow-md">
              <div className="mx-auto h-1 w-5 rounded-full bg-slate-300" />
              <div className="h-6 rounded" style={{ backgroundColor: c.primary }} />
              {bar("90%")} {bar("70%")}
              <div className="mt-auto h-4 rounded" style={{ backgroundColor: c.secondary }} />
            </div>
          </div>
        );
      case "uikit":
        return (
          <div className="grid h-full grid-cols-3 gap-1.5 p-3">
            <div className="rounded" style={{ backgroundColor: c.primary }} />
            <div className="rounded border-2" style={{ borderColor: c.primary }} />
            <div className="rounded-full" style={{ backgroundColor: c.secondary }} />
            <div className="col-span-2 rounded bg-white shadow-sm" />
            <div className="rounded" style={{ backgroundColor: c.accent }} />
          </div>
        );
      case "social":
        return (
          <div className="flex h-full items-center justify-center p-2">
            <div className="flex h-full w-16 flex-col gap-1 rounded-xl bg-white p-1.5 shadow-md">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: c.primary }} />
                {bar("60%")}
              </div>
              <div className="grid flex-1 grid-cols-3 grid-rows-3 gap-0.5">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-sm"
                    style={{ backgroundColor: i % 4 === 0 ? c.primary : i % 4 === 2 ? c.secondary : c.line2 }}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      case "banner":
        return (
          <div className="flex h-full items-center justify-center p-3">
            <div className="flex h-12 w-full items-center justify-between rounded bg-white px-3 shadow-sm">
              <div className="flex flex-col gap-1">
                {bar("60px", c.primary)} {bar("40px")}
              </div>
              <div className="h-5 w-12 rounded" style={{ backgroundColor: c.primary }} />
            </div>
          </div>
        );
      case "email":
        return (
          <div className="flex h-full justify-center p-3">
            <div className="flex w-3/4 flex-col gap-1.5 rounded bg-white p-2 shadow-sm">
              <div className="h-7 rounded" style={{ backgroundColor: c.primary }} />
              {bar("90%")} {bar("85%")} {bar("70%")}
              <div className="mx-auto mt-1 h-4 w-16 rounded" style={{ backgroundColor: c.secondary }} />
            </div>
          </div>
        );
      case "grid":
        return (
          <div className="grid h-full grid-cols-3 grid-rows-2 gap-1.5 p-3">
            <div className="rounded" style={{ backgroundColor: c.primary }} />
            <div className="rounded" style={{ backgroundColor: c.line2 }} />
            <div className="rounded" style={{ backgroundColor: c.secondary }} />
            <div className="rounded" style={{ backgroundColor: c.line2 }} />
            <div className="rounded" style={{ backgroundColor: c.accent }} />
            <div className="rounded" style={{ backgroundColor: c.line2 }} />
          </div>
        );
      case "deck":
        return (
          <div className="flex h-full items-center justify-center p-3">
            <div className="flex h-full w-full flex-col gap-1.5 rounded bg-white p-2 shadow-sm">
              <div className="h-3 w-1/2 rounded" style={{ backgroundColor: c.primary }} />
              <div className="flex flex-1 gap-1.5">
                <div className="flex flex-1 flex-col justify-center gap-1">
                  {bar("90%")} {bar("75%")} {bar("80%")}
                </div>
                <div className="flex-1 rounded" style={{ backgroundColor: c.secondary }} />
              </div>
            </div>
          </div>
        );
      case "infographic":
        return (
          <div className="flex h-full items-end justify-center gap-2 p-3">
            <div className="h-8 w-3 rounded-t" style={{ backgroundColor: c.primary }} />
            <div className="h-14 w-3 rounded-t" style={{ backgroundColor: c.secondary }} />
            <div className="h-10 w-3 rounded-t" style={{ backgroundColor: c.accent }} />
            <div className="h-16 w-3 rounded-t" style={{ backgroundColor: c.primary }} />
            <div
              className="ml-2 h-10 w-10 rounded-full border-4"
              style={{ borderColor: c.secondary, borderTopColor: c.line2 }}
            />
          </div>
        );
      case "brochure":
        return (
          <div className="flex h-full items-center justify-center gap-1 p-3">
            {[c.primary, "#fff", "#fff"].map((bg, i) => (
              <div key={i} className="flex h-20 w-1/4 flex-col gap-1 rounded bg-white p-1.5 shadow-sm">
                <div className="h-5 rounded" style={{ backgroundColor: i === 0 ? c.primary : c.line2 }} />
                {bar("90%")} {bar("70%")}
              </div>
            ))}
          </div>
        );
      case "poster":
        return (
          <div className="flex h-full items-center justify-center p-3">
            <div className="flex h-full w-20 flex-col gap-1.5 rounded bg-white p-2 shadow-md">
              <div className="h-1/2 rounded" style={{ backgroundColor: c.primary }} />
              <div className="h-3 w-3/4 rounded" style={{ backgroundColor: c.secondary }} />
              {bar("85%")} {bar("60%")}
            </div>
          </div>
        );
      case "package":
        return (
          <div className="flex h-full items-center justify-center p-3">
            <div className="relative h-16 w-16">
              <div className="absolute inset-y-0 left-0 w-12 rounded-l bg-white shadow-md" style={{ borderTop: `8px solid ${c.primary}` }}>
                <div className="mt-3 flex flex-col items-center gap-1">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: c.primary }} />
                  {bar("60%")}
                </div>
              </div>
              <div className="absolute right-0 top-0 h-full w-5 origin-left skew-y-[18deg] rounded-r" style={{ backgroundColor: c.secondary }} />
            </div>
          </div>
        );
      case "menu":
        return (
          <div className="flex h-full justify-center p-3">
            <div className="flex w-2/3 flex-col gap-1.5 rounded bg-white p-2 shadow-sm">
              <div className="mx-auto h-3 w-1/2 rounded" style={{ backgroundColor: c.primary }} />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  {bar("60%")} <div className="h-1.5 w-4 rounded-full" style={{ backgroundColor: c.secondary }} />
                </div>
              ))}
            </div>
          </div>
        );
      case "motion":
        return (
          <div className="flex h-full items-center justify-center p-3">
            <div className="relative flex h-full w-full items-center justify-center rounded" style={{ backgroundColor: c.primary }}>
              <div className="h-0 w-0 border-y-[10px] border-l-[16px] border-y-transparent border-l-white" />
              <div className="absolute bottom-1 left-1 right-1 h-1 rounded-full bg-white/40">
                <div className="h-full w-1/3 rounded-full bg-white" />
              </div>
            </div>
          </div>
        );
      case "merch":
        return (
          <div className="flex h-full items-center justify-center p-3">
            <svg viewBox="0 0 64 56" className="h-full" aria-hidden>
              <path d="M20 6 L8 14 L14 22 L20 18 V50 H44 V18 L50 22 L56 14 L44 6 L38 10 Q32 16 26 10 Z" fill="#fff" stroke={c.line} strokeWidth="1.5" />
              <circle cx="32" cy="32" r="6" fill={c.primary} />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return <div className="h-full w-full rounded-md bg-slate-100">{inner()}</div>;
}
