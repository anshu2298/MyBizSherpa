from fastapi import APIRouter, HTTPException
from datetime import datetime
from app.models.icebreaker_model import IcebreakerIn, IcebreakerOut
from app.services.gorq_client import  generate_icebreaker  
from app.services.supabase_client import supabase  

router = APIRouter()

@router.get("/all_icebreker")
async def get_all_icebreaker():
    try:
        response = supabase.table("linkedin_icebreakers").select("*").execute()
        # Check if data was returned
        if response.data is None:
            return {"linkedin_icebreakers": []}
        return {"linkedin_icebreakers": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch linkedin_icebreakers: {str(e)}")

@router.post("/icebreaker", response_model=IcebreakerOut)
async def linkedin_icebreaker(payload: IcebreakerIn):
  
    if not payload.linkedin_bio.strip():
        raise HTTPException(status_code=400, detail="LinkedIn bio is required")
    
    # Generate today's date
    today = datetime.now()
    
    try:
        # Call AI service to generate icebreaker
        icebreaker_text = generate_icebreaker(
            linkedin_bio=payload.linkedin_bio,
            pitch_deck=payload.pitch_deck,
            company_name=payload.company_name
        )

        # Optional: Save to Supabase
        record = {
            "company_name": payload.company_name,
            "linkedin_bio": payload.linkedin_bio,
            "pitch_deck": payload.pitch_deck,
            "icebreaker_text": icebreaker_text,
            "date_generated": today.isoformat()  
        }
        supabase.table("linkedin_icebreakers").insert(record).execute()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")
    
    return IcebreakerOut(
        icebreaker=icebreaker_text,
        date_generated=today
    )


@router.delete("/icebreaker/{icebreaker_id}")
def delete_transcript(icebreaker_id: str):
    try:
        response = supabase.table("linkedin_icebreakers").delete().eq("id", icebreaker_id).execute()

        if len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Transcript not found")

        return {"message": "Transcript deleted successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))