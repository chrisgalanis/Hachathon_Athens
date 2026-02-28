"""
VideoGenerationPipeline
=======================

Full pipeline: processed JSON → two voiced MP4 reels.

  Reel 1 — Concept
      ManimAgent animates the ``reviewed_transcript`` narrative.
      VoiceAgent sends ``reviewed_transcript`` straight to ElevenLabs (no LLM).

  Reel 2 — Example
      ManimAgent animates ``examples[0]`` step by step with concrete numbers.
      VoiceAgent asks the LLM to narrate ``examples[0]``, then synthesises it.

Steps per reel
--------------
1. Generate ManimGL script (LLM).
2. Render with ``manimgl`` CLI → silent MP4.
3. Generate / obtain narration audio → MP3.
4. Merge audio + video with ffmpeg (freeze last frame if audio is longer).

Usage::

    from backend.agents.pipeline import VideoGenerationPipeline

    pipeline = VideoGenerationPipeline(output_dir="output")
    concept_mp4, example_mp4 = await pipeline.run_from_json(
        "backend/scraper/processed/Linear_Algebra/Elimination_with_matrices/2/processed.json"
    )
    print(concept_mp4, example_mp4)
"""

import asyncio
import json
import re
import subprocess
import sys
from pathlib import Path

from .manim_agent import ManimAgent
from .voice_agent import VoiceAgent

_MANIMGL = str(Path(sys.executable).parent / "manimgl")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_scene_class(code: str) -> str:
    """Return the first Scene subclass name found in the generated code."""
    match = re.search(r"class\s+(\w+)\s*\((?:ThreeD)?Scene\)", code)
    if not match:
        raise ValueError("Could not find a Scene subclass in the generated ManimGL code.")
    return match.group(1)


def _get_duration(path: str) -> float:
    """Return the duration of a media file in seconds via ffprobe."""
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", path],
        capture_output=True, text=True, check=True,
    )
    return float(json.loads(result.stdout)["format"]["duration"])


def _merge_audio_video(video_path: str, audio_path: str, output_path: str) -> None:
    """Combine video + audio into output_path.

    If the animation is shorter than the narration the video is looped
    seamlessly to fill the audio duration — no freeze, no slowdown.
    Looping is deterministic (pure ffmpeg), appropriate for short-form
    Gen-Z/Gen-Alpha content where repeated viewing is the norm.
    """
    video_dur = _get_duration(video_path)
    audio_dur = _get_duration(audio_path)

    print(f"  Video: {video_dur:.2f}s  |  Audio: {audio_dur:.2f}s", end="")

    if audio_dur > video_dur:
        loops = int(audio_dur / video_dur) + 1
        print(f"  |  Looping video x{loops}")
        cmd = [
            "ffmpeg", "-y",
            "-stream_loop", "-1",   # loop video input indefinitely
            "-i", video_path,
            "-i", audio_path,
            "-map", "0:v",
            "-map", "1:a",
            "-c:v", "libx264", "-preset", "fast", "-crf", "18",
            "-c:a", "aac", "-b:a", "128k",
            "-shortest",            # stop exactly when audio ends
            output_path,
        ]
    else:
        print()
        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-i", audio_path,
            "-map", "0:v",
            "-map", "1:a",
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "128k",
            "-shortest",
            output_path,
        ]

    subprocess.run(cmd, check=True, capture_output=True)


def _render_manim(script_path: str, scene_class: str, video_dir: str) -> str:
    """Run the manimgl CLI and return the path of the rendered MP4."""
    cmd = [
        _MANIMGL, script_path, scene_class,
        "-w",
        "--video_dir", video_dir,
    ]
    print(f"  Rendering: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(
            f"manimgl render failed:\n{result.stderr}\n{result.stdout}"
        )

    mp4_files = sorted(Path(video_dir).rglob("*.mp4"))
    if not mp4_files:
        raise RuntimeError(
            f"manimgl reported success but no MP4 found under {video_dir}.\n"
            f"stdout:\n{result.stdout}\nstderr:\n{result.stderr}"
        )
    return str(max(mp4_files, key=lambda p: p.stat().st_mtime))


def _write_script(code: str, path: str) -> None:
    """Strip markdown fences if present, then write the Python script."""
    if code.startswith("```"):
        code = re.sub(r"^```[^\n]*\n", "", code).rstrip("`").strip()
    with open(path, "w", encoding="utf-8") as f:
        f.write(code)


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

