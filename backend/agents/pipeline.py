"""
VideoGenerationPipeline
=======================

Full pipeline: processed JSON → ManimGL animation + ElevenLabs narration → MP4.

Steps
-----
1. ManimAgent   — generates the ManimGL Python script from the JSON.
2. Render       — runs `manimgl` CLI to produce a silent MP4.
3. VoiceAgent   — generates narration text (Claude) and synthesises it (ElevenLabs).
4. Merge        — ffmpeg combines video + audio; if narration is longer the last
                  frame is frozen so speech is never cut off.

Usage::

    from backend.agents.pipeline import VideoGenerationPipeline

    pipeline = VideoGenerationPipeline(output_dir="output")
    mp4_path = await pipeline.run_from_json(
        "backend/scraper/processed/Linear_Algebra/Elimination_with_matrices/2/processed.json"
    )
    print(mp4_path)
"""

import asyncio
import json
import os
import re
import subprocess
import sys
from pathlib import Path

from .manim_agent import ManimAgent
from .voice_agent import VoiceAgent

# Resolve manimgl from the same Python environment running this script
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
    """
    Combine *video_path* and *audio_path* into *output_path*.

    If narration is longer than the video the last frame is frozen for the
    extra duration so the full narration plays out.
    """
    video_dur = _get_duration(video_path)
    audio_dur = _get_duration(audio_path)
    extra = audio_dur - video_dur

    print(f"  Video: {video_dur:.2f}s  |  Audio: {audio_dur:.2f}s  |  "
          f"Freeze extension: {max(extra, 0):.2f}s")

    if extra > 0:
        print(f"  Extending video by {extra:.2f}s (freeze last frame) …")
        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-i", audio_path,
            "-filter_complex", f"[0:v]tpad=stop_mode=clone:stop_duration={extra:.3f}[v]",
            "-map", "[v]",
            "-map", "1:a",
            "-c:v", "libx264", "-preset", "fast", "-crf", "18",
            "-c:a", "aac", "-b:a", "128k",
            output_path,
        ]
    else:
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
    """
    Run the manimgl CLI and return the path of the rendered MP4.

    Raises RuntimeError if no MP4 is found after rendering.
    """
    cmd = [
        _MANIMGL, script_path, scene_class,
        "-w",                        # write to file (no preview window)
        "--video_dir", video_dir,
    ]
    print(f"  Rendering: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(
            f"manimgl render failed:\n{result.stderr}\n{result.stdout}"
        )

    # manimgl writes to video_dir/<SceneName>/<SceneName>.mp4 (or similar)
    mp4_files = sorted(Path(video_dir).rglob("*.mp4"))
    if not mp4_files:
        raise RuntimeError(
            f"manimgl reported success but no MP4 found under {video_dir}.\n"
            f"stdout:\n{result.stdout}\nstderr:\n{result.stderr}"
        )
    # Pick the most recently modified one in case there are leftovers
    return str(max(mp4_files, key=lambda p: p.stat().st_mtime))


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

class VideoGenerationPipeline:
    """Orchestrates ManimAgent + VoiceAgent + ffmpeg into a single voiced MP4.

    Args:
        output_dir: Directory where intermediate and final files are written.
            Created automatically if it does not exist.
    """

    def __init__(self, output_dir: str = "output"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._manim_agent = ManimAgent()
        self._voice_agent = VoiceAgent()

    async def run_from_json(self, json_path: str) -> str:
        """Run the full pipeline for a single processed JSON file.

        Args:
            json_path: Path to a ``processed.json`` file.

        Returns:
            Absolute path to the final voiced MP4.
        """
        with open(json_path, encoding="utf-8") as f:
            data = json.load(f)
        return await self.run_from_dict(data)

    async def run_from_dict(self, data: dict) -> str:
        """Run the full pipeline from a pre-loaded JSON dict.

        Args:
            data: Dict with keys ``lecture_number``, ``subject``,
                ``concepts``, ``examples``, and ``analogy``.

        Returns:
            Absolute path to the final voiced MP4.
        """
        subject_slug = re.sub(r"\W+", "_", data.get("subject", "lecture")).strip("_")

        # ------------------------------------------------------------------ #
        # Step 1 & 3 — generate code and narration concurrently
        # ------------------------------------------------------------------ #
        print("\n[1/4] Generating ManimGL code and narration in parallel …")
        audio_path = str(self.output_dir / f"{subject_slug}_narration.mp3")

        manim_result, _ = await asyncio.gather(
            self._manim_agent.run_from_dict(data),
            self._voice_agent.run_from_dict(data, output_path=audio_path),
        )
        manim_code: str = manim_result.output

        # ------------------------------------------------------------------ #
        # Step 2 — write script and render with manimgl
        # ------------------------------------------------------------------ #
        print("\n[2/4] Rendering ManimGL animation …")
        scene_class = _extract_scene_class(manim_code)
        script_path = str(self.output_dir / f"{subject_slug}.py")
        video_dir   = str(self.output_dir / "videos")

        with open(script_path, "w", encoding="utf-8") as f:
            f.write(manim_code)

        # Strip the markdown fences if the model wrapped the code
        if manim_code.startswith("```"):
            clean_code = re.sub(r"^```[^\n]*\n", "", manim_code).rstrip("`").strip()
            with open(script_path, "w", encoding="utf-8") as f:
                f.write(clean_code)

        silent_mp4 = _render_manim(script_path, scene_class, video_dir)
        print(f"  Silent video: {silent_mp4}")

        # ------------------------------------------------------------------ #
        # Step 4 — merge audio + video
        # ------------------------------------------------------------------ #
        print("\n[3/4] Merging audio and video …")
        final_mp4 = str(self.output_dir / f"{subject_slug}_voiced.mp4")
        _merge_audio_video(silent_mp4, audio_path, final_mp4)

        final_dur = _get_duration(final_mp4)
        print(f"\n[4/4] Done!  Final video: {final_mp4}  ({final_dur:.1f}s)")
        return final_mp4
