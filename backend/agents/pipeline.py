"""
VideoGenerationPipeline
=======================

Voice-first pipeline: processed JSON → two voiced, beat-synced MP4 reels.

The voice agent is the **source of truth**. It reads the JSON and produces
[BEAT]-delimited narration. The Manim agent then generates animation code
that matches **exactly** what the narrator describes.

  Reel 1 — Concept
      VoiceAgent reads ``reviewed_transcript`` → beat-delimited narration.
      ManimAgent animates the narration beat by beat.

  Reel 2 — Example
      VoiceAgent reads ``examples[0]`` → beat-delimited narration.
      ManimAgent animates the narration beat by beat.

Steps per reel
--------------
1. Voice agent generates [BEAT]-delimited narration from JSON.
2. Each beat is TTS'd individually → per-beat MP3s with known durations.
3. Manim agent generates ManimGL script from the narration (one self.wait()
   per [BEAT] boundary).
4. Adjust ``self.wait()`` durations so animation pauses long enough for each
   narration beat.
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
import shutil
import subprocess
import sys
from pathlib import Path
from typing import List

from .manim_agent import ManimAgent
from .voice_agent import VoiceAgent, _split_beats

# Resolve manimgl: prefer PATH lookup, then look in the same venv as the
# running interpreter, then fall back to the Hackathon-Athens backend venv.
def _find_manimgl() -> str:
    found = shutil.which("manimgl")
    if found:
        return found
    # Same directory as current Python executable
    candidate = Path(sys.executable).parent / "manimgl"
    if candidate.exists():
        return str(candidate)
    # Hard-coded fallback for the project venv
    fallback = Path(__file__).parent.parent / ".venv" / "bin" / "manimgl"
    if fallback.exists():
        return str(fallback)
    return str(candidate)  # will fail with a clear message

_MANIMGL = _find_manimgl()
print(f"[pipeline] manimgl resolved to: {_MANIMGL}")


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
        "-r", "1080x1920",          # 9:16 portrait
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


def _save_subtitle_json(
    narration: str,
    beat_durations: List[float],
    output_path: str,
) -> None:
    """Save beat-level subtitle data as JSON for downstream subtitle generation.

    Each entry has the beat text, its duration, and cumulative start/end
    timestamps — everything needed to produce SRT, VTT, or ASS subtitles.
    """
    beats = _split_beats(narration)
    entries = []
    cursor = 0.0
    for i, (text, dur) in enumerate(zip(beats, beat_durations)):
        entries.append({
            "beat": i,
            "start": round(cursor, 3),
            "end": round(cursor + dur, 3),
            "duration": round(dur, 3),
            "text": text,
        })
        cursor += dur
    # If there are more beats than durations, append them with 0 duration
    for j in range(len(beat_durations), len(beats)):
        entries.append({
            "beat": j,
            "start": round(cursor, 3),
            "end": round(cursor, 3),
            "duration": 0.0,
            "text": beats[j],
        })

    payload = {
        "total_duration": round(cursor, 3),
        "beat_count": len(entries),
        "beats": entries,
    }
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    print(f"  Saved subtitle data → {output_path}")


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
        if stripped.startswith("def ") or stripped.startswith("class "):
            break

        if "self.play(" in stripped:
            rt_match = _PLAY_RUNTIME_RE.search(stripped)
            beat_dur += float(rt_match.group(1)) if rt_match else 1.0

        wait_match = _WAIT_RE.search(stripped)
        if wait_match:
            wait_val = float(wait_match.group(1)) if wait_match.group(1) else 1.0
            beat_dur += wait_val
            durations.append(beat_dur)
            beat_dur = 0.0

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

    lines = code.split("\n")
    in_construct = False
    beat_idx = 0
    play_accum = 0.0
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

        if "self.play(" in stripped:
            rt_match = _PLAY_RUNTIME_RE.search(stripped)
            play_accum += float(rt_match.group(1)) if rt_match else 1.0

        wait_match = _WAIT_RE.search(stripped)
        if wait_match and in_construct:
            original_wait = float(wait_match.group(1)) if wait_match.group(1) else 1.0

            if beat_idx < len(beat_audio_durations):
                audio_dur = beat_audio_durations[beat_idx]
                anim_time_without_wait = play_accum
                needed_wait = max(audio_dur - anim_time_without_wait, original_wait)
                needed_wait = round(needed_wait, 1)

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

    if len(beat_audio_durations) > len(anim_durations):
        extra_audio = sum(beat_audio_durations[len(anim_durations):])
        print(f"    Adding {extra_audio:.1f}s extra wait at end for {len(beat_audio_durations) - len(anim_durations)} extra audio beats")
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
    """Voice-first pipeline: VoiceAgent → ManimAgent → ffmpeg → voiced MP4 reels.

    The voice agent reads the JSON and produces narration. The Manim agent
    animates exactly what the narrator describes. Timing is adjusted so
    the animation pauses long enough for each narration beat.

    Args:
        output_dir: Directory where all intermediate and final files are written.
    """

    def __init__(self, output_dir: str = "output"):
        self.output_dir = Path(output_dir)
        self._finals_dir = self.output_dir / "final"
        self._scratch_dir = self.output_dir / "_scratch"
        self._finals_dir.mkdir(parents=True, exist_ok=True)
        self._scratch_dir.mkdir(parents=True, exist_ok=True)
        self._voice_agent = VoiceAgent()
        self._manim_agent = ManimAgent()

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
        """Run the full voice-first pipeline from a pre-loaded JSON dict.

        Flow per reel:
          1. Voice agent reads JSON → [BEAT]-delimited narration + TTS.
          2. Manim agent reads narration → ManimGL script (one self.wait()
             per beat boundary).
          3. self.wait() durations adjusted to match per-beat audio durations.
          4. Timing-adjusted script rendered → silent MP4.
          5. Audio + video merged with ffmpeg.

        Args:
            data: Processed JSON dict.

        Returns:
            (concept_mp4_path, example_mp4_path)
        """
        slug = re.sub(r"\W+", "_", data.get("subject", "lecture")).strip("_")
        subject = data.get("subject", "Unknown Topic")
        lecture_number = str(data.get("lecture_number", "?"))

        concept_audio     = str(self._scratch_dir / f"{slug}_concept_narration.mp3")
        example_audio     = str(self._scratch_dir / f"{slug}_example_narration.mp3")
        concept_subs      = str(self._finals_dir / f"{slug}_concept_subtitles.json")
        example_subs      = str(self._finals_dir / f"{slug}_example_subtitles.json")
        concept_script    = str(self._scratch_dir / f"{slug}_concept.py")
        example_script    = str(self._scratch_dir / f"{slug}_example.py")
        concept_video_dir = str(self._scratch_dir / "silent" / "concept")
        example_video_dir = str(self._scratch_dir / "silent" / "example")
        concept_mp4       = str(self._finals_dir / f"{slug}_concept.mp4")
        example_mp4       = str(self._finals_dir / f"{slug}_example.mp4")

        # ------------------------------------------------------------------ #
        # Step 1 — Voice agent generates narration from JSON (source of truth)
        # ------------------------------------------------------------------ #
        print("\n[1/5] Generating narrations from JSON in parallel …")
        (concept_beats, _, concept_narration), (example_beats, _, example_narration) = (
            await asyncio.gather(
                self._voice_agent.run_concept_narration(data, output_path=concept_audio),
                self._voice_agent.run_example_narration(data, output_path=example_audio),
            )
        )

        # Save subtitle JSON for both reels
        _save_subtitle_json(concept_narration, concept_beats, concept_subs)
        _save_subtitle_json(example_narration, example_beats, example_subs)

        # ------------------------------------------------------------------ #
        # Step 2 — Manim agent generates animation FROM the narration
        # ------------------------------------------------------------------ #
        print("\n[2/5] Generating Manim scripts from narration in parallel …")
        concept_manim_result, example_manim_result = await asyncio.gather(
            self._manim_agent.run_from_narration(
                concept_narration, subject, lecture_number, reel_type="concept"
            ),
            self._manim_agent.run_from_narration(
                example_narration, subject, lecture_number, reel_type="example"
            ),
        )
        concept_code: str = concept_manim_result.output
        example_code: str = example_manim_result.output

        # ------------------------------------------------------------------ #
        # Step 3 — Adjust self.wait() durations to match narration beats
        # ------------------------------------------------------------------ #
        print("\n[3/5] Adjusting animation timing to match narration beats …")

        print("  Concept reel:")
        concept_code = _adjust_wait_times(concept_code, concept_beats)
        print("  Example reel:")
        example_code = _adjust_wait_times(example_code, example_beats)

        # ------------------------------------------------------------------ #
        # Step 4 — Render timing-adjusted scripts + merge with audio
        #           Retries up to MAX_RENDER_ATTEMPTS times, regenerating the
        #           Manim script from scratch on each failure.
        # ------------------------------------------------------------------ #
        MAX_RENDER_ATTEMPTS = 3
        print("\n[4/5] Rendering and merging …")

        # --- Concept reel render with retry ---
        concept_silent: str | None = None
        for attempt in range(1, MAX_RENDER_ATTEMPTS + 1):
            try:
                _write_script(concept_code, concept_script)
                print(f"  Rendering concept reel (attempt {attempt}/{MAX_RENDER_ATTEMPTS}) …")
                concept_silent = _render_manim(
                    concept_script, _extract_scene_class(concept_code), concept_video_dir
                )
                break
            except Exception as exc:
                print(f"  Concept render attempt {attempt} failed: {exc}")
                if attempt == MAX_RENDER_ATTEMPTS:
                    raise
                # Fix the Manim script using the actual error message
                print("  Fixing concept Manim script …")
                concept_manim_result = await self._manim_agent.fix_error(
                    concept_narration, concept_code, str(exc),
                    subject, lecture_number, reel_type="concept"
                )
                concept_code = _adjust_wait_times(
                    concept_manim_result.output, concept_beats
                )

        # --- Example reel render with retry ---
        example_silent: str | None = None
        for attempt in range(1, MAX_RENDER_ATTEMPTS + 1):
            try:
                _write_script(example_code, example_script)
                print(f"  Rendering example reel (attempt {attempt}/{MAX_RENDER_ATTEMPTS}) …")
                example_silent = _render_manim(
                    example_script, _extract_scene_class(example_code), example_video_dir
                )
                break
            except Exception as exc:
                print(f"  Example render attempt {attempt} failed: {exc}")
                if attempt == MAX_RENDER_ATTEMPTS:
                    raise
                print("  Fixing example Manim script …")
                example_manim_result = await self._manim_agent.fix_error(
                    example_narration, example_code, str(exc),
                    subject, lecture_number, reel_type="example"
                )
                example_code = _adjust_wait_times(
                    example_manim_result.output, example_beats
                )

        print("  Merging concept reel …")
        _merge_audio_video(concept_silent, concept_audio, concept_mp4)
        print("  Merging example reel …")
        _merge_audio_video(example_silent, example_audio, example_mp4)

        # ------------------------------------------------------------------ #
        # Step 5 — Done
        # ------------------------------------------------------------------ #
        concept_dur = _get_duration(concept_mp4)
        example_dur = _get_duration(example_mp4)
        print(f"\n[5/5] Done!")
        print(f"  Concept reel: {concept_mp4}  ({concept_dur:.1f}s)")
        print(f"  Example reel: {example_mp4}  ({example_dur:.1f}s)")

        return concept_mp4, example_mp4
