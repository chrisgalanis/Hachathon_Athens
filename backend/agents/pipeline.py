"""
VideoGenerationPipeline
=======================

Full pipeline: processed JSON → two voiced, beat-synced MP4 reels.

  Reel 1 — Concept
      ManimAgent animates the ``reviewed_transcript`` narrative.
      VoiceAgent reads the animation code, writes [BEAT]-delimited narration.

  Reel 2 — Example
      ManimAgent animates ``examples[0]`` step by step with concrete numbers.
      VoiceAgent reads the animation code, writes [BEAT]-delimited narration.

Steps per reel
--------------
1. Generate ManimGL script (LLM).
2. Generate beat-segmented narration from the code → per-beat MP3s.
3. Revise the ManimGL script so visuals (colors, labels, objects) match
   the narration exactly (LLM revision pass).
4. Adjust ``self.wait()`` durations in the script so each animation beat
   pauses long enough for its narration segment to finish.
5. Render the timing-adjusted script with ``manimgl`` CLI → silent MP4.
6. Merge audio + video with ffmpeg (freeze last frame if needed).

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
from typing import List

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

    If the animation is shorter than the narration the last frame is
    frozen (held) until the audio finishes — clean and natural for
    educational content where the viewer needs time to absorb the result.
    """
    video_dur = _get_duration(video_path)
    audio_dur = _get_duration(audio_path)

    print(f"  Video: {video_dur:.2f}s  |  Audio: {audio_dur:.2f}s", end="")

    if audio_dur > video_dur:
        freeze_secs = audio_dur - video_dur
        print(f"  |  Freezing last frame +{freeze_secs:.1f}s")
        # Use tpad filter to hold the last frame until the audio ends.
        # tpad=stop_mode=clone:stop_duration=N  clones the final frame
        # for N extra seconds — no re-encoding artefacts, pixel-perfect.
        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-i", audio_path,
            "-filter_complex",
            f"[0:v]tpad=stop_mode=clone:stop_duration={freeze_secs:.3f}[v]",
            "-map", "[v]",
            "-map", "1:a",
            "-c:v", "libx264", "-preset", "fast", "-crf", "18",
            "-c:a", "aac", "-b:a", "128k",
            "-shortest",
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
# Beat-sync timing adjustment
# ---------------------------------------------------------------------------

# Matches self.wait(), self.wait(N), self.wait(N.N) — with any whitespace
_WAIT_RE = re.compile(r"self\.wait\(\s*(\d+\.?\d*)?\s*\)")

# Matches self.play(..., run_time=N, ...) — captures the run_time value
_PLAY_RUNTIME_RE = re.compile(r"run_time\s*=\s*(\d+\.?\d*)")


def _estimate_beat_anim_durations(code: str) -> List[float]:
    """Walk the construct() body and estimate how long each beat takes.

    A "beat" = everything between consecutive self.wait() calls.
    Returns one duration per beat (sum of self.play run_times + self.wait).
    Default run_time for a self.play() with no explicit arg is 1.0s.
    Default self.wait() with no arg is 1.0s.
    """
    # Extract just the construct body lines
    lines = code.split("\n")
    in_construct = False
    beat_dur = 0.0
    durations: List[float] = []

    for line in lines:
        stripped = line.strip()

        if "def construct(self)" in stripped:
            in_construct = True
            continue
        if not in_construct:
            continue
        # End of construct (next def or class at same/lower indent)
        if stripped.startswith("def ") or stripped.startswith("class "):
            break

        # self.play(...) — accumulate run_time
        if "self.play(" in stripped:
            rt_match = _PLAY_RUNTIME_RE.search(stripped)
            beat_dur += float(rt_match.group(1)) if rt_match else 1.0

        # self.wait(...) — marks end of a beat
        wait_match = _WAIT_RE.search(stripped)
        if wait_match:
            wait_val = float(wait_match.group(1)) if wait_match.group(1) else 1.0
            beat_dur += wait_val
            durations.append(beat_dur)
            beat_dur = 0.0

    # Trailing beat after last self.wait (or if there's no wait at all)
    if beat_dur > 0 or not durations:
        durations.append(max(beat_dur, 1.0))

    return durations


