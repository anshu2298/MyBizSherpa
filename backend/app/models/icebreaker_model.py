from pydantic import BaseModel
from datetime import date
from datetime import datetime

# Input model when user submits LinkedIn bio + pitch
class IcebreakerIn(BaseModel):
    company_name: str
    linkedin_bio: str
    pitch_deck: str

# Output model for AI-generated icebreaker
class IcebreakerOut(BaseModel):
    icebreaker: str   
    date_generated: datetime
