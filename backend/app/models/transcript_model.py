from pydantic import BaseModel
from datetime import date
from typing import Optional

# Input model when user uploads a transcript
class TranscriptIn(BaseModel):
    company_name: str
    attendees: list[str]
    transcript_text: str
    date: Optional[date] = None

# Output model for processed insights
class TranscriptOut(BaseModel):
    summary: str
    strengths: list[str]
    improvements: list[str]
    recommendations: list[str]
