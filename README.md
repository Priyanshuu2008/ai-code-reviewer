# AI Code Reviewer

**An AI-powered code review agent with RAG pipeline, GitHub PR analysis, team memory, and auto language detection — built for real-world engineering workflows.**

![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Gemini AI](https://img.shields.io/badge/Gemini_2.5_Flash-F9AB00?style=for-the-badge&logo=google&logoColor=white)
![ChromaDB](https://img.shields.io/badge/ChromaDB-RAG-FF6B6B?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)

---

## About the Project

This project is a **full-stack AI code review platform** that goes beyond a simple chatbot. It combines **Retrieval-Augmented Generation (RAG)** with **Google Gemini 2.5 Flash** to provide intelligent, context-aware code reviews.

> Built with FastAPI, React, LangChain, ChromaDB & Gemini AI

The system learns from past reviews using **ChromaDB vector database**, applies **team-specific coding standards** via persistent team memory, and can analyze real **GitHub Pull Requests** automatically.

---

## Features

| Feature | Description |
|---|---|
| AI Code Review | Paste any code and get instant AI feedback with score, issues & suggestions |
| RAG Pipeline | Learns from past reviews using ChromaDB — gets smarter over time |
| GitHub PR Review | Enter any GitHub repo + PR number — AI reviews all changed files |
| Team Memory | Save team coding standards (naming, security, frameworks) — applied to every review |
| Auto Language Detection | Automatically detects Python, JS, TypeScript, Kotlin, Rust and 12+ more |
| Severity Filter | Filter issues by Critical / Major / Minor |
| Review History | All past reviews saved locally — click to reload any review |
| Copy Button | One-click copy of full review output |

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Python 3.12+ | Core backend language |
| FastAPI | REST API framework |
| Google Gemini 2.5 Flash | LLM for code analysis |
| LangChain | LLM orchestration |
| ChromaDB | Vector database for RAG pipeline |
| PyGithub | GitHub API integration |
| React 18 | Frontend UI |
| Vite | Frontend build tool |
| python-dotenv | Environment variable management |

---

## Getting Started

### Prerequisites
- Python 3.12+
- Node.js 18+
- Google Gemini API key — [Get it here](https://aistudio.google.com/apikey)
- GitHub Personal Access Token (optional) — [Get it here](https://github.com/settings/tokens)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Priyanshuu2008/ai-code-reviewer.git
cd ai-code-reviewer
```

#### Backend Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt

# Create .env file
echo GEMINI_API_KEY=your_gemini_api_key_here > .env
echo GITHUB_TOKEN=your_github_token_here >> .env

python -m uvicorn app.main:app --reload
```

Backend runs at `http://127.0.0.1:8000`

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## Project Structure

```
ai-code-reviewer/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application entry point
│   │   ├── routers/
│   │   │   ├── review.py            # Code & PR review endpoints
│   │   │   └── team.py              # Team memory endpoints
│   │   └── services/
│   │       ├── gemini_service.py    # Gemini AI integration
│   │       ├── rag_service.py       # ChromaDB RAG pipeline
│   │       └── github_service.py   # GitHub API integration
│   ├── requirements.txt
│   └── .env                         # API keys (not committed)
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  # Main React component
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
├── .gitignore
└── README.md
```

---

## Environment Variables

Create a `.env` file inside the `backend/` directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GITHUB_TOKEN=your_github_token_here
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/review/code` | Review a code snippet |
| POST | `/api/review/github-pr` | Review a GitHub Pull Request |
| GET | `/api/review/stats` | Get review statistics |
| GET | `/api/team/rules` | Get team coding rules |
| POST | `/api/team/rules` | Add a team rule |
| DELETE | `/api/team/rules` | Delete a team rule |
| DELETE | `/api/team/rules/all` | Clear all team rules |

Full API docs available at `http://127.0.0.1:8000/docs`

---

## Key Highlights

- **RAG Pipeline** — ChromaDB stores past reviews; AI uses them as context for smarter feedback
- **Team Memory** — Persistent coding standards applied to every review automatically
- **GitHub Integration** — Review real PRs from any public repository
- **Auto Language Detection** — Supports 16+ programming languages
- **Secure** — API keys never committed to version control

---

## Author

**Priyanshu Tiwari**
- GitHub: [@Priyanshuu2008](https://github.com/Priyanshuu2008)
- LinkedIn: [priyanshuu20](https://www.linkedin.com/in/priyanshuu20/)

---

## License

This project is open source and available under the [MIT License](LICENSE).
