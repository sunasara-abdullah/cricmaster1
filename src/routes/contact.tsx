import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MessageSquare, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/cricmaster/Navbar";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Support — CricMaster" },
      {
        name: "description",
        content:
          "Get help with CricMaster scoring, accounts or leagues. Send us a support message and we'll get back to you.",
      },
      { property: "og:title", content: "Contact & Support — CricMaster" },
      {
        property: "og:description",
        content: "Reach the CricMaster team for scoring help, bugs or feature requests.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cricmaster1.lovable.app/contact" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://cricmaster1.lovable.app/contact" }],
  }),
  component: ContactPage,
});

const SUPPORT_EMAIL = "support@cricmaster1.lovable.app";

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

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    const subject = encodeURIComponent(`[CricMaster ${topic}] from ${name.trim()}`);
    const body = encodeURIComponent(`${message.trim()}\n\n— ${name.trim()} (${email.trim()})`);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    toast.success("Opening your email app with the message ready to send.");
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
          {[
            { icon: Mail, title: "Email us", desc: SUPPORT_EMAIL },
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
          <button type="submit" className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
            Send message
          </button>
        </form>
      </main>
    </div>
  );
}
