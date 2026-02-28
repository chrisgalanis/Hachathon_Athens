"""Quick test: run the full pipeline on one processed JSON."""

import asyncio
import sys
from backend.agents.pipeline import VideoGenerationPipeline

JSON_PATH = (
    "backend/scraper/processed/Linear_Algebra/Linear_transformations_and_their_matrices/30/processed.json"
)


async def main():
    pipeline = VideoGenerationPipeline(output_dir="output")
    concept_mp4, example_mp4 = await pipeline.run_from_json(JSON_PATH)
    print("\n✓ Concept reel:", concept_mp4)
    print("✓ Example reel:", example_mp4)


if __name__ == "__main__":
    asyncio.run(main())
