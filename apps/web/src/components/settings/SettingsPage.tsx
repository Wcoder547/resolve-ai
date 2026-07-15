"use client";

import { useState } from "react";
import {
  Building, Users, Zap, GitBranch, Bell, CreditCard, Shield,
  ClipboardList, ChevronRight, Plus, Trash2, Eye, EyeOff,
  CheckCircle, AlertTriangle, X, Copy, RefreshCw, ExternalLink,
  User, Mail, Clock, MoreHorizontal, Globe, Hash, Link2
} from "lucide-react";
import { Button } from "../ui/button";

type Section =
  | "organization"
  | "members"
  | "providers"
  | "integrations"
  | "notifications"
  | "billing"
  | "security"
  | "audit";

const navItems: { id: Section; label: string; icon: React.FC<any> }[] = [
  { id: "organization", label: "Organization", icon: Building },
  { id: "members", label: "Members", icon: Users },
  { id: "providers", label: "AI Providers", icon: Zap },
  { id: "integrations", label: "Integrations", icon: GitBranch },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "security", label: "Security", icon: Shield },
  { id: "audit", label: "Audit log", icon: ClipboardList },
];

const members = [
  { name: "Jane Doe", email: "jane@acme.io", role: "Owner", status: "Active", lastActive: "Now" },
  { name: "Tom Kim", email: "tom@acme.io", role: "Admin", status: "Active", lastActive: "2h ago" },
  { name: "Priya Rajan", email: "priya@acme.io", role: "Support Agent", status: "Active", lastActive: "5h ago" },
  { name: "Marcus Webb", email: "marcus@acme.io", role: "Developer", status: "Active", lastActive: "1d ago" },
  { name: "Lena Fischer", email: "lena@acme.io", role: "Viewer", status: "Invited", lastActive: "—" },
];

const roleColors: Record<string, string> = {
  Owner: "bg-violet-400/10 text-violet-400 border-violet-400/20",
  Admin: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  "Support Agent": "bg-cyan-400/10 text-cyan-400 border-cyan-400/20",
  Developer: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  Viewer: "bg-slate-400/10 text-slate-400 border-slate-400/20",
};

const auditLogs = [
  { actor: "Jane Doe", action: "Approved action", resource: "APR-288", time: "35m ago", ip: "192.168.1.14" },
  { actor: "Tom Kim", action: "Uploaded source", resource: "API Reference.md", time: "2h ago", ip: "10.0.0.5" },
  { actor: "ResolveAI Agent", action: "Created run", resource: "run_4p9n1r2q", time: "18m ago", ip: "internal" },
  { actor: "Jane Doe", action: "Invited member", resource: "lena@acme.io", time: "1d ago", ip: "192.168.1.14" },
  { actor: "Tom Kim", action: "Updated provider key", resource: "OpenRouter", time: "2d ago", ip: "10.0.0.5" },
  { actor: "Priya Rajan", action: "Resolved ticket", resource: "TKT-2865", time: "1d ago", ip: "10.0.0.9" },
];

