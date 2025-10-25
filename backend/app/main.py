import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import transcript
from app.routers import linkedin
load_dotenv() 
app = FastAPI()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# include the routes
app.include_router(transcript.router, prefix="/api")
app.include_router(linkedin.router, prefix="/api")

@app.get("/")
def health_check():
    return {"message": "Health Check Complete"}
