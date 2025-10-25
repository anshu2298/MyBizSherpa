from fastapi import APIRouter, HTTPException
from app.services.supabase_client import supabase
from app.services.gorq_client import analyze_transcript_with_groq
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

    # --- Call OpenAI to get the summary ---
    try:
        ai_summary = analyze_transcript_with_groq(transcript)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI analysis failed: {str(e)}")

    # --- Prepare data to save in Supabase ---
    data = {
        "company_name": company,
        "attendees": attendees_str,
        "transcript_text": transcript,
        "date": date or None,
        "ai_summary": ai_summary
    }

    # --- Insert into Supabase ---
    try:
        inserted = supabase.table("transcripts").insert(data).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase insert failed: {str(e)}")

    if not inserted or not inserted.data:
        raise HTTPException(status_code=500, detail="Failed to insert transcript")

    return {
        "insights": ai_summary,
        "transcript_id": inserted.data[0]['id']
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