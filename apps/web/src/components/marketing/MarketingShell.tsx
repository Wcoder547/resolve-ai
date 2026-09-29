"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { Button } from "../ui/button";
import { ThemeToggle } from "../theme/ThemeToggle";
import { cn } from "../ui/utils";
import { ResolveLogo, ResolveMark } from "../brand/ResolveLogo";

const ANNOUNCEMENT_DISMISS_KEY = "resolveai_announcement_dismissed";

export { ResolveMark, ResolveLogo };

function AnnouncementBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(ANNOUNCEMENT_DISMISS_KEY) !== "1") {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(ANNOUNCEMENT_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="bg-brand text-brand-foreground">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2 sm:gap-3 sm:px-8 sm:py-2.5">
        <p className="min-w-0 flex-1 truncate text-center text-xs font-medium sm:text-left sm:text-sm">
          Grounded answers with citations — risky tools need human approval.
        </p>
        <Link
          href="/register"
          className="shrink-0 text-xs font-semibold underline-offset-2 hover:underline sm:text-sm"
        >
          Try free →
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md opacity-85 transition-opacity hover:opacity-100"
          aria-label="Dismiss announcement"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

export const marketingNav: {
  label: string;
  href: string;
  children?: { label: string; href: string; desc: string }[];
}[] = [
  {
    label: "Product",
    href: "/product",
    children: [
      {
        label: "Overview",
        href: "/product",
        desc: "Knowledge, chat, agents, approvals.",
      },
      {
        label: "How it works",
        href: "/how-it-works",
        desc: "Upload → retrieve → resolve → approve.",
      },
      {
        label: "Agent runs",
        href: "/product#agents",
        desc: "Full triage-to-QA traces.",
      },
    ],
  },
  { label: "Customers", href: "/customers" },
  { label: "Pricing", href: "/pricing" },
  { label: "Security", href: "/security" },
  { label: "Docs", href: "/docs" },
  {
    label: "Resources",
    href: "/blog",
    children: [
      { label: "Blog", href: "/blog", desc: "Product notes and support AI." },
      { label: "Changelog", href: "/changelog", desc: "What shipped recently." },
      { label: "About", href: "/about", desc: "Why we built ResolveAI." },
      { label: "Contact", href: "/contact", desc: "Talk to the team." },
    ],
  },
];

function NavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active =
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "text-sm transition-colors hover:text-foreground",
        active ? "text-foreground font-medium" : "text-muted-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function DropdownNav({
  item,
}: {
  item: (typeof marketingNav)[number];
}) {
  const [open, setOpen] = useState(false);
  if (!item.children?.length) {
    return <NavLink href={item.href}>{item.label}</NavLink>;
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {item.label}
        <ChevronDown className="size-3.5 opacity-70" />
      </button>
      {open ? (
        <div className="absolute left-0 top-full pt-3">
          <div className="w-72 overflow-hidden rounded-xl border border-border bg-card p-2 shadow-xl">
            {item.children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-muted"
                onClick={() => setOpen(false)}
              >
                <div className="text-sm font-medium text-foreground">{child.label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{child.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function MarketingHeader() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="sticky top-0 z-40">
      <AnnouncementBar />

      <header className="border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" className="flex items-center">
            <ResolveLogo variant="lockup" size={32} />
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {marketingNav.map((item) => (
              <DropdownNav key={item.label} item={item} />
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <ThemeToggle />
            <Button
              variant="ghost"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={() => router.push("/login")}
            >
              Log in
            </Button>
            <Button
              className="rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90"
              onClick={() => router.push("/register")}
            >
              Try it for free
              <ArrowRight className="size-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <Button
              variant="outline"
              size="icon"
              className="border-border"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Open menu"
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </Button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="max-h-[80vh] overflow-y-auto border-t border-border px-5 py-5 lg:hidden">
            <div className="flex flex-col gap-5">
              {marketingNav.map((item) => (
                <div key={item.label}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-signal">
                    {item.label}
                  </p>
                  {item.children ? (
                    <div className="flex flex-col gap-2.5">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="text-sm text-foreground"
                          onClick={() => setMobileOpen(false)}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <NavLink
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </NavLink>
                  )}
                </div>
              ))}
              <div className="mt-1 flex flex-col gap-2 border-t border-border pt-4">
                <Button variant="outline" onClick={() => router.push("/login")}>
                  Log in
                </Button>
                <Button
                  className="rounded-full bg-primary text-primary-foreground"
                  onClick={() => router.push("/register")}
                >
                  Try it for free
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </header>
    </div>
  );
}

const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Overview", href: "/product" },
      { label: "How it works", href: "/how-it-works" },
      { label: "Pricing", href: "/pricing" },
      { label: "Security", href: "/security" },
      { label: "Docs", href: "/docs" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Customers", href: "/customers" },
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Changelog", href: "/changelog" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Changelog", href: "/changelog" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Terms", href: "/legal/terms" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-background">
      <div className="relative mx-auto max-w-7xl px-5 pt-14 sm:px-8 sm:pt-16">
        <div className="mb-12 sm:mb-14">
          <Link href="/" className="flex items-center">
            <ResolveLogo variant="lockup" size={28} />
          </Link>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-8 sm:grid-cols-4 lg:gap-12">
          {footerColumns.map((col) => (
            <div key={col.title}>
              <p className="mb-4 text-sm font-medium text-foreground">{col.title}</p>
              <ul className="space-y-3 text-sm">
                {col.links.map((link) => (
                  <li key={`${col.title}-${link.href}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          aria-hidden
          className="pointer-events-none relative mt-16 select-none sm:mt-20"
        >
          <p
            className="font-display text-center text-[18vw] font-semibold leading-none tracking-[-0.06em] sm:text-[14vw] lg:text-[11rem]"
            style={{
              color: "transparent",
              WebkitTextStroke: "1.5px color-mix(in srgb, var(--brand) 38%, transparent)",
            }}
          >
            ResolveAI
          </p>
        </div>
      </div>

      <div className="relative z-10 border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/legal/terms" className="underline-offset-4 hover:text-foreground hover:underline">
              Legal
            </Link>
            <Link
              href="/legal/privacy"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              Privacy Policy
            </Link>
          </div>
          <p>ResolveAI Inc. © {new Date().getFullYear()}</p>
        </div>
      </div>
    </footer>
  );
}

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}

export function MarketingPageHero({
  eyebrow,
  title,
  description,
  actions,
  visual,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  visual?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 50% at 50% -10%, color-mix(in srgb, var(--brand) 16%, transparent), transparent)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
        <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-signal">
          {eyebrow}
        </p>
        <h1 className="font-display max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {description}
        </p>
        {actions ? <div className="mt-7 flex flex-wrap gap-3">{actions}</div> : null}
        {visual ? <div className="mt-4">{visual}</div> : null}
      </div>
    </section>
  );
}
