"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  MessageSquare,
  CheckCircle,
  Clock,
  User,
  X,
  Plus,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "../ui/button";
import { EmptyState, SectionMark } from "../ui/EmptyState";
import { createTicket, listTickets, updateTicket } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import type { Ticket, TicketPriority, TicketStatus } from "@/types/tickets";

const STATUS_TABS: TicketStatus[] = ["OPEN", "PENDING", "ESCALATED", "RESOLVED"];

const statusLabel: Record<TicketStatus, string> = {
  OPEN: "Open",
  PENDING: "Pending",
  ESCALATED: "Escalated",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const priorityLabel: Record<TicketPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

const statusBadge = (s: TicketStatus) => {
  const m: Record<TicketStatus, string> = {
    OPEN: "bg-sky-50 text-sky-700 border-sky-200",
    PENDING:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    ESCALATED:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
    RESOLVED: "bg-signal-soft text-signal border-signal/20",
    CLOSED: "bg-muted text-muted-foreground border-border",
  };
  return m[s];
};

const priorityBadge = (p: TicketPriority) => {
  const m: Record<TicketPriority, string> = {
    URGENT: "text-red-700",
    HIGH: "text-red-700",
    MEDIUM: "text-amber-700",
    LOW: "text-muted-foreground",
  };
  return m[p];
};

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function CreateTicketModal({
  open,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (input: {
    subject: string;
    description?: string;
    customerName?: string;
    customerEmail?: string;
    priority: TicketPriority;
  }) => void;
}) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");

  useEffect(() => {
    if (!open) {
      setSubject("");
      setDescription("");
      setCustomerName("");
      setCustomerEmail("");
      setPriority("MEDIUM");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">New ticket</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Create a support ticket in this workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-border focus:outline-none"
              placeholder="What needs attention?"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-border focus:outline-none"
              placeholder="Optional context"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Customer</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-border focus:outline-none"
                placeholder="Name"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Email</label>
              <input
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-border focus:outline-none"
                placeholder="optional@email.com"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-border focus:outline-none"
            >
              {(["LOW", "MEDIUM", "HIGH", "URGENT"] as TicketPriority[]).map((p) => (
                <option key={p} value={p}>
                  {priorityLabel[p]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={submitting || !subject.trim()}
            onClick={() =>
              onSubmit({
                subject: subject.trim(),
                description: description.trim() || undefined,
                customerName: customerName.trim() || undefined,
                customerEmail: customerEmail.trim() || undefined,
                priority,
              })
            }
            className="bg-brand text-brand-foreground"
          >
            {submitting ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}

function TicketDetail({
  ticket,
  updating,
  onClose,
  onStatusChange,
}: {
  ticket: Ticket;
  updating: boolean;
  onClose: () => void;
  onStatusChange: (status: TicketStatus) => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onClose}
            className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground/80 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {shortId(ticket.id)}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusBadge(ticket.status)}`}
              >
                {statusLabel[ticket.status]}
              </span>
              <span className={`text-[10px] font-semibold ${priorityBadge(ticket.priority)}`}>
                {priorityLabel[ticket.priority]}
              </span>
              {ticket.confidence ? (
                <span className="ml-auto rounded-full bg-signal-soft px-1.5 py-0.5 font-mono text-[10px] text-signal">
                  {ticket.confidence} conf.
                </span>
              ) : null}
            </div>
            <h2 className="text-base font-semibold leading-tight text-foreground">
              {ticket.subject}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{ticket.customerName || "No customer"}</span>
              {ticket.customerEmail ? (
                <>
                  <span>·</span>
                  <span>{ticket.customerEmail}</span>
                </>
              ) : null}
              <span>·</span>
              <span>{ticket.assignee?.name || "Unassigned"}</span>
              <span>·</span>
              <span>{formatRelativeTime(ticket.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <div>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Description
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
            {ticket.description || ticket.summary || "No description provided."}
          </p>
        </div>

        {ticket.summary && ticket.description && ticket.summary !== ticket.description ? (
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Summary
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
              {ticket.summary}
            </p>
          </div>
        ) : null}

        <div>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Update status
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((status) => (
              <button
                key={status}
                type="button"
                disabled={updating || ticket.status === status}
                onClick={() => onStatusChange(status)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                  ticket.status === status
                    ? statusBadge(status)
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {statusLabel[status]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [activeTab, setActiveTab] = useState<TicketStatus>("OPEN");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listTickets({ limit: 100 });
      setTickets(res.data.tickets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tickets.");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!selectedTicket) return;
    const fresh = tickets.find((t) => t.id === selectedTicket.id);
    if (fresh) setSelectedTicket(fresh);
  }, [tickets, selectedTicket?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      const tabMatch =
        activeTab === "RESOLVED"
          ? t.status === "RESOLVED" || t.status === "CLOSED"
          : t.status === activeTab;
      if (!tabMatch) return false;
      if (!q) return true;
      return (
        t.subject.toLowerCase().includes(q) ||
        (t.customerName || "").toLowerCase().includes(q) ||
        (t.customerEmail || "").toLowerCase().includes(q)
      );
    });
  }, [tickets, activeTab, search]);

  const tabCounts = useMemo(
    () =>
      Object.fromEntries(
        STATUS_TABS.map((tab) => [
          tab,
          tickets.filter((t) =>
            tab === "RESOLVED"
              ? t.status === "RESOLVED" || t.status === "CLOSED"
              : t.status === tab,
          ).length,
        ]),
      ) as Record<TicketStatus, number>,
    [tickets],
  );

  const highPriorityCount = tickets.filter(
    (t) => t.priority === "HIGH" || t.priority === "URGENT",
  ).length;

  const handleCreate = async (input: {
    subject: string;
    description?: string;
    customerName?: string;
    customerEmail?: string;
    priority: TicketPriority;
  }) => {
    setCreating(true);
    try {
      const res = await createTicket(input);
      setTickets((prev) => [res.data.ticket, ...prev]);
      setSelectedTicket(res.data.ticket);
      setCreateOpen(false);
      setActiveTab(res.data.ticket.status === "CLOSED" ? "RESOLVED" : res.data.ticket.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket.");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (status: TicketStatus) => {
    if (!selectedTicket) return;
    setUpdating(true);
    try {
      const res = await updateTicket(selectedTicket.id, { status });
      setTickets((prev) =>
        prev.map((t) => (t.id === res.data.ticket.id ? res.data.ticket : t)),
      );
      setSelectedTicket(res.data.ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update ticket.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-background">
      <div
        className={`flex flex-col border-r border-border ${
          selectedTicket ? "hidden lg:flex lg:w-[420px] xl:w-[480px]" : "flex-1"
        }`}
      >
        <div className="border-b border-border px-5 py-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 hidden sm:block">
                <SectionMark variant="orbit" />
              </div>
              <div>
                <h1 className="font-display text-xl tracking-tight text-foreground">
                  Tickets
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {tickets.length} total · {highPriorityCount} high priority
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="bg-brand text-xs font-semibold text-brand-foreground"
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> New ticket
            </Button>
          </div>

          {error ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="flex overflow-hidden rounded-xl border border-border">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground/80"
                }`}
              >
                {statusLabel[tab]}
                <span
                  className={`font-mono text-[9px] ${
                    activeTab === tab ? "text-brand" : "text-muted-foreground"
                  }`}
                >
                  {tabCounts[tab]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 border-b border-border px-4 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tickets..."
              className="w-full rounded-lg border border-border bg-card py-1.5 pl-8 pr-3 text-xs text-foreground/80 placeholder:text-muted-foreground focus:border-border focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 divide-y divide-border overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            tickets.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  variant="inbox"
                  title="No tickets yet"
                  description="Create a ticket manually, or approve a create_support_ticket tool call from Approvals."
                  action={
                    <Button
                      size="sm"
                      onClick={() => setCreateOpen(true)}
                      className="bg-brand text-brand-foreground"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> New ticket
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="p-12 text-center">
                <CheckCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">No tickets in this view</div>
              </div>
            )
          ) : (
            filtered.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => setSelectedTicket(ticket)}
                className={`w-full px-4 py-3.5 text-left transition-colors hover:bg-card ${
                  selectedTicket?.id === ticket.id
                    ? "border-r-2 border-r-brand bg-brand/5"
                    : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                      ticket.priority === "HIGH" || ticket.priority === "URGENT"
                        ? "bg-red-400"
                        : ticket.priority === "MEDIUM"
                          ? "bg-yellow-400"
                          : "bg-muted-foreground/40"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {shortId(ticket.id)}
                      </span>
                      <span
                        className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${statusBadge(ticket.status)}`}
                      >
                        {statusLabel[ticket.status]}
                      </span>
                    </div>
                    <div className="mb-1 truncate text-sm font-medium text-foreground">
                      {ticket.subject}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{ticket.customerName || "No customer"}</span>
                      {ticket.confidence ? (
                        <>
                          <span>·</span>
                          <span className="font-mono text-signal">{ticket.confidence} AI</span>
                        </>
                      ) : null}
                      <span>·</span>
                      <Clock className="h-3 w-3" />
                      <span>{formatRelativeTime(ticket.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {selectedTicket ? (
        <div className="flex-1 overflow-hidden">
          <TicketDetail
            ticket={selectedTicket}
            updating={updating}
            onClose={() => setSelectedTicket(null)}
            onStatusChange={handleStatusChange}
          />
        </div>
      ) : (
        <div className="hidden flex-1 items-center justify-center p-8 text-center lg:flex">
          <div>
            <MessageSquare className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">Select a ticket to view details</div>
          </div>
        </div>
      )}

      <CreateTicketModal
        open={createOpen}
        submitting={creating}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
