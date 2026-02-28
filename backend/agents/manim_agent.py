"""
ManimAgent — generates ManimGL animation code from math content.
"""

import os

from .base_agent import BaseAgent

_PROMPT_PATH = os.path.join(
    os.path.dirname(__file__), "agent_prompts", "manim_agent_system_prompt.md"
)


def _load_prompt() -> str:
    with open(_PROMPT_PATH, encoding="utf-8") as f:
        return f.read()


class ManimAgent(BaseAgent):
    """Agent that turns mathematical content into runnable ManimGL scenes.

    Usage::

        agent = ManimAgent()
        result = await agent.run("Visualise eigenvalue decomposition of a 2×2 matrix.")
        print(result.output)  # complete ManimGL Python script
    """

    def __init__(self, **kwargs):
        super().__init__(
            instructions=_load_prompt(),
            output_type=str,
            **kwargs,
        )
