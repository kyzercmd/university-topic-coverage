import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

export const Route = createFileRoute("/")({
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin");
  const [password, setPassword] = useState("admin");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate({ to: "/overview" });
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-16 border-r">
        <div className="text-sm font-medium tracking-tight text-muted-foreground">
          AICAS
        </div>
        <div className="max-w-lg">
          <h1 className="text-7xl font-semibold tracking-tighter text-foreground">
            AICAS
          </h1>
          <p className="mt-6 text-xl text-foreground/80 tracking-tight">
            Academic Intelligence & Curriculum Analytics System
          </p>
          <p className="mt-8 text-base text-muted-foreground leading-relaxed max-w-md">
            AI-powered curriculum coverage, assessment quality, and teaching
            analytics for university administrators.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">© 2026 AICAS</div>
      </div>

      <div className="flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10">
            <h1 className="text-4xl font-semibold tracking-tighter">AICAS</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Academic Intelligence & Curriculum Analytics System
            </p>
          </div>

          <div className="rounded-xl border bg-card p-8 shadow-sm">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Enter your credentials to continue.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Username
                </label>
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 rounded-lg border bg-background px-3 text-sm outline-none transition-colors focus:border-foreground/40"
                  placeholder="admin"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 rounded-lg border bg-background px-3 text-sm outline-none transition-colors focus:border-foreground/40"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-colors hover:bg-primary/90"
              >
                Sign In
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link
              to="/overview"
              className="hover:text-foreground transition-colors"
            >
              Continue to overview →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
