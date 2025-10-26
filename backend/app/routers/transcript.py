import os
import json
import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime
from app.services.supabase_client import supabase
from app.models.transcript_model import TranscriptIn, TranscriptOut
from app.services.gorq_client import analyze_transcript_with_groq

load_dotenv()
router = APIRouter()

QSTASH_URL = os.getenv("QSTASH_URL")
QSTASH_TOKEN = os.getenv("QSTASH_TOKEN")

# TESTING ROUTE
@router.post("/enqueue-dummy")
async def enqueue_dummy():
    target_url = "https://mybiz-backend.onrender.com/api/dummy-worker"
    payload = {"foo": "bar"}

    # ✅ Correct QStash format: append target URL to the publish endpoint
    qstash_publish_url = f"{QSTASH_URL}/{target_url}"
    
    print("=" * 60)
    print("🚀 ENQUEUING JOB TO QSTASH")
    print(f"QStash Publish URL: {qstash_publish_url}")
    print(f"Target: {target_url}")
    print(f"Payload: {payload}")
    print(f"Delay: 3 seconds")
    print("=" * 60)
    
    async with httpx.AsyncClient(follow_redirects=False) as client:
        res = await client.post(
            qstash_publish_url,
            json=payload,
            headers={
                "Authorization": f"Bearer {QSTASH_TOKEN}",
                "Content-Type": "application/json",
                "Upstash-Delay": "3s"
            }
        )

    print(f"✅ QStash Response: {res.status_code}")
    print(f"📝 Response Text: {res.text}")
    print(f"📋 Response Headers: {dict(res.headers)}")
    print("⏳ Worker will be called in 3 seconds...")
    print("=" * 60)
    
    return {
        "queued": True,
        "qstash_response_text": res.text,
        "status_code": res.status_code,
        "headers": dict(res.headers)
    }

@router.post("/dummy-worker")
async def dummy_worker(request: Request):
    print("=" * 60)
    print("🎯 WORKER ENDPOINT CALLED BY QSTASH!")
    print(f"⏰ Time: {datetime.now().isoformat()}")
    
    data = await request.json()
    print(f"📦 Received data: {data}")
    print("✅ Processing completed successfully!")
    print("=" * 60)
    
    return {"received": data, "message": "Dummy worker executed successfully"}

# ✅ 1️⃣ QUEUE ENDPOINT - lightweight and fast
@router.post("/transcript", response_model=dict)
async def enqueue_transcript(payload: TranscriptIn):
    """Receives transcript data and queues background processing via QStash."""    
    data = payload.dict()

    # transcript is required
    if not data.get("transcript_text"):
        raise HTTPException(status_code=400, detail="Transcript text is required")
    
    # Convert date to string if present
    if data.get("date"):
        data["date"] = data["date"].isoformat()

    # deployed backend worker endpoint
    target_url = "https://mybiz-backend.onrender.com/api/process-transcript"

    # QStash payload
    qstash_payload = {
        "url": target_url,          # MUST start with https://
        "method": "POST",
        "body": data,
        "headers": {},
        "delay": "3s"               # optional delay
    }

    headers = {
        "Authorization": f"Bearer {QSTASH_TOKEN}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        res = await client.post(QSTASH_URL, json=qstash_payload, headers=headers)

        # debug logging
        print(f"URL going to QStash: '{target_url}'")
        print(f"QSTASH_URL: '{QSTASH_URL}'")

    return {
        "queued": True,
        "qstash_response_text": res.text,
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
