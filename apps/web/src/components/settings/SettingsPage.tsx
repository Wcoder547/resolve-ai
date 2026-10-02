"use client";

import { useCallback, useEffect, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
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
  updateOrganization,
  transferOrganization,
  deleteOrganization,
  getOrganizationMembers,
  getCurrentUser,
  changePassword,
  listSessions,
  revokeSession,
  revokeOtherSessions,
  listOrganizationInvites,
  createOrganizationInvite,
  resendOrganizationInvite,
  revokeOrganizationInvite,
  updateOrganizationMember,
  removeOrganizationMember,
  listIntegrations,
  createIntegration,
  updateIntegrationStatus,
  deleteIntegration,
  getAiUsageSummary,
  listAiUsageEvents,
  listAuditLogs,
  listAiProviders,
  upsertAiProvider,
  setDefaultAiProvider,
  testAiProvider,
  deleteAiProvider,
  listNotificationPreferences,
  updateNotificationPreferences,
  RateLimitError,
} from "@/lib/api";
import { ResendVerificationButton } from "@/components/auth/ResendVerificationButton";
import { EmptyState, SectionMark } from "@/components/ui/EmptyState";
import { saveTokens, saveOrganization, clearSession } from "@/lib/auth";
import { canShowDevAuthLinks } from "@/lib/dev-auth-links";
import type { AuthSession, CurrentOrganization, OrganizationInvite } from "@/types/auth";
import type {
  Integration,
  IntegrationProvider,
  IntegrationStatus,
} from "@/types/integrations";
import type { AiUsageSummary, AiUsageEvent, OrganizationPlan } from "@/types/usage";
import type { AuditLogEntry } from "@/types/audit";
import type { AiLlmProvider, NotificationPreference, OrganizationAiProvider } from "@/types/settings";
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
  { id: "billing", label: "Plan & usage", icon: CreditCard },
  { id: "security", label: "Security", icon: Shield },
  { id: "audit", label: "Audit log", icon: ClipboardList },
];

const roleColors: Record<string, string> = {
  OWNER: "bg-stone-100 text-stone-700 border-stone-200",
  ADMIN: "bg-sky-50 text-sky-700 border-sky-200",
  SUPPORT_AGENT: "bg-brand-soft text-brand border-brand/20",
  DEVELOPER: "bg-signal-soft text-signal border-signal/20",
  VIEWER: "bg-muted text-muted-foreground border-border",
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
    <div className="flex items-start gap-2 bg-muted-foreground/5 border border-border rounded-xl p-3 mb-4">
      <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
      <p className="text-xs text-muted-foreground">{children}</p>
    </div>
  );
}

