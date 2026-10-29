import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MessageSquare, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/cricmaster/Navbar";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Support — Playnivo" },
      {
        name: "description",
        content:
          "Get help with Playnivo scoring, accounts or leagues. Send us a support message and we'll get back to you.",
      },
      { property: "og:title", content: "Contact & Support — Playnivo" },
      {
        property: "og:description",
        content: "Reach the Playnivo team for scoring help, bugs or feature requests.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://playnivo.lovable.app/contact" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://playnivo.lovable.app/contact" }],
  }),
  component: ContactPage,
});

const SUPPORT_EMAIL = "supportplaynivo@gmail.com";

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("Support");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Please enter your name.";
    else if (name.trim().length > 60) e.name = "Name must be 60 characters or less.";
    if (!email.trim()) e.email = "Please enter your email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = "That email doesn't look right.";
    if (!message.trim()) e.message = "Please write a message.";
    else if (message.trim().length < 10) e.message = "Tell us a bit more (10+ characters).";
    else if (message.trim().length > 1000) e.message = "Message must be 1000 characters or less.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const buildMailto = () => {
    const subject = `[Playnivo Feedback] ${topic}`;
    const body = [
      `Name: ${name.trim()}`,
      `Email: ${email.trim()}`,
      `Topic: ${topic}`,
      "",
      message.trim(),
    ].join("\n");
    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    if (sending) return;
    setSending(true);
    // Open the visitor's own email app with everything pre-filled.
    window.location.href = buildMailto();
    // Keep a copy with us too, so the feedback is never lost.
    const { error } = await supabase.from("feedback_messages").insert({
      name: name.trim(),
      email: email.trim(),
      topic,
      message: message.trim(),
    });
    setSending(false);
    if (error) {
      toast.error(
        "Your email app is opening — but we could not keep a backup copy. Please press send in your email app.",
      );
    } else {
      toast.success("Your email app is opening — press send to deliver your feedback.");
    }
    setSentTo(email.trim());
    setName("");
    setEmail("");
    setTopic("Support");
    setMessage("");
  };

  const field =
    "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-heading text-4xl font-bold tracking-tight">
          Contact & <span className="text-primary">Support</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Scoring question, bug report or a feature you'd love? Send it over.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
          >
            <Mail className="mb-2 size-5 text-primary" />
            <h2 className="text-sm font-bold">Email us</h2>
            <p className="mt-0.5 break-words text-xs text-muted-foreground">
              {SUPPORT_EMAIL} — tap to open your email app
            </p>
          </a>
          {[
            { icon: LifeBuoy, title: "Response time", desc: "Usually within 2 working days" },
            { icon: MessageSquare, title: "Feedback", desc: "Feature requests welcome" },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl border border-border bg-card p-4">
              <c.icon className="mb-2 size-5 text-primary" />
              <h2 className="text-sm font-bold">{c.title}</h2>
              <p className="mt-0.5 break-words text-xs text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>

        <form onSubmit={submit} noValidate className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6">
          <div>
            <label htmlFor="c-name" className="mb-1 block text-sm font-medium">Name</label>
            <input id="c-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className={field} placeholder="Your name" />
            {errors.name && <p className="mt-1 text-xs font-medium text-destructive">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="c-email" className="mb-1 block text-sm font-medium">Email</label>
            <input id="c-email" type="email" value={email} maxLength={255} onChange={(e) => setEmail(e.target.value)} className={field} placeholder="you@example.com" />
            {errors.email && <p className="mt-1 text-xs font-medium text-destructive">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="c-topic" className="mb-1 block text-sm font-medium">Topic</label>
            <select id="c-topic" value={topic} onChange={(e) => setTopic(e.target.value)} className={field}>
              <option>Support</option>
              <option>Bug report</option>
              <option>Feature request</option>
              <option>Account & data</option>
            </select>
          </div>
          <div>
            <label htmlFor="c-msg" className="mb-1 block text-sm font-medium">Message</label>
            <textarea id="c-msg" rows={5} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} className={field} placeholder="How can we help?" />
            <div className="mt-1 flex justify-between">
              {errors.message ? (
                <p className="text-xs font-medium text-destructive">{errors.message}</p>
              ) : <span />}
              <span className="text-xs text-muted-foreground">{message.length}/1000</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            {sending ? "Opening your email app…" : "Send feedback via email"}
          </button>
          <p className="text-center text-xs text-muted-foreground">
            Submitting opens your own email app with the message ready — you just press send.
            A copy is also kept with us in case the email doesn't go through.
          </p>
        </form>

        {sentTo && (
          <div className="mt-4 rounded-2xl border border-primary/40 bg-primary/10 p-5 text-sm">
            <p className="font-bold">Your email app should be open now.</p>
            <p className="mt-1 text-muted-foreground">
              If it didn't open, email us directly at{" "}
              <a className="font-medium text-primary hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
              . We reply to <span className="font-medium text-foreground">{sentTo}</span>, usually within 2 working days.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
