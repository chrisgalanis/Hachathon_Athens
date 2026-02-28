"""
VoiceAgent — generates spoken narration from a ManimGL animation script.

The animation code is the PRIMARY source. The voice agent reads what is
actually on screen (the self.play() sequence) and narrates it. The processed
JSON is secondary context — it helps the agent speak accurately about the math
but only what the animation shows.

This applies to both reels. There is no shortcut path.

Usage::

    agent = VoiceAgent()
    mp3_path = await agent.run_from_code(
        data=data,
        manim_code=manim_code,
        output_path="narration.mp3",
    )
"""

import os
import re

from .base_agent import BaseAgent

_PROMPT_PATH = os.path.join(
    os.path.dirname(__file__), "agent_prompts", "voice_agent_system_prompt.md"
)

DEFAULT_VOICE_ID = "9BWtsMINqrJLrRacOk9x"   # Aria — warm, expressive
DEFAULT_MODEL_ID = "eleven_multilingual_v2"
DEFAULT_OUTPUT_FORMAT = "mp3_44100_128"


def _load_prompt() -> str:
    with open(_PROMPT_PATH, encoding="utf-8") as f:
        return f.read()


def _optimize_for_tts(text: str) -> str:
    """Fix mathematical notation so ElevenLabs reads it naturally aloud."""
    fixes = [
        (r"([A-Za-z])₀", r"\1-zero"),
        (r"([A-Za-z])₁", r"\1-one"),
        (r"([A-Za-z])₂", r"\1-two"),
        (r"([A-Za-z])₃", r"\1-three"),
        (r"([A-Za-z])₄", r"\1-four"),
        (r"([A-Za-z])₅", r"\1-five"),
        (r"([A-Za-z])⁻¹", r"\1-inverse"),
        (r"\bUx\b", "U times x"),
        (r"\bAx\b", "A times x"),
        (r"\bAb\b", "A times b"),
    ]
    for pattern, replacement in fixes:
        text = re.sub(pattern, replacement, text)
    return text


def _build_prompt(data: dict, manim_code: str) -> str:
    """Build prompt with animation code as primary, full JSON as math context."""
    import json as _json
    subject = data.get("subject", "Unknown Topic")
    lecture_number = data.get("lecture_number", "?")

    # Full JSON minus reviewed_transcript (already captured in the animation)
    context_data = {k: v for k, v in data.items() if k != "reviewed_transcript"}

    return (
        f"Lecture {lecture_number}: {subject}\n\n"
        f"ANIMATION CODE (PRIMARY — your script comes from this, in this order):\n"
        f"```python\n{manim_code}\n```\n\n"
        f"FULL LECTURE JSON (secondary math context — use for accuracy only, "
        f"never narrate anything not shown in the animation above):\n"
        f"```json\n{_json.dumps(context_data, indent=2)}\n```"
    )


def _text_to_speech(text: str, output_path: str) -> None:
    """Synthesise *text* with ElevenLabs and write MP3 to *output_path*."""
    try:
        from elevenlabs.client import ElevenLabs
    except ImportError as e:
        raise ImportError(
            "elevenlabs package is required: pip install elevenlabs"
        ) from e

    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise EnvironmentError("ELEVENLABS_API_KEY environment variable is not set.")

    voice_id = os.environ.get("ELEVENLABS_VOICE_ID", "").strip() or DEFAULT_VOICE_ID
    model_id = os.environ.get("ELEVENLABS_MODEL_ID", "").strip() or DEFAULT_MODEL_ID

    client = ElevenLabs(api_key=api_key)
    audio_chunks = client.text_to_speech.convert(
        text=text,
        voice_id=voice_id,
        model_id=model_id,
        output_format=DEFAULT_OUTPUT_FORMAT,
    )

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "wb") as f:
        for chunk in audio_chunks:
            f.write(chunk)


class VoiceAgent(BaseAgent):
    """Narrates a ManimGL animation script as a short reel voice-over.

    The animation code is the source of truth — the narration describes
    what is literally on screen, in the order it appears.
    The processed JSON provides math context for accuracy.
    """

    def __init__(self, **kwargs):
        super().__init__(
            instructions=_load_prompt(),
            output_type=str,
            **kwargs,
        )

    async def run_from_code(
        self,
        data: dict,
        manim_code: str,
        output_path: str = "narration.mp3",
    ) -> str:
        """Generate narration from animation code, then synthesise to MP3.

        Args:
            data: Processed JSON dict (used as math context).
            manim_code: The ManimGL Python script that will play on screen.
            output_path: Destination MP3 path.

        Returns:
            Path to the written MP3.
        """
        prompt = _build_prompt(data, manim_code)
        result = await self.run(prompt)
        narration: str = _optimize_for_tts(result.output)

        print(f"\n── Narration: {len(narration.split())} words ─────────────────────────────")
        print(narration)
        print("──────────────────────────────────────────────────────────────────\n")

        _text_to_speech(narration, output_path)
        print(f"Audio saved: {output_path}")
        return output_path
