from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.gemini_service import review_code_with_gemini
from app.services.rag_service import store_review, get_similar_reviews, get_review_count
from app.services.github_service import get_pr_code, detect_language
from app.routers.team import load_rules

router = APIRouter()

class CodeReviewRequest(BaseModel):
    code: str
    language: str = "python"
    filename: str = ""

class PRReviewRequest(BaseModel):
    repo_name: str
    pr_number: int

@router.post("/code")
async def review_code(request: CodeReviewRequest):
    try:
        language = request.language
        if request.filename:
            language = detect_language(request.filename) or request.language

        context = get_similar_reviews(request.code, language)
        team_rules = load_rules()
        review = review_code_with_gemini(request.code, language, context, team_rules)
        store_review(request.code, language, review)

        return {
            "success": True,
            "language": language,
            "review": review,
            "rag_context_used": bool(context),
            "total_reviews_in_db": get_review_count()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/github-pr")
async def review_github_pr(request: PRReviewRequest):
    try:
        pr_data = get_pr_code(request.repo_name, request.pr_number)
        team_rules = load_rules()

        all_reviews = []
        for file in pr_data["files"][:5]:
            language = detect_language(file["filename"])
            context = get_similar_reviews(file["patch"], language)
            review = review_code_with_gemini(file["patch"], language, context, team_rules)
            store_review(file["patch"], language, review)

            all_reviews.append({
                "filename": file["filename"],
                "language": language,
                "review": review
            })

        return {
            "success": True,
            "pr_title": pr_data["pr_title"],
            "total_files": len(pr_data["files"]),
            "reviewed_files": len(all_reviews),
            "reviews": all_reviews
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_stats():
    return {
        "total_reviews": get_review_count(),
        "status": "active"
    }
