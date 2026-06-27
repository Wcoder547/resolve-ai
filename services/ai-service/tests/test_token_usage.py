from app.services.token_usage import (
    build_embedding_usage,
    build_usage,
    estimate_tokens_from_text,
)


def test_estimate_tokens_from_text():
    assert estimate_tokens_from_text("") == 0
    assert estimate_tokens_from_text("hello") >= 1


def test_build_usage():
    usage = build_usage(
        prompt_text="hello world",
        completion_text="response text",
    )

    assert usage["promptTokens"] > 0
    assert usage["completionTokens"] > 0
    assert usage["totalTokens"] == usage["promptTokens"] + usage["completionTokens"]
    assert usage["isEstimated"] is True


def test_build_embedding_usage():
    usage = build_embedding_usage(["hello world", "another text"])

    assert usage["promptTokens"] > 0
    assert usage["completionTokens"] == 0
    assert usage["totalTokens"] == usage["promptTokens"]