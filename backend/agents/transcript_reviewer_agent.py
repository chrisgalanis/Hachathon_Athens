"""
Transcript Reviewer Agent

Reads a video_transcript.json produced by VideoTranscriptAgent and uses an LLM
with deep subject-matter knowledge to check every claim for scientific accuracy.
Incorrect or misleading statements are rephrased; correct ones are kept as-is.

Output JSON structure:
    {
        "original_transcript": "...",
        "reviewed_transcript": "...",
        "issues": [
            {
                "original_phrase": "...",
                "issue": "...",
                "corrected_phrase": "...",
                "severity": "minor|major"
            },
            ...
        ],
        "overall_accuracy": "accurate|minor_issues|major_issues",
        "reviewer_notes": "..."
    }

Usage (CLI):
    python -m agents.transcript_reviewer_agent [--input PATH] [--output PATH]

Defaults:
    --input   ../scraper/processed/video_transcript.json
    --output  ../scraper/processed/video_transcript_reviewed.json
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
# Structured output model
# ---------------------------------------------------------------------------


class TranscriptIssue(BaseModel):
    original_phrase: str
    issue: str
    corrected_phrase: str
    severity: Literal["minor", "major"]


class ReviewedTranscript(BaseModel):
    reviewed_transcript: str
    issues: List[TranscriptIssue]
    overall_accuracy: Literal["accurate", "minor_issues", "major_issues"]
    reviewer_notes: str


# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------

_INSTRUCTIONS = """\
You are a mathematics professor and science communication expert with deep expertise
in Linear Algebra (at the level of Gilbert Strang's MIT 18.06 course).

Your task is to review a short video transcript for **scientific accuracy**.

For every sentence or phrase you encounter:
- If it is mathematically correct and clear: keep it exactly as-is.
- If it is imprecise, misleading, or outright wrong: flag it, explain the issue
  concisely, and provide a corrected rephrasing that preserves the lay-audience tone.

Common pitfalls to watch for:
- Conflating the column space with "reachable points" without noting that it is
  the span of the matrix's columns (a subspace of the output space).
- Saying eigenvectors "show no rotation" without noting this is only true when
  the eigenvalue is real.
- Overstating what a single eigenvalue "predicts" in dynamical systems
  (growth/decay depends on ALL eigenvalues, not just the largest in general).
- Confusing "null space" with "things that disappear" in a hand-wavy way that
  could mislead (null space vectors map to zero, not to non-existence).
- Any claim about matrices, determinants, inverses, or decompositions that
  contradicts standard definitions.

When writing the reviewed transcript:
- Preserve the video's engaging, accessible tone — do NOT make it dry or overly technical.
- Keep changes minimal: only fix what is genuinely wrong or misleading.
- The reviewed transcript must still fit under 60 seconds (~120–140 words).

Return your answer in the structured JSON format specified.
"""


class TranscriptReviewerAgent(BaseAgent):
    """Reviews a video transcript for scientific accuracy and rephrases errors."""

    def __init__(self):
        super().__init__(
            instructions=_INSTRUCTIONS,
            output_type=ReviewedTranscript,
        )

    async def review(self, transcript_path: Path) -> dict:
        """Read a video_transcript.json, review it, and return the result as a dict."""
        with transcript_path.open(encoding="utf-8") as f:
            data = json.load(f)

        original_transcript: str = data.get("transcript", "")
        if not original_transcript.strip():
            raise ValueError(f"No transcript found in {transcript_path}")

        context = (
            f"Title: {data.get('title', '')}\n"
            f"Selected lectures: "
            + ", ".join(
                f"Lecture {sl['lecture_number']} ({sl['subject']})"
                for sl in data.get("selected_lectures", [])
            )
        )

        prompt = (
            "Please review the following video transcript for scientific accuracy.\n\n"
            f"CONTEXT:\n{context}\n\n"
            f"TRANSCRIPT TO REVIEW:\n{original_transcript}"
        )

        result = await self.run(prompt)
        output: ReviewedTranscript = result.output

        return {
            "original_transcript": original_transcript,
            "reviewed_transcript": output.reviewed_transcript,
            "issues": [
                {
                    "original_phrase": issue.original_phrase,
                    "issue": issue.issue,
                    "corrected_phrase": issue.corrected_phrase,
                    "severity": issue.severity,
                }
                for issue in output.issues
            ],
            "overall_accuracy": output.overall_accuracy,
            "reviewer_notes": output.reviewer_notes,
        }


# ---------------------------------------------------------------------------
# CLI runner
# ---------------------------------------------------------------------------

async def _run(input_path: Path, output_path: Path) -> None:
    agent = TranscriptReviewerAgent()

    logger.info("Reviewing transcript: %s", input_path)
    result = await agent.review(input_path)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    logger.info("Reviewed transcript written to: %s", output_path)

    # Print summary to stdout
    print("\n" + "=" * 60)
    print(f"OVERALL ACCURACY: {result['overall_accuracy'].upper()}")
    print(f"ISSUES FOUND: {len(result['issues'])}")
    print("=" * 60)

    if result["issues"]:
        print("\nISSUES:")
        for i, issue in enumerate(result["issues"], 1):
            print(f"\n  [{i}] [{issue['severity'].upper()}]")
            print(f"  Original : {issue['original_phrase']}")
            print(f"  Problem  : {issue['issue']}")
            print(f"  Fix      : {issue['corrected_phrase']}")

    print("\nREVIEWED TRANSCRIPT:")
    print(result["reviewed_transcript"])
    print("\nREVIEWER NOTES:")
    print(result["reviewer_notes"])
    print("=" * 60)


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    here = Path(__file__).parent
    default_input = here.parent / "scraper" / "processed" / "video_transcript.json"
    default_output = here.parent / "scraper" / "processed" / "video_transcript_reviewed.json"

    parser = argparse.ArgumentParser(
        description="Review a video transcript for scientific accuracy."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=default_input,
        help=f"Path to video_transcript.json (default: {default_input})",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=default_output,
        help=f"Path for the reviewed output JSON (default: {default_output})",
    )
    args = parser.parse_args()

    asyncio.run(_run(args.input, args.output))


if __name__ == "__main__":
    main()
