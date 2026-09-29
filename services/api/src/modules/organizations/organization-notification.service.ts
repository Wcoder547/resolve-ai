import { prisma } from "../../lib/prisma.js";
import {
  NOTIFICATION_EVENT_KEYS,
  type UpdateNotificationPreferencesInput,
} from "./organization-notification.validation.js";

const EVENT_LABELS: Record<(typeof NOTIFICATION_EVENT_KEYS)[number], string> = {
  "approval.requested": "New approval request",
  "approval.resolved": "Approval approved or rejected",
  "incident.declared": "Incident declared",
  "incident.severity_upgraded": "Incident severity upgraded",
  "agent_run.failed": "Agent run failed",
  "knowledge.ingestion_failed": "Knowledge ingestion failed",
  "ticket.high_priority": "New high-priority ticket",
};

function serializePreference(row: {
  eventKey: string;
  emailEnabled: boolean;
  slackEnabled: boolean;
}) {
  const eventKey = row.eventKey as (typeof NOTIFICATION_EVENT_KEYS)[number];
  return {
    eventKey,
    label: EVENT_LABELS[eventKey] || row.eventKey,
    emailEnabled: row.emailEnabled,
    slackEnabled: row.slackEnabled,
  };
}

export async function listNotificationPreferences(
  userId: string,
  organizationId: string,
) {
  const existing = await prisma.userNotificationPreference.findMany({
    where: { userId, organizationId },
  });

  const byKey = new Map(existing.map((row) => [row.eventKey, row]));
  const missing = NOTIFICATION_EVENT_KEYS.filter((key) => !byKey.has(key));

  if (missing.length > 0) {
    await prisma.userNotificationPreference.createMany({
      data: missing.map((eventKey) => ({
        userId,
        organizationId,
        eventKey,
        emailEnabled: true,
        slackEnabled: false,
      })),
      skipDuplicates: true,
    });
  }

  const rows = await prisma.userNotificationPreference.findMany({
    where: { userId, organizationId },
  });

  const latest = new Map(rows.map((row) => [row.eventKey, row]));

  return NOTIFICATION_EVENT_KEYS.map((eventKey) => {
    const row = latest.get(eventKey);
    return serializePreference(
      row || {
        eventKey,
        emailEnabled: true,
        slackEnabled: false,
      },
    );
  });
}

export async function updateNotificationPreferences(
  userId: string,
  organizationId: string,
  input: UpdateNotificationPreferencesInput,
) {
  await prisma.$transaction(
    input.preferences.map((preference) =>
      prisma.userNotificationPreference.upsert({
        where: {
          userId_organizationId_eventKey: {
            userId,
            organizationId,
            eventKey: preference.eventKey,
          },
        },
        create: {
          userId,
          organizationId,
          eventKey: preference.eventKey,
          emailEnabled: preference.emailEnabled,
          slackEnabled: preference.slackEnabled,
        },
        update: {
          emailEnabled: preference.emailEnabled,
          slackEnabled: preference.slackEnabled,
        },
      }),
    ),
  );

  return listNotificationPreferences(userId, organizationId);
}
