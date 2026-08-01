import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, LogOut, Shield, User as UserIcon } from "lucide-react";
import { Navbar } from "@/components/cricmaster/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Profile & Settings — CricMaster" },
      {
        name: "description",
        content:
          "Manage your CricMaster profile photo, display name, password and active sessions.",
      },
    ],
  }),
  component: SettingsPage,
});

/** Resize an image file to a compact square data URL for avatar storage. */
function fileToAvatar(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        const s = Math.min(img.width, img.height);
        ctx.drawImage(
          img,
          (img.width - s) / 2,
          (img.height - s) / 2,
          s,
          s,
          0,
          0,
          size,
          size,
        );
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function SettingsPage() {
  const navigate = useNavigate();
  const { user, displayName } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string>("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");

  useEffect(() => {
    setName(displayName);
  }, [displayName]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.display_name) setName(data.display_name);
        if (data?.avatar_url) setAvatar(data.avatar_url);
      });
  }, [user]);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToAvatar(file);
      setAvatar(dataUrl);
    } catch {
      setProfileMsg("Photo load nahi hui, dobara try karein.");
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    setProfileMsg("");
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: name.trim(), avatar_url: avatar || null })
        .eq("id", user.id);
      if (error) throw error;
      await supabase.auth.updateUser({ data: { display_name: name.trim() } });
      setProfileMsg("Profile saved!");
    } catch (e) {
      setProfileMsg((e as Error).message || "Save failed");
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg("");
    setPwErr("");
    if (pw.length < 6) return setPwErr("Password kam se kam 6 characters ka ho.");
    if (pw !== pw2) return setPwErr("Passwords match nahi ho rahe.");
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setPw("");
      setPw2("");
      setPwMsg("Password update ho gaya!");
    } catch (err) {
      setPwErr((err as Error).message || "Update failed");
    } finally {
      setSavingPw(false);
    }
  };

  const signOutAll = async () => {
    if (!window.confirm("Sabhi devices se sign out karein?")) return;
    await supabase.auth.signOut({ scope: "global" });
    navigate({ to: "/auth" });
  };

  const signOutThis = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const initial = (name || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-8">
          <h1 className="font-heading text-4xl font-bold tracking-tight">
            Profile <span className="text-primary">Settings</span>
          </h1>
          <p className="mt-1 text-muted-foreground">
            Apna naam, photo aur account security manage karein.
          </p>
        </header>

        {/* Profile card */}
        <section className="mb-6 rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <UserIcon className="size-4" /> Profile
          </div>
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="flex size-20 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary text-2xl font-bold text-muted-foreground">
                {avatar ? (
                  <img
                    src={avatar}
                    alt="Avatar"
                    className="size-full object-cover"
                  />
                ) : (
                  initial
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary-hover"
                title="Change photo"
              >
                <Camera className="size-4" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickFile}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Display name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={saveProfile}
              disabled={savingProfile}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
            >
              {savingProfile ? "Saving…" : "Save profile"}
            </button>
            {profileMsg && (
              <span className="text-sm text-muted-foreground">{profileMsg}</span>
            )}
          </div>
        </section>

        {/* Security card */}
        <section className="mb-6 rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <Shield className="size-4" /> Security
          </div>
          <form onSubmit={changePassword} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                New password
              </label>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Confirm new password
              </label>
              <input
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            {pwErr && <p className="text-sm text-destructive">{pwErr}</p>}
            {pwMsg && <p className="text-sm text-primary">{pwMsg}</p>}
            <button
              type="submit"
              disabled={savingPw}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
            >
              {savingPw ? "Updating…" : "Change password"}
            </button>
          </form>
        </section>

        {/* Sessions card */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <LogOut className="size-4" /> Active sessions
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Aap is device par signed in hain. Agar aapko lagta hai kisi aur device
            par account khula hai, sabhi sessions band kar dein.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={signOutThis}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-primary/50"
            >
              Sign out this device
            </button>
            <button
              onClick={signOutAll}
              className="rounded-lg border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
            >
              Sign out all devices
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}