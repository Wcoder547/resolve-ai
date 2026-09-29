/**
 * Decide whether a chat question needs the multi-agent pipeline
 * (/chat/agent/ask) vs plain RAG (/chat/ask).
 *
 * Default is RAG. Agents only for action / investigation / escalation intent.
 */
export function questionNeedsAgents(question: string): boolean {
  const q = question.trim().toLowerCase();
  if (!q) return false;

  // Explicit action / side-effect language
  if (
    /\b(create|open|file|raise|submit)\b.{0,40}\b(ticket|incident|escalation)\b/.test(
      q,
    ) ||
    /\b(ticket|incident)\b.{0,40}\b(create|open|file|raise)\b/.test(q)
  ) {
    return true;
  }

  if (
    /\b(escalate|page on[- ]?call|notify (the )?team|send (a )?slack|webhook)\b/.test(
      q,
    )
  ) {
    return true;
  }

  if (
    /\b(investigate|diagnose|debug|root cause|triage this|take action)\b/.test(q)
  ) {
    return true;
  }

  if (
    /\b(refund|charge(d|s)?|activate (the )?subscription|deactivate|revoke (api )?key)\b/.test(
      q,
    )
  ) {
    return true;
  }

  if (/\b(run|use|call)\b.{0,20}\b(tool|agent|workflow)\b/.test(q)) {
    return true;
  }

  return false;
}

export type ChatAskMode = "auto" | "rag" | "agent";

export function resolveChatAskMode(
  mode: ChatAskMode,
  question: string,
): "rag" | "agent" {
  if (mode === "rag") return "rag";
  if (mode === "agent") return "agent";
  return questionNeedsAgents(question) ? "agent" : "rag";
}

export function resolveAutoChatAskMode(question: string): "rag" | "agent" {
  return resolveChatAskMode("auto", question);
}
