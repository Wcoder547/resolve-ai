export type AuditLogEntry = {
  id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export type ListAuditLogsResponse = {
  success: boolean;
  data: {
    logs: AuditLogEntry[];
  };
};
