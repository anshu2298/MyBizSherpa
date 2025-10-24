from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.post("/transcript")
async def analyze_transcript(payload: dict):
    transcript = payload.get("transcript")
    company = payload.get("company")
    attendees = payload.get("attendees")
    date = payload.get("date")

    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript text is required")

    # Simulated AI analysis
    analysis = {
        "insights": f"Simulated insights for company {company or 'N/A'} with attendees {attendees or 'N/A'} on {date or 'N/A'}"
    }

    return analysis
