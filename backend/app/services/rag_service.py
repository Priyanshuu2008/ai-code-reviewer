import chromadb
import os
from datetime import datetime

chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="code_reviews")

def store_review(code: str, language: str, review: dict):
    """Store a code review in ChromaDB for future RAG context"""
    doc_id = f"review_{datetime.now().timestamp()}"
    
    issues_text = " ".join([
        f"{i['type']} {i['severity']}: {i['description']}" 
        for i in review.get("issues", [])
    ])
    
    collection.add(
        documents=[f"Code: {code[:500]}\nIssues: {issues_text}"],
        metadatas=[{
            "language": language,
            "score": str(review.get("overall_score", 0)),
            "timestamp": datetime.now().isoformat()
        }],
        ids=[doc_id]
    )

def get_similar_reviews(code: str, language: str, n_results: int = 3) -> str:
    """Get similar past reviews for RAG context"""
    try:
        results = collection.query(
            query_texts=[code[:500]],
            n_results=n_results,
            where={"language": language}
        )
        
        if not results["documents"][0]:
            return ""
        
        context = "Similar past code reviews from your team:\n"
        for doc in results["documents"][0]:
            context += f"- {doc}\n"
        
        return context
    except:
        return ""

def get_review_count() -> int:
    return collection.count()
