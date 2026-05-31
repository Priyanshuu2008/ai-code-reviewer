import { useState, useEffect } from "react";

const API_URL = "https://ai-code-reviewer-anhq.onrender.com";

const LANGUAGES = [
  "python","javascript","typescript","java","kotlin","c","c++","go",
  "rust","php","ruby","swift","html","css","sql","bash"
];

const CATEGORIES = [
  { key: "naming", label: "Naming" },
  { key: "coding_standards", label: "Coding Standards" },
  { key: "architecture", label: "Architecture" },
  { key: "frameworks", label: "Frameworks" },
  { key: "security", label: "Security" },
];

const detectLang = (code) => {
  const map = {
    python: ["def ", "import ", "elif ", "print(", "self."],
    javascript: ["const ", "let ", "var ", "=>", "console.log", "document."],
    typescript: ["interface ", ": string", ": number", ": boolean"],
    java: ["public class", "System.out", "static void"],
    kotlin: ["fun ", ": Double", ": Int", "data class", "println("],
    cpp: ["#include", "cout <<", "std::", "int main()"],
    c: ["#include <stdio", "printf(", "scanf("],
    go: ["func ", "fmt.", "package ", ":="],
    rust: ["fn ", "let mut", "println!", "impl ", "pub fn"],
    sql: ["SELECT ", "FROM ", "WHERE ", "CREATE TABLE"],
    bash: ["#!/bin/bash", "echo ", "grep "],
    php: ["<?php", "echo ", "$_"],
    swift: ["UIViewController", "func ", "var "],
    ruby: ["puts ", "end", "require "],
  };
  let best = null, bestScore = 0;
  for (const [lang, kws] of Object.entries(map)) {
    const score = kws.filter(kw => code.includes(kw)).length;
    if (score > bestScore) { bestScore = score; best = lang; }
  }
  return bestScore > 0 ? best : null;
};

