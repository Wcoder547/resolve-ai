"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, Database, MessageSquare, Ticket, AlertTriangle,
  CheckSquare, Activity, BarChart3, Settings, User,
  Bell, Upload, Search, ChevronDown, Menu, LogOut,
  ChevronRight, Loader2, PanelLeftClose, PanelLeft
} from "lucide-react";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "../ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { getAccessToken, getUser, getOrganization, saveOrganization, clearSession } from "@/lib/auth";
import { getCurrentUser, getCurrentOrganization, logoutUser, listPendingToolCalls } from "@/lib/api";
import type { AuthUser, AuthOrganization } from "@/types/auth";
import { CommandPalette } from "./CommandPalette";
import { ThemeToggle } from "../theme/ThemeToggle";
import { ResolveLogo } from "../brand/ResolveLogo";

type SidebarOrganization = AuthOrganization & { plan?: string };

function orgInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const navItems = [
  { label: "Overview", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Knowledge Base", icon: Database, path: "/knowledge" },
  { label: "AI Chat", icon: MessageSquare, path: "/chat" },
  { label: "Tickets", icon: Ticket, path: "/tickets" },
  { label: "Incidents", icon: AlertTriangle, path: "/incidents", preview: true },
  { label: "Approvals", icon: CheckSquare, path: "/approvals", badgeVariant: "warning" as const },
  { label: "Agent Runs", icon: Activity, path: "/agent-runs" },
  { label: "Analytics", icon: BarChart3, path: "/analytics" },
];

const bottomItems = [
  { label: "Settings", icon: Settings, path: "/settings" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Tooltips only after collapse settles — otherwise the close-button click
  // leaves the pointer over a nav icon and a delay-0 tooltip flashes open.
  const [collapsedTooltipsReady, setCollapsedTooltipsReady] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [org, setOrg] = useState<SidebarOrganization | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState<number | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (sidebarOpen) {
      setCollapsedTooltipsReady(false);
    }
  }, [sidebarOpen]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const cached = getUser();
    if (cached) {
      setUser(cached);
      setCheckingAuth(false);
    }

    const cachedOrg = getOrganization();
    if (cachedOrg) setOrg(cachedOrg);

    // Refresh org details in the background (name/plan/role can change,
    // and cached org may be missing `plan` if it was saved before that
    // field existed on the response).
    getCurrentOrganization()
      .then((res) => {
        setOrg(res.data.organization);
        saveOrganization(res.data.organization);
      })
      .catch(() => {
        // Non-fatal — keep whatever we had cached rather than blanking
        // the sidebar over a transient failure. Auth validity itself is
        // already checked by the getCurrentUser() call below.
      });

    // Validate the token against the backend and refresh user info in the
    // background; if it's expired or invalid, boot back to login.
    getCurrentUser()
      .then((res) => {
        setUser(res.data.user);
        setCheckingAuth(false);
      })
      .catch(() => {
        clearSession();
        router.replace("/login");
      });
  }, [router]);

  // Poll the pending-approvals count for the sidebar badge. Runs only once
  // auth has resolved, refreshes every 30s, and can be triggered immediately
  // via the "approvals:changed" event (dispatched e.g. after an approve/reject
  // action) so the badge doesn't wait for the next poll tick.
  useEffect(() => {
    if (checkingAuth) return;

    let cancelled = false;

    const fetchPending = async () => {
      try {
        const res = await listPendingToolCalls();
        if (!cancelled) setPendingApprovals(res.data.toolCalls.length);
      } catch {
        // Non-fatal — leave the last known count in place rather than
        // clearing the badge on a transient failure.
      }
    };

    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    window.addEventListener("approvals:changed", fetchPending);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("approvals:changed", fetchPending);
    };
  }, [checkingAuth]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      // Non-fatal — clear the local session regardless.
    } finally {
      clearSession();
      router.push("/login");
    }
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0]!.toUpperCase())
        .join("")
    : "";

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(path);
  };

  if (checkingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-5 h-5 text-brand animate-spin" />
      </div>
    );
  }

  const currentPage = navItems.find(i => isActive(i.path))?.label ||
    bottomItems.find(i => isActive(i.path))?.label || "Overview";

  const resolveBadge = (item: (typeof navItems)[number]): string | undefined => {
    if (item.path === "/approvals") {
      return pendingApprovals && pendingApprovals > 0 ? String(pendingApprovals) : undefined;
    }
    return undefined;
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-foreground/20 backdrop-blur-[1px] z-40 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
          fixed lg:relative z-50 lg:z-auto
          flex flex-col h-full bg-card border-r border-border
          transition-all duration-200
          ${sidebarOpen ? "w-60" : "w-14"}
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
          onMouseLeave={() => {
            if (!sidebarOpen) setCollapsedTooltipsReady(true);
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-3 h-14 border-b border-border shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {sidebarOpen ? (
                <ResolveLogo variant="lockup" size={28} className="min-w-0" />
              ) : (
                <ResolveLogo variant="mark" className="size-7" />
              )}
            </div>
            {sidebarOpen && (
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  setCollapsedTooltipsReady(false);
                  (document.activeElement as HTMLElement | null)?.blur?.();
                }}
                className="ml-auto text-muted-foreground hover:text-foreground transition-colors hidden lg:block"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Workspace switcher */}
          {sidebarOpen && (
            <div className="px-2.5 py-2 border-b border-border">
              <button
                type="button"
                onClick={() => router.push("/settings")}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-left"
              >
                <div className="w-5 h-5 rounded bg-muted border border-border flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-muted-foreground">
                    {org ? orgInitials(org.name) : "…"}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-foreground truncate">
                    {org?.name ?? "Loading…"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {org?.plan ? `${org.plan.charAt(0)}${org.plan.slice(1).toLowerCase()} plan` : "\u00A0"}
                  </div>
                </div>
                <Settings className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </button>
            </div>
          )}

          {/* Nav items */}
          <nav className="flex-1 overflow-y-auto py-2.5 px-2 space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const badge = resolveBadge(item);
              const navButton = (
                <button
                  onClick={() => { router.push(item.path); setMobileSidebarOpen(false); }}
                  className={`
                    relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors
                    ${active
                      ? "bg-brand-soft text-brand"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }
                  `}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-brand"
                      aria-hidden
                    />
                  )}
                  <Icon className={`w-4 h-4 shrink-0 ${active ? "text-brand" : ""}`} />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {"preview" in item && item.preview ? (
                        <span className="text-[9px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded border border-border text-muted-foreground bg-background">
                          Preview
                        </span>
                      ) : null}
                      {badge && (
                        <span className={`
                          text-[10px] font-semibold px-1.5 py-0.5 rounded-md tabular-nums
                          ${item.badgeVariant === "warning"
                            ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                            : "bg-brand-soft text-brand border border-brand/20"
                          }
                        `}>
                          {badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );

              if (!collapsedTooltipsReady) {
                return <div key={item.path}>{navButton}</div>;
              }

              return (
                <Tooltip key={item.path} delayDuration={400}>
                  <TooltipTrigger asChild>
                    {navButton}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>

          {/* Bottom items */}
          <div className="px-2 py-2 border-t border-border space-y-0.5">
            {bottomItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const navButton = (
                <button
                  onClick={() => { router.push(item.path); setMobileSidebarOpen(false); }}
                  className={`
                    relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors
                    ${active
                      ? "bg-brand-soft text-brand"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }
                  `}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-brand"
                      aria-hidden
                    />
                  )}
                  <Icon className={`w-4 h-4 shrink-0 ${active ? "text-brand" : ""}`} />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              );

              if (!collapsedTooltipsReady) {
                return <div key={item.path}>{navButton}</div>;
              }

              return (
                <Tooltip key={item.path} delayDuration={400}>
                  <TooltipTrigger asChild>
                    {navButton}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}

            {/* User profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <Avatar className="w-6 h-6 shrink-0">
                    <AvatarFallback className="bg-brand-soft text-brand text-[10px] font-semibold">
                      {initials || "?"}
                    </AvatarFallback>
                  </Avatar>
                  {sidebarOpen && (
                    <>
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-xs font-medium text-foreground truncate">
                          {user?.name ?? "—"}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {user?.email ?? ""}
                        </div>
                      </div>
                      <ChevronDown className="w-3 h-3 shrink-0" />
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52" side="top" align="start">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => router.push("/settings")}
                >
                  <User className="w-4 h-4 mr-2" /> Account
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => router.push("/settings")}
                >
                  <Settings className="w-4 h-4 mr-2" /> Workspace settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Collapsed expand button */}
          {!sidebarOpen && (
            <div className="p-2 border-t border-border">
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-full flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Expand sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top header */}
          <header className="h-14 flex items-center gap-3 px-4 lg:px-6 border-b border-border bg-card shrink-0">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
              <span className="text-muted-foreground truncate">{org?.name ?? "Workspace"}</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
              <span className="text-foreground font-medium truncate">{currentPage}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              <ThemeToggle />

              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-sm"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden md:block text-xs">Search</span>
                <kbd className="hidden md:inline-flex items-center text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                  ⌘K
                </kbd>
              </button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => router.push("/knowledge")}
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Upload knowledge</TooltipContent>
              </Tooltip>

              <Button
                size="sm"
                className="rounded-full bg-brand text-brand-foreground hover:bg-brand/90 font-medium text-xs px-3.5"
                onClick={() => router.push("/chat")}
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1" />
                Ask AI
              </Button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => router.push("/approvals")}
                    className="relative p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
                    aria-label="Approvals"
                  >
                    <Bell className="w-4 h-4" />
                    {pendingApprovals && pendingApprovals > 0 ? (
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand rounded-full" />
                    ) : null}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {pendingApprovals && pendingApprovals > 0
                    ? `${pendingApprovals} pending approval${pendingApprovals === 1 ? "" : "s"}`
                    : "No pending approvals"}
                </TooltipContent>
              </Tooltip>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto bg-background">
            {children}
          </main>
        </div>
        <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      </div>
    </TooltipProvider>
  );
}
