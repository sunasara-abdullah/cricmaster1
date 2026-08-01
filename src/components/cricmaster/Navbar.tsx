import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, LogIn, User, Settings } from "lucide-react";
import markUrl from "@/assets/cricmaster-mark.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ConfirmButton } from "@/components/cricmaster/ConfirmButton";

const links = [
  { to: "/", label: "Live Scoring" },
  { to: "/matches", label: "Matches" },
  { to: "/players", label: "Players" },
  { to: "/teams", label: "Teams" },
  { to: "/leagues", label: "Leagues" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Support" },
] as const;

export function Navbar() {
  const navigate = useNavigate();
  const { user, displayName } = useAuth();

  const handleLogout = async () => {
    if (typeof window === "undefined") return;
    try {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith("cricmaster:")) keys.push(k);
      }
      keys.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="flex items-center gap-2"
          >
            <img
              src={markUrl}
              alt="CricMaster logo"
              className="h-9 w-auto md:h-10"
            />
            <span className="font-heading text-2xl font-bold tracking-tighter">
              <span className="text-foreground">Cric</span>
              <span className="text-primary">Master</span>
            </span>
          </Link>
          <div className="hidden gap-5 text-sm font-medium text-muted-foreground lg:flex">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                activeProps={{ className: "text-primary" }}
                activeOptions={{ exact: l.to === "/" }}
                className="transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/career"
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                <User className="size-4" />
                <span className="hidden sm:inline">
                  {displayName ? displayName : "My Career"}
                </span>
              </Link>
              <Link
                to="/settings"
                title="Profile settings"
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <Settings className="size-4" />
                <span className="hidden sm:inline">Settings</span>
              </Link>
              <ConfirmButton
                onConfirm={handleLogout}
                title="Sign out & reset?"
                description="This signs you out and clears all matches, players, teams, leagues and setup data stored on this device."
                confirmLabel="Sign out"
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Logout</span>
              </ConfirmButton>
            </>
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              <LogIn className="size-4" />
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
