import os
import httpx
import json
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime
from app.services.supabase_client import supabase
from app.models.transcript_model import TranscriptIn, TranscriptOut
from app.services.gorq_client import analyze_transcript_with_groq

load_dotenv()
router = APIRouter()

QSTASH_URL = os.getenv("QSTASH_URL", "https://qstash.upstash.io/v2/publish")
QSTASH_TOKEN = os.getenv("QSTASH_TOKEN")

# ✅ 1️⃣ QUEUE ENDPOINT - lightweight and fast
@router.post("/transcript", response_model=dict)
async def enqueue_transcript(payload: TranscriptIn):
    """Receives transcript data and queues background processing via QStash."""
    data = payload.dict()

    if not data.get("transcript_text"):
        raise HTTPException(status_code=400, detail="Transcript text is required")
    
        # Convert date to string for JSON serialization
    if data.get("date"):
        data["date"] = data["date"].isoformat()

    # deployed backend worker endpoint
    target_url = "https://mybiz-backend.onrender.com/api/process-transcript"

    async with httpx.AsyncClient() as client:
        res = await client.post(
        QSTASH_URL,
        headers={"Authorization": f"Bearer {QSTASH_TOKEN}"},
        json={
            "url": "https://mybiz-backend.onrender.com/api/process-transcript",
            "body": json.dumps(data),  # <- important: convert to string
            "delay": "3s"
        }
    )

    return {
    "queued": True,
    "qstash_response_text": res.text,   # use .text instead of .json()
    "status_code": res.status_code
}


# ✅ 2️⃣ WORKER ENDPOINT - called by QStash asynchronously
@router.post("/process-transcript", response_model=TranscriptOut)
async def process_transcript(request: Request):
    """Does the actual AI + Supabase work asynchronously when QStash calls it."""
    data = await request.json()
    transcript = data.get("transcript_text")
    company = data.get("company_name")
    attendees = data.get("attendees")
    date = data.get("date")

    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript text is required")

    today = datetime.now()

    # --- Run AI analysis ---
    try:
        ai_summary = analyze_transcript_with_groq(transcript)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

    # --- Save in Supabase ---
    record = {
        "company_name": company,
        "attendees": attendees,
        "transcript_text": transcript,
        "date": date,
        "ai_summary": ai_summary,
        "date_generated": today.isoformat(),
    }

    try:
        inserted = supabase.table("transcripts").insert(record).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase insert failed: {str(e)}")

    return {
        "ai_summary": ai_summary,
        "date_generated": today
    }


# ✅ 3️⃣ GET ALL
@router.get("/transcripts")
async def get_all_transcripts():
    try:
        response = supabase.table("transcripts").select("*").execute()
        if response.data is None:
            return {"transcripts": []}
        return {"transcripts": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch transcripts: {str(e)}")


# ✅ 4️⃣ DELETE
@router.delete("/transcript/{transcript_id}")
def delete_transcript(transcript_id: str):
    try:
        response = supabase.table("transcripts").delete().eq("id", transcript_id).execute()
        if len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Transcript not found")
        return {"message": "Transcript deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
