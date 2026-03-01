# 6Blue7Brown

**TikTok-style vertical reels for university lectures — powered by an autonomous AI pipeline.**

---

## Features

- **Vertical Snap Feed** — Swipe through lecture content in a TikTok-style feed, one concept per reel
- **AI-Generated Content** — Multi-agent pipeline automatically extracts key concepts, analogies, examples, and summaries from raw lecture transcripts
- **Deep-Link Search** — Search any topic or concept and jump directly to the matching reel in the feed
- **Explore Page** — Browse all available subjects with lecture counts and a My Uploads tab
- **User Uploads** — Upload your own lecture video or PDF and get it processed into reels instantly
- **Brainrot Mode** — Split-screen view with a muted supplementary video playing alongside the reel card
- **Mobile-First UI** — Designed for 430px viewport with smooth animations, dark theme, and frosted glass components
- **Zero Human Content Pipeline** — From raw transcript to published reel with no manual editing

---

## Tech Stack

**Frontend**
- React 19 + TypeScript (Vite)
- React Router v7
- Tailwind CSS
- Motion / Framer Motion v12
- Lucide React

**Backend**
- Python 3.12
- FastAPI
- Uvicorn

**AI Pipeline**
- Multi-agent system (`backend/agents/`)
- Agents: `data_processor`, `lecture_transcript`, `manim`, `voice`, `transcript_reviewer`, `video_transcript`
- Input: raw lecture transcripts → Output: structured `processed.json` per lecture reel

**Data**
- MIT OpenCourseWare — Linear Algebra (scraped & processed)
- Stored at `backend/scraper/processed/Linear_Algebra/<concept>/<lecture_num>/processed.json`

---

## Prerequisites

- **Node.js** ≥ 18 and **npm** ≥ 9
- **Python** 3.12
- **pip** dependencies listed in `requirements.txt`

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repo-url>
cd Hachathon_Athens
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

Verify it's working:

```bash
curl http://localhost:8000/health
# → {"status":"ok"}
```

### 3. Frontend

```bash
cd frontend_rework
npm install --legacy-peer-deps
npm run dev
```

The app will be available at `http://localhost:5173` (or `5174` if that port is in use).

### 4. Environment variables (optional)

Create a `.env` file inside `frontend_rework/` to override the default backend URL:

```env
VITE_API_URL=http://localhost:8000
```

### 5. Running the AI Pipeline (optional)

To regenerate reel content from transcripts:

```bash
# From project root
python run_pipeline.py
```

Or target a specific lecture directly:

```python
import asyncio
from backend.agents.pipeline import VideoGenerationPipeline

async def main():
    pipeline = VideoGenerationPipeline(output_dir="output")
    concept_mp4, example_mp4 = await pipeline.run_from_json(
        "backend/scraper/processed/Linear_Algebra/Elimination_with_matrices/2/processed.json"
    )
    print(concept_mp4, example_mp4)

asyncio.run(main())
```
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

