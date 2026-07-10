import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

const DEFAULT_MESSAGES = [
  "Loading course information...",
  "Retrieving curriculum...",
  "Reading uploaded materials...",
  "Comparing syllabus...",
  "Generating analytics...",
  "Preparing report...",
  "Finalizing...",
];

export function AnalysisLoader({
  onDone,
  title = "Running Analysis",
  messages = DEFAULT_MESSAGES,
  variant = "card",
}: {
  onDone: () => void;
  title?: string;
  messages?: string[];
  variant?: "card" | "modal";
}) {
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    setProgress(0);
    setMsgIndex(0);

    // Random total duration between 2000–4000ms
    const total = 2000 + Math.random() * 2000;
    const start = performance.now();

    const tick = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / total);
      // Non-linear progress with jitter
      const eased = t < 1 ? Math.min(0.98, t * (0.85 + Math.random() * 0.3)) : 1;
      const pct = Math.min(100, Math.round(eased * 100));
      setProgress(pct);
      setMsgIndex(Math.min(messages.length - 1, Math.floor(t * messages.length)));

      if (t < 1) {
        setTimeout(tick, 120 + Math.random() * 220);
      } else {
        setProgress(100);
        setMsgIndex(messages.length - 1);
        if (!doneRef.current) {
          doneRef.current = true;
          setTimeout(onDone, 250);
        }
      }
    };
    const id = setTimeout(tick, 100 + Math.random() * 200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const body = (
    <div className="flex flex-col items-center text-center px-8 py-12">
      <div className="h-12 w-12 rounded-xl border bg-background flex items-center justify-center">
        <Sparkles size={18} className="animate-pulse" />
      </div>
      <h3 className="mt-5 text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground min-h-[20px]">
        {messages[msgIndex]}
      </p>
      <div className="mt-6 w-full max-w-md">
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-foreground rounded-full transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-muted-foreground tabular-nums">
          {progress}%
        </div>
      </div>
    </div>
  );

  if (variant === "modal") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="w-full max-w-md rounded-2xl border bg-card shadow-2xl">
          {body}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card shadow-sm">{body}</div>
  );
}
