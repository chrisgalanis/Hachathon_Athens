"""
Base Agent
Provider-agnostic base class for all pydantic-ai agents.
Configure via .env: LLM_MODEL, LLM_PROVIDER, and the relevant API key.
"""

import logging
import os
from typing import List

import dotenv
from pydantic_ai import Agent, capture_run_messages
from pydantic_ai.messages import ModelMessage

dotenv.load_dotenv()

logger = logging.getLogger(__name__)

# Supported providers and their env var for the API key
_PROVIDER_API_KEY_ENV = {
    "anthropic": "ANTHROPIC_API_KEY",
    "openai": "OPENAI_API_KEY",
    "google": "GEMINI_API_KEY",
    "groq": "GROQ_API_KEY",
    "mistral": "MISTRAL_API_KEY",
}


def _resolve_model() -> str:
    """Build the pydantic-ai model string from env vars.

    Reads:
        LLM_PROVIDER  – e.g. "openai", "anthropic", "google"  (default: "anthropic")
        LLM_MODEL     – the full model ID, e.g. "claude-sonnet-4-20250514", "gpt-4o"

    Returns:
        A string like "anthropic:claude-sonnet-4-20250514" that pydantic-ai accepts.
    """
    provider = os.getenv("LLM_PROVIDER", "anthropic").lower().strip()
    model = os.getenv("LLM_MODEL", "")

    if not model:
        raise ValueError(
            "LLM_MODEL env var is required. Set it to the model ID "
            "your provider expects (e.g. 'claude-sonnet-4-20250514', 'gpt-4o')."
        )

    # Validate the API key is set
    key_env = _PROVIDER_API_KEY_ENV.get(provider)
    if key_env and not os.getenv(key_env):
        logger.warning("API key env var %s is not set for provider '%s'", key_env, provider)

    return f"{provider}:{model}"


class BaseAgent:
    """Provider-agnostic base agent wrapping pydantic-ai.

    The model and provider are read from env vars (LLM_PROVIDER, LLM_MODEL)
    so you can switch between OpenAI, Anthropic, Google, etc. by editing
    your .env file — zero code changes needed.

    Subclass this to create specialised agents::

        class ManimAgent(BaseAgent):
            def __init__(self):
                super().__init__(
                    instructions="You generate ManimGL code from math transcripts.",
                )

        agent = ManimAgent()
        result = await agent.run("Explain matrix multiplication visually.")
        print(result.output)
    """

    def __init__(
        self,
        instructions: str | None = None,
        deps_type=None,
        output_type=None,
        mcp_servers: list | None = None,
        retries: int = 2,
        model_override: str | None = None,
    ):
        self.message_history: List[ModelMessage] = []

        # Use explicit override or fall back to env-driven resolution
        model_string = model_override if model_override else _resolve_model()

        # Build Agent kwargs, omitting None values
        agent_kwargs: dict = {"model": model_string, "retries": retries}

        if instructions:
            agent_kwargs["instructions"] = instructions
        if deps_type is not None:
            agent_kwargs["deps_type"] = deps_type
        if output_type is not None:
            agent_kwargs["output_type"] = output_type
        if mcp_servers:
            agent_kwargs["toolsets"] = mcp_servers

        self.agent = Agent(**agent_kwargs)

    # -- public API ----------------------------------------------------------

    async def run(
        self,
        prompt: str,
        *,
        message_history: List[ModelMessage] | None = None,
        deps=None,
    ):
        """Run the agent and return the full pydantic-ai RunResult.

        Args:
            prompt: The user prompt to send.
            message_history: Optional conversation history (overrides internal).
            deps: Optional dependencies for the agent run.

        Returns:
            The ``RunResult`` object (access ``.output`` for the response).
        """
        history = message_history if message_history is not None else self.message_history

        with capture_run_messages() as messages:
            try:
                result = await self.agent.run(prompt, message_history=history, deps=deps)
                self.message_history = result.all_messages()
                return result
            except Exception as e:
                logger.error("[BaseAgent] Run failed: %s", e)
                logger.debug("[BaseAgent] Captured messages: %s", messages)
                raise

    def reset_history(self):
        """Clear the conversation history."""
        self.message_history = []
