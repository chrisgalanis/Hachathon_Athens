"""
ManimAgent — generates ManimGL animation code for two reel types.

  Concept reel  — uses ``reviewed_transcript`` as the narrative script.
                  Animates exactly what the transcript describes, nothing more.

  Example reel  — uses ``examples[0]`` to animate a concrete step-by-step
                  worked example with real numbers and matrices.

Usage::

    agent = ManimAgent()

    concept_result = await agent.run_concept_reel(data)
    example_result = await agent.run_example_reel(data)

    print(concept_result.output)  # ManimGL Python script
    print(example_result.output)  # ManimGL Python script
"""

import json
import os

from .base_agent import BaseAgent

_PROMPT_PATH = os.path.join(
    os.path.dirname(__file__), "agent_prompts", "manim_agent_system_prompt.md"
)


def _load_prompt() -> str:
    with open(_PROMPT_PATH, encoding="utf-8") as f:
        return f.read()


def _build_concept_prompt(data: dict) -> str:
    """Prompt that uses reviewed_transcript as the single narrative source."""
    subject = data.get("subject", "Unknown Topic")
    lecture_number = data.get("lecture_number", "?")
    transcript = data.get("reviewed_transcript", "").strip()

    if not transcript:
        raise ValueError(
            "processed.json has no 'reviewed_transcript'. "
            "Cannot build a concept reel prompt without it."
        )

    return (
        f"Lecture {lecture_number}: {subject}\n\n"
        f"NARRATION SCRIPT (this is the voice-over that will play alongside your animation):\n"
        f"\"{transcript}\"\n\n"
        "Animate exactly what the narration describes — one concept, one clean scene. "
        "The animation must mirror the narrative arc of the transcript sentence by sentence. "
        "Keep the total duration tight (30–90 seconds) to match the spoken length."
    )


def _build_example_prompt(data: dict) -> str:
    """Prompt that animates the first concrete worked example."""
    subject = data.get("subject", "Unknown Topic")
    lecture_number = data.get("lecture_number", "?")
    examples = data.get("examples", [])
    example_text = examples[0] if examples else "(no example available)"

    return (
        f"Lecture {lecture_number}: {subject} — Worked Example\n\n"
        f"EXAMPLE TO ANIMATE:\n{example_text}\n\n"
        "Animate this example step by step with the exact numbers given. "
        "Show each matrix, each row operation, each intermediate result as a distinct animation step. "
        "Do NOT summarise — animate every calculation shown in the example. "
        "Keep the scene focused: one example, one clean visual progression."
    )


class ManimAgent(BaseAgent):
    """Generates ManimGL animation code for concept and example reels.

    Concept reel  — narrative driven by ``reviewed_transcript``.
    Example reel  — driven by the first entry in ``examples``.
    """

    def __init__(self, **kwargs):
        super().__init__(
            instructions=_load_prompt(),
            output_type=str,
            **kwargs,
        )

    async def run_concept_reel(self, data: dict):
        """Generate a ManimGL script for the concept reel.

        Uses ``reviewed_transcript`` as the narrative guide so the animation
        stays in sync with the voice-over.

        Args:
            data: Processed JSON dict; must contain ``reviewed_transcript``.

        Returns:
            RunResult — access ``.output`` for the Python script.
        """
        prompt = _build_concept_prompt(data)
        return await self.run(prompt)

    async def run_example_reel(self, data: dict):
        """Generate a ManimGL script that animates ``examples[0]`` step by step.

        Args:
            data: Processed JSON dict; uses ``examples[0]``.

        Returns:
            RunResult — access ``.output`` for the Python script.
        """
        prompt = _build_example_prompt(data)
        return await self.run(prompt)

    # ------------------------------------------------------------------
    # Legacy helpers kept for backward compatibility
    # ------------------------------------------------------------------

    async def run_from_json(self, json_path: str):
        """Load a processed JSON file and run the concept reel."""
        with open(json_path, encoding="utf-8") as f:
            data = json.load(f)
        return await self.run_concept_reel(data)

    async def run_from_dict(self, data: dict):
        """Run the concept reel from a pre-loaded dict."""
        return await self.run_concept_reel(data)
