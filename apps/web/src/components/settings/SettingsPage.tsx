"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building, Users, Zap, GitBranch, Bell, CreditCard, Shield,
  ClipboardList, Plus, Trash2, Eye, EyeOff,
  AlertTriangle, X, RefreshCw,
  MoreHorizontal, Globe, Hash, Link2, Loader2,
  AlertCircle, Lock,
  type LucideIcon
} from "lucide-react";
import { Button } from "../ui/button";
import {
  getCurrentOrganization,
  getOrganizationMembers,
  listIntegrations,
  createIntegration,
  updateIntegrationStatus,
  deleteIntegration,
  RateLimitError,
} from "@/lib/api";
import type { AuthOrganization } from "@/types/auth";
import type {
  Integration,
  IntegrationProvider,
  IntegrationStatus,
} from "@/types/integrations";
import { formatRelativeTime } from "@/lib/format";

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

const roleColors: Record<string, string> = {
  OWNER: "bg-violet-400/10 text-violet-400 border-violet-400/20",
  ADMIN: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  SUPPORT_AGENT: "bg-cyan-400/10 text-cyan-400 border-cyan-400/20",
  DEVELOPER: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  VIEWER: "bg-slate-400/10 text-slate-400 border-slate-400/20",
};

function roleLabel(role: string): string {
  return role
    .toLowerCase()
    .split("_")
    .map(w => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

// Small banner used on sections that don't have a backend to wire to yet,
// so it's obvious to anyone poking around which parts of Settings are real.
function NotWiredBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 bg-slate-400/5 border border-slate-400/20 rounded-xl p-3 mb-4">
      <Lock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-slate-500">{children}</p>
    </div>
  );
}

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

