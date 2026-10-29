import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie } from "lucide-react";

const CONSENT_KEY = "playnivo:cookie-consent:v1";
export const COOKIE_SETTINGS_EVENT = "playnivo:cookie-settings";

export function resetCookieConsent() {
  try {
    window.localStorage.removeItem(CONSENT_KEY);
    window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT));
  } catch {
    /* ignore */
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(CONSENT_KEY)) setVisible(true);
    } catch {
      /* ignore */
    }
    const reopen = () => setVisible(true);
    window.addEventListener(COOKIE_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, reopen);
  }, []);

  const choose = (value: "accepted" | "rejected") => {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-2xl border border-border bg-card p-4 shadow-lg sm:inset-x-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-bold">Cookies &amp; local data</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Playnivo stores your matches, stats and sign-in session on your device. We use
              no advertising or tracking cookies. You can change this choice anytime from our{" "}
              <Link to="/cookies" className="text-primary hover:underline">
                cookie policy
              </Link>
              .
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2 sm:ml-auto">
          <button
            onClick={() => choose("rejected")}
            className="rounded-xl border border-input bg-background px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Reject optional
          </button>
          <button
            onClick={() => choose("accepted")}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
