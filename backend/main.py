"""
LearnReel — FastAPI backend
===========================

Endpoints
---------
GET /api/subjects
    List all concepts with lecture and video counts.

GET /api/reels/{concept}
    All reels for a concept, sorted by lecture number.

GET /api/reels/{concept}/{lecture_number}
    Single reel for a concept + lecture number.

Static files
------------
Videos are served from  backend/videos/<Concept>/Lecture_<N>/video.mp4
and are accessible at   http://localhost:8000/videos/<Concept>/Lecture_<N>/video.mp4

Run with:
    uvicorn main:app --reload --port 8000
"""

import json
import re
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# ---------------------------------------------------------------------------
# App & CORS
# ---------------------------------------------------------------------------

app = FastAPI(title="LearnReel API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Directories
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).parent
PROCESSED_DIR = BASE_DIR / "scraper" / "processed"
VIDEOS_DIR = BASE_DIR / "videos"

# Ensure the videos directory exists so StaticFiles doesn't error on startup
VIDEOS_DIR.mkdir(parents=True, exist_ok=True)

# Serve MP4 files as static assets
app.mount("/videos", StaticFiles(directory=str(VIDEOS_DIR)), name="videos")

# ---------------------------------------------------------------------------
# reels.json — maps transcript dirs to video files
# ---------------------------------------------------------------------------

def _load_reels_map() -> tuple[dict[Path, Path], dict[Path, Path]]:
    """Return ({transcript_dir: video_path}, {transcript_dir: brainrot_path}) from reels.json."""
    reels_json = BASE_DIR / "reels.json"
    if not reels_json.exists():
        return {}, {}
    entries = json.loads(reels_json.read_text(encoding="utf-8"))
    reels_map: dict[Path, Path] = {}
    brainrot_map: dict[Path, Path] = {}
    for e in entries:
        if "transcript" in e and "video" in e:
            t = Path(e["transcript"]).resolve()
            reels_map[t] = Path(e["video"]).resolve()
            if "brainrot_video" in e:
                brainrot_map[t] = Path(e["brainrot_video"]).resolve()
    return reels_map, brainrot_map

REELS_MAP, BRAINROT_MAP = _load_reels_map()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_WORDS_PER_SECOND = 130 / 60  # educational speech ~130 wpm


def _transcript_to_captions(text: str) -> list[dict]:
    """Split a transcript into sentence-level timed captions.

    No real timestamps exist, so duration is estimated from word count at a
    typical educational speech rate of ~130 wpm.
    """
    sentences = re.split(r"(?<=[.!?—])\s+", text.strip())
    sentences = [s.strip() for s in sentences if s.strip()]

    captions: list[dict] = []
    t = 0.0
    for sentence in sentences:
        word_count = len(sentence.split())
        duration = max(1.5, word_count / _WORDS_PER_SECOND)
        captions.append({"start": round(t, 2), "end": round(t + duration, 2), "text": sentence})
        t += duration

    return captions


def _build_reel(concept: str, lecture_dir: Path) -> dict | None:
    """Load processed.json for a lecture and return the reel payload."""
    processed_json = lecture_dir / "processed.json"
    if not processed_json.exists():
        return None

    data = json.loads(processed_json.read_text(encoding="utf-8"))
    lecture_num: int = data.get("lecture_number", int(lecture_dir.name))

    # Prefer reviewed transcript from transcript_reviewed.json; fall back to processed.json
    reviewed_json = lecture_dir / "transcript_reviewed.json"
    if reviewed_json.exists():
        reviewed_data = json.loads(reviewed_json.read_text(encoding="utf-8"))
        reviewed_transcript = reviewed_data.get("reviewed_transcript", data.get("reviewed_transcript", ""))
    else:
        reviewed_transcript = data.get("reviewed_transcript", "")

    # Resolve video path: prefer reels.json mapping, fall back to convention
    mapped_video = REELS_MAP.get(lecture_dir.resolve())
    if mapped_video and mapped_video.exists():
        video_abs = mapped_video
        video_rel = "/videos/" + mapped_video.relative_to(VIDEOS_DIR).as_posix()
    else:
        video_abs = VIDEOS_DIR / concept / f"Lecture_{lecture_num}" / "video.mp4"
        video_rel = f"/videos/{concept}/Lecture_{lecture_num}/video.mp4"

    subject = data.get("subject", concept.replace("_", " "))

    # Resolve brainrot video path if present
    brainrot_abs = BRAINROT_MAP.get(lecture_dir.resolve())
    if brainrot_abs and brainrot_abs.exists():
        brainrot_rel = "/videos/" + brainrot_abs.relative_to(VIDEOS_DIR).as_posix()
    else:
        brainrot_rel = None

    return {
        "id": f"{concept}-lecture-{lecture_num}",
        "concept": concept,
        "lectureNumber": lecture_num,
        "subject": subject,
        "topic": subject,
        "concepts": data.get("concepts", []),
        "examples": data.get("examples", []),
        "analogy": data.get("analogy", []),
        "transcript": reviewed_transcript,
        "captions": _transcript_to_captions(reviewed_transcript),
        "videoSrc": video_rel if video_abs.exists() else None,
        "hasVideo": video_abs.exists(),
        "brainrotSrc": brainrot_rel,
    }


