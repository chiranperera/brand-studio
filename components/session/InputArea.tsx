"use client";

import { useState } from "react";
import type { Question } from "@/lib/question-engine";

export type AnswerVal = string | string[] | number;

export function InputArea({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: AnswerVal;
  onChange: (v: AnswerVal) => void;
}) {
  const [other, setOther] = useState("");

  switch (question.inputType) {
    case "textarea":
      return (
        <textarea
          className="input min-h-28"
          placeholder="Type the answer…"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "text":
      return (
        <input
          className="input"
          placeholder="Type the answer…"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "rating":
      return (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`chip ${value === n ? "chip-on" : ""}`}
              onClick={() => onChange(n)}
            >
              {n}
            </button>
          ))}
        </div>
      );

    case "select": {
      const base = question.options ?? [];
      // Include the current value as a chip even if it wasn't in the original
      // options (e.g. revisiting an AI question whose options weren't stored).
      const opts =
        typeof value === "string" && value && !base.includes(value) ? [...base, value] : base;
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {opts.map((o) => (
              <button
                key={o}
                type="button"
                className={`chip ${value === o ? "chip-on" : ""}`}
                onClick={() => onChange(o)}
              >
                {o}
              </button>
            ))}
          </div>
          <input
            className="input"
            placeholder="Other…"
            value={typeof value === "string" && !opts.includes(value) ? value : other}
            onChange={(e) => {
              setOther(e.target.value);
              onChange(e.target.value);
            }}
          />
        </div>
      );
    }

    case "multiselect": {
      const base = question.options ?? [];
      const arr = Array.isArray(value) ? value : [];
      // Show already-selected values as chips too, so revisited answers are
      // visible and removable even when the original options weren't stored.
      const opts = [...base, ...arr.filter((v) => !base.includes(v))];
      const toggle = (o: string) =>
        onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o]);
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {opts.map((o) => (
              <button
                key={o}
                type="button"
                className={`chip ${arr.includes(o) ? "chip-on" : ""}`}
                onClick={() => toggle(o)}
              >
                {o}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Add another…"
              value={other}
              onChange={(e) => setOther(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && other.trim()) {
                  e.preventDefault();
                  onChange([...arr, other.trim()]);
                  setOther("");
                }
              }}
            />
            <button
              type="button"
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
      );
    }

    default:
      return null;
  }
}
