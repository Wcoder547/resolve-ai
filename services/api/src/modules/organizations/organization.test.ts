import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { app } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import {
  API_PREFIX,
  createTestEmail,
  registerAndLoginTestUser,
} from "../../test/test-helpers.js";
import * as emailService from "../email/email.service.js";

describe("Organizations API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads and updates the current organization", async () => {
    const { accessToken } = await registerAndLoginTestUser({ role: "OWNER" });

    const current = await request(app)
      .get(`${API_PREFIX}/organizations/current`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(current.status).toBe(200);
    expect(current.body.data.organization.name).toBeTruthy();

    const updated = await request(app)
      .patch(`${API_PREFIX}/organizations/current`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Updated Resolve Org",
      });

    expect(updated.status).toBe(200);
    expect(updated.body.data.organization.name).toBe("Updated Resolve Org");
  });

  it("lists members and updates member role", async () => {
    const owner = await registerAndLoginTestUser({ role: "OWNER" });
    const inviteeEmail = createTestEmail("member");

    vi.spyOn(emailService, "sendOrganizationInviteEmail").mockResolvedValue({
      sent: false,
      reason: "SMTP_NOT_CONFIGURED",
    });

    const invite = await request(app)
      .post(`${API_PREFIX}/organizations/invites`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        email: inviteeEmail,
        role: "VIEWER",
      });

    expect(invite.status).toBe(201);
    const inviteUrl = invite.body.data.inviteUrl as string;
    expect(inviteUrl).toContain("token=");
    const token = new URL(inviteUrl).searchParams.get("token");
    expect(token).toBeTruthy();

    const accept = await request(app)
      .post(`${API_PREFIX}/organizations/invites/accept`)
      .send({
        token,
        name: "Invited Member",
        password: "Password123",
      });

    expect(accept.status).toBe(200);

    const members = await request(app)
      .get(`${API_PREFIX}/organizations/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(members.status).toBe(200);
    expect(members.body.data.members.length).toBeGreaterThanOrEqual(2);

    const member = members.body.data.members.find(
      (item: { user: { email: string } }) => item.user.email === inviteeEmail,
    );
    expect(member).toBeTruthy();

    const patched = await request(app)
      .patch(`${API_PREFIX}/organizations/members/${member.id}`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ role: "SUPPORT_AGENT" });

    expect(patched.status).toBe(200);
    expect(patched.body.data.member.role).toBe("SUPPORT_AGENT");
  });

  it("creates, lists, resends, previews, and revokes invites", async () => {
    const owner = await registerAndLoginTestUser({ role: "OWNER" });
    const inviteEmail = createTestEmail("invite");

    vi.spyOn(emailService, "sendOrganizationInviteEmail").mockResolvedValue({
      sent: false,
      reason: "SMTP_NOT_CONFIGURED",
    });

    const created = await request(app)
      .post(`${API_PREFIX}/organizations/invites`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        email: inviteEmail,
        role: "DEVELOPER",
      });

    expect(created.status).toBe(201);
    const inviteId = created.body.data.invite.id as string;
    const inviteUrl = created.body.data.inviteUrl as string;
    const token = new URL(inviteUrl).searchParams.get("token");

    const list = await request(app)
      .get(`${API_PREFIX}/organizations/invites`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(list.status).toBe(200);
    expect(
      list.body.data.invites.some((item: { id: string }) => item.id === inviteId),
    ).toBe(true);

    const preview = await request(app).get(
      `${API_PREFIX}/organizations/invites/preview?token=${encodeURIComponent(
        token || "",
      )}`,
    );
    expect(preview.status).toBe(200);

    const resend = await request(app)
      .post(`${API_PREFIX}/organizations/invites/${inviteId}/resend`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(resend.status).toBe(200);

    const revoked = await request(app)
      .delete(`${API_PREFIX}/organizations/invites/${inviteId}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(revoked.status).toBe(200);
  });

  it("reads audit logs and notification preferences", async () => {
    const { accessToken } = await registerAndLoginTestUser({ role: "OWNER" });

    const audit = await request(app)
      .get(`${API_PREFIX}/organizations/audit-logs`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(audit.status).toBe(200);

    const prefs = await request(app)
      .get(`${API_PREFIX}/organizations/notification-preferences`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(prefs.status).toBe(200);

    const updatedPrefs = await request(app)
      .put(`${API_PREFIX}/organizations/notification-preferences`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        preferences: [
          {
            eventKey: "approval.requested",
            emailEnabled: true,
            slackEnabled: false,
          },
        ],
      });
    expect(updatedPrefs.status).toBe(200);
  });

  it("upserts, lists, sets default, tests, and deletes AI providers", async () => {
    const { accessToken } = await registerAndLoginTestUser({ role: "OWNER" });

    const upsert = await request(app)
      .put(`${API_PREFIX}/organizations/ai-providers/OPENROUTER`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        apiKey: "test-openrouter-key-123456",
        model: "openrouter/auto",
      });

    expect(upsert.status).toBe(200);

    const list = await request(app)
      .get(`${API_PREFIX}/organizations/ai-providers`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(list.status).toBe(200);
    expect(JSON.stringify(list.body)).not.toContain("test-openrouter-key-123456");

    const setDefault = await request(app)
      .post(`${API_PREFIX}/organizations/ai-providers/OPENROUTER/default`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(setDefault.status).toBe(200);

    const tested = await request(app)
      .post(`${API_PREFIX}/organizations/ai-providers/OPENROUTER/test`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(tested.status).toBe(200);

    const deleted = await request(app)
      .delete(`${API_PREFIX}/organizations/ai-providers/OPENROUTER`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(deleted.status).toBe(200);
  });

  it("updates plan and transfers ownership", async () => {
    const owner = await registerAndLoginTestUser({ role: "OWNER" });
    const inviteEmail = createTestEmail("transfer");

    vi.spyOn(emailService, "sendOrganizationInviteEmail").mockResolvedValue({
      sent: false,
      reason: "SMTP_NOT_CONFIGURED",
    });

    const invite = await request(app)
      .post(`${API_PREFIX}/organizations/invites`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ email: inviteEmail, role: "ADMIN" });

    const token = new URL(invite.body.data.inviteUrl).searchParams.get("token");

    await request(app).post(`${API_PREFIX}/organizations/invites/accept`).send({
      token,
      name: "Future Owner",
      password: "Password123",
    });

    const members = await request(app)
      .get(`${API_PREFIX}/organizations/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`);

    const adminMember = members.body.data.members.find(
      (item: { user: { email: string } }) => item.user.email === inviteEmail,
    );

    const plan = await request(app)
      .patch(`${API_PREFIX}/organizations/current/plan`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ plan: "PRO" });
    expect(plan.status).toBe(400);

    const keepFree = await request(app)
      .patch(`${API_PREFIX}/organizations/current/plan`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ plan: "FREE" });
    expect(keepFree.status).toBe(200);

    const transfer = await request(app)
      .post(`${API_PREFIX}/organizations/current/transfer`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ memberId: adminMember.id });

    expect(transfer.status).toBe(200);

    const org = await prisma.organizationMember.findUniqueOrThrow({
      where: { id: adminMember.id },
    });
    expect(org.role).toBe("OWNER");
  });
});
