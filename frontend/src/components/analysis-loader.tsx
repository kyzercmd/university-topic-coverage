import { Loader2 } from "lucide-react";

export function AnalysisLoader({
  title = "Loading...",
  messages = ["Please wait..."],
  variant = "card",
}: {
  title?: string;
  messages?: string[];
  variant?: "card" | "modal";
}) {
  const body = (
    <div className="flex flex-col items-center text-center px-8 py-12">
      <div className="h-12 w-12 rounded-xl border bg-background flex items-center justify-center">
        <Loader2 size={18} className="animate-spin text-muted-foreground" />
      </div>
      <h3 className="mt-5 text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground min-h-[20px]">
        {messages[0]}
      </p>
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
