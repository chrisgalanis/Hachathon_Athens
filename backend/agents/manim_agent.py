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


def _build_revision_prompt(original_code: str, narration: str) -> str:
    """Build a prompt asking the Manim agent to revise its code to match the narration.

    The voice agent has already written narration based on the original code,
    but it may describe visuals slightly differently (e.g., "purple line" when
    the code uses BLUE). This revision pass ensures the animation matches
    exactly what the narrator says.
    """
    return (
        "REVISION TASK — align your animation to the narration\n\n"
        "A voice-over narrator has written the following narration for your animation. "
        "The narration is split into beats separated by [BEAT] markers.\n\n"
        f"─── NARRATION ───\n{narration}\n─── END NARRATION ───\n\n"
        f"─── YOUR ORIGINAL CODE ───\n```python\n{original_code}\n```\n─── END CODE ───\n\n"
        "Your job: revise the ManimGL code so the animation EXACTLY matches "
        "what the narrator describes. Specifically:\n\n"
        "1. **Colors**: If the narrator says \"purple line\", the code must use PURPLE. "
        "If the narrator says \"green arrow\", the code must use GREEN. Match EVERY "
        "color reference in the narration to the code.\n\n"
        "2. **Labels & text**: If the narrator says \"lambda equals three\", the on-screen "
        "text must show that. If the narrator references a specific label, it must exist.\n\n"
        "3. **Order**: If the narrator describes events in a specific order, the "
        "self.play() calls must match that order.\n\n"
        "4. **Objects**: If the narrator says \"two arrows appear\", there must be "
        "exactly two arrows. If the narrator says \"the grid stretches\", there must "
        "be a grid transformation.\n\n"
        "RULES:\n"
        "- Output the COMPLETE revised ManimGL script (not a diff).\n"
        "- Keep the same scene class name.\n"
        "- Keep the same self.wait() boundaries — do NOT add, remove, or reorder them.\n"
        "- Keep the same number of self.play() beats — only change visual properties "
        "(colors, labels, text) to match the narration.\n"
        "- Do NOT change the mathematical content or structure of animations.\n"
        "- If the narration already matches the code perfectly, return the code unchanged.\n"
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

    async def revise_to_match_narration(
        self, original_code: str, narration: str
    ):
        """Revise a Manim script so its visuals match the narration exactly.

        This is a follow-up call that uses the agent's conversation history
        (from the original generation) plus a revision prompt. The LLM sees
        the original code and the narration, then outputs a complete revised
        ManimGL script with colors, labels, and visual details aligned.

        Args:
            original_code: The ManimGL script generated in the first pass.
            narration: The beat-delimited narration text (with [BEAT] markers).

        Returns:
            RunResult — access ``.output`` for the revised Python script.
        """
        prompt = _build_revision_prompt(original_code, narration)
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
