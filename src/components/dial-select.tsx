import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { COUNTRY_DIALS } from "@/lib/phone-auth";

function Flag({ code, emoji }: { code: string; emoji: string }) {
  const iso = code.toLowerCase();
  return (
    <span className="relative inline-flex h-[15px] w-[22px] shrink-0 overflow-hidden rounded-[2px] bg-border ring-1 ring-border">
      <span className="pointer-events-none absolute inset-0 grid place-items-center text-[11px] leading-none" aria-hidden>
        {emoji}
      </span>
      <img
        src={`/flags/${iso}.png`}
        alt=""
        width={22}
        height={15}
        className="relative z-[1] h-[15px] w-[22px] object-cover"
      />
    </span>
  );
}

export function DialSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (dial: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = COUNTRY_DIALS.find((c) => c.dial === value) ?? COUNTRY_DIALS[0];

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        id={id}
        aria-label="Código do país"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-12 items-center gap-1.5 rounded-xl border border-border bg-surface pl-2.5 pr-2 text-sm font-semibold text-fg focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Flag code={current.code} emoji={current.flag} />
        <span className="tabular-nums">+{current.dial}</span>
        <ChevronDown className={`size-3.5 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={id}
          className="absolute left-0 z-30 mt-1 max-h-64 w-max min-w-[16.5rem] overflow-y-auto rounded-xl border border-border bg-surface py-1 shadow-[0_12px_32px_-12px_rgb(26_25_22_/_0.28)]"
        >
          {COUNTRY_DIALS.map((c) => {
            const selected = c.dial === current.dial;
            return (
              <li key={c.code} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={`flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-sm ${
                    selected ? "bg-primary-soft font-semibold text-primary" : "text-fg hover:bg-bg"
                  }`}
                  onClick={() => {
                    onChange(c.dial);
                    setOpen(false);
                  }}
                >
                  <Flag code={c.code} emoji={c.flag} />
                  <span className="flex-1">{c.label}</span>
                  <span className="tabular-nums text-muted">+{c.dial}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
