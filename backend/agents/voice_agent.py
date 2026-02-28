"""
VoiceAgent — generates beat-synced spoken narration for ManimGL animations.

The animation code is the SOLE narration source. The voice agent reads every
``self.play()`` call top-to-bottom, groups them into logical beats (separated
by ``self.wait()``), and writes one narration segment per beat.

Each beat is synthesised to audio individually so we know its exact duration.
The pipeline uses these durations to adjust ``self.wait()`` times in the Manim
script *before* rendering — guaranteeing the animation pauses long enough for
each narration segment to finish before moving on.

The ``reviewed_transcript`` from the processed JSON is passed as background
context so the LLM can use correct terminology and verify numbers — but it
must NEVER narrate anything that isn't visually present in the animation code.

Usage::

    agent = VoiceAgent()
    beat_durations, mp3_path = await agent.run_from_code(
        data=data,
        manim_code=manim_code,
        output_path="narration.mp3",
    )
    # beat_durations = [3.2, 2.1, 4.5, ...]  seconds per beat
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
        "Group them into beats (split at self.wait() boundaries).\n"
        "Write one narration segment per beat, separated by [BEAT] markers.\n\n"
        f"```python\n{manim_code}\n```\n",
    ]

    if reviewed_transcript:
        parts.append(
            "─── REVIEWED TRANSCRIPT (background context only) ───\n"
            "This is a human-written explanation of the same concept. Use it to:\n"
            "  • understand the mathematical intent behind the code\n"
            "  • pick the right terminology and phrasing\n"
            "  • ensure numerical values and definitions are correct\n"
            "Do NOT narrate anything from this text that is not visually present "
            "in the animation code above.\n\n"
            f'"{reviewed_transcript}"'
        )

    return "\n".join(parts)


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
        # Just copy the single file
        import shutil
        shutil.copy2(mp3_paths[0], output_path)
        return

    # Build ffmpeg concat demuxer file list
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


class VoiceAgent(BaseAgent):
    """Narrates a ManimGL animation script as beat-synced voice-over.

    The animation code is the source of truth — the narration describes
    what is literally on screen, in the order it appears. The output is
    split into beats (aligned with ``self.wait()`` boundaries in the code)
    so the pipeline can adjust animation timing to match narration length.
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
    ) -> Tuple[List[float], str, str]:
        """Generate beat-synced narration from animation code, then synthesise.

        Args:
            data: Processed JSON dict (used as math context).
            manim_code: The ManimGL Python script that will play on screen.
            output_path: Destination MP3 path for the combined narration.

        Returns:
            (beat_durations, mp3_path, raw_narration) — list of seconds per
            beat, the path to the concatenated MP3, and the raw [BEAT]-delimited
            narration text from the LLM.
        """
        prompt = _build_prompt(data, manim_code)
        result = await self.run(prompt)
        raw_narration: str = result.output

        # Split into beats and optimise each for TTS
        beats = _split_beats(raw_narration)
        beats = [_optimize_for_tts(b) for b in beats]

        total_words = sum(len(b.split()) for b in beats)
        print(f"\n── Narration: {total_words} words, {len(beats)} beats ──────────────────")
        for i, b in enumerate(beats):
            print(f"  [{i}] {b}")
        print("──────────────────────────────────────────────────────────────────\n")

        # Synthesise each beat individually
        out_dir = os.path.dirname(os.path.abspath(output_path))
        slug = Path(output_path).stem
        print("  Synthesising beats …")
        beat_durations, beat_paths = _synthesise_beats(beats, out_dir, slug)

        # Concatenate all beats into one MP3
        _concat_mp3s(beat_paths, output_path)
        total_dur = sum(beat_durations)
        print(f"  Combined audio: {output_path}  ({total_dur:.1f}s)")

        return beat_durations, output_path, raw_narration
