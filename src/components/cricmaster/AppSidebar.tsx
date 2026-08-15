import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Menu,
  Radio,
  ListOrdered,
  Users,
  Shield,
  Trophy,
  User,
  Settings,
  Info,
  LifeBuoy,
  FileText,
  Lock,
  LogIn,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import markUrl from "@/assets/cricmaster-mark.png";
import { useAuth } from "@/hooks/useAuth";

type Item = { to: string; label: string; desc: string; icon: typeof Radio };

const scoring: Item[] = [
  { to: "/", label: "Live Scoring", desc: "Ball-by-ball scoring engine", icon: Radio },
  { to: "/matches", label: "Matches", desc: "History & full scorecards", icon: ListOrdered },
];

const cricketData: Item[] = [
  { to: "/players", label: "Players", desc: "Career stats & leaderboards", icon: Users },
  { to: "/teams", label: "Teams", desc: "Squads & team records", icon: Shield },
  { to: "/leagues", label: "Leagues", desc: "Tournaments & points table", icon: Trophy },
];

const account: Item[] = [
  { to: "/career", label: "My Career", desc: "Your synced match history", icon: User },
  { to: "/settings", label: "Settings", desc: "Profile, photo & security", icon: Settings },
];

const more: Item[] = [
  { to: "/about", label: "About", desc: "What CricMaster does", icon: Info },
  { to: "/contact", label: "Support", desc: "Help & contact", icon: LifeBuoy },
  { to: "/terms", label: "Terms", desc: "Terms of service", icon: FileText },
  { to: "/privacy", label: "Privacy", desc: "Privacy policy", icon: Lock },
];

export function AppSidebar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const Section = ({ title, items }: { title: string; items: Item[] }) => (
    <div className="mb-5">
      <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1">
        {items.map((it) => (
          <Link
            key={it.to}
            to={it.to}
            onClick={() => setOpen(false)}
            activeOptions={{ exact: it.to === "/" }}
            activeProps={{ className: "border-primary/50 bg-primary/10" }}
            className="flex items-start gap-3 rounded-xl border border-transparent px-2.5 py-2 transition-colors hover:border-border hover:bg-muted/50"
          >
            <it.icon className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                {it.label}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {it.desc}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open menu"
        className="flex items-center justify-center rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[86vw] max-w-sm overflow-y-auto p-0">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle className="flex items-center gap-2">
            <img src={markUrl} alt="CricMaster logo" className="h-8 w-auto" />
            <span className="font-heading text-xl font-bold tracking-tighter">
              <span className="text-foreground">Cric</span>
              <span className="text-primary">Master</span>
            </span>
          </SheetTitle>
        </SheetHeader>
        <nav className="px-3 py-4">
          <Section title="Scoring" items={scoring} />
          <Section title="Cricket Data" items={cricketData} />
          <Section title="Account" items={account} />
          <Section title="More" items={more} />
          {!user && (
            <Link
              to="/auth"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
            >
              <LogIn className="size-4" /> Login / Sign up
            </Link>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}