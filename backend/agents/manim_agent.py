"""
ManimAgent — generates ManimGL animation code from voice-over narration.

The narration is the **source of truth**. The Manim agent reads [BEAT]-delimited
narration text and produces a ManimGL scene that animates exactly what the
narrator describes — colors, objects, transformations, and order.

Each [BEAT] in the narration becomes a group of ``self.play()`` calls followed
by a ``self.wait()``, creating a 1:1 mapping between narration beats and
animation beats for timing synchronisation.

Usage::

    agent = ManimAgent()

    result = await agent.run_from_narration(
        narration="Here's a two-by-two grid.\\n[BEAT]\\nA green arrow appears...",
        subject="Eigenvalues and eigenvectors",
        lecture_number="21",
    )
    print(result.output)  # ManimGL Python script
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


def _build_narration_prompt(
    narration: str,
    subject: str = "Unknown Topic",
    lecture_number: str = "?",
    reel_type: str = "concept",
) -> str:
    """Build a prompt from the voice-over narration.

    The narration is the SOLE source. The Manim agent must animate exactly
    what the narrator describes — every color, every object, every action.
    """
    reel_label = "Concept Reel" if reel_type == "concept" else "Worked Example Reel"

    return (
        f"Lecture {lecture_number}: {subject} — {reel_label}\n\n"
        "─── VOICE-OVER NARRATION (this is your ONLY source) ───\n"
        "The narrator has already recorded the voice-over below. Each section "
        "separated by [BEAT] is one narration beat.\n\n"
        "Your job: create a ManimGL scene that animates EXACTLY what the "
        "narrator describes, beat by beat.\n\n"
        f"{narration}\n\n"
        "─── END NARRATION ───\n\n"
        "CANVAS: 9:16 PORTRAIT (1080×1920). Design all layouts vertically — "
        "stack elements top-to-bottom, not side-by-side. Use large font sizes "
        "(≥40). Keep content within x = ±3.5 to avoid clipping.\n\n"
        "CRITICAL RULES:\n"
        "1. Each [BEAT] boundary → one self.wait() in your code. "
        "This creates the pause where the animation waits for the narrator.\n"
        "2. The animations between self.wait() calls must match the narration "
        "beat they correspond to — same colors, same objects, same actions.\n"
        "3. If the narrator says 'green arrow', use color=GREEN. "
        "If they say 'the grid warps', apply a matrix transformation to the grid. "
        "If they say 'a yellow highlight', use SurroundingRectangle with color=YELLOW.\n"
        "4. If the narrator mentions specific numbers (e.g., 'matrix two, one, zero, one'), "
        "use those exact numbers.\n"
        "5. Every visual detail the narrator mentions MUST appear in the animation. "
        "Nothing the narrator skips should appear on screen.\n"
        "6. Keep it tight: one Scene class, one construct() method.\n"
    )


class ManimAgent(BaseAgent):
    """Generates ManimGL animation code from voice-over narration.

    The narration drives the animation — every beat in the narration becomes
    a group of self.play() calls followed by self.wait() in the code.
    """

    def __init__(self, **kwargs):
        super().__init__(
            instructions=_load_prompt(),
            output_type=str,
            **kwargs,
        )

    async def run_from_narration(
        self,
        narration: str,
        subject: str = "Unknown Topic",
        lecture_number: str = "?",
        reel_type: str = "concept",
    ):
        """Generate a ManimGL script that animates the given narration.

        Args:
            narration: [BEAT]-delimited voice-over text.
            subject: Lecture subject for context.
            lecture_number: Lecture number for context.
            reel_type: 'concept' or 'example'.

        Returns:
            RunResult — access ``.output`` for the Python script.
        """
        prompt = _build_narration_prompt(
            narration, subject, lecture_number, reel_type
        )
        return await self.run(prompt)

    # ------------------------------------------------------------------
    # Legacy helpers kept for backward compatibility
    # ------------------------------------------------------------------

    async def run_from_json(self, json_path: str):
        """Load a processed JSON file and run a concept reel from its transcript."""
        with open(json_path, encoding="utf-8") as f:
            data = json.load(f)
        return await self.run_from_dict(data)

    async def run_from_dict(self, data: dict):
        """Run a concept reel from a pre-loaded dict (legacy)."""
        transcript = data.get("reviewed_transcript", "").strip()
        subject = data.get("subject", "Unknown Topic")
        lecture_number = str(data.get("lecture_number", "?"))
        return await self.run_from_narration(
            narration=transcript,
            subject=subject,
            lecture_number=lecture_number,
            reel_type="concept",
        )
