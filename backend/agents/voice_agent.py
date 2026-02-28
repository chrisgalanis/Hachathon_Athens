"""
VoiceAgent — voice-first narration from processed lecture JSON.

The voice agent is the **source of truth** for the entire pipeline. It reads
the ``reviewed_transcript`` (concept reel) or ``examples[0]`` (example reel)
directly from the processed JSON and produces [BEAT]-delimited narration.

The narration is then passed to the ManimAgent, which animates **only** what
the narrator describes. This guarantees perfect alignment between what the
viewer hears and what they see.

Each beat is synthesised to audio individually so we know its exact duration.
The pipeline uses these durations to adjust ``self.wait()`` times in the Manim
script *before* rendering — guaranteeing the animation pauses long enough for
each narration segment to finish before moving on.

Usage::

    agent = VoiceAgent()

    # Concept reel — from reviewed_transcript
    beat_durations, mp3_path, narration = await agent.run_concept_narration(
        data=data, output_path="concept_narration.mp3",
    )

    # Example reel — from examples[0]
    beat_durations, mp3_path, narration = await agent.run_example_narration(
        data=data, output_path="example_narration.mp3",
    )
"""

import json as _json_mod
import os
import re
import subprocess
import tempfile
from pathlib import Path
from typing import List, Tuple

from .base_agent import BaseAgent

_PROMPT_PATH = os.path.join(
    os.path.dirname(__file__), "agent_prompts", "voice_agent_system_prompt.md"
)

FISH_AUDIO_TTS_URL = "https://api.fish.audio/v1/tts"
FISH_AUDIO_MODEL = "s1"


def _load_prompt() -> str:
    with open(_PROMPT_PATH, encoding="utf-8") as f:
        return f.read()


def _optimize_for_tts(text: str) -> str:
    """Fix mathematical notation so the TTS engine reads it naturally aloud."""
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


# ---------------------------------------------------------------------------
# Prompt builders — JSON is the input, NOT animation code
# ---------------------------------------------------------------------------

def _build_concept_prompt(data: dict) -> str:
    """Build prompt for concept reel narration from reviewed_transcript."""
    subject = data.get("subject", "Unknown Topic")
    lecture_number = data.get("lecture_number", "?")
    transcript = data.get("reviewed_transcript", "").strip()

    if not transcript:
        raise ValueError(
            "processed.json has no 'reviewed_transcript'. "
            "Cannot build a concept narration without it."
        )

    return (
        f"Lecture {lecture_number}: {subject}\n\n"
        "─── REVIEWED TRANSCRIPT (your primary source) ───\n"
        f'"{transcript}"\n\n'
        "Write a voice-over narration for a short animation reel that teaches "
        "this concept visually. Your narration will be handed to an animation "
        "engine that will create visuals to match exactly what you describe.\n\n"
        "IMPORTANT: Describe specific visual actions the animation should show. "
        "Name objects by their label, position, or coordinates — NEVER by color. "
        "The animation engine picks its own colors. For example:\n"
        '  - "An arrow for i-hat stretches to one, zero"\n'
        '  - "The grid warps under the transformation"\n'
        '  - "A highlight surrounds the pivot"\n\n'
        "The animator will create exactly what you describe — so be precise "
        "and visual. Never mention colors."
    )


def _build_example_prompt(data: dict) -> str:
    """Build prompt for example reel narration from examples[0]."""
    subject = data.get("subject", "Unknown Topic")
    lecture_number = data.get("lecture_number", "?")
    examples = data.get("examples", [])
    example_text = examples[0] if examples else "(no example available)"

    return (
        f"Lecture {lecture_number}: {subject} — Worked Example\n\n"
        "─── EXAMPLE TO NARRATE ───\n"
        f"{example_text}\n\n"
        "Write a voice-over narration for a short animation reel that walks "
        "through this example step by step. Your narration will be handed to "
        "an animation engine that will create visuals to match exactly what "
        "you describe.\n\n"
        "IMPORTANT: Describe specific visual actions for each step. "
        "Name every matrix, vector, number, and transformation "
        "explicitly — but NEVER mention colors. The animation engine picks "
        "its own colors. Identify objects by name or position instead. "
        "For example:\n"
        '  - "Here\'s our two-by-two matrix with entries one, two, three, four"\n'
        '  - "Watch row two — subtract three times row one"\n'
        '  - "An arrow marks the pivot position"\n\n'
        "The animator will create exactly what you describe — so be precise "
        "and visual. Show every calculation. Never reference colors."
    )


# ---------------------------------------------------------------------------
# Beat splitting & audio helpers
# ---------------------------------------------------------------------------

def _split_beats(narration: str) -> List[str]:
    """Split a [BEAT]-delimited narration into individual beat texts.

    Handles edge cases: leading/trailing markers, empty segments, etc.
    If no [BEAT] markers are found, treat the whole text as one beat.
    """
    segments = re.split(r"\[BEAT\]", narration, flags=re.IGNORECASE)
    beats = [s.strip() for s in segments if s.strip()]
    return beats if beats else [narration.strip()]


def _get_audio_duration(path: str) -> float:
    """Return the duration of an audio file in seconds via ffprobe."""
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", path],
        capture_output=True, text=True, check=True,
    )
    return float(_json_mod.loads(result.stdout)["format"]["duration"])


