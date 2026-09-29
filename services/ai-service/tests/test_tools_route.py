from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_execute_approved_tool_http_route():
    response = client.post(
        "/ai/tools/execute-approved",
        json={
            "toolCallId": "tool_call_http_1",
            "toolName": "create_support_ticket",
            "reason": "Approved in test",
            "input": {
                "title": "Subscription activation failed",
                "summary": "Payment succeeded but subscription did not activate",
                "priority": "high",
            },
            "metadata": {"test": True},
        },
    )

    assert response.status_code == 200
    body = response.json()

    assert body["success"] is True
    data = body["data"]
    assert data["toolName"] == "create_support_ticket"
    assert data["requiresApproval"] is True
    assert data["approvalStatus"] == "EXECUTED"
    assert data["status"] == "completed"
    assert data["output"]["mockExecution"] is True
    assert data["toolCallId"] == "tool_call_http_1"


def test_execute_approved_unknown_tool_returns_400():
    response = client.post(
        "/ai/tools/execute-approved",
        json={
            "toolName": "delete_customer_account",
            "reason": "Should fail",
            "input": {"customerId": "cust_1"},
        },
    )

    assert response.status_code == 400
    assert "failed" in response.json()["message"].lower()


def test_execute_approved_validates_required_fields():
    response = client.post(
        "/ai/tools/execute-approved",
        json={"toolName": "create_support_ticket"},
    )

    assert response.status_code == 422