def _find_concept_dir(concept: str) -> Path | None:
    """Return the first subject directory matching *concept* across all courses."""
    for course_dir in PROCESSED_DIR.iterdir():
        if not course_dir.is_dir():
            continue
        subject_dir = course_dir / concept
        if subject_dir.is_dir():
            return subject_dir
    return None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/reels")
def get_all_reels():
    """Return all reels from every processed concept, sorted by concept + lecture number."""
    reels = []
    for course_dir in PROCESSED_DIR.iterdir():
        if not course_dir.is_dir():
            continue
        for subject_dir in course_dir.iterdir():
            if not subject_dir.is_dir():
                continue
            concept = subject_dir.name
            for lecture_dir in subject_dir.iterdir():
                if not lecture_dir.is_dir():
                    continue
                reel = _build_reel(concept, lecture_dir)
                if reel:
                    reels.append(reel)
    reels.sort(key=lambda r: (r["concept"], r["lectureNumber"]))
    return reels


@app.get("/api/subjects")
def get_subjects():
    """Return all available concepts with their lecture and video counts."""
    subjects = []

    for course_dir in PROCESSED_DIR.iterdir():
        if not course_dir.is_dir():
            continue
        for subject_dir in course_dir.iterdir():
            if not subject_dir.is_dir():
                continue

            lecture_dirs = [d for d in subject_dir.iterdir() if d.is_dir()]
            video_count = sum(
                1
                for d in lecture_dirs
                if (
                    VIDEOS_DIR / subject_dir.name / f"Lecture_{d.name}" / "video.mp4"
                ).exists()
            )

            subjects.append(
                {
                    "concept": subject_dir.name,
                    "course": course_dir.name,
                    "displayName": subject_dir.name.replace("_", " "),
                    "lectureCount": len(lecture_dirs),
                    "videoCount": video_count,
                }
            )

    subjects.sort(key=lambda s: s["displayName"])
    return subjects


@app.get("/api/reels/{concept}")
def get_reels_for_concept(concept: str):
    """Return all reels for a concept ordered by lecture number."""
    subject_dir = _find_concept_dir(concept)
    if subject_dir is None:
        raise HTTPException(status_code=404, detail=f"Concept '{concept}' not found")

    reels = []
    for lecture_dir in subject_dir.iterdir():
        if not lecture_dir.is_dir():
            continue
        reel = _build_reel(concept, lecture_dir)
        if reel:
            reels.append(reel)

    reels.sort(key=lambda r: r["lectureNumber"])
    return reels


@app.get("/api/reels/{concept}/{lecture_number}")
def get_reel(concept: str, lecture_number: int):
    """Return a single reel for a concept + lecture number."""
    subject_dir = _find_concept_dir(concept)
    if subject_dir is None:
        raise HTTPException(status_code=404, detail=f"Concept '{concept}' not found")

    lecture_dir = subject_dir / str(lecture_number)
    if not lecture_dir.is_dir():
        raise HTTPException(
            status_code=404,
            detail=f"Lecture {lecture_number} not found in concept '{concept}'",
        )

    reel = _build_reel(concept, lecture_dir)
    if reel is None:
        raise HTTPException(
            status_code=404, detail=f"No processed data for '{concept}/{lecture_number}'"
        )
    return reel