function formatAuditAction(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function auditDetail(log: AuditLogEntry) {
  const metadata = log.metadata || {};
  const email = typeof metadata.email === "string" ? metadata.email : null;
  const role = typeof metadata.role === "string" ? metadata.role : null;
  const toRole = typeof metadata.toRole === "string" ? metadata.toRole : null;
  const fromRole = typeof metadata.fromRole === "string" ? metadata.fromRole : null;
  const path = typeof metadata.path === "string" ? metadata.path : null;

  if (email && toRole) return `${email} → ${toRole}`;
  if (email && role) return `${email} (${role})`;
  if (email) return email;
  if (fromRole && toRole) return `${fromRole} → ${toRole}`;
  if (path) return path;
  return "—";
}

const aiProviderMeta: Record<AiLlmProvider, { name: string; logo: string }> = {
  OPENROUTER: { name: "OpenRouter", logo: "OR" },
  GROQ: { name: "Groq", logo: "G" },
  GEMINI: { name: "Google Gemini", logo: "Gm" },
};

function ProviderCard({
  provider,
  canManage,
  onChanged,
}: {
  provider: OrganizationAiProvider;
  canManage: boolean;
  onChanged: (providers?: OrganizationAiProvider[]) => void;
}) {
  const meta = aiProviderMeta[provider.provider];
  const [showKey, setShowKey] = useState(false);
  const [editing, setEditing] = useState(!provider.connected);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(provider.model);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!canManage) return;
    setSaving(true);
    setError("");
    try {
      await upsertAiProvider(provider.provider, {
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        model: model.trim() || provider.model,
      });
      setApiKey("");
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save provider.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setError("");
    try {
      await testAiProvider(provider.provider);
      setTestResult("ok");
      onChanged();
    } catch (err) {
      setTestResult("fail");
      setError(err instanceof Error ? err.message : "Test failed.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={`bg-card border rounded-xl p-5 ${provider.isDefault ? "border-brand/30" : "border-border"}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center text-base font-bold text-foreground/80">
            {meta.logo}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{meta.name}</span>
              {provider.isDefault ? (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-brand-soft text-brand border border-brand/20">Default</span>
              ) : null}
            </div>
            <span className={`text-[10px] flex items-center gap-1 mt-0.5 ${provider.connected ? "text-signal" : "text-muted-foreground"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${provider.connected ? "bg-emerald-400" : "bg-slate-600"}`} />
              {provider.connected ? "Connected" : "Not connected"}
            </span>
          </div>
        </div>
        {testResult ? (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${testResult === "ok" ? "bg-signal-soft text-signal border-signal/20" : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"}`}>
            {testResult === "ok" ? "Key readable" : "Failed"}
          </span>
        ) : null}
      </div>

      {error ? <div className="text-xs text-red-700 mb-3">{error}</div> : null}

      {provider.connected && !editing ? (
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Selected model</span>
            <span className="font-mono text-foreground/80">{provider.model}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">API key</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-muted-foreground">
                {showKey ? provider.keyMasked : "••••••••••••"}
              </span>
              <button type="button" onClick={() => setShowKey(!showKey)} className="text-muted-foreground hover:text-foreground/80">
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">API key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider.connected ? "Leave blank to keep the current key" : "Paste API key"}
              className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Model</label>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground font-mono"
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {editing ? (
          <>
            <Button
              size="sm"
              disabled={saving || !canManage || (!provider.connected && apiKey.trim().length < 16)}
              onClick={() => void handleSave()}
              className="bg-brand text-brand-foreground hover:bg-brand/90 font-semibold text-xs"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
            {provider.connected ? (
              <Button
                size="sm"
                variant="outline"
                className="border-border text-muted-foreground bg-transparent text-xs"
                onClick={() => {
                  setEditing(false);
                  setApiKey("");
                  setModel(provider.model);
                }}
              >
                Cancel
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              className="border-border text-muted-foreground hover:text-foreground hover:bg-muted bg-transparent text-xs"
              onClick={() => void handleTest()}
              disabled={testing || !provider.connected || !canManage}
            >
              {testing ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : null}
              {testing ? "Testing..." : "Test connection"}
            </Button>
            {!provider.isDefault && provider.connected ? (
              <Button
                size="sm"
                variant="outline"
                className="border-border text-muted-foreground hover:text-foreground hover:bg-muted bg-transparent text-xs"
                disabled={!canManage}
                onClick={() => {
                  void setDefaultAiProvider(provider.provider)
                    .then((res) => onChanged(res.data.providers))
                    .catch((err) => setError(err instanceof Error ? err.message : "Couldn't set default."));
                }}
              >
                Make default
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              className="border-border text-muted-foreground hover:text-foreground hover:bg-muted bg-transparent text-xs ml-auto"
              disabled={!canManage}
              onClick={() => setEditing(true)}
            >
              {provider.connected ? "Edit key" : "Connect"}
            </Button>
            {provider.connected ? (
              <Button
                size="sm"
                variant="outline"
                className="border-red-400/30 text-red-700 bg-transparent text-xs"
                disabled={!canManage}
                onClick={() => {
                  void deleteAiProvider(provider.provider)
                    .then(() => onChanged())
                    .catch((err) => setError(err instanceof Error ? err.message : "Couldn't disconnect."));
                }}
              >
                Disconnect
              </Button>
            ) : null}
          </>
        )}
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

function OrganizationSection({
  onUpdated,
}: {
  onUpdated?: (organization: CurrentOrganization) => void;
}) {
  const router = useRouter();
  const [org, setOrg] = useState<CurrentOrganization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [showTransfer, setShowTransfer] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const canUpdate = org?.role === "OWNER" || org?.role === "ADMIN";
  const canDanger = org?.role === "OWNER";
  const dirty = org ? name.trim() !== org.name || slug.trim() !== org.slug : false;

  const applyOrganization = (next: CurrentOrganization) => {
    setOrg(next);
    setName(next.name);
    setSlug(next.slug);
    saveOrganization(next);
    onUpdated?.(next);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [orgRes, membersRes] = await Promise.all([
          getCurrentOrganization(),
          getOrganizationMembers().catch(() => null),
        ]);
        if (cancelled) return;
        applyOrganization(orgRes.data.organization);
        if (membersRes) setMembers(membersRes.data.members);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof RateLimitError
            ? `Rate limited, retry in ${err.retryAfterSeconds}s.`
            : err instanceof Error
              ? err.message
              : "Couldn't load organization details.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Load once on mount; parent callback is only used after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!org || !canUpdate) return;
    setSaving(true);
    setSaveError("");
    setSaveMessage("");
    try {
      const res = await updateOrganization({
        name: name.trim(),
        slug: slug.trim(),
      });
      applyOrganization(res.data.organization);
      setSaveMessage("Workspace details saved.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save workspace.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="py-16 text-center">
        <AlertCircle className="w-8 h-8 text-red-700 mx-auto mb-3" />
        <div className="text-sm text-red-700">{error || "No organization found."}</div>
      </div>
    );
  }

  const transferCandidates = members.filter((member) => member.role !== "OWNER");

  return (
    <div className="max-w-xl space-y-5">
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Organization name</label>
          {canUpdate ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground"
            />
          ) : (
            <div className="text-sm text-foreground font-medium">{org.name}</div>
          )}
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Workspace URL</label>
          {canUpdate ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono shrink-0">app.resolveai.io/</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground font-mono"
              />
            </div>
          ) : (
            <div className="text-sm text-foreground/80 font-mono">app.resolveai.io/{org.slug}</div>
          )}
        </div>
        <div className="flex gap-8">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Plan</div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-soft text-brand border border-brand/20">{org.plan}</span>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Your role</div>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${roleColors[org.role ?? ""] ?? roleColors.VIEWER}`}>
              {roleLabel(org.role ?? "VIEWER")}
            </span>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Created</div>
            <div className="text-sm text-foreground/80">{formatRelativeTime(org.createdAt)}</div>
          </div>
        </div>
        {canUpdate ? (
          <div className="flex items-center justify-between pt-1">
            <div className="text-xs">
              {saveError ? <span className="text-red-700">{saveError}</span> : null}
              {!saveError && saveMessage ? <span className="text-signal">{saveMessage}</span> : null}
            </div>
            <Button
              type="button"
              size="sm"
              disabled={saving || !dirty || name.trim().length < 2 || slug.trim().length < 2}
              onClick={() => void handleSave()}
              className="bg-brand text-brand-foreground hover:bg-brand/90 font-semibold"
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Only owners and admins can rename this workspace.</p>
        )}
      </div>

      <div className={`border border-red-200 rounded-xl p-4 mt-8 ${canDanger ? "" : "opacity-60"}`}>
        <div className="text-sm font-semibold text-red-700 mb-3">Danger zone</div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-foreground/80">Transfer ownership</div>
              <div className="text-xs text-muted-foreground">Transfer this workspace to another member. You will become an admin.</div>
            </div>
            <Button
              disabled={!canDanger}
              variant="outline"
              size="sm"
              className="border-red-400/30 text-red-700 bg-transparent text-xs"
              onClick={() => setShowTransfer(true)}
            >
              Transfer
            </Button>
          </div>
          <div className="border-t border-border pt-3 flex items-center justify-between">
            <div>
              <div className="text-sm text-foreground/80">Delete workspace</div>
              <div className="text-xs text-muted-foreground">Permanently delete this workspace and all data</div>
            </div>
            <Button
              disabled={!canDanger}
              variant="outline"
              size="sm"
              className="border-red-400/30 text-red-700 bg-transparent text-xs"
              onClick={() => setShowDelete(true)}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>

      {showTransfer && canDanger ? (
        <TransferOwnershipModal
          members={transferCandidates}
          onClose={() => setShowTransfer(false)}
          onTransferred={(next) => {
            applyOrganization(next);
            setShowTransfer(false);
            void getOrganizationMembers()
              .then((res) => setMembers(res.data.members))
              .catch(() => undefined);
          }}
        />
      ) : null}

      {showDelete && canDanger ? (
        <DeleteWorkspaceModal
          organizationName={org.name}
          onClose={() => setShowDelete(false)}
          onDeleted={() => {
            clearSession();
            router.replace("/login");
          }}
        />
      ) : null}
    </div>
  );
}

function TransferOwnershipModal({
  members,
  onClose,
  onTransferred,
}: {
  members: Member[];
  onClose: () => void;
  onTransferred: (organization: CurrentOrganization) => void;
}) {
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!memberId) {
      setError("Select a member to transfer ownership to.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await transferOrganization(memberId);
      onTransferred(res.data.organization);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't transfer ownership.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold text-foreground">Transfer ownership</div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground/80">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          The selected member becomes the owner. You will keep access as an admin.
        </p>
        {error ? <div className="text-sm text-red-700">{error}</div> : null}
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Invite another member before transferring ownership.</p>
        ) : (
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">New owner</label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground"
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.user.name} ({member.user.email}) — {roleLabel(member.role)}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="border-border text-foreground/80 bg-transparent">
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={submitting || members.length === 0}
            onClick={() => void handleSubmit()}
            className="bg-red-500 text-foreground hover:bg-red-400 font-semibold"
          >
            {submitting ? "Transferring..." : "Transfer ownership"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DeleteWorkspaceModal({
  organizationName,
  onClose,
  onDeleted,
}: {
  organizationName: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirmName, setConfirmName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await deleteOrganization(confirmName);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete workspace.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold text-red-700">Delete workspace</div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground/80">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          This permanently deletes knowledge, chats, integrations, and members. Type{" "}
          <span className="text-foreground font-medium">{organizationName}</span> to confirm.
        </p>
        {error ? <div className="text-sm text-red-700">{error}</div> : null}
        <input
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          placeholder={organizationName}
          className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="border-border text-foreground/80 bg-transparent">
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={submitting || confirmName !== organizationName}
            onClick={() => void handleSubmit()}
            className="bg-red-500 text-foreground hover:bg-red-400 font-semibold"
          >
            {submitting ? "Deleting..." : "Delete workspace"}
          </Button>
        </div>
      </div>
    </div>
  );
}

type InviteRole = "ADMIN" | "SUPPORT_AGENT" | "DEVELOPER" | "VIEWER";

function InviteMemberModal({
  actorRole,
  onClose,
  onCreated,
}: {
  actorRole: string;
  onClose: () => void;
  onCreated: (invite: OrganizationInvite, inviteUrl: string | null) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("VIEWER");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const roles: InviteRole[] =
    actorRole === "OWNER"
      ? ["ADMIN", "SUPPORT_AGENT", "DEVELOPER", "VIEWER"]
      : ["SUPPORT_AGENT", "DEVELOPER", "VIEWER"];

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await createOrganizationInvite({
        email: email.trim(),
        role,
      });
      onCreated(res.data.invite, res.data.inviteUrl);
      onClose();
    } catch (err) {
      setError(
        err instanceof RateLimitError
          ? `Rate limited, retry in ${err.retryAfterSeconds}s.`
          : err instanceof Error ? err.message : "Couldn't send invite.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold text-foreground">Invite member</div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground/80">
            <X className="w-4 h-4" />
          </button>
        </div>
        {error ? <div className="text-sm text-red-700">{error}</div> : null}
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Work email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@company.com"
            className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as InviteRole)}
            className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground"
          >
            {roles.map((r) => (
              <option key={r} value={r}>{roleLabel(r)}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="border-border text-foreground/80 bg-transparent">
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={submitting}
            onClick={() => void handleSubmit()}
            className="bg-brand text-brand-foreground hover:bg-brand/90 font-semibold"
          >
            {submitting ? "Sending..." : "Send invite"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MembersSection() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [orgRole, setOrgRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [devInviteUrl, setDevInviteUrl] = useState("");
  const [inviteActionId, setInviteActionId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [memberActionId, setMemberActionId] = useState<string | null>(null);

  const canManage = orgRole === "OWNER" || orgRole === "ADMIN";
  const assignableRoles: InviteRole[] =
    orgRole === "OWNER"
      ? ["ADMIN", "SUPPORT_AGENT", "DEVELOPER", "VIEWER"]
      : ["SUPPORT_AGENT", "DEVELOPER", "VIEWER"];

  const canManageMember = (member: Member) => {
    if (!canManage) return false;
    if (member.user.id === currentUserId) return false;
    if (member.role === "OWNER") return false;
    if (orgRole === "ADMIN" && member.role === "ADMIN") return false;
    return true;
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [membersRes, orgRes, meRes] = await Promise.all([
        getOrganizationMembers(),
        getCurrentOrganization(),
        getCurrentUser(),
      ]);
      setMembers(membersRes.data.members);
      setOrgRole(orgRes.data.organization.role ?? null);
      setCurrentUserId(meRes.data.user.id);

      const role = orgRes.data.organization.role;
      if (role === "OWNER" || role === "ADMIN") {
        try {
          const invitesRes = await listOrganizationInvites();
          setInvites(invitesRes.data.invites);
        } catch {
          setInvites([]);
        }
      } else {
        setInvites([]);
      }
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

  const handleResend = async (inviteId: string) => {
    setInviteActionId(inviteId);
    try {
      const res = await resendOrganizationInvite(inviteId);
      if (canShowDevAuthLinks() && res.data.inviteUrl) setDevInviteUrl(res.data.inviteUrl);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't resend invite.");
    } finally {
      setInviteActionId(null);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    setInviteActionId(inviteId);
    try {
      await revokeOrganizationInvite(inviteId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't revoke invite.");
    } finally {
      setInviteActionId(null);
    }
  };

  const handleRoleChange = async (member: Member, role: InviteRole) => {
    setMemberActionId(member.id);
    setError("");
    try {
      await updateOrganizationMember(member.id, role);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update role.");
    } finally {
      setMemberActionId(null);
    }
  };

  const handleRemoveMember = async (member: Member) => {
    if (!window.confirm(`Remove ${member.user.name} from this workspace?`)) {
      return;
    }
    setMemberActionId(member.id);
    setError("");
    try {
      await removeOrganizationMember(member.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove member.");
    } finally {
      setMemberActionId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{loading ? "Loading…" : `${members.length} members`}</div>
        <Button
          disabled={!canManage}
          title={canManage ? undefined : "Only owners and admins can invite members."}
          size="sm"
          className="bg-brand text-brand-foreground hover:bg-brand/90 font-semibold text-xs disabled:bg-brand/40 disabled:text-brand-foreground/70 disabled:cursor-not-allowed"
          onClick={() => setShowInvite(true)}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Invite member
        </Button>
      </div>

      {devInviteUrl ? (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-800 break-all">
          Development invite link: {devInviteUrl}
        </div>
      ) : null}

      {showInvite && orgRole ? (
        <InviteMemberModal
          actorRole={orgRole}
          onClose={() => setShowInvite(false)}
          onCreated={(_invite, inviteUrl) => {
            if (canShowDevAuthLinks() && inviteUrl) setDevInviteUrl(inviteUrl);
            void load();
          }}
        />
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      ) : error ? (
        <div className="py-16 text-center">
          <AlertCircle className="w-8 h-8 text-red-700 mx-auto mb-3" />
          <div className="text-sm text-red-700 mb-3">{error}</div>
          <Button size="sm" className="bg-brand-soft text-brand hover:bg-brand-soft text-xs" onClick={load}>
            Retry
          </Button>
        </div>
      ) : (
        <>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Member", "Role", "Joined", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map(m => (
                <tr key={m.id} className="hover:bg-card transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-foreground/80 flex-shrink-0">
                        {m.user.name[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{m.user.name}</div>
                        <div className="text-xs text-muted-foreground">{m.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {canManageMember(m) ? (
                      <select
                        value={m.role}
                        disabled={memberActionId === m.id}
                        onChange={(e) => void handleRoleChange(m, e.target.value as InviteRole)}
                        className="bg-card border border-border rounded-lg px-2 py-1 text-xs text-foreground"
                      >
                        {assignableRoles.map((role) => (
                          <option key={role} value={role}>{roleLabel(role)}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${roleColors[m.role] ?? roleColors.VIEWER}`}>{roleLabel(m.role)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatRelativeTime(m.joinedAt)}</td>
                  <td className="px-4 py-3">
                    {canManageMember(m) ? (
                      <button
                        type="button"
                        title="Remove member"
                        disabled={memberActionId === m.id}
                        onClick={() => void handleRemoveMember(m)}
                        className="text-muted-foreground hover:text-red-700 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-muted-foreground">
                        <MoreHorizontal className="w-4 h-4" />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {canManage ? (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border text-sm font-semibold text-foreground">
              Pending invites
            </div>
            {invites.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">No pending invitations.</p>
            ) : (
              <div className="divide-y divide-border">
                {invites.map((invite) => (
                  <div key={invite.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-foreground">{invite.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {roleLabel(invite.role)} · expires {formatRelativeTime(invite.expiresAt)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={inviteActionId !== null}
                        onClick={() => void handleResend(invite.id)}
                        className="border-border text-foreground/80 bg-transparent text-xs"
                      >
                        {inviteActionId === invite.id ? "Working..." : "Resend"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={inviteActionId !== null}
                        onClick={() => void handleRevoke(invite.id)}
                        className="border-red-400/30 text-red-700 bg-transparent text-xs"
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
        </>
      )}
    </div>
  );
}

function ProvidersSection() {
  const [providers, setProviders] = useState<OrganizationAiProvider[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canManage = role === "OWNER" || role === "ADMIN" || role === "DEVELOPER";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [providersRes, orgRes] = await Promise.all([
        listAiProviders(),
        getCurrentOrganization(),
      ]);
      setProviders(providersRes.data.providers);
      setRole(orgRes.data.organization.role ?? null);
    } catch (err) {
      setError(
        err instanceof RateLimitError
          ? `Rate limited, retry in ${err.retryAfterSeconds}s.`
          : err instanceof Error
            ? err.message
            : "Couldn't load AI providers.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <AlertCircle className="w-8 h-8 text-red-700 mx-auto mb-3" />
        <div className="text-sm text-red-700 mb-3">{error}</div>
        <Button size="sm" className="bg-brand-soft text-brand hover:bg-brand-soft text-xs" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        Store encrypted workspace API keys. Keys are masked after saving and never returned in full.
        Chat still uses the platform AI service; these keys are kept for this workspace.
      </p>
      {!canManage ? (
        <p className="text-xs text-muted-foreground">Only owners, admins, and developers can change provider keys.</p>
      ) : null}
      {providers.map((provider) => (
        <ProviderCard
          key={provider.provider}
          provider={provider}
          canManage={canManage}
          onChanged={(next) => {
            if (next) setProviders(next);
            else void load();
          }}
        />
      ))}
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
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold text-foreground">Add integration</div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground/80">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Provider</label>
          <select
            value={provider}
            onChange={e => setProvider(e.target.value as IntegrationProvider)}
            className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-brand transition-colors"
          >
            {(Object.keys(providerMeta) as IntegrationProvider[]).map(p => (
              <option key={p} value={p}>{providerMeta[p].label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. #incidents alerts"
            className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Webhook URL</label>
          <input
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.example.com/..."
            className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-brand transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Secret header name <span className="text-muted-foreground">(optional)</span></label>
            <input
              value={secretHeaderName}
              onChange={e => setSecretHeaderName(e.target.value)}
              placeholder="X-Signature"
              className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Secret header value <span className="text-muted-foreground">(optional)</span></label>
            <input
              value={secretHeaderValue}
              onChange={e => setSecretHeaderValue(e.target.value)}
              type="password"
              placeholder="••••••••"
              className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand transition-colors"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-brand hover:bg-brand/90 text-brand-foreground font-semibold text-sm disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Add integration"}
          </Button>
          <Button onClick={onClose} disabled={submitting} variant="outline" className="border-border text-muted-foreground hover:text-foreground hover:bg-muted bg-transparent">
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
    <div className={`bg-card border rounded-xl p-4 flex items-start gap-4 ${active ? "border-signal/20" : "border-border"}`}>
      <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-sm font-medium text-foreground">{integration.name}</span>
          <span className="text-[10px] text-muted-foreground bg-muted0/10 px-1.5 py-0.5 rounded-full border border-slate-500/20">{meta?.label ?? integration.provider}</span>
          {active ? (
            <span className="text-[10px] text-signal bg-signal-soft px-1.5 py-0.5 rounded-full border border-signal/20">Active</span>
          ) : (
            <span className="text-[10px] text-muted-foreground bg-muted0/10 px-1.5 py-0.5 rounded-full border border-slate-500/20">Disabled</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{meta?.description}</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {integration.lastUsedAt ? `Last used ${formatRelativeTime(integration.lastUsedAt)}` : "Never used"} · added {formatRelativeTime(integration.createdAt)}
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          className="border-border text-muted-foreground hover:text-foreground hover:bg-muted bg-transparent text-xs disabled:opacity-50"
          onClick={async () => { setBusy(true); await onToggle(integration); setBusy(false); }}
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : active ? "Disable" : "Enable"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          className="border-red-400/30 text-red-700 hover:bg-red-50 bg-transparent text-xs disabled:opacity-50"
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
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="text-base font-semibold text-foreground">Delete integration?</div>
            <p className="text-sm text-muted-foreground">This will permanently remove <span className="text-foreground font-medium">{pendingDelete.name}</span>. This can&apos;t be undone.</p>
            <div className="flex gap-3">
              <Button onClick={handleConfirmDelete} disabled={deleting} className="flex-1 bg-red-500 hover:bg-red-400 text-foreground font-semibold text-sm disabled:opacity-50">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Delete"}
              </Button>
              <Button onClick={() => setPendingDelete(null)} disabled={deleting} variant="outline" className="border-border text-muted-foreground hover:text-foreground hover:bg-muted bg-transparent">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-muted-foreground">Connect external tools to enable AI-assisted actions and notifications.</p>
        <Button size="sm" onClick={() => setShowAdd(true)} className="bg-brand text-brand-foreground hover:bg-brand/90 font-semibold text-xs flex-shrink-0 ml-3">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      ) : error ? (
        <div className="py-16 text-center">
          <AlertCircle className="w-8 h-8 text-red-700 mx-auto mb-3" />
          <div className="text-sm text-red-700 mb-3">{error}</div>
          <Button size="sm" className="bg-brand-soft text-brand hover:bg-brand-soft text-xs" onClick={load}>
            Retry
          </Button>
        </div>
      ) : integrations.length === 0 ? (
        <EmptyState
          variant="inbox"
          title="No integrations yet"
          description="Connect Slack, GitHub, or email when you're ready."
        />
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

function PlanPicker({
  currentPlan,
  plans,
}: {
  currentPlan: string;
  plans: OrganizationPlan[];
  onChanged?: () => void;
}) {
  const freePlan = plans.find((plan) => plan.id === "FREE") ?? plans[0];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        ResolveAI is free for every workspace. Limits below apply to AI chat
        usage so the platform stays sustainable.
      </p>
      {freePlan ? (
        <div className="bg-card border border-brand/30 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {freePlan.label}
                </span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-brand-soft text-brand border border-brand/20">
                  {currentPlan === freePlan.id ? "Current" : currentPlan}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {freePlan.description}
              </p>
              <p className="text-[11px] text-muted-foreground mt-2 font-mono">
                {freePlan.dailyRequestLimit.toLocaleString()} req/day ·{" "}
                {freePlan.dailyTokenLimit.toLocaleString()} tok/day ·{" "}
                {freePlan.monthlyTokenLimit.toLocaleString()} tok/mo
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-semibold text-foreground">Free</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function UsageSection() {
  const [summary, setSummary] = useState<AiUsageSummary | null>(null);
  const [events, setEvents] = useState<AiUsageEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryRes, eventsRes] = await Promise.all([
        getAiUsageSummary(),
        listAiUsageEvents(10),
      ]);
      setSummary(summaryRes.data);
      setEvents(eventsRes.data.events);
    } catch (err) {
      setError(
        err instanceof RateLimitError
          ? `Rate limited, retry in ${err.retryAfterSeconds}s.`
          : "Couldn't load usage data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="py-16 text-center">
        <AlertCircle className="w-8 h-8 text-red-700 mx-auto mb-3" />
        <div className="text-sm text-red-700 mb-3">{error || "Something went wrong."}</div>
        <Button size="sm" className="bg-brand-soft text-brand hover:bg-brand-soft text-xs" onClick={load}>
          Retry
        </Button>
      </div>
    );
  }

  const dailyRequestPct = summary.daily.limits.requestLimit > 0
    ? Math.min(100, (summary.daily.requestCount / summary.daily.limits.requestLimit) * 100)
    : 0;
  const dailyTokenPct = summary.daily.limits.tokenLimit > 0
    ? Math.min(100, (summary.daily.totalTokens / summary.daily.limits.tokenLimit) * 100)
    : 0;
  const monthlyTokenPct = summary.monthly.limits.tokenLimit > 0
    ? Math.min(100, (summary.monthly.totalTokens / summary.monthly.limits.tokenLimit) * 100)
    : 0;

  const barColor = (pct: number) => pct >= 90 ? "bg-red-400" : pct >= 70 ? "bg-yellow-400" : "bg-brand";

  return (
    <div className="max-w-lg space-y-4">
      <PlanPicker
        currentPlan={summary.plan}
        plans={summary.availablePlans}
        onChanged={() => void load()}
      />

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">Today</div>
          <div className="text-xs text-muted-foreground font-mono">${summary.daily.estimatedCostUsd.toFixed(4)} est.</div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Requests</span>
            <span className="font-mono text-foreground/80">
              {summary.daily.requestCount} / {summary.daily.limits.requestLimit}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div className={`h-1.5 rounded-full ${barColor(dailyRequestPct)}`} style={{ width: `${dailyRequestPct}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Tokens</span>
            <span className="font-mono text-foreground/80">
              {summary.daily.totalTokens.toLocaleString()} / {summary.daily.limits.tokenLimit.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div className={`h-1.5 rounded-full ${barColor(dailyTokenPct)}`} style={{ width: `${dailyTokenPct}%` }} />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">This month</div>
          <div className="text-xs text-muted-foreground font-mono">${summary.monthly.estimatedCostUsd.toFixed(4)} est.</div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div>Requests <div className="font-mono text-foreground text-sm">{summary.monthly.requestCount}</div></div>
          <div>Prompt tokens <div className="font-mono text-foreground text-sm">{summary.monthly.promptTokens.toLocaleString()}</div></div>
          <div>Completion tokens <div className="font-mono text-foreground text-sm">{summary.monthly.completionTokens.toLocaleString()}</div></div>
          <div>Total tokens <div className="font-mono text-foreground text-sm">{summary.monthly.totalTokens.toLocaleString()}</div></div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Monthly token limit</span>
            <span className="font-mono text-foreground/80">{monthlyTokenPct.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div className={`h-1.5 rounded-full ${barColor(monthlyTokenPct)}`} style={{ width: `${monthlyTokenPct}%` }} />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-sm font-semibold text-foreground">
          Recent AI calls
        </div>
        {events.length === 0 ? (
          <EmptyState
            compact
            variant="analytics"
            title="No AI usage yet"
            description="Token and call history appears after your first agent runs."
          />
        ) : (
          <div className="divide-y divide-border">
            {events.map((e) => (
              <div key={e.id} className="px-4 py-2.5 flex items-center justify-between text-xs">
                <div className="min-w-0">
                  <div className="text-foreground/80 font-mono">{e.operation}</div>
                  <div className="text-muted-foreground">{e.provider}/{e.model}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-muted-foreground font-mono">{e.totalTokens.toLocaleString()} tok</div>
                  <div className="text-muted-foreground">{formatRelativeTime(e.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AuditSection() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listAuditLogs(50);
      setLogs(res.data.logs);
    } catch (err) {
      setError(
        err instanceof RateLimitError
          ? `Rate limited, retry in ${err.retryAfterSeconds}s.`
          : err instanceof Error
            ? err.message
            : "Couldn't load audit logs.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">A complete log of actions taken in this workspace.</p>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <AlertCircle className="w-8 h-8 text-red-700 mx-auto mb-3" />
            <div className="text-sm text-red-700 mb-3">{error}</div>
            <Button size="sm" className="bg-brand-soft text-brand hover:bg-brand-soft text-xs" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            variant="inbox"
            title="No audit events yet"
            description="Workspace actions will show up here for accountability."
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Actor", "Action", "Detail", "Timestamp", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => {
                const actor = log.user?.name || "System";
                return (
                  <Fragment key={log.id}>
                    <tr className="hover:bg-card transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-semibold text-foreground/80 flex-shrink-0">
                            {actor[0]}
                          </div>
                          <span className="text-xs text-foreground/80">{actor}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatAuditAction(log.action)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{auditDetail(log)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatRelativeTime(log.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                          className="text-[10px] text-brand hover:text-brand transition-colors"
                        >
                          {expandedId === log.id ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                    {expandedId === log.id ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-3 bg-card">
                          <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap break-all">
                            {JSON.stringify(log.metadata || {}, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SecuritySection() {
  const router = useRouter();
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState("");
  const [sessionActionId, setSessionActionId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError("");
    try {
      const res = await listSessions();
      setSessions(res.data.sessions);
    } catch (err) {
      setSessionsError(
        err instanceof Error ? err.message : "Couldn't load sessions.",
      );
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((res) => {
        if (!cancelled) {
          setEmailVerified(Boolean(res.data.user.emailVerified));
        }
      })
      .catch(() => {
        if (!cancelled) setEmailVerified(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage("");
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      saveTokens(res.data.tokens);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password changed. Other devices have been signed out.");
      await loadSessions();
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Could not change password.",
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleRevokeSession = async (session: AuthSession) => {
    setSessionActionId(session.id);
    setSessionsError("");
    try {
      await revokeSession(session.id);
      if (session.current) {
        clearSession();
        router.push("/login");
        return;
      }
      await loadSessions();
    } catch (err) {
      setSessionsError(
        err instanceof Error ? err.message : "Could not revoke session.",
      );
    } finally {
      setSessionActionId(null);
    }
  };

  const handleRevokeOthers = async () => {
    setSessionActionId("others");
    setSessionsError("");
    try {
      await revokeOtherSessions();
      await loadSessions();
    } catch (err) {
      setSessionsError(
        err instanceof Error ? err.message : "Could not revoke other sessions.",
      );
    } finally {
      setSessionActionId(null);
    }
  };

  return (
    <div className="max-w-xl space-y-5">
      {emailVerified === false ? <ResendVerificationButton /> : null}

      <form
        onSubmit={(e) => void handleChangePassword(e)}
        className="bg-card border border-border rounded-xl p-4 space-y-3"
      >
        <div className="text-sm font-semibold text-foreground">Change password</div>
        {passwordError ? (
          <div className="text-sm text-red-700">{passwordError}</div>
        ) : null}
        {passwordMessage ? (
          <div className="text-sm text-signal">{passwordMessage}</div>
        ) : null}
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Current password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">New password</label>
          <input
            type={showPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground"
            required
            minLength={8}
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Confirm new password</label>
          <input
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground"
            required
            minLength={8}
          />
        </div>
        <Button
          type="submit"
          disabled={passwordLoading}
          className="bg-brand text-brand-foreground hover:bg-brand/90 font-semibold text-xs"
        >
          {passwordLoading ? "Saving..." : "Update password"}
        </Button>
      </form>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-foreground">Active sessions</div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={sessionActionId !== null || sessions.filter((s) => !s.current).length === 0}
            onClick={() => void handleRevokeOthers()}
            className="border-border text-foreground/80 bg-transparent text-xs"
          >
            {sessionActionId === "others" ? "Revoking..." : "Revoke other sessions"}
          </Button>
        </div>
        {sessionsError ? <div className="text-sm text-red-700">{sessionsError}</div> : null}
        {sessionsLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active sessions.</p>
        ) : (
          <div className="divide-y divide-border">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between py-3 gap-3">
                <div>
                  <div className="text-sm text-foreground">
                    {session.current ? "This device" : "Another device"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Started {formatRelativeTime(session.createdAt)} · expires {formatRelativeTime(session.expiresAt)}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={sessionActionId !== null}
                  onClick={() => void handleRevokeSession(session)}
                  className="border-red-400/30 text-red-700 bg-transparent text-xs"
                >
                  {sessionActionId === session.id ? "Revoking..." : "Revoke"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <NotWiredBanner>
        The toggles below are still demo-only. Role-based access control itself is enforced server-side.
      </NotWiredBanner>
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="text-sm font-semibold text-foreground mb-3">Workspace access</div>
        <div className="space-y-3 text-sm">
          {[
            { label: "Role-based access control", enabled: true },
            { label: "Enforce SSO for all members", enabled: false },
            { label: "Require MFA for all members", enabled: true },
            { label: "Session timeout after inactivity", enabled: true, value: "8 hours" },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-muted-foreground">{item.label}</span>
              <div className="flex items-center gap-2">
                {item.value && <span className="text-xs text-muted-foreground">{item.value}</span>}
                <div className={`w-8 h-4 rounded-full transition-colors cursor-default ${item.enabled ? "bg-brand" : "bg-muted-foreground/40"}`}>
                  <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform m-0.5 ${item.enabled ? "translate-x-4" : "translate-x-0"}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <NotWiredBanner>
        AI approval policy toggles below are preview-only. Tool approvals themselves are enforced server-side.
      </NotWiredBanner>
      <div className="bg-card border border-border rounded-xl p-4 opacity-80">
        <div className="text-sm font-semibold text-foreground mb-3">AI & approval controls</div>
        <div className="space-y-3 text-sm">
          {[
            { label: "Require approval for high-risk AI actions", enabled: true },
            { label: "Require approval for medium-risk AI actions", enabled: false },
            { label: "Log all AI-generated responses", enabled: true },
            { label: "Mask provider API keys in all logs", enabled: true },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-muted-foreground">{item.label}</span>
              <div className={`w-8 h-4 rounded-full transition-colors cursor-default ${item.enabled ? "bg-brand" : "bg-muted-foreground/40"}`}>
                <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform m-0.5 ${item.enabled ? "translate-x-4" : "translate-x-0"}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotificationsSection() {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listNotificationPreferences();
      setPreferences(res.data.preferences);
    } catch (err) {
      setError(
        err instanceof RateLimitError
          ? `Rate limited, retry in ${err.retryAfterSeconds}s.`
          : err instanceof Error
            ? err.message
            : "Couldn't load notification preferences.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (eventKey: string, channel: "emailEnabled" | "slackEnabled") => {
    setPreferences((current) =>
      current.map((item) =>
        item.eventKey === eventKey ? { ...item, [channel]: !item[channel] } : item,
      ),
    );
    setMessage("");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await updateNotificationPreferences(
        preferences.map((item) => ({
          eventKey: item.eventKey,
          emailEnabled: item.emailEnabled,
          slackEnabled: item.slackEnabled,
        })),
      );
      setPreferences(res.data.preferences);
      setMessage("Preferences saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save preferences.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (error && preferences.length === 0) {
    return (
      <div className="py-16 text-center">
        <AlertCircle className="w-8 h-8 text-red-700 mx-auto mb-3" />
        <div className="text-sm text-red-700 mb-3">{error}</div>
        <Button size="sm" className="bg-brand-soft text-brand hover:bg-brand-soft text-xs" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <p className="text-sm text-muted-foreground">Choose how you want to be notified for workspace events.</p>
      {error ? <div className="text-sm text-red-700 mt-3">{error}</div> : null}
      <div className="mt-4 space-y-3">
        {preferences.map((item) => (
          <div key={item.eventKey} className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <div className="flex gap-3">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.emailEnabled}
                  onChange={() => toggle(item.eventKey, "emailEnabled")}
                  className="accent-[var(--brand)] w-3.5 h-3.5 rounded"
                />
                Email
              </label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.slackEnabled}
                  onChange={() => toggle(item.eventKey, "slackEnabled")}
                  className="accent-[var(--brand)] w-3.5 h-3.5 rounded"
                />
                Slack
              </label>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-4">
        <span className="text-xs text-signal">{message}</span>
        <Button
          size="sm"
          disabled={saving}
          onClick={() => void handleSave()}
          className="bg-brand text-brand-foreground hover:bg-brand/90 font-semibold"
        >
          {saving ? "Saving..." : "Save preferences"}
        </Button>
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
    organization: <OrganizationSection onUpdated={(organization) => setOrgName(organization.name)} />,
    members: <MembersSection />,
    providers: <ProvidersSection />,
    integrations: <IntegrationsSection />,
    notifications: <NotificationsSection />,
    billing: <UsageSection />,
    security: <SecuritySection />,
    audit: <AuditSection />,
  };

  const currentNav = navItems.find(n => n.id === section);

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* Settings sidebar */}
      <div className="w-52 xl:w-64 border-r border-border bg-card flex-shrink-0 overflow-y-auto">
        <div className="px-4 py-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <SectionMark variant="orbit" className="size-8" />
            <div>
              <h1 className="font-display text-base tracking-tight text-foreground">Settings</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{orgName ?? "Your workspace"}</p>
            </div>
          </div>
        </div>
        <nav className="p-2 space-y-0.5">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${section === id ? "bg-brand-soft text-brand border border-brand/20" : "text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent"}`}
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
          <div className="mb-6 flex items-center gap-3 border-b border-border pb-5">
            <SectionMark
              variant={
                section === "security" || section === "audit"
                  ? "shield"
                  : section === "providers"
                    ? "nodes"
                    : section === "billing"
                      ? "bars"
                      : "orbit"
              }
            />
            <h2 className="font-display text-xl tracking-tight text-foreground">{currentNav?.label}</h2>
          </div>
          {sectionContent[section]}
        </div>
      </div>
    </div>
  );
}