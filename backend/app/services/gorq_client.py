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
