"""
merge_transcripts.py

For every transcript_reviewed.json found under the processed directory,
reads the `reviewed_transcript` field and appends it to the sibling processed.json.

Usage:
    python merge_transcripts.py [--processed-dir PATH]

Defaults:
    --processed-dir  ./processed
"""

import argparse
import json
import sys
from pathlib import Path


def merge(processed_dir: Path) -> None:
    reviewed_files = sorted(processed_dir.rglob("transcript_reviewed.json"))

    if not reviewed_files:
        print(f"No transcript_reviewed.json files found under {processed_dir}", file=sys.stderr)
        sys.exit(1)

    updated = 0
    for reviewed_path in reviewed_files:
        processed_path = reviewed_path.parent / "processed.json"

        if not processed_path.exists():
            print(f"WARNING: no processed.json next to {reviewed_path} — skipping")
            continue

        with reviewed_path.open(encoding="utf-8") as f:
            reviewed = json.load(f)

        reviewed_transcript = reviewed.get("reviewed_transcript", "")
        if not reviewed_transcript:
            print(f"WARNING: empty reviewed_transcript in {reviewed_path} — skipping")
            continue

        with processed_path.open(encoding="utf-8") as f:
            processed = json.load(f)

        processed["reviewed_transcript"] = reviewed_transcript

        with processed_path.open("w", encoding="utf-8") as f:
            json.dump(processed, f, indent=2, ensure_ascii=False)

        print(f"Updated: {processed_path}")
        updated += 1

    print(f"\nDone. {updated}/{len(reviewed_files)} processed.json files updated.")


def main() -> None:
    here = Path(__file__).parent
    default_processed = here / "processed"

    parser = argparse.ArgumentParser(
        description="Merge reviewed_transcript into each processed.json."
    )
    parser.add_argument(
        "--processed-dir",
        type=Path,
        default=default_processed,
        help=f"Root directory containing processed.json files (default: {default_processed})",
    )
    args = parser.parse_args()

    if not args.processed_dir.is_dir():
        print(f"ERROR: directory not found: {args.processed_dir}", file=sys.stderr)
        sys.exit(1)

    merge(args.processed_dir)


if __name__ == "__main__":
    main()
