from fastapi import APIRouter
from pydantic import BaseModel
import json
import os

router = APIRouter()

RULES_FILE = "team_rules.json"

DEFAULT_RULES = {
    "naming": [],
    "coding_standards": [],
    "architecture": [],
    "frameworks": [],
    "security": []
}

def load_rules():
    if os.path.exists(RULES_FILE):
        with open(RULES_FILE, "r") as f:
            return json.load(f)
    return DEFAULT_RULES.copy()

def save_rules(rules):
    with open(RULES_FILE, "w") as f:
        json.dump(rules, f, indent=2)

class Rule(BaseModel):
    category: str
    rule: str

@router.get("/rules")
def get_rules():
    return {"success": True, "rules": load_rules()}

@router.post("/rules")
def add_rule(rule: Rule):
    rules = load_rules()
    if rule.category not in rules:
        rules[rule.category] = []
    rules[rule.category].append(rule.rule)
    save_rules(rules)
    return {"success": True, "rules": rules}

@router.delete("/rules")
def delete_rule(rule: Rule):
    rules = load_rules()
    if rule.category in rules and rule.rule in rules[rule.category]:
        rules[rule.category].remove(rule.rule)
        save_rules(rules)
    return {"success": True, "rules": rules}

@router.delete("/rules/all")
def clear_rules():
    save_rules(DEFAULT_RULES.copy())
    return {"success": True, "message": "All rules cleared"}