export default function App() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("review");
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [teamRules, setTeamRules] = useState({});
  const [newRule, setNewRule] = useState("");
  const [newCategory, setNewCategory] = useState("naming");
  const [mainTab, setMainTab] = useState("code");
  const [prRepo, setPrRepo] = useState("");
  const [prNumber, setPrNumber] = useState("");
  const [prLoading, setPrLoading] = useState(false);
  const [prResult, setPrResult] = useState(null);
  const [prError, setPrError] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("review_history");
    if (saved) setHistory(JSON.parse(saved));
    fetchTeamRules();
  }, []);

  const fetchTeamRules = async () => {
    try {
      const res = await fetch(`${API_URL}/api/team/rules`);
      const data = await res.json();
      if (data.success) setTeamRules(data.rules);
    } catch {}
  };

  const addRule = async () => {
    if (!newRule.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/team/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: newCategory, rule: newRule.trim() }),
      });
      const data = await res.json();
      if (data.success) { setTeamRules(data.rules); setNewRule(""); }
    } catch {}
  };

  const deleteRule = async (category, rule) => {
    try {
      const res = await fetch(`${API_URL}/api/team/rules`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, rule }),
      });
      const data = await res.json();
      if (data.success) setTeamRules(data.rules);
    } catch {}
  };

  const clearAllRules = async () => {
    try {
      await fetch(`${API_URL}/api/team/rules/all`, { method: "DELETE" });
      fetchTeamRules();
    } catch {}
  };

  const handleCodeChange = (e) => {
    const val = e.target.value;
    setCode(val);
    const detected = detectLang(val);
    if (detected) setLanguage(detected);
  };

  const reviewCode = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/api/review/code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
        setActiveTab("review");
        if (data.review?.language) setLanguage(data.review.language);
        const entry = {
          id: Date.now(),
          timestamp: new Date().toLocaleString(),
          language: data.language,
          score: data.review.overall_score,
          summary: data.review.summary,
          code: code.slice(0, 100) + "...",
          full: data,
        };
        const newHistory = [entry, ...history].slice(0, 20);
        setHistory(newHistory);
        localStorage.setItem("review_history", JSON.stringify(newHistory));
      } else {
        setError(data.detail || "Something went wrong");
      }
    } catch {
      setError("Backend se connect nahi ho pa raha!");
    } finally {
      setLoading(false);
    }
  };

  const reviewPR = async () => {
    if (!prRepo.trim() || !prNumber.trim()) return;
    setPrLoading(true);
    setPrError(null);
    setPrResult(null);
    try {
      const res = await fetch(`${API_URL}/api/review/github-pr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_name: prRepo, pr_number: parseInt(prNumber) }),
      });
      const data = await res.json();
      if (data.success) setPrResult(data);
      else setPrError(data.detail || "Something went wrong");
    } catch {
      setPrError("Backend se connect nahi ho pa raha!");
    } finally {
      setPrLoading(false);
    }
  };

  const copyResult = () => {
    if (!result) return;
    const text = `AI Code Review Result\nScore: ${result.review.overall_score}/10\nLanguage: ${result.language}\nSummary: ${result.review.summary}\n\nIssues:\n${result.review.issues?.map(i => `[${i.severity.toUpperCase()}] ${i.type} (ln:${i.line})\n${i.description}\nFix: ${i.suggestion}`).join("\n\n")}\n\nStrengths:\n${result.review.positive_aspects?.map(p => `+ ${p}`).join("\n")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadFromHistory = (entry) => {
    setResult(entry.full);
    setCode(entry.code);
    setLanguage(entry.language);
    setShowHistory(false);
    setActiveTab("review");
    setMainTab("code");
  };

  const totalRules = Object.values(teamRules).flat().length;
  const getSeverityStyle = (s) => {
    if (s === "critical") return { border: "#f97583", bg: "rgba(249,117,131,0.08)", badge: "#f97583" };
    if (s === "major") return { border: "#e1c16e", bg: "rgba(225,193,110,0.08)", badge: "#e1c16e" };
    return { border: "#79b8ff", bg: "rgba(121,184,255,0.08)", badge: "#79b8ff" };
  };
  const getScoreColor = (s) => s >= 8 ? "#85e89d" : s >= 5 ? "#e1c16e" : "#f97583";
  const lineCount = Math.max(20, code.split("\n").length + 5);
  const filteredIssues = result?.review?.issues?.filter(i => severityFilter === "all" ? true : i.severity === severityFilter) || [];

  return (
    <div style={{ minHeight: "100vh", background: "#1e1e2e", fontFamily: "'Inter', sans-serif", color: "#cdd6f4", display: "flex", flexDirection: "column" }}>

      {/* Title Bar */}
      <div style={{ background: "#181825", borderBottom: "1px solid #313244", padding: "10px 20px", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#f97583" }}></div>
          <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#e1c16e" }}></div>
          <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#85e89d" }}></div>
        </div>
        <span style={{ fontSize: "13px", color: "#6c7086", fontFamily: "monospace", marginLeft: "8px" }}>ai-code-reviewer — RAG + Gemini</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
          <button onClick={() => { setShowTeam(!showTeam); setShowHistory(false); }}
            style={{ background: showTeam ? "rgba(203,166,247,0.15)" : "transparent", color: "#cba6f7", border: "1px solid rgba(203,166,247,0.2)", padding: "3px 12px", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}>
            Team {totalRules > 0 && `(${totalRules})`}
          </button>
          <button onClick={() => { setShowHistory(!showHistory); setShowTeam(false); }}
            style={{ background: showHistory ? "rgba(137,180,250,0.15)" : "transparent", color: "#89b4fa", border: "1px solid rgba(137,180,250,0.2)", padding: "3px 12px", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}>
            History {history.length > 0 && `(${history.length})`}
          </button>
          <span style={{ fontSize: "11px", color: "#89b4fa", background: "rgba(137,180,250,0.1)", border: "1px solid rgba(137,180,250,0.2)", padding: "2px 10px", borderRadius: "4px" }}>RAG</span>
          <span style={{ fontSize: "11px", color: "#cba6f7", background: "rgba(203,166,247,0.1)", border: "1px solid rgba(203,166,247,0.2)", padding: "2px 10px", borderRadius: "4px" }}>Gemini 2.5</span>
        </div>
      </div>

      {/* Team Memory Panel */}
      {showTeam && (
        <div style={{ background: "#181825", borderBottom: "1px solid #313244", padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "11px", color: "#cba6f7", fontFamily: "monospace" }}>// team memory — coding standards</span>
            <button onClick={clearAllRules} style={{ background: "transparent", color: "#f97583", border: "1px solid rgba(249,117,131,0.2)", padding: "2px 10px", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}>clear all</button>
          </div>
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
              style={{ background: "#313244", color: "#cba6f7", border: "1px solid #45475a", padding: "6px 10px", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace", outline: "none", cursor: "pointer" }}>
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <input value={newRule} onChange={(e) => setNewRule(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRule()}
              placeholder="e.g. Use snake_case for all functions"
              style={{ flex: 1, background: "#1e1e2e", color: "#cdd6f4", border: "1px solid #313244", padding: "6px 12px", borderRadius: "4px", fontSize: "12px", outline: "none" }} />
            <button onClick={addRule}
              style={{ background: "#cba6f7", color: "#1e1e2e", border: "none", padding: "6px 16px", borderRadius: "4px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
              + Add
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }}>
            {CATEGORIES.map(cat => (
              <div key={cat.key}>
                <div style={{ fontSize: "10px", color: "#6c7086", fontFamily: "monospace", marginBottom: "6px", letterSpacing: "1px", textTransform: "uppercase" }}>{cat.label}</div>
                {teamRules[cat.key]?.length > 0 ? teamRules[cat.key].map((rule, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "6px", padding: "5px 8px", background: "#1e1e2e", borderRadius: "4px", marginBottom: "4px", border: "1px solid #313244" }}>
                    <span style={{ fontSize: "11px", color: "#a6adc8", flex: 1, lineHeight: "1.4" }}>{rule}</span>
                    <button onClick={() => deleteRule(cat.key, rule)}
                      style={{ background: "transparent", color: "#45475a", border: "none", cursor: "pointer", fontSize: "12px", padding: "0" }}>×</button>
                  </div>
                )) : (
                  <div style={{ fontSize: "11px", color: "#313244", fontFamily: "monospace" }}>// empty</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Panel */}
      {showHistory && (
        <div style={{ background: "#181825", borderBottom: "1px solid #313244", padding: "16px 20px", maxHeight: "280px", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "11px", color: "#6c7086", fontFamily: "monospace" }}>// review history</span>
            <button onClick={() => { setHistory([]); localStorage.removeItem("review_history"); }}
              style={{ background: "transparent", color: "#f97583", border: "1px solid rgba(249,117,131,0.2)", padding: "2px 10px", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}>clear</button>
          </div>
          {history.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#45475a", fontFamily: "monospace" }}>// no history yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {history.map(entry => (
                <div key={entry.id} onClick={() => loadFromHistory(entry)}
                  style={{ padding: "10px 14px", background: "#1e1e2e", borderRadius: "6px", border: "1px solid #313244", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "18px", fontWeight: "300", color: getScoreColor(entry.score), fontFamily: "monospace" }}>{entry.score}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "11px", color: "#89b4fa", fontFamily: "monospace", marginBottom: "2px" }}>{entry.language} · {entry.timestamp}</div>
                    <div style={{ fontSize: "12px", color: "#6c7086" }}>{entry.summary}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Tabs */}
      <div style={{ background: "#181825", borderBottom: "1px solid #313244", padding: "0 20px", display: "flex" }}>
        <div onClick={() => setMainTab("code")}
          style={{ padding: "9px 20px", fontSize: "12px", color: mainTab === "code" ? "#cdd6f4" : "#6c7086", borderBottom: mainTab === "code" ? "2px solid #89b4fa" : "2px solid transparent", fontFamily: "monospace", cursor: "pointer" }}>
          review.py
        </div>
        <div onClick={() => setMainTab("pr")}
          style={{ padding: "9px 20px", fontSize: "12px", color: mainTab === "pr" ? "#cdd6f4" : "#6c7086", borderBottom: mainTab === "pr" ? "2px solid #85e89d" : "2px solid transparent", fontFamily: "monospace", cursor: "pointer" }}>
          github-pr.js
        </div>
        <div onClick={() => result && setActiveTab(activeTab === "json" ? "review" : "json")}
          style={{ padding: "9px 20px", fontSize: "12px", color: result ? "#a6adc8" : "#45475a", fontFamily: "monospace", cursor: result ? "pointer" : "default", borderBottom: activeTab === "json" && mainTab === "code" ? "2px solid #cba6f7" : "2px solid transparent" }}>
          output.json {result && <span style={{ fontSize: "10px", color: "#85e89d", marginLeft: "4px" }}>●</span>}
        </div>
      </div>

      {/* Code Review Tab */}
      {mainTab === "code" && (
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", background: "#313244", gap: "1px" }}>
          <div style={{ background: "#1e1e2e", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 16px", background: "#181825", borderBottom: "1px solid #313244", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ color: "#e1c16e", fontSize: "12px", fontFamily: "monospace" }}>const</span>
                <span style={{ color: "#89dceb", fontSize: "12px", fontFamily: "monospace" }}>code</span>
                <span style={{ color: "#cdd6f4", fontSize: "12px", fontFamily: "monospace" }}>=</span>
                <span style={{ color: "#f97583", fontSize: "12px", fontFamily: "monospace" }}>input</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "11px", color: "#85e89d", fontFamily: "monospace" }}>auto:</span>
                <select value={language} onChange={(e) => setLanguage(e.target.value)}
                  style={{ background: "#313244", color: "#89b4fa", border: "1px solid #45475a", padding: "4px 10px", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace", outline: "none", cursor: "pointer" }}>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div style={{ flex: 1, display: "flex", overflow: "auto" }}>
              <div style={{ padding: "16px 12px", background: "#181825", color: "#45475a", fontSize: "13px", fontFamily: "monospace", lineHeight: "1.7", minWidth: "44px", textAlign: "right", userSelect: "none", borderRight: "1px solid #313244" }}>
                {Array.from({ length: lineCount }, (_, i) => <div key={i}>{i + 1}</div>)}
              </div>
              <textarea value={code} onChange={handleCodeChange}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); reviewCode(); } }}
                placeholder="// paste code here — Enter to review, Shift+Enter for newline"
                style={{ flex: 1, background: "#1e1e2e", color: "#cdd6f4", border: "none", outline: "none", resize: "none", padding: "16px", fontFamily: "monospace", fontSize: "13px", lineHeight: "1.7", caretColor: "#89b4fa", minHeight: "400px" }} />
            </div>
            <div style={{ padding: "12px 16px", background: "#181825", borderTop: "1px solid #313244" }}>
              {totalRules > 0 && (
                <div style={{ fontSize: "11px", color: "#cba6f7", fontFamily: "monospace", marginBottom: "8px" }}>
                  ✓ {totalRules} team rule{totalRules > 1 ? "s" : ""} active
                </div>
              )}
              <button onClick={reviewCode} disabled={loading || !code.trim()}
                style={{ width: "100%", padding: "10px", background: loading || !code.trim() ? "#313244" : "#89b4fa", color: loading || !code.trim() ? "#6c7086" : "#1e1e2e", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: loading || !code.trim() ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.15s" }}>
                {loading ? "analyzing..." : "> run review — Enter"}
              </button>
            </div>
          </div>

          <div style={{ background: "#1e1e2e", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "8px 16px", background: "#181825", borderBottom: "1px solid #313244", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12px", color: "#6c7086", fontFamily: "monospace" }}>{activeTab === "json" ? "// output.json" : "// analysis output"}</span>
              {result && (
                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  {["all", "critical", "major", "minor"].map(f => (
                    <button key={f} onClick={() => setSeverityFilter(f)}
                      style={{ background: severityFilter === f ? "#313244" : "transparent", color: f === "critical" ? "#f97583" : f === "major" ? "#e1c16e" : f === "minor" ? "#79b8ff" : "#6c7086", border: "1px solid #313244", padding: "2px 8px", borderRadius: "4px", fontSize: "10px", cursor: "pointer", fontFamily: "monospace" }}>
                      {f}
                    </button>
                  ))}
                  <button onClick={copyResult}
                    style={{ background: copied ? "rgba(133,232,157,0.1)" : "transparent", color: copied ? "#85e89d" : "#6c7086", border: `1px solid ${copied ? "rgba(133,232,157,0.3)" : "#313244"}`, padding: "2px 10px", borderRadius: "4px", fontSize: "11px", cursor: "pointer", fontFamily: "monospace", marginLeft: "4px" }}>
                    {copied ? "copied!" : "copy"}
                  </button>
                </div>
              )}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
              {!result && !loading && !error && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "8px" }}>
                  <div style={{ color: "#45475a", fontSize: "13px", textAlign: "center", lineHeight: "2" }}>
                    <div><span style={{ color: "#6c7086", fontFamily: "monospace" }}>{"// "}</span>waiting for input...</div>
                    <div><span style={{ color: "#6c7086", fontFamily: "monospace" }}>{"// "}</span>Enter to review · Shift+Enter for newline</div>
                  </div>
                </div>
              )}
              {loading && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "16px" }}>
                  <div style={{ color: "#89b4fa", fontSize: "13px" }}>analyzing code...</div>
                  <div style={{ width: "200px", height: "2px", background: "#313244", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "linear-gradient(90deg, #89b4fa, #cba6f7)", animation: "slide 1.2s ease-in-out infinite", width: "50%" }}></div>
                  </div>
                  <style>{`@keyframes slide { 0%{transform:translateX(-100%)} 100%{transform:translateX(300%)} }`}</style>
                </div>
              )}
              {error && (
                <div style={{ fontSize: "13px", color: "#f97583", padding: "16px", background: "rgba(249,117,131,0.08)", borderRadius: "6px", border: "1px solid rgba(249,117,131,0.2)" }}>
                  <span style={{ color: "#6c7086", fontFamily: "monospace" }}>{"// "}</span>error: {error}
                </div>
              )}
              {result && activeTab === "json" && (
                <pre style={{ fontFamily: "monospace", fontSize: "11px", color: "#a6adc8", lineHeight: "1.6", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
              {result && activeTab === "review" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ padding: "16px", background: "#181825", borderRadius: "8px", border: "1px solid #313244" }}>
                    <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#6c7086", marginBottom: "10px" }}>{"// score"}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "10px" }}>
                      <span style={{ fontSize: "44px", fontWeight: "300", fontFamily: "monospace", color: getScoreColor(result.review.overall_score), lineHeight: "1" }}>{result.review.overall_score}</span>
                      <span style={{ fontSize: "16px", color: "#45475a", fontFamily: "monospace" }}>/10</span>
                      <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
                        <span style={{ fontSize: "11px", color: "#89b4fa", background: "rgba(137,180,250,0.1)", padding: "2px 8px", borderRadius: "4px" }}>{language}</span>
                        {result.rag_context_used && <span style={{ fontSize: "11px", color: "#85e89d", background: "rgba(133,232,157,0.1)", padding: "2px 8px", borderRadius: "4px" }}>rag</span>}
                        {totalRules > 0 && <span style={{ fontSize: "11px", color: "#cba6f7", background: "rgba(203,166,247,0.1)", padding: "2px 8px", borderRadius: "4px" }}>team</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: "13px", color: "#a6adc8", lineHeight: "1.6" }}>{result.review.summary}</div>
                  </div>
                  {filteredIssues.length > 0 && (
                    <div>
                      <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#6c7086", marginBottom: "10px" }}>
                        {"// issues[" + filteredIssues.length + "]"}
                        {severityFilter !== "all" && <span style={{ color: "#cba6f7", marginLeft: "8px" }}>filter: {severityFilter}</span>}
                      </div>
                      {filteredIssues.map((issue, i) => {
                        const st = getSeverityStyle(issue.severity);
                        return (
                          <div key={i} style={{ padding: "12px 14px", background: st.bg, borderLeft: `2px solid ${st.border}`, borderRadius: "0 6px 6px 0", marginBottom: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                              <span style={{ fontSize: "10px", color: st.badge, fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>{issue.severity}</span>
                              <span style={{ fontSize: "10px", color: "#6c7086" }}>{issue.type}</span>
                              <span style={{ fontSize: "10px", color: "#45475a", fontFamily: "monospace", marginLeft: "auto" }}>ln:{issue.line}</span>
                            </div>
                            <div style={{ fontSize: "13px", color: "#cdd6f4", lineHeight: "1.6", marginBottom: "6px" }}>{issue.description}</div>
                            <div style={{ fontSize: "12px", color: "#6c7086", lineHeight: "1.5" }}>
                              <span style={{ color: "#45475a", fontFamily: "monospace" }}>fix: </span>{issue.suggestion}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {result.review.positive_aspects?.length > 0 && (
                    <div>
                      <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#6c7086", marginBottom: "10px" }}>{"// strengths"}</div>
                      {result.review.positive_aspects.map((p, i) => (
                        <div key={i} style={{ fontSize: "13px", color: "#85e89d", padding: "4px 0 4px 12px", borderLeft: "2px solid rgba(133,232,157,0.3)", marginBottom: "4px" }}>
                          + {p}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GitHub PR Tab */}
      {mainTab === "pr" && (
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", background: "#313244", gap: "1px" }}>
          <div style={{ background: "#1e1e2e", display: "flex", flexDirection: "column", padding: "24px" }}>
            <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#6c7086", marginBottom: "20px" }}>{"// github pull request review"}</div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "11px", color: "#6c7086", fontFamily: "monospace", display: "block", marginBottom: "6px" }}>repo_name</label>
              <input value={prRepo} onChange={(e) => setPrRepo(e.target.value)}
                placeholder="owner/repository (e.g. facebook/react)"
                style={{ width: "100%", background: "#181825", color: "#cdd6f4", border: "1px solid #313244", padding: "10px 14px", borderRadius: "6px", fontSize: "13px", fontFamily: "monospace", outline: "none", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ fontSize: "11px", color: "#6c7086", fontFamily: "monospace", display: "block", marginBottom: "6px" }}>pr_number</label>
              <input value={prNumber} onChange={(e) => setPrNumber(e.target.value)}
                placeholder="e.g. 42"
                type="number"
                style={{ width: "100%", background: "#181825", color: "#cdd6f4", border: "1px solid #313244", padding: "10px 14px", borderRadius: "6px", fontSize: "13px", fontFamily: "monospace", outline: "none", boxSizing: "border-box" }} />
            </div>

            {totalRules > 0 && (
              <div style={{ fontSize: "11px", color: "#cba6f7", fontFamily: "monospace", marginBottom: "12px" }}>
                ✓ {totalRules} team rule{totalRules > 1 ? "s" : ""} active
              </div>
            )}

            <button onClick={reviewPR} disabled={prLoading || !prRepo.trim() || !prNumber.trim()}
              style={{ width: "100%", padding: "11px", background: prLoading || !prRepo.trim() || !prNumber.trim() ? "#313244" : "#85e89d", color: prLoading || !prRepo.trim() || !prNumber.trim() ? "#6c7086" : "#1e1e2e", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              {prLoading ? "reviewing PR..." : "> review pull request"}
            </button>

            <div style={{ marginTop: "24px", padding: "14px", background: "#181825", borderRadius: "6px", border: "1px solid #313244" }}>
              <div style={{ fontSize: "11px", color: "#6c7086", fontFamily: "monospace", marginBottom: "8px" }}>{"// how to use"}</div>
              <div style={{ fontSize: "12px", color: "#45475a", lineHeight: "1.8" }}>
                <div>1. Enter GitHub repo (owner/repo)</div>
                <div>2. Enter PR number</div>
                <div>3. Click Review — AI analyzes all changed files</div>
                <div style={{ marginTop: "8px", color: "#6c7086" }}>Works with public repos. For private repos, add GITHUB_TOKEN to .env</div>
              </div>
            </div>
          </div>

          <div style={{ background: "#1e1e2e", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "8px 16px", background: "#181825", borderBottom: "1px solid #313244" }}>
              <span style={{ fontSize: "12px", color: "#6c7086", fontFamily: "monospace" }}>// pr analysis output</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
              {!prResult && !prLoading && !prError && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "8px" }}>
                  <div style={{ color: "#45475a", fontSize: "13px", textAlign: "center", lineHeight: "2" }}>
                    <div><span style={{ color: "#6c7086", fontFamily: "monospace" }}>{"// "}</span>enter repo + PR number</div>
                    <div><span style={{ color: "#6c7086", fontFamily: "monospace" }}>{"// "}</span>AI will review all changed files</div>
                  </div>
                </div>
              )}
              {prLoading && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "16px" }}>
                  <div style={{ color: "#85e89d", fontSize: "13px" }}>reviewing pull request...</div>
                  <div style={{ width: "200px", height: "2px", background: "#313244", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "linear-gradient(90deg, #85e89d, #89b4fa)", animation: "slide 1.2s ease-in-out infinite", width: "50%" }}></div>
                  </div>
                  <style>{`@keyframes slide { 0%{transform:translateX(-100%)} 100%{transform:translateX(300%)} }`}</style>
                </div>
              )}
              {prError && (
                <div style={{ fontSize: "13px", color: "#f97583", padding: "16px", background: "rgba(249,117,131,0.08)", borderRadius: "6px", border: "1px solid rgba(249,117,131,0.2)" }}>
                  <span style={{ color: "#6c7086", fontFamily: "monospace" }}>{"// "}</span>error: {prError}
                </div>
              )}
              {prResult && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ padding: "14px", background: "#181825", borderRadius: "8px", border: "1px solid #313244" }}>
                    <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#6c7086", marginBottom: "8px" }}>{"// pr summary"}</div>
                    <div style={{ fontSize: "14px", color: "#cdd6f4", fontWeight: "500", marginBottom: "6px" }}>{prResult.pr_title}</div>
                    <div style={{ fontSize: "12px", color: "#6c7086" }}>
                      {prResult.total_files} files changed · {prResult.reviewed_files} reviewed
                    </div>
                  </div>

                  {prResult.reviews?.map((fileReview, idx) => (
                    <div key={idx} style={{ padding: "14px", background: "#181825", borderRadius: "8px", border: "1px solid #313244" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                        <span style={{ fontSize: "12px", color: "#89b4fa", fontFamily: "monospace" }}>{fileReview.filename}</span>
                        <span style={{ fontSize: "11px", color: "#6c7086", fontFamily: "monospace" }}>{fileReview.language}</span>
                        <span style={{ marginLeft: "auto", fontSize: "20px", fontWeight: "300", color: getScoreColor(fileReview.review.overall_score), fontFamily: "monospace" }}>
                          {fileReview.review.overall_score}/10
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#a6adc8", marginBottom: "10px" }}>{fileReview.review.summary}</div>
                      {fileReview.review.issues?.map((issue, i) => {
                        const st = getSeverityStyle(issue.severity);
                        return (
                          <div key={i} style={{ padding: "8px 12px", background: st.bg, borderLeft: `2px solid ${st.border}`, borderRadius: "0 4px 4px 0", marginBottom: "6px" }}>
                            <div style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
                              <span style={{ fontSize: "10px", color: st.badge, fontWeight: "600", textTransform: "uppercase" }}>{issue.severity}</span>
                              <span style={{ fontSize: "10px", color: "#6c7086" }}>{issue.type}</span>
                            </div>
                            <div style={{ fontSize: "12px", color: "#cdd6f4" }}>{issue.description}</div>
                            <div style={{ fontSize: "11px", color: "#6c7086", marginTop: "4px" }}>
                              <span style={{ fontFamily: "monospace", color: "#45475a" }}>fix: </span>{issue.suggestion}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}