from github import Github
import os

def get_github_client():
    token = os.getenv("GITHUB_TOKEN")
    if token:
        return Github(token)
    return Github()

def get_pr_code(repo_name: str, pr_number: int) -> dict:
    """Fetch code changes from a GitHub PR"""
    try:
        g = get_github_client()
        repo = g.get_repo(repo_name)
        pr = repo.get_pull(pr_number)
        
        files_data = []
        for file in pr.get_files():
            if file.patch:
                files_data.append({
                    "filename": file.filename,
                    "status": file.status,
                    "additions": file.additions,
                    "deletions": file.deletions,
                    "patch": file.patch
                })
        
        return {
            "pr_title": pr.title,
            "pr_body": pr.body or "",
            "files": files_data,
            "total_changes": pr.additions + pr.deletions
        }
    except Exception as e:
        raise Exception(f"GitHub API error: {str(e)}")

def detect_language(filename: str) -> str:
    """Detect programming language from filename"""
    ext_map = {
        ".py": "python",
        ".js": "javascript", 
        ".ts": "typescript",
        ".jsx": "react",
        ".tsx": "react",
        ".java": "java",
        ".cpp": "cpp",
        ".c": "c",
        ".go": "go",
        ".rs": "rust",
        ".html": "html",
        ".css": "css",
    }
    
    for ext, lang in ext_map.items():
        if filename.endswith(ext):
            return lang
    return "code"
