from dotenv import load_dotenv
load_dotenv()
from app.services.gemini_service import review_code_with_gemini

try:
    result = review_code_with_gemini("def add(a,b): return a+b", "python")
    print("SUCCESS:", result)
except Exception as e:
    print("ERROR:", str(e))
    