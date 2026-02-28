"""
ManimAgent — generates ManimGL animation code from math content.
"""

import json
import os
import textwrap

from .base_agent import BaseAgent

_PROMPT_PATH = os.path.join(
    os.path.dirname(__file__), "agent_prompts", "manim_agent_system_prompt.md"
)


def _load_prompt() -> str:
    with open(_PROMPT_PATH, encoding="utf-8") as f:
        return f.read()


def _build_prompt_from_json(data: dict) -> str:
    """Format a processed JSON object into a prompt for the agent."""
    subject = data.get("subject", "Unknown Topic")
    lecture_number = data.get("lecture_number", "?")

    concepts = data.get("concepts", [])
    examples = data.get("examples", [])
    analogies = data.get("analogy", [])

    def _numbered_list(items: list) -> str:
        return "\n".join(f"  {i + 1}. {item}" for i, item in enumerate(items))

    return textwrap.dedent(f"""\
        Lecture {lecture_number}: {subject}

        === CONCEPTS ===
        {_numbered_list(concepts)}

        === EXAMPLES ===
        {_numbered_list(examples)}

        === ANALOGIES ===
        {_numbered_list(analogies)}

        Generate a complete ManimGL Python script that animates the key ideas above using your system prompt as your help.
    """)


class ManimAgent(BaseAgent):
    """Agent that turns structured math content into runnable ManimGL scenes.

    Usage::

        agent = ManimAgent()

        # From a processed JSON file:
        result = await agent.run_from_json("backend/scraper/processed/.../processed.json")
        print(result.output)  # complete ManimGL Python script

        # Or pass a pre-loaded dict:
        result = await agent.run_from_dict(data)
        print(result.output)
    """

    def __init__(self, **kwargs):
        super().__init__(
            instructions=_load_prompt(),
            output_type=str,
            **kwargs,
        )

    async def run_from_json(self, json_path: str):
        """Load a processed JSON file and generate a ManimGL animation script.

        Args:
            json_path: Absolute or relative path to a ``processed.json`` file
                with keys ``concepts``, ``examples``, and ``analogy``.

        Returns:
            The ``RunResult`` object (access ``.output`` for the Python script).
        """
        with open(json_path, encoding="utf-8") as f:
            data = json.load(f)
        return await self.run_from_dict(data)

    async def run_from_dict(self, data: dict):
        """Generate a ManimGL animation script from a pre-loaded JSON dict.

        Args:
            data: Dict with keys ``lecture_number``, ``subject``,
                ``concepts``, ``examples``, and ``analogy``.

        Returns:
            The ``RunResult`` object (access ``.output`` for the Python script).
        """
        prompt = _build_prompt_from_json(data)
        return await self.run(prompt)
