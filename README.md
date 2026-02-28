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



