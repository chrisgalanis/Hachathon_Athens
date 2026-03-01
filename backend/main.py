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

import asyncio
import json
import re
import subprocess
import tempfile
import uuid
from pathlib import Path
from typing import Any

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
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
FINAL_DIR = (BASE_DIR / "final").resolve()
# Pipeline writes to backend/ so that backend/final/ is served by the /final mount
OUTPUT_DIR = BASE_DIR

# Ensure required directories exist so StaticFiles doesn't error on startup
VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
FINAL_DIR.mkdir(parents=True, exist_ok=True)

# Serve MP4 files as static assets
app.mount("/videos", StaticFiles(directory=str(VIDEOS_DIR)), name="videos")
app.mount("/final", StaticFiles(directory=str(FINAL_DIR)), name="final")

# ---------------------------------------------------------------------------
# Upload job store (in-memory + disk persistence)
# ---------------------------------------------------------------------------

_JOBS_DIR = BASE_DIR / "final" / "jobs"
_JOBS_DIR.mkdir(parents=True, exist_ok=True)

_jobs: dict[str, dict[str, Any]] = {}


def _persist_job(job_id: str, job: dict) -> None:
    """Write job state to disk so it survives server restarts."""
    (_JOBS_DIR / f"{job_id}.json").write_text(
        json.dumps(job, ensure_ascii=False), encoding="utf-8"
    )


def _load_job_from_disk(job_id: str) -> dict | None:
    job_file = _JOBS_DIR / f"{job_id}.json"
    if not job_file.exists():
        return None
    return json.loads(job_file.read_text(encoding="utf-8"))

# ---------------------------------------------------------------------------
# reels.json — maps transcript dirs to video files
# ---------------------------------------------------------------------------

def _load_reels_map() -> tuple[dict[Path, Path], dict[Path, Path], list[dict]]:
    """Return ({transcript_dir: video_path}, {transcript_dir: brainrot_path}, direct_entries) from reels.json."""
    reels_json = BASE_DIR / "reels.json"
    if not reels_json.exists():
        return {}, {}, []
    entries = json.loads(reels_json.read_text(encoding="utf-8"))
    reels_map: dict[Path, Path] = {}
    brainrot_map: dict[Path, Path] = {}
    direct_entries: list[dict] = []
    for e in entries:
        if "transcript" in e and "video" in e:
            t = Path(e["transcript"]).resolve()
            reels_map[t] = Path(e["video"]).resolve()
            if "brainrot_video" in e:
                brainrot_map[t] = Path(e["brainrot_video"]).resolve()
        elif "video" in e and "captions_file" in e:
            direct_entries.append(e)
    return reels_map, brainrot_map, direct_entries

REELS_MAP, BRAINROT_MAP, DIRECT_ENTRIES = _load_reels_map()

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


