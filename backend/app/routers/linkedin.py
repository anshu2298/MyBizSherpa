import os
import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException,Request
from datetime import datetime
from app.models.icebreaker_model import IcebreakerIn, IcebreakerOut
from app.services.gorq_client import  generate_icebreaker  
from app.services.supabase_client import supabase  
load_dotenv()
router = APIRouter()

QSTASH_URL = os.getenv("QSTASH_URL")
QSTASH_TOKEN = os.getenv("QSTASH_TOKEN")

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

@router.post("/icebreaker", response_model=dict)
async def enqueue_icebreaker(payload: IcebreakerIn):
    """Receives icebreaker data and queues background processing via QStash."""
    
    if not payload.linkedin_bio.strip():
        raise HTTPException(status_code=400, detail="LinkedIn bio is required")
    
    data = payload.dict()
    
    target_url = "https://mybiz-backend.onrender.com/api/process-icebreaker"
    qstash_publish_url = f"{QSTASH_URL}/{target_url}"

    print("=" * 60)
    print("🚀 ENQUEUING ICEBREAKER GENERATION TO QSTASH")
    print(f"QStash Publish URL: {qstash_publish_url}")
    print(f"Target: {target_url}")
    print(f"Company: {data.get('company_name', 'N/A')}")
    print(f"Bio length: {len(data.get('linkedin_bio', ''))} chars")
    print("=" * 60)

    headers = {
        "Authorization": f"Bearer {QSTASH_TOKEN}",
        "Content-Type": "application/json",
        "Upstash-Delay": "1m"  
    }

    async with httpx.AsyncClient(follow_redirects=False) as client:
        res = await client.post(qstash_publish_url, json=data, headers=headers)
        
        print(f"✅ QStash Response: {res.status_code}")
        print(f"📝 Response Text: {res.text}")
        
        if res.status_code != 201:
            print(f"⚠️ WARNING: Expected 201, got {res.status_code}")
            print(f"📋 Response Headers: {dict(res.headers)}")
        
        print("⏳ Worker will generate icebreaker in 1 minute...")
        print("=" * 60)

    return {
        "queued": True,
        "qstash_response_text": res.text,
        "status_code": res.status_code
    }


# 2️⃣ WORKER ENDPOINT - called by QStash asynchronously
@router.post("/process-icebreaker", response_model=IcebreakerOut)
async def process_icebreaker(request: Request):
    """Does the actual AI + Supabase work asynchronously when QStash calls it."""
    
    print("=" * 60)
    print("🎯 ICEBREAKER WORKER CALLED BY QSTASH!")
    print(f"⏰ Time: {datetime.now().isoformat()}")
    print("=" * 60)
    
    data = await request.json()
    linkedin_bio = data.get("linkedin_bio")
    pitch_deck = data.get("pitch_deck")
    company_name = data.get("company_name")

    print(f"🏢 Generating icebreaker for: {company_name or 'Unknown company'}")
    print(f"📝 LinkedIn bio length: {len(linkedin_bio) if linkedin_bio else 0} chars")

    if not linkedin_bio or not linkedin_bio.strip():
        raise HTTPException(status_code=400, detail="LinkedIn bio is required")
    
    today = datetime.now()
    
    # --- Run AI generation ---
    print("🤖 Starting AI icebreaker generation...")
    try:
        icebreaker_text = generate_icebreaker(
            linkedin_bio=linkedin_bio,
            pitch_deck=pitch_deck,
            company_name=company_name
        )
        print("✅ AI icebreaker generation completed successfully!")
    except Exception as e:
        print(f"❌ AI generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

    # --- Save to Supabase ---
    record = {
        "company_name": company_name,
        "linkedin_bio": linkedin_bio,
        "pitch_deck": pitch_deck,
        "icebreaker_text": icebreaker_text,
        "date_generated": today.isoformat()
    }
    
    print("💾 Saving to Supabase...")
    try:
        inserted = supabase.table("linkedin_icebreakers").insert(record).execute()
        print("✅ Successfully saved to Supabase!")
        print(f"📊 Record ID: {inserted.data[0].get('id') if inserted.data else 'N/A'}")
    except Exception as e:
        print(f"❌ Supabase insert failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Supabase insert failed: {str(e)}")

    print("=" * 60)
    print("🎉 ICEBREAKER GENERATION COMPLETED!")
    print("=" * 60)
    
    return IcebreakerOut(
        icebreaker=icebreaker_text,
        date_generated=today
    )


@router.delete("/icebreaker/{icebreaker_id}")
def delete_icebreaker(icebreaker_id: str):
    try:
        response = supabase.table("linkedin_icebreakers").delete().eq("id", icebreaker_id).execute()

        if len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Icebreaker not found")

        return {"message": "Icebreaker deleted successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))