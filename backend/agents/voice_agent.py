"""
VoiceAgent — generates spoken narration from a ManimGL animation script.

The animation code is the SOLE narration source. The voice agent reads every
``self.play()`` call top-to-bottom, translates each visual beat into one
sentence of spoken narration, and outputs a tight 30–50 second voice-over.

The ``reviewed_transcript`` from the processed JSON is passed as background
context so the LLM can use correct terminology and verify numbers — but it
must NEVER narrate anything that isn't visually present in the animation code.

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
    """Build prompt: animation code is the SOLE narration source.

    The reviewed_transcript provides human-readable mathematical context
    so the LLM can speak accurately, but the narration must describe
    only what the animation code actually renders — nothing else.
    """
    subject = data.get("subject", "Unknown Topic")
    lecture_number = data.get("lecture_number", "?")
    reviewed_transcript = data.get("reviewed_transcript", "").strip()

    parts = [
        f"Lecture {lecture_number}: {subject}\n",
        "─── ANIMATION CODE (this is your ONLY narration source) ───\n"
        "Read every self.play() call top-to-bottom. That is the video.\n"
        "Your narration must cover exactly these visual moments, in this order, "
        "and nothing else.\n\n"
        f"```python\n{manim_code}\n```\n",
    ]

    if reviewed_transcript:
        parts.append(
            "─── REVIEWED TRANSCRIPT (background context only) ───\n"
            "This is a human-written explanation of the same concept. Use it to:\n"
            "  - understand the mathematical intent behind the code\n"
            "  - pick the right terminology and phrasing\n"
            "  - ensure numerical values and definitions are correct\n"
            "Do NOT narrate anything from this text that is not visually present "
            "in the animation code above.\n\n"
            f'"{reviewed_transcript}"'
        )

    return "\n".join(parts)


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
