from dotenv import load_dotenv
load_dotenv()
import os
import json
import re
from google import genai
from google.genai import types

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def detect_language_from_code(code: str) -> str:
    keywords = {
        "python": ["def ", "import ", "elif ", "print(", "self.", "lambda"],
        "javascript": ["const ", "let ", "var ", "=>", "console.log", "document."],
        "typescript": ["interface ", ": string", ": number", ": boolean"],
        "java": ["public class", "System.out", "static void"],
        "kotlin": ["fun ", ": Double", ": Int", "data class", "println("],
        "cpp": ["#include", "cout <<", "std::", "int main()"],
        "c": ["#include <stdio", "printf(", "scanf("],
        "go": ["func ", "fmt.", "package ", ":="],
        "rust": ["fn ", "let mut", "println!", "impl ", "pub fn"],
        "sql": ["SELECT ", "FROM ", "WHERE ", "CREATE TABLE"],
        "bash": ["#!/bin/bash", "echo ", "grep "],
        "php": ["<?php", "echo ", "$_"],
        "swift": ["UIViewController", "func ", "var "],
        "ruby": ["puts ", "end", "require "],
    }
    scores = {}
    for lang, kws in keywords.items():
        scores[lang] = sum(1 for kw in kws if kw in code)
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "python"

def review_code_with_gemini(code: str, language: str = "auto", context: str = "", team_rules: dict = None) -> dict:
    if language == "auto":
        language = detect_language_from_code(code)

    rules_text = ""
    if team_rules:
        rules_list = []
        for category, rules in team_rules.items():
            for rule in rules:
                rules_list.append(f"- [{category}] {rule}")
        if rules_list:
            rules_text = "Team coding standards (MUST follow):\n" + "\n".join(rules_list)

    prompt = """You are a code reviewer. Return ONLY a JSON object. No markdown, no backticks, no explanation.

Language: """ + language + """

""" + (rules_text if rules_text else "") + """

Code to review:
---
""" + code + """
---

JSON structure to return:
{
  "overall_score": 8,
  "summary": "brief one line summary",
  "language": """ + '"' + language + '"' + """,
  "issues": [
    {
      "type": "naming",
      "severity": "minor",
      "line": "1",
      "description": "description of issue",
      "suggestion": "how to fix"
    }
  ],
  "positive_aspects": ["strength 1", "strength 2"]
}

IMPORTANT: Return ONLY the JSON object. Nothing else."""

    response = client.models.generate_content(
        model="models/gemini-2.5-flash-lite",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.1,
            max_output_tokens=800
        )
    )

    text = response.text.strip()
    text = re.sub(r'```(?:json)?', '', text)
    text = re.sub(r'```', '', text)
    text = text.strip()

    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1:
        text = text[start:end+1]

    return json.loads(text)
