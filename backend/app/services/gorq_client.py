import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def analyze_transcript_with_groq(transcript_text: str) -> str:
    """
    Sends the transcript to Groq's Llama 3.3 70B model for a summary.
    """
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You are an AI assistant that summarizes transcripts."},
            {"role": "user", "content": transcript_text},
        ],
        max_tokens=500,
        temperature=0.7
    )

    # Extract the AI-generated summary
    summary = response.choices[0].message.content
    return summary


def generate_icebreaker(linkedin_bio: str, pitch_deck: str = "", company_name: str = "") -> str:
    prompt = f"""
Paste the following LinkedIn bio/about section: {linkedin_bio}
Company name: {company_name or 'N/A'}
Pitch Deck info: {pitch_deck or 'N/A'}

Generate a cold outreach icebreaker. Include:
- Buying signals
- Why they matter
- Discovery triggers
- Smart questions to ask
- Preferred buying style
- Short summary
- 3 reflection questions
- Top 5 things they would like from our deck
- Potential unclear/relevant/valuable parts and suggestions
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are an AI assistant that generates cold outreach icebreakers."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=700,
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        raise Exception(f"Groq AI generation failed: {str(e)}")