def _adjust_wait_times(code: str, beat_audio_durations: List[float]) -> str:
    """Rewrite self.wait() durations so each beat has room for its narration.

    For each beat, if the narration audio is longer than the animation
    (play run_times + original wait), the self.wait() at the end of that
    beat is increased to fill the gap. If the animation is already long
    enough, the wait is left unchanged.

    If there are more beats in the audio than self.wait() calls in the code,
    the extra audio time is added to the final wait. If there are fewer audio
    beats, extra self.wait()s keep their original values.
    """
    anim_durations = _estimate_beat_anim_durations(code)

    print(f"  Beat sync: {len(anim_durations)} code beats, {len(beat_audio_durations)} audio beats")
    for i, (anim, audio) in enumerate(
        zip(anim_durations, beat_audio_durations)
    ):
        print(f"    Beat {i}: anim={anim:.1f}s  audio={audio:.1f}s")

    # Compute the new wait value for each beat
    lines = code.split("\n")
    in_construct = False
    beat_idx = 0
    play_accum = 0.0  # accumulated play time in current beat
    new_lines: List[str] = []

    for line in lines:
        stripped = line.strip()

        if "def construct(self)" in stripped:
            in_construct = True
            new_lines.append(line)
            continue
        if not in_construct:
            new_lines.append(line)
            continue
        if stripped.startswith("def ") or stripped.startswith("class "):
            in_construct = False
            new_lines.append(line)
            continue

        # Track play time
        if "self.play(" in stripped:
            rt_match = _PLAY_RUNTIME_RE.search(stripped)
            play_accum += float(rt_match.group(1)) if rt_match else 1.0

        # Rewrite self.wait() if we have audio duration info for this beat
        wait_match = _WAIT_RE.search(stripped)
        if wait_match and in_construct:
            original_wait = float(wait_match.group(1)) if wait_match.group(1) else 1.0

            if beat_idx < len(beat_audio_durations):
                audio_dur = beat_audio_durations[beat_idx]
                # How much time the plays already take
                anim_time_without_wait = play_accum
                # Minimum wait = audio duration minus play time (at least original)
                needed_wait = max(audio_dur - anim_time_without_wait, original_wait)
                # Round to 1 decimal
                needed_wait = round(needed_wait, 1)

                # Replace the wait value in the line
                indent = line[: len(line) - len(line.lstrip())]
                new_lines.append(f"{indent}self.wait({needed_wait})")

                if needed_wait > original_wait:
                    print(
                        f"    Beat {beat_idx}: wait {original_wait}→{needed_wait}s "
                        f"(+{needed_wait - original_wait:.1f}s for narration)"
                    )
            else:
                new_lines.append(line)

            beat_idx += 1
            play_accum = 0.0
            continue

        new_lines.append(line)

    # If audio has more beats than code waits, extend the very last wait
    if len(beat_audio_durations) > len(anim_durations):
        extra_audio = sum(beat_audio_durations[len(anim_durations):])
        print(f"    Adding {extra_audio:.1f}s extra wait at end for {len(beat_audio_durations) - len(anim_durations)} extra audio beats")
        # Find last self.wait and increase it
        for i in range(len(new_lines) - 1, -1, -1):
            wm = _WAIT_RE.search(new_lines[i])
            if wm:
                old_val = float(wm.group(1)) if wm.group(1) else 1.0
                new_val = round(old_val + extra_audio, 1)
                indent = new_lines[i][: len(new_lines[i]) - len(new_lines[i].lstrip())]
                new_lines[i] = f"{indent}self.wait({new_val})"
                break

    return "\n".join(new_lines)


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
        # Separate ManimAgent instances so each keeps its own conversation
        # history for the revision follow-up call.
        self._concept_manim_agent = ManimAgent()
        self._example_manim_agent = ManimAgent()
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
        """Run the full beat-synced pipeline from a pre-loaded JSON dict.

        Flow per reel:
          1. LLM generates ManimGL script.
          2. LLM generates [BEAT]-delimited narration from the script.
          3. LLM revises the Manim script so visuals match narration exactly
             (colors, labels, objects).
          4. Each beat is TTS'd individually → per-beat MP3s with known durations.
          5. ``self.wait()`` durations in the Manim code are adjusted so the
             animation pauses long enough for each narration beat.
          6. The timing-adjusted script is rendered → silent MP4.
          7. Audio + video are merged with ffmpeg.

        Args:
            data: Processed JSON dict.

        Returns:
            (concept_mp4_path, example_mp4_path)
        """
        slug = re.sub(r"\W+", "_", data.get("subject", "lecture")).strip("_")

        concept_audio     = str(self._scratch_dir / f"{slug}_concept_narration.mp3")
        example_audio     = str(self._scratch_dir / f"{slug}_example_narration.mp3")
        concept_script    = str(self._scratch_dir / f"{slug}_concept.py")
        example_script    = str(self._scratch_dir / f"{slug}_example.py")
        concept_video_dir = str(self._scratch_dir / "silent" / "concept")
        example_video_dir = str(self._scratch_dir / "silent" / "example")
        concept_mp4       = str(self._finals_dir / f"{slug}_concept.mp4")
        example_mp4       = str(self._finals_dir / f"{slug}_example.mp4")

        # ------------------------------------------------------------------ #
        # Step 1 — generate both Manim scripts in parallel (LLM)
        # ------------------------------------------------------------------ #
        print("\n[1/7] Generating Manim scripts in parallel …")
        concept_manim_result, example_manim_result = await asyncio.gather(
            self._concept_manim_agent.run_concept_reel(data),
            self._example_manim_agent.run_example_reel(data),
        )
        concept_code: str = concept_manim_result.output
        example_code: str = example_manim_result.output

        # ------------------------------------------------------------------ #
        # Step 2 — voice agent reads each script → beat-delimited narration
        #          Each beat is TTS'd individually so we know exact durations.
        # ------------------------------------------------------------------ #
        print("\n[2/7] Generating beat-synced narrations in parallel …")
        (concept_beats, _, concept_narration), (example_beats, _, example_narration) = (
            await asyncio.gather(
                self._voice_agent.run_from_code(data, concept_code, output_path=concept_audio),
                self._voice_agent.run_from_code(data, example_code, output_path=example_audio),
            )
        )

        # ------------------------------------------------------------------ #
        # Step 3 — revise Manim scripts to match narration exactly
        #          (colours, labels, objects, order)
        # ------------------------------------------------------------------ #
        print("\n[3/7] Revising Manim scripts to match narration …")

        print("  Revising concept reel …")
        concept_revised_result, example_revised_result = await asyncio.gather(
            self._concept_manim_agent.revise_to_match_narration(concept_code, concept_narration),
            self._example_manim_agent.revise_to_match_narration(example_code, example_narration),
        )
        concept_code = concept_revised_result.output
        print("  Revising example reel …")
        example_code = example_revised_result.output

        # ------------------------------------------------------------------ #
        # Step 4 — adjust self.wait() durations so animation syncs to narration
        # ------------------------------------------------------------------ #
        print("\n[4/7] Adjusting animation timing to match narration beats …")

        print("  Concept reel:")
        concept_code = _adjust_wait_times(concept_code, concept_beats)
        print("  Example reel:")
        example_code = _adjust_wait_times(example_code, example_beats)

        # ------------------------------------------------------------------ #
        # Step 5 — render timing-adjusted scripts + merge with audio
        # ------------------------------------------------------------------ #
        print("\n[5/7] Rendering and merging …")

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
        # Step 6 — done
        # ------------------------------------------------------------------ #
        concept_dur = _get_duration(concept_mp4)
        example_dur = _get_duration(example_mp4)
        print(f"\n[6/7] Done!")
        print(f"  Concept reel: {concept_mp4}  ({concept_dur:.1f}s)")
        print(f"  Example reel: {example_mp4}  ({example_dur:.1f}s)")

        return concept_mp4, example_mp4