function OrganizationSection() {
  const [org, setOrg] = useState<(AuthOrganization & { plan: string; createdAt: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getCurrentOrganization();
        if (!cancelled) setOrg(res.data.organization);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof RateLimitError
            ? `Rate limited, retry in ${err.retryAfterSeconds}s.`
            : "Couldn't load organization details."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="py-16 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <div className="text-sm text-red-400">{error || "No organization found."}</div>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-5">
      <NotWiredBanner>
        This section is read-only — there&apos;s no update/transfer/delete endpoint on the backend yet, so nothing here is editable.
      </NotWiredBanner>

      <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-5 space-y-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">Organization name</div>
          <div className="text-sm text-slate-200 font-medium">{org.name}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Workspace URL</div>
          <div className="text-sm text-slate-300 font-mono">app.resolveai.io/{org.slug}</div>
        </div>
        <div className="flex gap-8">
          <div>
            <div className="text-xs text-slate-500 mb-1">Plan</div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">{org.plan}</span>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Your role</div>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${roleColors[org.role ?? ""] ?? roleColors.VIEWER}`}>
              {roleLabel(org.role ?? "VIEWER")}
            </span>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Created</div>
            <div className="text-sm text-slate-300">{formatRelativeTime(org.createdAt)}</div>
          </div>
        </div>
      </div>

      {/* Danger zone — visibly present but disabled, no backend route exists */}
      <div className="border border-red-400/20 rounded-xl p-4 mt-8 opacity-60">
        <div className="text-sm font-semibold text-red-400 mb-3">Danger zone</div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-300">Transfer ownership</div>
              <div className="text-xs text-slate-500">Transfer this workspace to another owner</div>
            </div>
            <Button disabled variant="outline" size="sm" className="border-red-400/30 text-red-400 bg-transparent text-xs cursor-not-allowed">Transfer</Button>
          </div>
          <div className="border-t border-[#1E293B] pt-3 flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-300">Delete workspace</div>
              <div className="text-xs text-slate-500">Permanently delete this workspace and all data</div>
            </div>
            <Button disabled variant="outline" size="sm" className="border-red-400/30 text-red-400 bg-transparent text-xs cursor-not-allowed">Delete</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

type Member = {
  id: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string; email: string };
};

function MembersSection() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getOrganizationMembers();
      setMembers(res.data.members);
    } catch (err) {
      setError(
        err instanceof RateLimitError
          ? `Rate limited, retry in ${err.retryAfterSeconds}s.`
          : "Couldn't load members."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400">{loading ? "Loading…" : `${members.length} members`}</div>
        <Button
          disabled
          title="Invite flow isn't available yet — there's no invite endpoint on the backend."
          size="sm"
          className="bg-cyan-400/40 text-slate-950/70 font-semibold text-xs cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Invite member
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="py-16 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <div className="text-sm text-red-400 mb-3">{error}</div>
          <Button size="sm" className="bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20 text-xs" onClick={load}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1E293B]">
                {["Member", "Role", "Joined", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              {members.map(m => (
                <tr key={m.id} className="hover:bg-[#0B1220] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300 flex-shrink-0">
                        {m.user.name[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-200">{m.user.name}</div>
                        <div className="text-xs text-slate-500">{m.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${roleColors[m.role] ?? roleColors.VIEWER}`}>{roleLabel(m.role)}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatRelativeTime(m.joinedAt)}</td>
                  <td className="px-4 py-3">
                    <button disabled title="Role management isn't available yet." className="text-slate-700 cursor-not-allowed">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProvidersSection() {
  return (
    <div className="space-y-4 max-w-2xl">
      <NotWiredBanner>
        Demo data — there&apos;s no provider-key model or routes on the backend yet, so nothing here is connected to real credentials.
      </NotWiredBanner>
      <p className="text-sm text-slate-400">Connect AI provider API keys. Keys are masked after saving and never exposed in logs.</p>
      <ProviderCard name="OpenRouter" logo="OR" connected={true} model="gpt-4o" isDefault={true} />
      <ProviderCard name="Groq" logo="G" connected={true} model="llama-3.1-70b" isDefault={false} />
      <ProviderCard name="Google Gemini" logo="Gm" connected={false} isDefault={false} />
    </div>
  );
}

const providerMeta: Record<IntegrationProvider, { label: string; description: string; icon: LucideIcon }> = {
  SLACK_WEBHOOK: { label: "Slack", description: "Post incident alerts and approval notifications to a Slack channel via webhook.", icon: Hash },
  TICKETING_WEBHOOK: { label: "Ticketing webhook", description: "Push new tickets to an external ticketing system (Zendesk, Jira, etc.).", icon: Globe },
  GENERIC_WEBHOOK: { label: "Generic webhook", description: "Send events to any endpoint via HTTP POST.", icon: Link2 },
};

function AddIntegrationModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (integration: Integration) => void;
}) {
  const [provider, setProvider] = useState<IntegrationProvider>("GENERIC_WEBHOOK");
  const [name, setName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [secretHeaderName, setSecretHeaderName] = useState("");
  const [secretHeaderValue, setSecretHeaderValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim() || !webhookUrl.trim()) {
      setError("Name and webhook URL are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await createIntegration({
        provider,
        name: name.trim(),
        credentials: {
          webhookUrl: webhookUrl.trim(),
          ...(secretHeaderName.trim() ? { secretHeaderName: secretHeaderName.trim() } : {}),
          ...(secretHeaderValue.trim() ? { secretHeaderValue: secretHeaderValue.trim() } : {}),
        },
      });
      onCreated(res.data.integration);
      onClose();
    } catch (err) {
      setError(
        err instanceof RateLimitError
          ? `Rate limited, retry in ${err.retryAfterSeconds}s.`
          : err instanceof Error ? err.message : "Couldn't create integration."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold text-slate-100">Add integration</div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Provider</label>
          <select
            value={provider}
            onChange={e => setProvider(e.target.value as IntegrationProvider)}
            className="w-full bg-[#0B1220] border border-[#334155] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 transition-colors"
          >
            {(Object.keys(providerMeta) as IntegrationProvider[]).map(p => (
              <option key={p} value={p}>{providerMeta[p].label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. #incidents alerts"
            className="w-full bg-[#0B1220] border border-[#334155] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Webhook URL</label>
          <input
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.example.com/..."
            className="w-full bg-[#0B1220] border border-[#334155] rounded-xl px-3 py-2 text-sm text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Secret header name <span className="text-slate-600">(optional)</span></label>
            <input
              value={secretHeaderName}
              onChange={e => setSecretHeaderName(e.target.value)}
              placeholder="X-Signature"
              className="w-full bg-[#0B1220] border border-[#334155] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Secret header value <span className="text-slate-600">(optional)</span></label>
            <input
              value={secretHeaderValue}
              onChange={e => setSecretHeaderValue(e.target.value)}
              type="password"
              placeholder="••••••••"
              className="w-full bg-[#0B1220] border border-[#334155] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-400/10 border border-red-400/20 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-sm disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Add integration"}
          </Button>
          <Button onClick={onClose} disabled={submitting} variant="outline" className="border-[#334155] text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] bg-transparent">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function IntegrationRow({
  integration,
  onToggle,
  onDelete,
}: {
  integration: Integration;
  onToggle: (integration: Integration) => void;
  onDelete: (integration: Integration) => void;
}) {
  const meta = providerMeta[integration.provider];
  const Icon = meta?.icon ?? Link2;
  const active = integration.status === "ACTIVE";
  const [busy, setBusy] = useState(false);

  return (
    <div className={`bg-[#0F172A] border rounded-xl p-4 flex items-start gap-4 ${active ? "border-emerald-400/20" : "border-[#1E293B]"}`}>
      <div className="w-9 h-9 rounded-xl bg-[#1E293B] border border-[#334155] flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-sm font-medium text-slate-200">{integration.name}</span>
          <span className="text-[10px] text-slate-500 bg-slate-500/10 px-1.5 py-0.5 rounded-full border border-slate-500/20">{meta?.label ?? integration.provider}</span>
          {active ? (
            <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full border border-emerald-400/20">Active</span>
          ) : (
            <span className="text-[10px] text-slate-500 bg-slate-500/10 px-1.5 py-0.5 rounded-full border border-slate-500/20">Disabled</span>
          )}
        </div>
        <p className="text-xs text-slate-500">{meta?.description}</p>
        <p className="text-[10px] text-slate-600 mt-1">
          {integration.lastUsedAt ? `Last used ${formatRelativeTime(integration.lastUsedAt)}` : "Never used"} · added {formatRelativeTime(integration.createdAt)}
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          className="border-[#334155] text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] bg-transparent text-xs disabled:opacity-50"
          onClick={async () => { setBusy(true); await onToggle(integration); setBusy(false); }}
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : active ? "Disable" : "Enable"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          className="border-red-400/30 text-red-400 hover:bg-red-400/10 bg-transparent text-xs disabled:opacity-50"
          onClick={() => onDelete(integration)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function IntegrationsSection() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Integration | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listIntegrations();
      setIntegrations(res.data.integrations);
    } catch (err) {
      setError(
        err instanceof RateLimitError
          ? `Rate limited, retry in ${err.retryAfterSeconds}s.`
          : "Couldn't load integrations."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (integration: Integration) => {
    const nextStatus: IntegrationStatus = integration.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    try {
      const res = await updateIntegrationStatus(integration.id, nextStatus);
      setIntegrations(prev => prev.map(i => i.id === integration.id ? res.data.integration : i));
    } catch (err) {
      setError(
        err instanceof RateLimitError
          ? `Rate limited, retry in ${err.retryAfterSeconds}s.`
          : "Couldn't update integration status."
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteIntegration(pendingDelete.id);
      setIntegrations(prev => prev.filter(i => i.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) {
      setError(
        err instanceof RateLimitError
          ? `Rate limited, retry in ${err.retryAfterSeconds}s.`
          : "Couldn't delete integration."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3 max-w-2xl">
      {showAdd && (
        <AddIntegrationModal
          onClose={() => setShowAdd(false)}
          onCreated={integration => setIntegrations(prev => [integration, ...prev])}
        />
      )}

      {pendingDelete && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="text-base font-semibold text-slate-100">Delete integration?</div>
            <p className="text-sm text-slate-400">This will permanently remove <span className="text-slate-200 font-medium">{pendingDelete.name}</span>. This can&apos;t be undone.</p>
            <div className="flex gap-3">
              <Button onClick={handleConfirmDelete} disabled={deleting} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-semibold text-sm disabled:opacity-50">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Delete"}
              </Button>
              <Button onClick={() => setPendingDelete(null)} disabled={deleting} variant="outline" className="border-[#334155] text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] bg-transparent">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-slate-400">Connect external tools to enable AI-assisted actions and notifications.</p>
        <Button size="sm" onClick={() => setShowAdd(true)} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-semibold text-xs flex-shrink-0 ml-3">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="py-16 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <div className="text-sm text-red-400 mb-3">{error}</div>
          <Button size="sm" className="bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20 text-xs" onClick={load}>
            Retry
          </Button>
        </div>
      ) : integrations.length === 0 ? (
        <div className="py-16 text-center">
          <GitBranch className="w-8 h-8 text-slate-700 mx-auto mb-2" />
          <div className="text-sm text-slate-500">No integrations yet</div>
        </div>
      ) : (
        integrations.map(integration => (
          <IntegrationRow
            key={integration.id}
            integration={integration}
            onToggle={handleToggle}
            onDelete={setPendingDelete}
          />
        ))
      )}
    </div>
  );
}

function AuditSection() {
  return (
    <div className="space-y-4">
      <NotWiredBanner>
        Demo data — the backend writes audit log entries for actions like approvals and integration changes, but there&apos;s no read endpoint yet to list them here.
      </NotWiredBanner>
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
      <NotWiredBanner>
        Demo data — these toggles aren&apos;t backed by real settings yet, though role-based access control itself is genuinely enforced server-side via the RBAC middleware on every route.
      </NotWiredBanner>
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
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentOrganization()
      .then(res => { if (!cancelled) setOrgName(res.data.organization.name); })
      .catch(() => { /* header falls back to a generic label; section body surfaces the real error */ });
    return () => { cancelled = true; };
  }, []);

  const sectionContent: Record<Section, React.ReactNode> = {
    organization: <OrganizationSection />,
    members: <MembersSection />,
    providers: <ProvidersSection />,
    integrations: <IntegrationsSection />,
    notifications: (
      <div className="max-w-xl">
        <NotWiredBanner>
          Demo data — there&apos;s no notification-preferences model or routes on the backend yet, so these checkboxes don&apos;t persist anything.
        </NotWiredBanner>
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
        <NotWiredBanner>
          Demo data — there&apos;s no billing/usage model or routes on the backend yet, so plan, usage, and upgrade actions here aren&apos;t real.
        </NotWiredBanner>
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
          <p className="text-xs text-slate-500 mt-0.5">{orgName ?? "Your workspace"}</p>
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