from fastapi import APIRouter, HTTPException
from datetime import datetime
from app.services.supabase_client import supabase
from app.models.transcript_model import TranscriptIn, TranscriptOut
from app.services.gorq_client import analyze_transcript_with_groq
router = APIRouter()

@router.post("/transcript",response_model=TranscriptOut)
async def analyze_transcript(payload: TranscriptIn):
    transcript = payload.transcript_text
    company = payload.company_name
    attendees = payload.attendees
    date = payload.date
    
    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript text is required")

    # Generate today's date
    today = datetime.now()

    # --- Call OpenAI to get the summary ---
    try:
        ai_summary = analyze_transcript_with_groq(transcript)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI analysis failed: {str(e)}")

    # --- Prepare data to save in Supabase ---
    data = {
        "company_name": company,
        "attendees": attendees,
        "transcript_text": transcript,
        "date": date.isoformat() if date else None,
        "ai_summary": ai_summary,
        "date_generated": today.isoformat()
    }

    # --- Insert into Supabase ---
    try:
        inserted = supabase.table("transcripts").insert(data).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase insert failed: {str(e)}")

    if not inserted or not inserted.data:
        raise HTTPException(status_code=500, detail="Failed to insert transcript")

    return {
        "ai_summary": ai_summary,
         "date_generated":today
        }



@router.get("/transcripts")
async def get_all_transcripts():
    try:
        response = supabase.table("transcripts").select("*").execute()
        # Check if data was returned
        if response.data is None:
            return {"transcripts": []}
        return {"transcripts": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch transcripts: {str(e)}")
    
    
    
    
@router.delete("/transcript/{transcript_id}")
def delete_transcript(transcript_id: str):
    try:
        response = supabase.table("transcripts").delete().eq("id", transcript_id).execute()

        if len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Transcript not found")

        return {"message": "Transcript deleted successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))