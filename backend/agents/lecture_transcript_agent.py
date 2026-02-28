"""
Lecture Transcript Agent

For every processed.json found under the processed directory, generates a
short video transcript paragraph focused on that single lecture, then reviews
it for scientific accuracy — mirroring the structure of video_transcript_reviewed.json.

Output per lecture (saved alongside processed.json as transcript_reviewed.json):
    {
        "lecture_number": ...,
        "subject": "...",
        "original_transcript": "...",
        "reviewed_transcript": "...",
        "issues": [...],
        "overall_accuracy": "accurate|minor_issues|major_issues",
        "reviewer_notes": "..."
    }

Usage (CLI):
    python -m agents.lecture_transcript_agent [--processed-dir PATH]

Defaults:
    --processed-dir  ../scraper/processed
"""

import argparse
import asyncio
import json
import logging
from pathlib import Path
from typing import List, Literal

from pydantic import BaseModel

from .base_agent import BaseAgent

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Structured output models
# ---------------------------------------------------------------------------


class LectureTranscript(BaseModel):
    transcript: str


class TranscriptIssue(BaseModel):
    original_phrase: str
    issue: str
    corrected_phrase: str
    severity: Literal["minor", "major"]


class ReviewedLectureTranscript(BaseModel):
    reviewed_transcript: str
    issues: List[TranscriptIssue]
    overall_accuracy: Literal["accurate", "minor_issues", "major_issues"]
    reviewer_notes: str


# ---------------------------------------------------------------------------
# Agents
# ---------------------------------------------------------------------------

_GENERATE_INSTRUCTIONS = """\
You are an expert science communicator and video scriptwriter specialising in mathematics.

Given the concepts, examples, and analogies from a single lecture, write a tight
video transcript — a single cohesive paragraph — for a clip that is strictly UNDER
60 SECONDS (≈ 120–140 words at a natural reading pace of ~130 wpm).

The paragraph must:
- Open with a hook that grabs attention in the first sentence.
- Use plain, vivid language — prefer analogies over jargon.
- Weave in 1–2 concrete examples so the viewer pictures something real.
- Close with an inspiring statement about what mastering these ideas unlocks.
- Sound natural when read aloud (short sentences, active voice).

Return only the transcript text in the structured JSON format specified.
"""

_REVIEW_INSTRUCTIONS = """\
You are a mathematics professor and science communication expert with deep expertise
in Linear Algebra (at the level of Gilbert Strang's MIT 18.06 course).

Your task is to review a short video transcript paragraph for **scientific accuracy**.

For every sentence or phrase you encounter:
- If it is mathematically correct and clear: keep it exactly as-is.
- If it is imprecise, misleading, or outright wrong: flag it, explain the issue
  concisely, and provide a corrected rephrasing that preserves the lay-audience tone.

Common pitfalls to watch for:
- Conflating the column space with "reachable points" without noting the subspace/span structure.
- Saying eigenvectors "show no rotation" without noting this is only true for real eigenvalues.
- Overstating what a single eigenvalue "predicts" in dynamical systems.
- Confusing "null space" with "things that disappear" in a hand-wavy way.
- Any claim about matrices, determinants, inverses, or decompositions that
  contradicts standard definitions.

When writing the reviewed transcript:
- Preserve the video's engaging, accessible tone — do NOT make it dry or overly technical.
- Keep changes minimal: only fix what is genuinely wrong or misleading.
- The reviewed transcript must still fit under 60 seconds (~120–140 words).

Return your answer in the structured JSON format specified.
"""


class _GenerateAgent(BaseAgent):
    def __init__(self):
        super().__init__(instructions=_GENERATE_INSTRUCTIONS, output_type=LectureTranscript)

    async def generate(self, lecture: dict) -> str:
        prompt = (
            f"Lecture {lecture.get('lecture_number')}: {lecture.get('subject')}\n\n"
            "CONCEPTS:\n"
            + json.dumps(lecture.get("concepts", [])[:4], indent=2, ensure_ascii=False)
            + "\n\nEXAMPLES:\n"
            + json.dumps(lecture.get("examples", [])[:2], indent=2, ensure_ascii=False)
            + "\n\nANALOGIES:\n"
            + json.dumps(lecture.get("analogy", [])[:2], indent=2, ensure_ascii=False)
            + "\n\nWrite the video transcript paragraph."
        )
        result = await self.run(prompt)
        return result.output.transcript


class _ReviewAgent(BaseAgent):
    def __init__(self):
        super().__init__(instructions=_REVIEW_INSTRUCTIONS, output_type=ReviewedLectureTranscript)

    async def review(self, transcript: str, subject: str) -> ReviewedLectureTranscript:
        prompt = (
            f"Please review the following video transcript for scientific accuracy.\n\n"
            f"TOPIC: {subject}\n\n"
            f"TRANSCRIPT TO REVIEW:\n{transcript}"
        )
        result = await self.run(prompt)
        return result.output


# ---------------------------------------------------------------------------
# Public orchestrator
# ---------------------------------------------------------------------------


async def process_lecture(lecture: dict) -> dict:
    """Generate and review a transcript for a single lecture dict.

    Returns a dict ready to be serialised as transcript_reviewed.json.
    """
    generator = _GenerateAgent()
    reviewer = _ReviewAgent()

    original = await generator.generate(lecture)
    reviewed = await reviewer.review(original, lecture.get("subject", ""))

    return {
        "lecture_number": lecture.get("lecture_number"),
        "subject": lecture.get("subject"),
        "original_transcript": original,
        "reviewed_transcript": reviewed.reviewed_transcript,
        "issues": [
            {
                "original_phrase": issue.original_phrase,
                "issue": issue.issue,
                "corrected_phrase": issue.corrected_phrase,
                "severity": issue.severity,
            }
            for issue in reviewed.issues
        ],
        "overall_accuracy": reviewed.overall_accuracy,
        "reviewer_notes": reviewed.reviewer_notes,
    }


# ---------------------------------------------------------------------------
# CLI runner
# ---------------------------------------------------------------------------


async def _run(processed_dir: Path) -> None:
    json_files = sorted(processed_dir.rglob("processed.json"))
    if not json_files:
        logger.error("No processed.json files found under %s", processed_dir)
        return

    logger.info("Found %d lecture(s) to process.", len(json_files))

    for path in json_files:
        with path.open(encoding="utf-8") as f:
            lecture = json.load(f)

        subject = lecture.get("subject", "unknown")
        lecture_num = lecture.get("lecture_number", "?")
        logger.info("Processing lecture %s: %s", lecture_num, subject)

        try:
            result = await process_lecture(lecture)
        except Exception as exc:
            logger.error("Failed for lecture %s (%s): %s", lecture_num, subject, exc)
            continue

        out_path = path.parent / "transcript_reviewed.json"
        with out_path.open("w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)

        print(f"[{lecture_num}] {subject}")
        print(f"  Accuracy : {result['overall_accuracy']}")
        print(f"  Issues   : {len(result['issues'])}")
        print(f"  Saved    : {out_path}")
        print()


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    here = Path(__file__).parent
    default_processed = here.parent / "scraper" / "processed"

    parser = argparse.ArgumentParser(
        description=(
            "Generate and review a transcript paragraph for every lecture "
            "in the processed directory."
        )
    )
    parser.add_argument(
        "--processed-dir",
        type=Path,
        default=default_processed,
        help=f"Root directory containing processed.json files (default: {default_processed})",
    )
    args = parser.parse_args()

    asyncio.run(_run(args.processed_dir))


if __name__ == "__main__":
    main()
