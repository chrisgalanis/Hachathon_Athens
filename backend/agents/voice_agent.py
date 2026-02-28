"""
VoiceAgent — generates spoken narration audio from structured math content.

Pipeline
--------
1. Formats the processed JSON (concepts / examples / analogies) into a prompt.
2. Sends it to the LLM (via BaseAgent) to produce natural narration text.
3. Passes the narration to ElevenLabs text-to-speech and writes an MP3.

Usage::

    agent = VoiceAgent()

    # From a processed JSON file:
    audio_path = await agent.run_from_json(
        "backend/scraper/processed/.../processed.json",
        output_path="narration.mp3",
    )

    # From a pre-loaded dict:
    audio_path = await agent.run_from_dict(data, output_path="narration.mp3")
"""

import json
import os
import textwrap

from .base_agent import BaseAgent

_PROMPT_PATH = os.path.join(
    os.path.dirname(__file__), "agent_prompts", "voice_agent_system_prompt.md"
)

# ElevenLabs defaults — Aria: expressive, warm female (built-in voice)
DEFAULT_VOICE_ID = "9BWtsMINqrJLrRacOk9x"
DEFAULT_MODEL_ID = "eleven_multilingual_v2"
DEFAULT_OUTPUT_FORMAT = "mp3_44100_128"


def _load_prompt() -> str:
    with open(_PROMPT_PATH, encoding="utf-8") as f:
        return f.read()


def _build_prompt_from_json(data: dict) -> str:
    """Format a processed JSON object into a narration-generation prompt."""
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

        Write a warm, natural voice-over narration for an animation of this lecture.
    """)


def _text_to_speech(text: str, output_path: str) -> None:
    """Synthesise speech with ElevenLabs and write it to *output_path* (MP3)."""
    try:
        from elevenlabs.client import ElevenLabs
    except ImportError as e:
        raise ImportError(
            "elevenlabs package is required. Install it with: pip install elevenlabs"
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
    """Agent that generates narration audio from a processed lecture JSON.

    The LLM writes the narration script; ElevenLabs converts it to speech.

    Usage::

        agent = VoiceAgent()
        audio_path = await agent.run_from_json(
            "backend/scraper/processed/Linear_Algebra/Elimination_with_matrices/2/processed.json",
            output_path="narration.mp3",
        )
    """

    def __init__(self, **kwargs):
        super().__init__(
            instructions=_load_prompt(),
            output_type=str,
            **kwargs,
        )

    async def run_from_json(self, json_path: str, output_path: str = "narration.mp3") -> str:
        """Load a processed JSON file, generate narration, and synthesise audio.

        Args:
            json_path: Path to a ``processed.json`` file with keys
                ``concepts``, ``examples``, and ``analogy``.
            output_path: Destination path for the output MP3 file.

        Returns:
            The path to the written MP3 file.
        """
        with open(json_path, encoding="utf-8") as f:
            data = json.load(f)
        return await self.run_from_dict(data, output_path=output_path)

    async def run_from_dict(self, data: dict, output_path: str = "narration.mp3") -> str:
        """Generate narration audio from a pre-loaded JSON dict.

        Args:
            data: Dict with keys ``lecture_number``, ``subject``,
                ``concepts``, ``examples``, and ``analogy``.
            output_path: Destination path for the output MP3 file.

        Returns:
            The path to the written MP3 file.
        """
        prompt = _build_prompt_from_json(data)
        result = await self.run(prompt)
        narration: str = result.output

        print(f"\n── Generated narration ({len(narration.split())} words) ──────────────")
        print(narration)
        print("──────────────────────────────────────────────────────────────────\n")

        print(f"Synthesising speech with ElevenLabs → {output_path} …")
        _text_to_speech(narration, output_path)
        print(f"Audio saved: {output_path}")

        return output_path
