from typing import Any, Callable, Dict, List, Optional

from app.config.settings import get_settings


ToolHandler = Callable[[Dict[str, Any]], Dict[str, Any]]


class ToolExecutionError(Exception):
    pass


def get_allowed_tool_names() -> List[str]:
    settings = get_settings()

    return [
        item.strip()
        for item in settings.agent_allowed_tools.split(",")
        if item.strip()
    ]


def get_approval_required_tool_names() -> List[str]:
    settings = get_settings()

    return [
        item.strip()
        for item in settings.agent_approval_required_tools.split(",")
        if item.strip()
    ]


def check_customer_status(arguments: Dict[str, Any]) -> Dict[str, Any]:
    customer_email = str(arguments.get("customerEmail", "")).strip()

    if not customer_email:
        return {
            "available": False,
            "status": "missing_customer_email",
            "message": "Customer email was not provided, so customer status could not be checked.",
            "safeToUseInAnswer": True,
        }

    return {
        "available": True,
        "status": "mock_active_customer_record",
        "customerEmail": customer_email,
        "message": "Mock customer lookup completed. Replace this with real CRM/customer database integration later.",
        "safeToUseInAnswer": False,
        "note": "This is mock tool output and should not be treated as real customer data.",
    }


def check_subscription_status(arguments: Dict[str, Any]) -> Dict[str, Any]:
    customer_email = str(arguments.get("customerEmail", "")).strip()
    payment_id = str(arguments.get("paymentId", "")).strip()
    subscription_id = str(arguments.get("subscriptionId", "")).strip()

    if not customer_email and not payment_id and not subscription_id:
        return {
            "available": False,
            "status": "missing_identifiers",
            "message": "No customer email, payment ID, or subscription ID was provided.",
            "recommendedNextStep": "Ask support to collect customer email, payment ID, or subscription ID before checking systems.",
            "safeToUseInAnswer": True,
        }

    return {
        "available": True,
        "status": "mock_subscription_check_required",
        "customerEmail": customer_email or None,
        "paymentId": payment_id or None,
        "subscriptionId": subscription_id or None,
        "message": "Mock subscription lookup completed. Replace this with real billing/subscription API integration later.",
        "safeToUseInAnswer": False,
        "note": "This is mock tool output and should not be treated as real subscription data.",
    }


def create_support_ticket_draft(arguments: Dict[str, Any]) -> Dict[str, Any]:
    title = str(arguments.get("title", "")).strip() or "Support issue requires review"
    summary = str(arguments.get("summary", "")).strip()
    priority = str(arguments.get("priority", "medium")).strip().lower()

    if priority not in ["low", "medium", "high", "urgent"]:
        priority = "medium"

    return {
        "created": False,
        "draftOnly": True,
        "title": title,
        "priority": priority,
        "summary": summary or "No summary provided.",
        "message": "Support ticket draft prepared. No external ticket was created.",
        "safeToUseInAnswer": True,
    }


def create_escalation_summary(arguments: Dict[str, Any]) -> Dict[str, Any]:
    issue = str(arguments.get("issue", "")).strip()
    likely_cause = str(arguments.get("likelyCause", "")).strip()
    missing_info = arguments.get("missingInformation", [])

    if not isinstance(missing_info, list):
        missing_info = []

    return {
        "summary": {
            "issue": issue or "Issue not specified.",
            "likelyCause": likely_cause or "Likely cause not confirmed.",
            "missingInformation": missing_info,
        },
        "message": "Escalation summary generated safely.",
        "safeToUseInAnswer": True,
    }


