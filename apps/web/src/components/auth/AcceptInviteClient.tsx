"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { acceptOrganizationInvite, previewOrganizationInvite } from "@/lib/api";
import { saveOrganization, saveTokens, saveUser } from "@/lib/auth";
import { AuthShell } from "./AuthShell";

type AcceptInviteClientProps = {
  token?: string;
};

export function AcceptInviteClient({ token }: AcceptInviteClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("Loading invitation...");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [accountExists, setAccountExists] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      if (!token) {
        setStatus("error");
        setMessage("Invitation token is missing.");
        return;
      }

      try {
        const res = await previewOrganizationInvite(token);
        setOrganizationName(res.data.organizationName);
        setEmail(res.data.email);
        setRole(res.data.role);
        setAccountExists(res.data.accountExists);
        setStatus("ready");
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error ? error.message : "This invitation is invalid.",
        );
      }
    }

    void load();
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!accountExists) {
      if (!name.trim() || name.trim().length < 2) {
        setMessage("Name must be at least 2 characters.");
        return;
      }
      if (
        password.length < 8 ||
        !/[A-Za-z]/.test(password) ||
        !/\d/.test(password)
      ) {
        setMessage(
          "Password must be at least 8 characters and include a letter and a number.",
        );
        return;
      }
    }

    setSubmitting(true);
    setMessage("");

    try {
      const res = await acceptOrganizationInvite({
        token,
        ...(accountExists ? {} : { name, password }),
      });
      saveTokens(res.data.tokens);
      saveUser(res.data.user);
      saveOrganization(res.data.organization);
      router.push("/dashboard");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not accept invitation.",
      );
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      {status === "loading" ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          {message}
        </div>
      ) : null}

      {status === "error" ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            {message}
          </div>
          <Link href="/login" className="text-sm text-brand hover:underline">
            Back to login
          </Link>
        </div>
      ) : null}

      {status === "ready" ? (
        <form onSubmit={(e) => void handleAccept(e)} className="space-y-4">
          <h1 className="text-2xl font-bold text-foreground">
            Join {organizationName}
          </h1>
          <p className="text-sm text-muted-foreground">
            You were invited as {role.toLowerCase().replace(/_/g, " ")} using{" "}
            {email}.
          </p>

          {message ? (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800">
              {message}
            </div>
          ) : null}

          {!accountExists ? (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                  Full name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              An account already exists for this email. Accepting will sign you
              in and add you to the workspace.
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand text-brand-foreground hover:bg-brand/90 font-semibold h-10 text-sm"
          >
            {submitting ? "Joining..." : "Accept invitation"}
          </Button>
        </form>
      ) : null}
    </AuthShell>
  );
}
