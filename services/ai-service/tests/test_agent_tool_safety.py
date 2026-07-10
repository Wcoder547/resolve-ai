from app.agents.tools.executor import execute_approved_tool_call, execute_tool_plan
from app.agents.tools.registry import execute_tool, list_available_tools


def test_available_tools_include_approval_metadata():
    tools = list_available_tools()

    names = [tool["name"] for tool in tools]

    assert "create_support_ticket" in names

    support_ticket = next(
        tool for tool in tools if tool["name"] == "create_support_ticket"
    )

    assert support_ticket["requiresApproval"] is True
    assert support_ticket["category"] == "REQUIRES_APPROVAL"


def test_safe_draft_tool_executes_automatically():
    result = execute_tool_plan(
        {
            "toolCalls": [
                {
                    "toolName": "create_escalation_summary",
                    "arguments": {
                        "issue": "Subscription not activated after payment",
                        "likelyCause": "Webhook delivery or activation retry needed",
                        "missingInformation": ["customerEmail"]
                    },
                    "reason": "Need escalation summary"
                }
            ]
        }
    )

    assert len(result) == 1
    assert result[0]["toolName"] == "create_escalation_summary"
    assert result[0]["requiresApproval"] is False
    assert result[0]["approvalStatus"] == "NOT_REQUIRED"
    assert result[0]["status"] == "completed"


def test_approval_required_tool_does_not_execute_automatically():
    result = execute_tool_plan(
        {
            "toolCalls": [
                {
                    "toolName": "create_support_ticket",
                    "arguments": {
                        "title": "Subscription activation failed",
                        "summary": "Payment succeeded but subscription did not activate",
                        "priority": "high"
                    },
                    "reason": "Ticket creation needs approval"
                }
            ]
        }
    )

    assert len(result) == 1
    assert result[0]["toolName"] == "create_support_ticket"
    assert result[0]["requiresApproval"] is True
    assert result[0]["approvalStatus"] == "PENDING"
    assert result[0]["status"] == "pending_approval"
    assert result[0]["output"]["message"]


def test_disallowed_tool_fails_safely():
    result = execute_tool_plan(
        {
            "toolCalls": [
                {
                    "toolName": "delete_customer_account",
                    "arguments": {
                        "customerId": "cust_123"
                    },
                    "reason": "This should never run"
                }
            ]
        }
    )

    assert len(result) == 1
    assert result[0]["toolName"] == "delete_customer_account"
    assert result[0]["status"] == "failed"
    assert result[0]["error"]


def test_approved_tool_execution_endpoint_logic():
    result = execute_approved_tool_call(
        {
            "toolCallId": "test-tool-call",
            "toolName": "create_support_ticket",
            "reason": "Approved by human",
            "input": {
                "title": "Subscription activation failed",
                "summary": "Payment succeeded but subscription did not activate",
                "priority": "high"
            }
        }
    )

    assert result["toolName"] == "create_support_ticket"
    assert result["requiresApproval"] is True
    assert result["approvalStatus"] == "EXECUTED"
    assert result["status"] == "completed"
    assert result["output"]["mockExecution"] is True