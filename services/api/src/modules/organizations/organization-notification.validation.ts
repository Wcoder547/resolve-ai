import { z } from "zod";

export const NOTIFICATION_EVENT_KEYS = [
  "approval.requested",
  "approval.resolved",
  "incident.declared",
  "incident.severity_upgraded",
  "agent_run.failed",
  "knowledge.ingestion_failed",
  "ticket.high_priority",
] as const;

export const notificationEventKeySchema = z.enum(NOTIFICATION_EVENT_KEYS);

export const updateNotificationPreferencesSchema = z.object({
  preferences: z
    .array(
      z.object({
        eventKey: notificationEventKeySchema,
        emailEnabled: z.boolean(),
        slackEnabled: z.boolean(),
      }),
    )
    .min(1)
    .max(NOTIFICATION_EVENT_KEYS.length),
});

export type NotificationEventKey = (typeof NOTIFICATION_EVENT_KEYS)[number];
export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;