class VideoGenerationPipeline:
    """Orchestrates ManimAgent + VoiceAgent + ffmpeg into two voiced MP4 reels.

    Args:
        output_dir: Directory where all intermediate and final files are written.
    """

    def __init__(self, output_dir: str = "output"):
        self.output_dir = Path(output_dir)
        self._finals_dir = self.output_dir / "final"       # ← voiced MP4s here
        self._scratch_dir = self.output_dir / "_scratch"   # ← scripts, audio, silent MP4s
        self._finals_dir.mkdir(parents=True, exist_ok=True)
        self._scratch_dir.mkdir(parents=True, exist_ok=True)
        self._manim_agent = ManimAgent()
        self._voice_agent = VoiceAgent()

    async def run_from_json(self, json_path: str) -> tuple[str, str]:
        """Run the full pipeline for a processed JSON file.

        Args:
            json_path: Path to a ``processed.json`` file.

        Returns:
            (concept_mp4_path, example_mp4_path)
        """
        with open(json_path, encoding="utf-8") as f:
            data = json.load(f)
        return await self.run_from_dict(data)

    async def run_from_dict(self, data: dict) -> tuple[str, str]:
        """Run the full pipeline from a pre-loaded JSON dict.

        Generates both reels in parallel where possible, then merges each.

        Args:
            data: Processed JSON dict.

        Returns:
            (concept_mp4_path, example_mp4_path)
        """
        slug = re.sub(r"\W+", "_", data.get("subject", "lecture")).strip("_")

        concept_audio    = str(self._scratch_dir / f"{slug}_concept_narration.mp3")
        example_audio    = str(self._scratch_dir / f"{slug}_example_narration.mp3")
        concept_script   = str(self._scratch_dir / f"{slug}_concept.py")
        example_script   = str(self._scratch_dir / f"{slug}_example.py")
        concept_video_dir = str(self._scratch_dir / "silent" / "concept")
        example_video_dir = str(self._scratch_dir / "silent" / "example")
        concept_mp4      = str(self._finals_dir / f"{slug}_concept.mp4")
        example_mp4      = str(self._finals_dir / f"{slug}_example.mp4")

        # ------------------------------------------------------------------ #
        # Step 1 — generate both Manim scripts in parallel
        # ------------------------------------------------------------------ #
        print("\n[1/4] Generating Manim scripts in parallel …")
        concept_manim_result, example_manim_result = await asyncio.gather(
            self._manim_agent.run_concept_reel(data),
            self._manim_agent.run_example_reel(data),
        )
        concept_code: str = concept_manim_result.output
        example_code: str = example_manim_result.output

        # ------------------------------------------------------------------ #
        # Step 2 — voice reads each animation code → narration, in parallel
        # ------------------------------------------------------------------ #
        print("\n[2/4] Generating narrations from animation code in parallel …")
        await asyncio.gather(
            self._voice_agent.run_from_code(data, concept_code, output_path=concept_audio),
            self._voice_agent.run_from_code(data, example_code, output_path=example_audio),
        )

        # ------------------------------------------------------------------ #
        # Step 3 — render + merge both reels (sequentially to avoid GPU contention)
        # ------------------------------------------------------------------ #
        print("\n[3/4] Rendering and merging …")

        _write_script(concept_code, concept_script)
        _write_script(example_code, example_script)

        print("  Rendering concept reel …")
        concept_silent = _render_manim(
            concept_script, _extract_scene_class(concept_code), concept_video_dir
        )
        print("  Rendering example reel …")
        example_silent = _render_manim(
            example_script, _extract_scene_class(example_code), example_video_dir
        )

        print("  Merging concept reel …")
        _merge_audio_video(concept_silent, concept_audio, concept_mp4)
        print("  Merging example reel …")
        _merge_audio_video(example_silent, example_audio, example_mp4)

        # ------------------------------------------------------------------ #
        # Step 4 — done
        # ------------------------------------------------------------------ #
        concept_dur = _get_duration(concept_mp4)
        example_dur = _get_duration(example_mp4)
        print(f"\n[4/4] Done!")
        print(f"  Concept reel: {concept_mp4}  ({concept_dur:.1f}s)")
        print(f"  Example reel: {example_mp4}  ({example_dur:.1f}s)")

        return concept_mp4, example_mp4
