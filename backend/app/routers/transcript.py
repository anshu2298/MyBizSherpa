from fastapi import APIRouter, HTTPException
from app.services.supabase_client import supabase

router = APIRouter()

@router.post("/transcript")
async def analyze_transcript(payload: dict):
    transcript = payload.get("transcript")
    company = payload.get("company") or "N/A"
    attendees = payload.get("attendees") or []
    date = payload.get("date") 

    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript text is required")

    attendees_str = ", ".join(attendees) if isinstance(attendees, list) else str(attendees)

    data = {
        "company_name": company,
        "attendees": attendees_str,
        "transcript_text": transcript,
        "date": date or None
    }

    # --- NEW SYNTAX FOR SUPABASE v2 ---
    try:
        inserted = supabase.table("transcripts").insert(data).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase insert failed: {str(e)}")

    # Check inserted rows
    if not inserted or not inserted.data:
        raise HTTPException(status_code=500, detail="Failed to insert transcript")

    return {
        "insights": f"Transcript stored in Supabase with ID {inserted.data[0]['id']}"
    }
