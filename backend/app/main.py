from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import review, team
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="AI Code Reviewer",
    description="AI-powered code review agent using RAG + Gemini",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(review.router, prefix="/api/review", tags=["review"])
app.include_router(team.router, prefix="/api/team", tags=["team"])

@app.get("/")
def root():
    return {"message": "AI Code Reviewer API is running!"}

