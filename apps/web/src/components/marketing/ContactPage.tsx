"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { MarketingPageHero, MarketingShell } from "./MarketingShell";

export function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in name, email, and message.");
      return;
    }
    setSending(true);
    // UI stub — not wired to a backend inbox yet
    window.setTimeout(() => {
      console.info("[contact form stub]", { name, email, company, message });
      toast.success("Message captured locally — contact form is not wired yet.");
      setName("");
      setEmail("");
      setCompany("");
      setMessage("");
      setSending(false);
    }, 400);
  };

  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="Contact"
        title="Talk to the ResolveAI team."
        description="Sales, security reviews, or product questions — send a note."
      />

      <section className="pb-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-4">
            <div className="cr-panel p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email
              </p>
              <a
                href="mailto:hello@resolveai.app"
                className="mt-2 inline-block text-lg font-medium text-brand hover:underline"
              >
                hello@resolveai.app
              </a>
            </div>
            <div className="cr-panel p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Note
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                This form shows a success toast and logs to the console. It is{" "}
                <strong className="text-foreground">not wired</strong> to a
                backend yet — use mailto for real outreach.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="cr-panel space-y-4 p-6 sm:p-8"
          >
            {(
              [
                ["name", "Name", name, setName, "text"],
                ["email", "Work email", email, setEmail, "email"],
                ["company", "Company (optional)", company, setCompany, "text"],
              ] as const
            ).map(([id, label, value, setter, type]) => (
              <div key={id}>
                <label
                  htmlFor={id}
                  className="mb-1.5 block text-sm font-medium text-foreground/80"
                >
                  {label}
                </label>
                <input
                  id={id}
                  type={type}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
                />
              </div>
            ))}
            <div>
              <label
                htmlFor="message"
                className="mb-1.5 block text-sm font-medium text-foreground/80"
              >
                Message
              </label>
              <textarea
                id="message"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full resize-y rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
              />
            </div>
            <Button
              type="submit"
              disabled={sending}
              className="w-full rounded-full bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {sending ? "Sending…" : "Send message"}
            </Button>
          </form>
        </div>
      </section>
    </MarketingShell>
  );
}
