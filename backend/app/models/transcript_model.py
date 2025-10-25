from pydantic import BaseModel
from datetime import date
from datetime import datetime


# Input model when user uploads a transcript
class TranscriptIn(BaseModel):
    company_name: str
    attendees: str
    transcript_text: str
    date: date

# Output model for processed insights
class TranscriptOut(BaseModel):
    ai_summary: str
    date_generated: datetime
   
