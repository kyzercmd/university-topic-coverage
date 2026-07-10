import { useEffect, useRef, useState } from "react";

export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="space-y-2" ref={ref}>
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={
            "w-full h-11 rounded-lg border bg-card px-3.5 text-left text-sm flex items-center justify-between transition-colors " +
            (disabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:border-foreground/30")
          }
        >
          <span className={"truncate " + (value ? "" : "text-muted-foreground")}>
            {value || placeholder || `Select ${label.toLowerCase()}`}
          </span>

          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground shrink-0 ml-2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {open && (
          <div className="absolute z-10 mt-1.5 w-full rounded-lg border bg-popover shadow-sm py-1">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={
                  "w-full text-left px-3.5 py-2 text-sm transition-colors hover:bg-secondary " +
                  (opt === value ? "font-medium" : "text-muted-foreground")
                }
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
