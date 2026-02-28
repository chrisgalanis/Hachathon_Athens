"""
Video Transcript Agent

Reads all processed.json files and uses an LLM to select and organize the most
impactful concepts into a structured, under-one-minute video transcript.

Output JSON structure:
    {
        "title": "...",
        "duration_estimate": "~X seconds",
        "selected_lectures": [{"lecture_number": ..., "subject": "...", "reason": "..."}, ...],
        "narrative_arc": "...",
        "transcript": "..."
    }

Usage (CLI):
    python -m agents.video_transcript_agent [--processed-dir PATH] [--output PATH]

Defaults:
    --processed-dir  ../scraper/processed
    --output         video_transcript.json
"""

import argparse
import asyncio
import json
import logging
from pathlib import Path
from typing import List, Optional

from pydantic import BaseModel

from .base_agent import BaseAgent

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Structured output model
# ---------------------------------------------------------------------------


class SelectedLecture(BaseModel):
    lecture_number: int
    subject: str
    reason: str


class VideoTranscript(BaseModel):
    title: str
    duration_estimate: str
    selected_lectures: List[SelectedLecture]
    narrative_arc: str
    transcript: str


# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------

_INSTRUCTIONS = """\
You are an expert science communicator and video scriptwriter specialising in mathematics.

Given a collection of processed lecture summaries (concepts, examples, analogies), your job is to:

1. **Select** the 4–6 most impactful and beginner-friendly topics that, together, tell a
   coherent story about what Linear Algebra is and why it matters.

2. **Organise** them into a logical narrative arc — start with concrete intuition, build
   toward abstraction, and end with a "wow" insight or application.

3. **Write a tight video transcript** for a video that is strictly UNDER 60 SECONDS
   (≈ 120–140 words when read at a natural pace of ~130 wpm). The transcript should:
   - Open with a hook that grabs attention in the first 5 seconds.
   - Use plain, vivid language — analogies over jargon.
   - Name 1–2 concrete examples so the viewer pictures something real.
   - Close with an inspiring statement about what mastering these ideas unlocks.
   - Sound natural when read aloud (short sentences, active voice).

Return your answer in the structured JSON format specified.
"""


class VideoTranscriptAgent(BaseAgent):
    """Organises processed lecture data into a sub-60-second video transcript."""

    def __init__(self):
        super().__init__(
            instructions=_INSTRUCTIONS,
            output_type=VideoTranscript,
        )

    async def generate(self, processed_dir: Path) -> dict:
        """Read all processed.json files and produce a video transcript dict."""
        json_files = sorted(processed_dir.rglob("processed.json"))
        if not json_files:
            raise FileNotFoundError(f"No processed.json files found under {processed_dir}")

        lectures = []
        for path in json_files:
            with path.open(encoding="utf-8") as f:
                lectures.append(json.load(f))

        # Sort by lecture number so the LLM sees them in curriculum order
        lectures.sort(key=lambda x: x.get("lecture_number", 0))

        # Build a compact summary per lecture to keep the prompt manageable
        lecture_summaries = []
        for lec in lectures:
            summary = {
                "lecture_number": lec.get("lecture_number"),
                "subject": lec.get("subject"),
                "concepts": lec.get("concepts", [])[:3],   # top 3 concepts
                "examples": lec.get("examples", [])[:2],   # top 2 examples
                "analogy": lec.get("analogy", [])[:2],     # top 2 analogies
            }
            lecture_summaries.append(summary)

        prompt = (
            "Below are processed summaries of Linear Algebra lecture content.\n"
            "Select the best subset, organise them into a narrative, and write the video transcript.\n\n"
            "LECTURE SUMMARIES (JSON):\n"
            + json.dumps(lecture_summaries, indent=2, ensure_ascii=False)
        )

        result = await self.run(prompt)
        output: VideoTranscript = result.output

        return {
            "title": output.title,
            "duration_estimate": output.duration_estimate,
            "selected_lectures": [
                {
                    "lecture_number": sl.lecture_number,
                    "subject": sl.subject,
                    "reason": sl.reason,
                }
                for sl in output.selected_lectures
            ],
            "narrative_arc": output.narrative_arc,
            "transcript": output.transcript,
        }


# ---------------------------------------------------------------------------
# CLI runner
# ---------------------------------------------------------------------------

async def _run(processed_dir: Path, output_path: Path) -> None:
    agent = VideoTranscriptAgent()

    logger.info("Reading processed JSONs from: %s", processed_dir)
    result = await agent.generate(processed_dir)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    logger.info("Video transcript written to: %s", output_path)

    # Print transcript to stdout for quick preview
    print("\n" + "=" * 60)
    print(f"TITLE: {result['title']}")
    print(f"ESTIMATED DURATION: {result['duration_estimate']}")
    print("=" * 60)
    print("\nNARRATIVE ARC:")
    print(result["narrative_arc"])
    print("\nTRANSCRIPT:")
    print(result["transcript"])
    print("=" * 60)


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    here = Path(__file__).parent
    default_processed = here.parent / "scraper" / "processed"
    default_output = here.parent / "scraper" / "processed" / "video_transcript.json"

    parser = argparse.ArgumentParser(
        description="Generate a sub-60-second video transcript from processed lecture JSONs."
    )
    parser.add_argument(
        "--processed-dir",
        type=Path,
        default=default_processed,
        help=f"Root directory containing processed.json files (default: {default_processed})",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=default_output,
        help=f"Path for the output video_transcript.json (default: {default_output})",
    )
    args = parser.parse_args()

    asyncio.run(_run(args.processed_dir, args.output))


if __name__ == "__main__":
    main()
