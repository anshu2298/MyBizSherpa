import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Initialize client using the API key from the environment
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def analyze_transcript_with_openai(transcript_text: str) -> str:
    """
    Sends the transcript to OpenAI GPT model for a summary.
    """
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
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