function ProviderCard({
  name,
  logo,
  connected,
  model,
  isDefault,
}: {
  name: string;
  logo: string;
  connected: boolean;
  model?: string;
  isDefault?: boolean;
}) {
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);

  const handleTest = () => {
    setTesting(true);
    setTestResult(null);
    setTimeout(() => {
      setTesting(false);
      setTestResult(connected ? "ok" : "fail");
    }, 1500);
  };

  return (
    <div className={`bg-[#0F172A] border rounded-xl p-5 ${isDefault ? "border-cyan-400/30" : "border-[#1E293B]"}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1E293B] border border-[#334155] flex items-center justify-center text-base font-bold text-slate-300">
            {logo}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-200">{name}</span>
              {isDefault && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">Default</span>
              )}
            </div>
            <span className={`text-[10px] flex items-center gap-1 mt-0.5 ${connected ? "text-emerald-400" : "text-slate-500"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-slate-600"}`} />
              {connected ? "Connected" : "Not connected"}
            </span>
          </div>
        </div>
        {testResult && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${testResult === "ok" ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" : "bg-red-400/10 text-red-400 border-red-400/20"}`}>
            {testResult === "ok" ? "✓ Connected" : "✗ Failed"}
          </span>
        )}
      </div>

      {connected && (
        <div className="space-y-2 mb-4">
          {model && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Selected model</span>
              <span className="font-mono text-slate-300">{model}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">API key</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-400">{showKey ? "sk-or-v1-abc...xyz789" : "sk-or-v1-••••••••••••••••"}</span>
              <button onClick={() => setShowKey(!showKey)} className="text-slate-500 hover:text-slate-300">
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="border-[#334155] text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] bg-transparent text-xs"
          onClick={handleTest}
          disabled={testing}
        >
          {testing ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : null}
          {testing ? "Testing..." : "Test connection"}
        </Button>
        {!isDefault && connected && (
          <Button size="sm" variant="outline" className="border-[#334155] text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] bg-transparent text-xs">
            Make default
          </Button>
        )}
        <Button size="sm" variant="outline" className="border-[#334155] text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] bg-transparent text-xs ml-auto">
          {connected ? "Edit key" : "Connect"}
        </Button>
      </div>
    </div>
  );
}

function IntegrationCard({
  name,
  description,
  icon: Icon,
  connected,
  comingSoon,
}: {
  name: string;
  description: string;
  icon: React.FC<any>;
  connected?: boolean;
  comingSoon?: boolean;
}) {
  return (
    <div className={`bg-[#0F172A] border rounded-xl p-4 flex items-start gap-4 ${connected ? "border-emerald-400/20" : "border-[#1E293B]"} ${comingSoon ? "opacity-60" : ""}`}>
      <div className="w-9 h-9 rounded-xl bg-[#1E293B] border border-[#334155] flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-slate-200">{name}</span>
          {connected && <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full border border-emerald-400/20">Connected</span>}
          {comingSoon && <span className="text-[10px] text-slate-500 bg-slate-500/10 px-1.5 py-0.5 rounded-full border border-slate-500/20">Coming soon</span>}
        </div>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      {!comingSoon && (
        <Button size="sm" variant="outline" className="border-[#334155] text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] bg-transparent text-xs flex-shrink-0">
          {connected ? "Configure" : "Connect"}
        </Button>
      )}
    </div>
  );
}

function OrganizationSection() {
  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  return (
    <div className="max-w-xl space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Organization name</label>
        <input defaultValue="Acme Corp" className="w-full bg-[#0B1220] border border-[#334155] rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 transition-colors" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Workspace URL</label>
        <div className="flex items-center">
          <span className="bg-[#1E293B] border border-r-0 border-[#334155] rounded-l-xl px-3 py-2.5 text-sm text-slate-500 whitespace-nowrap">app.resolveai.io/</span>
          <input defaultValue="acme-corp" className="flex-1 bg-[#0B1220] border border-[#334155] rounded-r-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 transition-colors" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Time zone</label>
        <select className="w-full bg-[#0B1220] border border-[#334155] rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 transition-colors">
          <option>UTC (Coordinated Universal Time)</option>
          <option>America/New_York</option>
          <option>Europe/London</option>
          <option>Asia/Tokyo</option>
        </select>
      </div>
      <Button onClick={handleSave} className={`${saved ? "bg-emerald-500 hover:bg-emerald-400" : "bg-cyan-400 hover:bg-cyan-300"} text-slate-950 font-semibold text-sm transition-colors`}>
        {saved ? <><CheckCircle className="w-4 h-4 mr-2" />Saved</> : "Save changes"}
      </Button>

      {/* Danger zone */}
      <div className="border border-red-400/20 rounded-xl p-4 mt-8">
        <div className="text-sm font-semibold text-red-400 mb-3">Danger zone</div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-300">Transfer ownership</div>
              <div className="text-xs text-slate-500">Transfer this workspace to another owner</div>
            </div>
            <Button variant="outline" size="sm" className="border-red-400/30 text-red-400 hover:bg-red-400/10 bg-transparent text-xs">Transfer</Button>
          </div>
          <div className="border-t border-[#1E293B] pt-3 flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-300">Delete workspace</div>
              <div className="text-xs text-slate-500">Permanently delete this workspace and all data</div>
            </div>
            <Button variant="outline" size="sm" className="border-red-400/30 text-red-400 hover:bg-red-400/10 bg-transparent text-xs">Delete</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MembersSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400">{members.length} members</div>
        <Button size="sm" className="bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-semibold text-xs">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Invite member
        </Button>
      </div>
      <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1E293B]">
              {["Member", "Role", "Status", "Last active", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] font-medium text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]">
            {members.map(m => (
              <tr key={m.email} className="hover:bg-[#0B1220] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300 flex-shrink-0">
                      {m.name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-200">{m.name}</div>
                      <div className="text-xs text-slate-500">{m.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${roleColors[m.role]}`}>{m.role}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-medium ${m.status === "Active" ? "text-emerald-400" : "text-slate-500"}`}>
                    {m.status === "Active" ? "● Active" : "○ Invited"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{m.lastActive}</td>
                <td className="px-4 py-3">
                  <button className="text-slate-500 hover:text-slate-300 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProvidersSection() {
  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm text-slate-400">Connect AI provider API keys. Keys are masked after saving and never exposed in logs.</p>
      <ProviderCard name="OpenRouter" logo="OR" connected={true} model="gpt-4o" isDefault={true} />
      <ProviderCard name="Groq" logo="G" connected={true} model="llama-3.1-70b" isDefault={false} />
      <ProviderCard name="Google Gemini" logo="Gm" connected={false} isDefault={false} />
    </div>
  );
}

function IntegrationsSection() {
  return (
    <div className="space-y-3 max-w-2xl">
      <p className="text-sm text-slate-400 mb-4">Connect external tools to enable AI-assisted actions and notifications.</p>
      <IntegrationCard name="GitHub" description="Create issues, PRs, and receive webhook events." icon={GitBranch} connected />
      <IntegrationCard name="Slack" description="Receive incident alerts and approval notifications." icon={Hash} comingSoon />
      <IntegrationCard name="Zendesk" description="Sync tickets and push AI-suggested replies." icon={Globe} comingSoon />
      <IntegrationCard name="Webhooks" description="Send events to any endpoint via HTTP POST." icon={Link2} />
    </div>
  );
}

function AuditSection() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">A complete log of actions taken by team members and the AI agent.</p>
      <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1E293B]">
              {["Actor", "Action", "Resource", "Timestamp", "IP / Source", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] font-medium text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]">
            {auditLogs.map((log, i) => (
              <tr key={i} className="hover:bg-[#0B1220] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {log.actor === "ResolveAI Agent" ? (
                      <div className="w-5 h-5 rounded-full bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-2.5 h-2.5 text-cyan-400" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-semibold text-slate-300 flex-shrink-0">
                        {log.actor[0]}
                      </div>
                    )}
                    <span className="text-xs text-slate-300">{log.actor}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">{log.action}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{log.resource}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{log.time}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{log.ip}</td>
                <td className="px-4 py-3">
                  <button className="text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SecuritySection() {
  return (
    <div className="max-w-xl space-y-5">
      <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4">
        <div className="text-sm font-semibold text-slate-200 mb-3">Workspace access</div>
        <div className="space-y-3 text-sm">
          {[
            { label: "Role-based access control", enabled: true },
            { label: "Enforce SSO for all members", enabled: false },
            { label: "Require MFA for all members", enabled: true },
            { label: "Session timeout after inactivity", enabled: true, value: "8 hours" },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-slate-400">{item.label}</span>
              <div className="flex items-center gap-2">
                {item.value && <span className="text-xs text-slate-500">{item.value}</span>}
                <div className={`w-8 h-4 rounded-full transition-colors cursor-pointer ${item.enabled ? "bg-cyan-400" : "bg-slate-700"}`}>
                  <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform m-0.5 ${item.enabled ? "translate-x-4" : "translate-x-0"}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4">
        <div className="text-sm font-semibold text-slate-200 mb-3">AI & approval controls</div>
        <div className="space-y-3 text-sm">
          {[
            { label: "Require approval for high-risk AI actions", enabled: true },
            { label: "Require approval for medium-risk AI actions", enabled: false },
            { label: "Log all AI-generated responses", enabled: true },
            { label: "Mask provider API keys in all logs", enabled: true },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-slate-400">{item.label}</span>
              <div className={`w-8 h-4 rounded-full transition-colors cursor-pointer ${item.enabled ? "bg-cyan-400" : "bg-slate-700"}`}>
                <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform m-0.5 ${item.enabled ? "translate-x-4" : "translate-x-0"}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const [section, setSection] = useState<Section>("organization");

  const sectionContent: Record<Section, React.ReactNode> = {
    organization: <OrganizationSection />,
    members: <MembersSection />,
    providers: <ProvidersSection />,
    integrations: <IntegrationsSection />,
    notifications: (
      <div className="max-w-xl">
        <p className="text-sm text-slate-400">Configure how and when you receive notifications.</p>
        <div className="mt-4 space-y-3">
          {[
            "New approval request",
            "Approval approved or rejected",
            "Incident declared",
            "Incident severity upgraded",
            "Agent run failed",
            "Knowledge ingestion failed",
            "New high-priority ticket",
          ].map(item => (
            <div key={item} className="flex items-center justify-between py-2 border-b border-[#1E293B]">
              <span className="text-sm text-slate-400">{item}</span>
              <div className="flex gap-3">
                {["Email", "Slack"].map(ch => (
                  <label key={ch} className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                    <input type="checkbox" defaultChecked className="accent-cyan-400 w-3.5 h-3.5 rounded" />
                    {ch}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    billing: (
      <div className="max-w-lg space-y-4">
        <div className="bg-[#0F172A] border border-cyan-400/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold text-slate-200">Pro plan</div>
              <div className="text-xs text-slate-500">$49 / month · billed monthly</div>
            </div>
            <span className="text-[10px] bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 px-2 py-0.5 rounded-full font-medium">Active</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-400">
            <div className="flex justify-between"><span>Knowledge sources</span><span className="text-slate-300">24 / unlimited</span></div>
            <div className="flex justify-between"><span>AI conversations</span><span className="text-slate-300">312 / 1,000</span></div>
            <div className="flex justify-between"><span>Team members</span><span className="text-slate-300">5 / 20</span></div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" className="bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-semibold text-xs">Upgrade</Button>
            <Button variant="outline" size="sm" className="border-[#334155] text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] bg-transparent text-xs">Manage billing</Button>
          </div>
        </div>
      </div>
    ),
    security: <SecuritySection />,
    audit: <AuditSection />,
  };

  const currentNav = navItems.find(n => n.id === section);

  return (
    <div className="flex h-full bg-[#020617] overflow-hidden">
      {/* Settings sidebar */}
      <div className="w-52 xl:w-64 border-r border-[#1E293B] bg-[#0F172A] flex-shrink-0 overflow-y-auto">
        <div className="px-4 py-5 border-b border-[#1E293B]">
          <h1 className="text-base font-bold text-slate-50">Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">Acme Corp workspace</p>
        </div>
        <nav className="p-2 space-y-0.5">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${section === id ? "bg-cyan-400/10 text-cyan-400 border border-cyan-400/20" : "text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] border border-transparent"}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Settings content */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-3xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-50">{currentNav?.label}</h2>
          </div>
          {sectionContent[section]}
        </div>
      </div>
    </div>
  );
}
