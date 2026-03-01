"""
Data Processor Agent

Reads lecture data.json files and uses an LLM to extract a structured
summary with concepts, examples, and (optionally) analogies.

Output JSON structure per lecture:
    {
        "lecture_number": ...,
        "subject": "...",
        "concepts": ["...", ...],
        "examples": ["...", ...],
        "analogy": ["...", ...]   # omitted when no analogies are found
    }

Usage (CLI):
    python -m agents.data_processor_agent [--input-dir PATH] [--output-dir PATH]

Defaults:
    --input-dir   ../scraper/data
    --output-dir  ../scraper/processed
"""

import argparse
import asyncio
import json
import logging
import os
from pathlib import Path
from typing import List, Optional

from pydantic import BaseModel

from .base_agent import BaseAgent

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Structured output model
# ---------------------------------------------------------------------------


class LectureStructure(BaseModel):
    subject: str
    course: str
    concepts: List[str]
    examples: List[str]
    analogy: Optional[List[str]] = None


# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------

_INSTRUCTIONS = """\
You are an educational content processor specialising in mathematics and science lectures.

Given a lecture transcript, extract and return:

0. **subject** — The specific topic of this lecture (e.g. "AWGN Channel", "Eigenvalues and Eigenvectors").
   Infer it from the content itself; do NOT just repeat the filename or any hint given in the prompt.
   Use a concise, academically correct name (3–6 words).

0. **course** — The academic course or discipline this topic belongs to
   (e.g. "Digital Communications", "Linear Algebra", "Signal Processing", "Information Theory").
   Infer this from the content; pick the most specific correct course name.

1. **concepts** — A list of the core ideas, definitions, theorems, and key takeaways
   explained in the lecture.
   Immediately follow it with a simpler explanation in plain language (1–3 sentences) that makes it easy for a beginner to understand.

2. **examples** — A list of concrete examples, worked problems, or calculations used
   to illustrate the concepts. Describe each example specifically
   (e.g. "Solving 2x − y = 0 and −x + 2y = 3 to find the solution x = 1, y = 2").

3. **analogy** (OPTIONAL) — A list of analogies used to relate abstract ideas to
   familiar concepts (e.g. comparing a matrix to a function in calculus).
   ONLY include this field when the transcript actually contains analogies.
   If no analogies are present, leave this field out entirely.
"""


class DataProcessorAgent(BaseAgent):
    """Processes lecture transcripts into structured concept/example/analogy JSON."""

    def __init__(self):
        super().__init__(
            instructions=_INSTRUCTIONS,
            output_type=LectureStructure,
        )

    async def process_file(self, data_json_path: str | Path) -> dict:
        """Read a data.json file and return the structured output as a dict."""
        data_json_path = Path(data_json_path)

        with data_json_path.open(encoding="utf-8") as f:
            data = json.load(f)

        content: str = data.get("content", "")
        subject: str = data.get("subject", "")
        lecture_number = data.get("lecture_number", "")

        if not content.strip():
            logger.warning("Empty content in %s — skipping.", data_json_path)
            return {}

        prompt = (
            f'Process the following lecture transcript.\n'
            f'Lecture {lecture_number}: "{subject}"\n\n'
            f'TRANSCRIPT:\n{content}'
        )

        result = await self.run(prompt)
        structure: LectureStructure = result.output

        output: dict = {
            "lecture_number": lecture_number,
            "subject": structure.subject or subject,
            "course": structure.course,
            "concepts": structure.concepts,
            "examples": structure.examples,
        }

        if structure.analogy:
            output["analogy"] = structure.analogy

        return output


# ---------------------------------------------------------------------------
# CLI runner
# ---------------------------------------------------------------------------

async def _process_all(input_dir: Path, output_dir: Path, limit: int | None = None) -> None:
    agent = DataProcessorAgent()

    data_files = sorted(input_dir.rglob("data.json"))
    if not data_files:
        logger.error("No data.json files found under %s", input_dir)
        return

    if limit:
        data_files = data_files[:limit]

    logger.info("Found %d data.json file(s) to process.", len(data_files))

    for data_file in data_files:
        # Mirror the input directory structure under output_dir
        relative = data_file.relative_to(input_dir)
        out_file = output_dir / relative.parent / "processed.json"
        out_file.parent.mkdir(parents=True, exist_ok=True)

        logger.info("Processing: %s", data_file)
        try:
            result = await agent.process_file(data_file)
        except Exception as exc:
            logger.error("Failed to process %s: %s", data_file, exc)
            continue

        if not result:
            continue

        with out_file.open("w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)

        logger.info("  -> Written: %s", out_file)

    logger.info("Done.")


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    here = Path(__file__).parent
    default_input = here.parent / "scraper" / "data"
    default_output = here.parent / "scraper" / "processed"

    parser = argparse.ArgumentParser(
        description="Process lecture data.json files into structured JSON."
    )
    parser.add_argument(
        "--input-dir",
        type=Path,
        default=default_input,
        help=f"Root directory containing data.json files (default: {default_input})",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=default_output,
        help=f"Root directory for processed.json output (default: {default_output})",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Process only the first N files (useful for testing)",
    )
    args = parser.parse_args()

    asyncio.run(_process_all(args.input_dir, args.output_dir, args.limit))


if __name__ == "__main__":
    main()
