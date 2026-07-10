from time import perf_counter
from typing import Any, Dict, List
from uuid import uuid4

from app.config.settings import get_settings
from app.agents.tools.registry import execute_tool, get_tool_definition


def normalize_tool_calls(value: Any) -> List[Dict[str, Any]]:
    if not isinstance(value, list):
        return []

    normalized = []

    for item in value:
        if not isinstance(item, dict):
            continue

        tool_name = str(item.get("toolName", "")).strip()
        arguments = item.get("arguments", {})
        reason = str(item.get("reason", "")).strip()

        if not tool_name:
            continue

        if not isinstance(arguments, dict):
            arguments = {}

        normalized.append(
            {
                "toolName": tool_name,
                "arguments": arguments,
                "reason": reason,
            }
        )

    return normalized


def build_blocked_tool_result(
    tool_name: str,
    arguments: Dict[str, Any],
    reason: str | None,
    error: str,
) -> Dict[str, Any]:
    definition = get_tool_definition(tool_name) or {}

    return {
        "toolCallId": str(uuid4()),
        "toolName": tool_name,
        "toolCategory": definition.get("category", "UNKNOWN"),
        "requiresApproval": bool(definition.get("requiresApproval", False)),
        "approvalStatus": "FAILED",
        "status": "failed",
        "reason": reason,
        "latencyMs": 0,
        "input": arguments,
        "output": {},
        "error": error,
    }


def execute_tool_plan(tool_plan: Dict[str, Any]) -> List[Dict[str, Any]]:
    settings = get_settings()

    if not settings.agent_tools_enabled:
        return []

    planned_calls = normalize_tool_calls(tool_plan.get("toolCalls", []))
    planned_calls = planned_calls[: settings.agent_max_tool_calls]

    results = []

    for call in planned_calls:
        tool_call_id = str(uuid4())
        tool_name = call["toolName"]
        arguments = call["arguments"]
        reason = call.get("reason") or None
        definition = get_tool_definition(tool_name)

        if not definition:
            results.append(
                build_blocked_tool_result(
                    tool_name=tool_name,
                    arguments=arguments,
                    reason=reason,
                    error="Tool is not available or not allowed.",
                )
            )
            continue

        tool_category = definition["category"]
        requires_approval = bool(definition["requiresApproval"])

        if requires_approval:
            results.append(
                {
                    "toolCallId": tool_call_id,
                    "toolName": tool_name,
                    "toolCategory": tool_category,
                    "requiresApproval": True,
                    "approvalStatus": "PENDING",
                    "status": "pending_approval",
                    "reason": reason,
                    "latencyMs": 0,
                    "input": arguments,
                    "output": {
                        "message": "Tool call is pending human approval and has not been executed.",
                    },
                    "error": None,
                }
            )
            continue

        started_at = perf_counter()

        try:
            output = execute_tool(tool_name, arguments)
            latency_ms = int((perf_counter() - started_at) * 1000)

            results.append(
                {
                    "toolCallId": tool_call_id,
                    "toolName": tool_name,
                    "toolCategory": tool_category,
                    "requiresApproval": False,
                    "approvalStatus": "NOT_REQUIRED",
                    "status": "completed",
                    "reason": reason,
                    "latencyMs": latency_ms,
                    "input": arguments,
                    "output": output,
                    "error": None,
                }
            )

        except Exception as error:
            latency_ms = int((perf_counter() - started_at) * 1000)

            results.append(
                {
                    "toolCallId": tool_call_id,
                    "toolName": tool_name,
                    "toolCategory": tool_category,
                    "requiresApproval": False,
                    "approvalStatus": "FAILED",
                    "status": "failed",
                    "reason": reason,
                    "latencyMs": latency_ms,
                    "input": arguments,
                    "output": {},
                    "error": str(error),
                }
            )

    return results


def execute_approved_tool_call(input_data: Dict[str, Any]) -> Dict[str, Any]:
    tool_name = str(input_data.get("toolName", "")).strip()
    arguments = input_data.get("input", {})

    if not isinstance(arguments, dict):
        arguments = {}

    definition = get_tool_definition(tool_name)

    if not definition:
        raise ValueError(f"Tool is not available or not allowed: {tool_name}")

    if not definition.get("requiresApproval", False):
        raise ValueError(
            f"Tool does not require approval and should not be executed through approval endpoint: {tool_name}"
        )

    started_at = perf_counter()
    output = execute_tool(tool_name, arguments)
    latency_ms = int((perf_counter() - started_at) * 1000)

    return {
        "toolCallId": input_data.get("toolCallId"),
        "toolName": tool_name,
        "toolCategory": definition.get("category", "REQUIRES_APPROVAL"),
        "requiresApproval": True,
        "approvalStatus": "EXECUTED",
        "status": "completed",
        "reason": input_data.get("reason"),
        "latencyMs": latency_ms,
        "input": arguments,
        "output": output,
        "error": None,
    }