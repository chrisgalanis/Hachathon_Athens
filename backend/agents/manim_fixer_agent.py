"""
ManimFixerAgent — repairs broken ManimGL scripts using the error traceback.

When manimgl fails to render a generated script (AttributeError, TypeError,
NameError, etc.), this agent receives the full code and the error traceback,
then returns a corrected version of the script with the minimum changes needed
to fix the bug.

Usage::

    fixer = ManimFixerAgent()
    fixed_code = await fixer.fix(broken_code, error_traceback)
"""

import os
import re

from .base_agent import BaseAgent

_PROMPT_PATH = os.path.join(
    os.path.dirname(__file__), "agent_prompts", "manim_fixer_system_prompt.md"
)


def _load_prompt() -> str:
    with open(_PROMPT_PATH, encoding="utf-8") as f:
        return f.read()


class ManimFixerAgent(BaseAgent):
    """Fixes broken ManimGL scripts by analyzing the error traceback.

    Given a script that caused manimgl to crash and the full error output,
    returns a corrected script with minimal changes.
    """

    def __init__(self, **kwargs):
        super().__init__(
            instructions=_load_prompt(),
            output_type=str,
            **kwargs,
        )

    async def fix(self, broken_code: str, error_traceback: str) -> str:
        """Return a corrected version of the broken ManimGL script.

        Args:
            broken_code: The Python source of the broken ManimGL script.
            error_traceback: The stderr/stdout from the failed manimgl run.

        Returns:
            Corrected Python source as a string (no markdown fences).
        """
        prompt = (
            "The following ManimGL script failed to render. "
            "Fix it using the minimum possible changes.\n\n"
            "─── BROKEN SCRIPT ───\n"
            f"{broken_code}\n\n"
            "─── ERROR TRACEBACK ───\n"
            f"{error_traceback}\n\n"
            "─── END ───\n\n"
            "Return only the complete corrected Python script. No explanation. No markdown fences."
        )

        result = await self.run(prompt, model_settings={"max_tokens": 16000})
        code = result.output

        # Strip markdown fences if the model wrapped the output anyway
        if code.startswith("```"):
            code = re.sub(r"^```[^\n]*\n", "", code).rstrip("`").strip()

        return code
