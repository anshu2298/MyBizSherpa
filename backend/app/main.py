from fastapi import FastAPI
from app.routers import transcript

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# include the transcript routes
app.include_router(transcript.router, prefix="/api")

@app.get("/")
def health_check():
    return {"message": "Health Check Complete"}
