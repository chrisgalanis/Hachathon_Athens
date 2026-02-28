# Hachathon_Athens

# Step 1 — generate the video transcript from all processed JSONs
python -m agents.video_transcript_agent

# Step 2 — review it for scientific accuracy
python -m agents.transcript_reviewer_agent

cd backend
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm run dev


##

  Running the Pipeline

  The entry point is run_pipeline.py at the project root:

  cd /home/chris/uni/Hackathon-Athens
  python run_pipeline.py

  Or from Python directly:
  import asyncio
  from backend.agents.pipeline import VideoGenerationPipeline

  async def main():
      pipeline = VideoGenerationPipeline(output_dir="output")
      concept_mp4, example_mp4 = await pipeline.run_from_json(

  "backend/scraper/processed/Linear_Algebra/Elimination_with_matrices/2/processed.json"
      )
      print(concept_mp4, example_mp4)

  asyncio.run(main())

  ---
  What it does (5 steps)

  processed.json
      │
      ▼
  [1] VoiceAgent  →  [BEAT]-delimited narration + TTS MP3 per beat
      │
      ▼
  [2] ManimAgent  →  ManimGL Python script (one self.wait() per beat)
      │
      ▼
  [3] Beat sync   →  self.wait() durations stretched to match audio
      │
      ▼
  [4] manimgl     →  silent MP4 (1080×1920 portrait)
      ffmpeg       →  merges audio + video
      │
      ▼
  [5] output/final/
      ├── {topic}_concept.mp4
      ├── {topic}_example.mp4
      ├── {topic}_concept_subtitles.json
      └── {topic}_example_subtitles.json

  ---
  If you want to process raw transcripts first

  # Step 1: Process raw lecture data into structured JSON
  cd backend
  python -m agents.data_processor_agent --input-dir scraper/data --output-dir
  scraper/processed