def create_support_ticket(arguments: Dict[str, Any]) -> Dict[str, Any]:
    title = str(arguments.get("title", "")).strip() or "Support issue requires review"
    summary = str(arguments.get("summary", "")).strip()
    priority = str(arguments.get("priority", "medium")).strip().lower()

    if priority not in ["low", "medium", "high", "urgent"]:
        priority = "medium"

    return {
        "created": True,
        "mockExecution": True,
        "externalWritePerformed": False,
        "ticketId": "mock-ticket-after-human-approval",
        "title": title,
        "priority": priority,
        "summary": summary or "No summary provided.",
        "message": "Mock support ticket execution completed after human approval. No external system was modified.",
        "safeToUseInAnswer": True,
        "note": "Replace this mock implementation with a real ticketing integration later.",
    }


def send_escalation_notification(arguments: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "sent": True,
        "mockExecution": True,
        "externalWritePerformed": False,
        "message": "Mock escalation notification. Real execution is handled by Node integrations after approval.",
        "safeToUseInAnswer": True,
    }


TOOL_REGISTRY: Dict[str, ToolHandler] = {
    "check_customer_status": check_customer_status,
    "check_subscription_status": check_subscription_status,
    "create_support_ticket_draft": create_support_ticket_draft,
    "create_escalation_summary": create_escalation_summary,
    "create_support_ticket": create_support_ticket,
    "send_escalation_notification": send_escalation_notification,
}


TOOL_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    "check_customer_status": {
        "name": "check_customer_status",
        "category": "SAFE_READ",
        "description": "Mock read-only customer status check. Requires customerEmail if available.",
        "safe": True,
        "writesExternalData": False,
        "requiresApproval": False,
    },
    "check_subscription_status": {
        "name": "check_subscription_status",
        "category": "SAFE_READ",
        "description": "Mock read-only subscription/payment status check. Accepts customerEmail, paymentId, or subscriptionId.",
        "safe": True,
        "writesExternalData": False,
        "requiresApproval": False,
    },
    "create_support_ticket_draft": {
        "name": "create_support_ticket_draft",
        "category": "SAFE_DRAFT",
        "description": "Creates a draft support ticket payload only. Does not create an external ticket.",
        "safe": True,
        "writesExternalData": False,
        "requiresApproval": False,
    },
    "create_escalation_summary": {
        "name": "create_escalation_summary",
        "category": "SAFE_DRAFT",
        "description": "Creates a safe internal escalation summary.",
        "safe": True,
        "writesExternalData": False,
        "requiresApproval": False,
    },
    "create_support_ticket": {
        "name": "create_support_ticket",
        "category": "REQUIRES_APPROVAL",
        "description": "Creates a support ticket only after human approval. Current implementation is mock/safe.",
        "safe": True,
        "writesExternalData": False,
        "requiresApproval": True,
    },
    "send_escalation_notification": {
        "name": "send_escalation_notification",
        "category": "REQUIRES_APPROVAL",
        "description": "Sends an escalation notification to an external channel after human approval.",
        "safe": True,
        "writesExternalData": True,
        "requiresApproval": True,
    },
}


def get_tool_definition(tool_name: str) -> Optional[Dict[str, Any]]:
    definition = TOOL_DEFINITIONS.get(tool_name)

    if not definition:
        return None

    approval_required_tools = set(get_approval_required_tool_names())

    normalized_definition = dict(definition)

    if tool_name in approval_required_tools:
        normalized_definition["category"] = "REQUIRES_APPROVAL"
        normalized_definition["requiresApproval"] = True

    return normalized_definition


def list_available_tools() -> List[Dict[str, Any]]:
    allowed_tools = set(get_allowed_tool_names())

    tools = []

    for name, definition in TOOL_DEFINITIONS.items():
        if name not in allowed_tools:
            continue

        normalized_definition = get_tool_definition(name)

        if normalized_definition:
            tools.append(normalized_definition)

    return tools


def execute_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    allowed_tools = set(get_allowed_tool_names())

    if tool_name not in allowed_tools:
        raise ToolExecutionError(f"Tool is not allowed: {tool_name}")

    handler = TOOL_REGISTRY.get(tool_name)

    if not handler:
        raise ToolExecutionError(f"Tool is not registered: {tool_name}")

    return handler(arguments or {})