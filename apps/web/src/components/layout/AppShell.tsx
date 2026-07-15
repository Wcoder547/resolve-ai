"use client";

import { useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, Database, MessageSquare, Ticket, AlertTriangle,
  CheckSquare, Activity, BarChart3, Settings, BookOpen, User,
  Bell, Upload, Search, ChevronDown, Menu, X, Zap, LogOut,
  ChevronRight
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "../ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, path: "/app" },
  { label: "Knowledge Base", icon: Database, path: "/app/knowledge" },
  { label: "AI Chat", icon: MessageSquare, path: "/app/chat" },
  { label: "Tickets", icon: Ticket, path: "/app/tickets" },
  { label: "Incidents", icon: AlertTriangle, path: "/app/incidents", badge: "1", badgeVariant: "danger" },
  { label: "Approvals", icon: CheckSquare, path: "/app/approvals", badge: "3", badgeVariant: "warning" },
  { label: "Agent Runs", icon: Activity, path: "/app/agent-runs" },
  { label: "Analytics", icon: BarChart3, path: "/app/analytics" },
];

const bottomItems = [
  { label: "Settings", icon: Settings, path: "/app/settings" },
  { label: "Documentation", icon: BookOpen, path: "#" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/app") return pathname === "/app";
    return pathname.startsWith(path);
  };

  const currentPage = navItems.find(i => isActive(i.path))?.label ||
    bottomItems.find(i => isActive(i.path))?.label || "Overview";

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-[#020617] text-slate-50 overflow-hidden">
        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:relative z-50 lg:z-auto
          flex flex-col h-full bg-[#0F172A] border-r border-[#1E293B]
          transition-all duration-200
          ${sidebarOpen ? "w-64" : "w-16"}
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}>
          {/* Logo */}
          <div className="flex items-center gap-3 px-4 h-14 border-b border-[#1E293B] flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-cyan-400" />
              </div>
              {sidebarOpen && (
                <span className="font-semibold text-slate-50 text-[15px] tracking-tight">
                  Resolve<span className="text-cyan-400">AI</span>
                </span>
              )}
            </div>
            {sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="ml-auto text-slate-500 hover:text-slate-300 transition-colors hidden lg:block"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Workspace switcher */}
          {sidebarOpen && (
            <div className="px-3 py-2 border-b border-[#1E293B]">
              <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#1E293B] transition-colors text-left">
                <div className="w-5 h-5 rounded bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-violet-400">AC</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-slate-200 truncate">Acme Corp</div>
                  <div className="text-[10px] text-slate-500">Pro plan</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              </button>
            </div>
          )}

          {/* Nav items */}
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Tooltip key={item.path} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => { router.push(item.path); setMobileSidebarOpen(false); }}
                      className={`
                        w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-all duration-150
                        ${active
                          ? "bg-cyan-400/10 text-cyan-400 border border-cyan-400/20"
                          : "text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] border border-transparent"
                        }
                      `}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-cyan-400" : ""}`} />
                      {sidebarOpen && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.badge && (
                            <span className={`
                              text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                              ${item.badgeVariant === "danger" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}
                            `}>
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  </TooltipTrigger>
                  {!sidebarOpen && (
                    <TooltipContent side="right" className="bg-slate-800 border-slate-700 text-slate-200">
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </nav>

          {/* Bottom items */}
          <div className="px-2 py-2 border-t border-[#1E293B] space-y-0.5">
            {bottomItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Tooltip key={item.path} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => { router.push(item.path); setMobileSidebarOpen(false); }}
                      className={`
                        w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-all duration-150
                        ${active
                          ? "bg-cyan-400/10 text-cyan-400 border border-cyan-400/20"
                          : "text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] border border-transparent"
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {sidebarOpen && <span>{item.label}</span>}
                    </button>
                  </TooltipTrigger>
                  {!sidebarOpen && (
                    <TooltipContent side="right" className="bg-slate-800 border-slate-700 text-slate-200">
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}

            {/* User profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] transition-all duration-150">
                  <Avatar className="w-6 h-6 flex-shrink-0">
                    <AvatarFallback className="bg-cyan-400/20 text-cyan-400 text-[10px] font-semibold">JD</AvatarFallback>
                  </Avatar>
                  {sidebarOpen && (
                    <>
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-xs font-medium text-slate-300 truncate">Jane Doe</div>
                        <div className="text-[10px] text-slate-500 truncate">jane@acme.com</div>
                      </div>
                      <ChevronDown className="w-3 h-3 flex-shrink-0" />
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52 bg-slate-800 border-slate-700 text-slate-200" side="top" align="start">
                <DropdownMenuItem className="text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer">
                  <User className="w-4 h-4 mr-2" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
                  onClick={() => router.push("/app/settings")}>
                  <Settings className="w-4 h-4 mr-2" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem className="text-red-400 hover:text-red-300 hover:bg-slate-700 cursor-pointer"
                  onClick={() => router.push("/login")}>
                  <LogOut className="w-4 h-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Collapsed expand button */}
          {!sidebarOpen && (
            <div className="p-2 border-t border-[#1E293B]">
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-full flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-[#1E293B] transition-colors"
              >
                <Menu className="w-4 h-4" />
              </button>
            </div>
          )}
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top header */}
          <header className="h-14 flex items-center gap-4 px-4 lg:px-6 border-b border-[#1E293B] bg-[#020617] flex-shrink-0">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden text-slate-500 hover:text-slate-300 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
              <span className="text-slate-500">Acme Corp</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
              <span className="text-slate-300 font-medium truncate">{currentPage}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#334155] text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all text-sm">
                <Search className="w-3.5 h-3.5" />
                <span className="hidden md:block text-xs">Search...</span>
                <kbd className="hidden md:block text-[10px] bg-slate-800 text-slate-500 px-1 rounded">⌘K</kbd>
              </button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]"
                    onClick={() => router.push("/app/knowledge")}
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-800 border-slate-700 text-slate-200">Upload knowledge</TooltipContent>
              </Tooltip>

              <Button
                size="sm"
                className="bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-medium text-xs px-3"
                onClick={() => router.push("/app/chat")}
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1" />
                Ask AI
              </Button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="relative p-2 text-slate-400 hover:text-slate-200 transition-colors">
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-400 rounded-full" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-800 border-slate-700 text-slate-200">Notifications</TooltipContent>
              </Tooltip>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
