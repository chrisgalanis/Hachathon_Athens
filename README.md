# 6Blue7Brown

> University content, TikTok format. Built for the generation that never stops scrolling.

6Blue7Brown transforms raw university lecture transcripts into bite-sized vertical video reels — auto-generated, narrated, and served in a mobile-first interface that feels like social media, not a classroom.

---

## The Problem

Students' attention spans have been rewired by short-form content. Traditional e-learning hasn't kept up. LearnReel closes the gap between how Gen Z consumes content and how universities deliver knowledge.

---

## Features

- 🎬 **Vertical Reel Feed** — Snap-scroll through micro-lessons, one concept at a time
- 🧠 **Brainrot Mode** — Split-screen: educational video on bottom, engagement bait on top
- 📝 **Synced Captions** — Timed subtitles auto-generated from lecture transcripts
- 🤖 **AI Pipeline** — Multi-agent system that turns raw transcripts into narrated, animated videos
- 🎙️ **Voice Narration** — ElevenLabs TTS synthesis per lecture beat
- 🎨 **Manim Animations** — Auto-generated ManimGL visuals synced beat-by-beat to narration
- 📊 **Progress Tracking** — Streaks, aura points, and achievement system
- 🔍 **Subject Browser** — Filter and browse courses; jump to any lecture

---

## Tech Stack

**Frontend**
- React 19 + TypeScript (Vite 6)
- React Router v7
- Tailwind CSS 4
- Motion / Framer Motion v12
- Radix UI

**Backend**
- Python 3.12 + FastAPI + Uvicorn
- `pydantic-ai` — multi-provider LLM agent framework
- ElevenLabs SDK — text-to-speech narration
- ManimGL — programmatic math animation rendering
- ffmpeg — audio/video merge

**Data**
- MIT OpenCourseWare — Linear Algebra (scraped & processed)
- Stored at `backend/scraper/processed/Linear_Algebra/<concept>/<lecture_num>/processed.json`

---

## Project Structure

```
Hachathon_Athens/
├── backend/
│   ├── main.py                  # FastAPI server — 5 REST endpoints
│   ├── requirements.txt
│   ├── railway.toml             # Deployment config
│   ├── reels.json               # Transcript → video path mappings
│   ├── videos/                  # Served static MP4 files
│   ├── scraper/                 # OCW transcript extraction & processing
│   │   └── processed/           # Structured JSON per lecture
│   └── agents/                  # AI multi-agent pipeline
│       ├── pipeline.py          # End-to-end orchestration
│       ├── voice_agent.py       # TTS narration (ElevenLabs)
│       ├── manim_agent.py       # Animation code generation
│       ├── transcript_reviewer_agent.py
│       ├── data_processor_agent.py
│       └── agent_prompts/       # System prompts per agent
│
└── frontend_rework/
    └── src/
        ├── main.tsx
        ├── App.tsx              # 430px mobile frame wrapper
        ├── api.ts               # API client
        └── app/
            ├── pages/
            │   ├── FeedPage.tsx       # Main reel feed (snap scroll)
            │   ├── LandingPage.tsx    # Marketing hero page
            │   ├── SubjectsPage.tsx   # Course grid browser
            │   ├── ChatbotPage.tsx    # Search & discovery
            │   └── ProgressPage.tsx   # Streaks & achievements
            └── components/
                ├── ReelCardPremium.tsx  # Core video reel card
                └── FloatingNav.tsx      # Bottom navigation bar
```

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/subjects` | All concepts with lecture/video counts |
| `GET` | `/api/reels` | All reels in order |
| `GET` | `/api/reels/{concept}` | Reels for a concept, sorted by lecture |
| `GET` | `/api/reels/{concept}/{lecture_number}` | Single reel |

Videos are served as static files at `/videos/{concept}/Lecture_{N}/video.mp4`.

---

## AI Pipeline

The multi-agent pipeline (`backend/agents/pipeline.py`) turns a reviewed transcript into a finished reel:

```
Raw Transcript
    ↓
Transcript Reviewer Agent  →  cleaned, structured transcript
    ↓
Data Processor Agent       →  structured JSON (concepts, examples, analogies)
    ↓
Voice Agent                →  [BEAT]-delimited narration + ElevenLabs MP3
    ↓
Manim Agent                →  ManimGL animation code (self.wait() per beat)
    ↓
Beat Sync                  →  adjust wait() durations to match real audio timings
    ↓
manimgl CLI                →  render silent MP4 (1080×1920 portrait)
    ↓
ffmpeg                     →  merge audio + video → final reel
```

Two reels are produced per lecture: a **concept reel** and an **example reel** with subtitles.

---

## Setup

### Prerequisites

- Node.js ≥ 18
- Python 3.12
- ffmpeg
- ElevenLabs API key
- An LLM provider API key (OpenAI, Anthropic, etc.)

### Backend

```bash
cd backend
pip install -r requirements.txt
pip install -r agents/requirements.txt
```

Add a `.env` file:

```env
ELEVENLABS_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

```bash
uvicorn main:app --reload --port 8000
```

Verify:

```bash
curl http://localhost:8000/health
# → {"status":"ok"}
```

### Frontend

```bash
cd frontend_rework
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Optionally override the backend URL:

```env
# frontend_rework/.env
VITE_API_URL=http://localhost:8000
```

### Running the AI Pipeline

To regenerate reels from a processed transcript:

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

Or process raw transcripts first:

```bash
cd backend
python -m agents.data_processor_agent \
  --input-dir scraper/data \
  --output-dir scraper/processed
```

---

## Deployment

The backend is configured for **Railway** via `railway.toml`. Set environment variables in the Railway dashboard and push.

For the frontend, build and deploy to any static host:

```bash
cd frontend_rework
npm run build   # outputs to dist/
```

---

## Contributors

Team **6Blue7Brown** — Hackathon Athens 2025