def _build_direct_reel(entry: dict) -> dict | None:
    """Build a reel payload from a direct entry (video + captions_file, no transcript dir)."""
    video_abs = (BASE_DIR / entry["video"]).resolve()
    captions_abs = (BASE_DIR / entry["captions_file"]).resolve()

    if not captions_abs.exists():
        return None

    captions_data = json.loads(captions_abs.read_text(encoding="utf-8"))
    captions = [
        {"start": b["start"], "end": b["end"], "text": b["text"]}
        for b in captions_data.get("beats", [])
    ]

    title = entry.get("title", video_abs.stem.replace("_", " "))

    # Build URL for /final/ static mount
    try:
        video_rel = "/final/" + video_abs.relative_to(FINAL_DIR).as_posix()
    except ValueError:
        video_rel = "/final/" + video_abs.name

    slug = video_abs.stem
    # Derive concept/topic from filename (strip trailing _concept or _example)
    for suffix in ("_concept", "_example"):
        if slug.endswith(suffix):
            concept = slug[: -len(suffix)]
            break
    else:
        concept = slug

    # Resolve optional brainrot video path
    brainrot_rel: str | None = None
    if "brainrot" in entry:
        brainrot_abs = (BASE_DIR / entry["brainrot"]).resolve()
        if brainrot_abs.exists():
            try:
                brainrot_rel = "/videos/" + brainrot_abs.relative_to(VIDEOS_DIR).as_posix()
            except ValueError:
                brainrot_rel = None

    subject = entry.get("subject", title)

    return {
        "id": f"direct-{slug}",
        "concept": concept,
        "lectureNumber": 0,
        "subject": subject,
        "topic": title,
        "concepts": [],
        "examples": [],
        "analogy": [],
        "transcript": "",
        "captions": captions,
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
    """Return reels for every entry in reels.json, in order."""
    # Reload reels.json on every call so changes are picked up without restart.
    reels_map, _brainrot_map, direct_entries = _load_reels_map()
    reels = []
    for transcript_dir, video_abs in reels_map.items():
        # Infer concept from the transcript path (grandparent of lecture dir)
        # e.g. .../Linear_Algebra/Elimination_with_matrices/2  → concept = Elimination_with_matrices
        lecture_dir = transcript_dir
        concept = lecture_dir.parent.name
        reel = _build_reel(concept, lecture_dir)
        if reel:
            reels.append(reel)
    for entry in direct_entries:
        reel = _build_direct_reel(entry)
        if reel:
            reels.append(reel)
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


# ---------------------------------------------------------------------------
# PDF upload → full pipeline
# ---------------------------------------------------------------------------


def _extract_pdf_text(pdf_bytes: bytes) -> str:
    """Run pdftotext on raw PDF bytes and return the extracted text."""
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(pdf_bytes)
        tmp_path = tmp.name
    try:
        result = subprocess.run(
            ["pdftotext", "-nopgbrk", tmp_path, "-"],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise RuntimeError(f"pdftotext failed: {result.stderr}")
        return result.stdout
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def _append_to_reels_json(entry: dict) -> None:
    """Append a new direct entry to reels.json (thread-safe enough for hackathon)."""
    reels_json = BASE_DIR / "reels.json"
    if reels_json.exists():
        entries = json.loads(reels_json.read_text(encoding="utf-8"))
    else:
        entries = []
    entries.append(entry)
    reels_json.write_text(json.dumps(entries, indent=2, ensure_ascii=False), encoding="utf-8")

    # Reload the global maps so new reels are immediately visible
    global REELS_MAP, BRAINROT_MAP, DIRECT_ENTRIES
    REELS_MAP, BRAINROT_MAP, DIRECT_ENTRIES = _load_reels_map()


async def _run_upload_pipeline(job_id: str, pdf_bytes: bytes, filename: str) -> None:
    """Full pipeline: PDF bytes → concept & example MP4s → reels.json."""
    job = _jobs[job_id]
    try:
        # Step 1 — extract text
        job["message"] = "Extracting text from PDF…"
        text = _extract_pdf_text(pdf_bytes)
        if not text.strip():
            raise ValueError("Could not extract any text from the PDF.")

        # Derive a subject name from the filename
        subject = Path(filename).stem.replace("_", " ").replace("-", " ").title()

        # Step 2 — DataProcessorAgent → structured concepts/examples/analogy
        job["message"] = "Processing transcript with AI…"
        from agents.data_processor_agent import DataProcessorAgent

        processor = DataProcessorAgent()
        raw_data = {
            "lecture_number": 1,
            "subject": subject,
            "content": text,
            "examples": [],
        }
        # Write a temporary data.json for the agent
        with tempfile.NamedTemporaryFile(
            suffix=".json", mode="w", delete=False, encoding="utf-8"
        ) as tmp:
            json.dump(raw_data, tmp)
            tmp_data_path = tmp.name
        try:
            processed = await processor.process_file(tmp_data_path)
        finally:
            Path(tmp_data_path).unlink(missing_ok=True)

        if not processed:
            raise ValueError("DataProcessorAgent returned empty output.")

        processed["lecture_number"] = 1
        # Prefer the subject inferred by the model over the filename-derived one
        subject = processed.get("subject") or subject
        processed["subject"] = subject

        # Step 3 — generate + review transcript paragraph
        job["message"] = "Generating video transcript…"
        from agents.lecture_transcript_agent import process_lecture

        transcript_result = await process_lecture(processed)
        processed["reviewed_transcript"] = transcript_result["reviewed_transcript"]

        # Step 4 — video generation pipeline
        job["message"] = "Generating video (this takes a few minutes)…"
        from agents.pipeline import VideoGenerationPipeline

        pipeline = VideoGenerationPipeline(output_dir=str(OUTPUT_DIR))
        concept_mp4, example_mp4 = await pipeline.run_from_dict(processed)

        # Step 5 — build reels.json-compatible paths (relative to BASE_DIR with ./ prefix)
        import re as _re
        slug = _re.sub(r"\W+", "_", subject).strip("_")
        course = processed.get("course") or ""

        def _backend_rel(abs_path: str) -> str:
            """Return path relative to backend/ with ./ prefix, matching reels.json convention."""
            try:
                rel = Path(abs_path).relative_to(BASE_DIR)
                return "./" + rel.as_posix()
            except ValueError:
                return abs_path

        concept_subs_path = str(BASE_DIR / "final" / f"{slug}_concept_subtitles.json")
        example_subs_path = str(BASE_DIR / "final" / f"{slug}_example_subtitles.json")

        concept_entry: dict = {
            "title": f"{subject} (concept)",
            "video": _backend_rel(concept_mp4),
            "captions_file": _backend_rel(concept_subs_path),
        }
        example_entry: dict = {
            "title": f"{subject} (example)",
            "video": _backend_rel(example_mp4),
            "captions_file": _backend_rel(example_subs_path),
        }
        if course:
            concept_entry["subject"] = course
            example_entry["subject"] = course

        _append_to_reels_json(concept_entry)
        _append_to_reels_json(example_entry)

        job["status"] = "done"
        job["message"] = "Done!"
        job["result"] = {
            "subject": subject,
            "conceptVideo": _backend_rel(concept_mp4),
            "exampleVideo": _backend_rel(example_mp4),
        }
        _persist_job(job_id, job)

    except Exception as exc:
        job["status"] = "error"
        job["message"] = str(exc)
        _persist_job(job_id, job)


@app.post("/api/upload-transcript")
async def upload_transcript(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """Accept a university transcript PDF, run the full pipeline in the background."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    pdf_bytes = await file.read()
    job_id = str(uuid.uuid4())
    _jobs[job_id] = {"status": "processing", "message": "Starting…", "result": None}

    background_tasks.add_task(_run_upload_pipeline, job_id, pdf_bytes, file.filename)

    return {"jobId": job_id}


@app.get("/api/upload-status/{job_id}")
def upload_status(job_id: str):
    """Poll the status of an upload pipeline job."""
    job = _jobs.get(job_id) or _load_job_from_disk(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return {
        "jobId": job_id,
        "status": job["status"],
        "message": job["message"],
        "result": job.get("result"),
    }