def _text_to_speech(text: str, output_path: str) -> None:
    """Synthesise *text* with Fish Audio and write MP3 to *output_path*."""
    try:
        import httpx
    except ImportError as e:
        raise ImportError(
            "httpx package is required: pip install httpx"
        ) from e

    api_key = os.environ.get("FISH_AUDIO_API_KEY")
    if not api_key:
        raise EnvironmentError("FISH_AUDIO_API_KEY environment variable is not set.")

    model = os.environ.get("FISH_AUDIO_MODEL", "").strip() or FISH_AUDIO_MODEL
    reference_id = os.environ.get("FISH_AUDIO_REFERENCE_ID", "").strip() or None

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "model": model,
    }
    payload: dict = {"text": text}
    if reference_id:
        payload["reference_id"] = reference_id

    response = httpx.post(FISH_AUDIO_TTS_URL, headers=headers, json=payload, timeout=60)
    response.raise_for_status()

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(response.content)


def _synthesise_beats(
    beats: List[str], output_dir: str, slug: str
) -> Tuple[List[float], List[str]]:
    """TTS each beat individually. Returns (durations, beat_mp3_paths)."""
    os.makedirs(output_dir, exist_ok=True)
    durations: List[float] = []
    paths: List[str] = []

    for i, text in enumerate(beats):
        mp3_path = os.path.join(output_dir, f"{slug}_beat_{i:02d}.mp3")
        _text_to_speech(text, mp3_path)
        dur = _get_audio_duration(mp3_path)
        durations.append(dur)
        paths.append(mp3_path)
        print(f"    Beat {i}: {dur:.2f}s  ({len(text.split())} words)")

    return durations, paths


def _concat_mp3s(mp3_paths: List[str], output_path: str) -> None:
    """Concatenate beat MP3 files into a single MP3 using ffmpeg."""
    if len(mp3_paths) == 1:
        import shutil
        shutil.copy2(mp3_paths[0], output_path)
        return

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".txt", delete=False
    ) as f:
        for p in mp3_paths:
            f.write(f"file '{os.path.abspath(p)}'\n")
        list_path = f.name

    try:
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-f", "concat", "-safe", "0",
                "-i", list_path,
                "-c", "copy",
                output_path,
            ],
            check=True, capture_output=True,
        )
    finally:
        os.unlink(list_path)


# ---------------------------------------------------------------------------
# Internal narration runner (shared by concept + example)
# ---------------------------------------------------------------------------

def _run_narration(
    raw_narration: str, output_path: str
) -> Tuple[List[float], str]:
    """Split narration into beats, TTS each, concatenate, return durations.

    Args:
        raw_narration: LLM output with [BEAT] delimiters.
        output_path: Destination MP3 path for the combined narration.

    Returns:
        (beat_durations, mp3_path)
    """
    beats = _split_beats(raw_narration)
    beats = [_optimize_for_tts(b) for b in beats]

    total_words = sum(len(b.split()) for b in beats)
    print(f"\n── Narration: {total_words} words, {len(beats)} beats ──────────────────")
    for i, b in enumerate(beats):
        print(f"  [{i}] {b}")
    print("──────────────────────────────────────────────────────────────────\n")

    out_dir = os.path.dirname(os.path.abspath(output_path))
    slug = Path(output_path).stem
    print("  Synthesising beats …")
    beat_durations, beat_paths = _synthesise_beats(beats, out_dir, slug)

    _concat_mp3s(beat_paths, output_path)
    total_dur = sum(beat_durations)
    print(f"  Combined audio: {output_path}  ({total_dur:.1f}s)")

    return beat_durations, output_path


# ---------------------------------------------------------------------------
# VoiceAgent class
# ---------------------------------------------------------------------------

class VoiceAgent(BaseAgent):
    """Voice-first narration agent — reads JSON, produces [BEAT]-delimited
    narration that drives the entire animation pipeline.

    The narration is the source of truth. The Manim agent animates only
    what the narrator describes.
    """

    def __init__(self, **kwargs):
        super().__init__(
            instructions=_load_prompt(),
            output_type=str,
            **kwargs,
        )

    async def run_concept_narration(
        self,
        data: dict,
        output_path: str = "concept_narration.mp3",
    ) -> Tuple[List[float], str, str]:
        """Generate concept reel narration from reviewed_transcript.

        Args:
            data: Processed JSON dict; must contain ``reviewed_transcript``.
            output_path: Destination MP3 path for the combined narration.

        Returns:
            (beat_durations, mp3_path, raw_narration)
        """
        prompt = _build_concept_prompt(data)
        result = await self.run(prompt)
        raw_narration: str = result.output

        beat_durations, mp3_path = _run_narration(raw_narration, output_path)
        return beat_durations, mp3_path, raw_narration

    async def run_example_narration(
        self,
        data: dict,
        output_path: str = "example_narration.mp3",
    ) -> Tuple[List[float], str, str]:
        """Generate example reel narration from examples[0].

        Args:
            data: Processed JSON dict; uses ``examples[0]``.
            output_path: Destination MP3 path for the combined narration.

        Returns:
            (beat_durations, mp3_path, raw_narration)
        """
        prompt = _build_example_prompt(data)
        result = await self.run(prompt)
        raw_narration: str = result.output

        beat_durations, mp3_path = _run_narration(raw_narration, output_path)
        return beat_durations, mp3_path, raw_narration
