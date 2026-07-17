"use client";
import { useState, useEffect, useCallback } from "react";
import { X, Search, Ban } from "lucide-react";

type Company = { companyId: string; companyName: string; brandName?: string | null; logoUrl?: string | null };

export default function CompanyBlockModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Company[]>([]);
  const [blocked, setBlocked] = useState<Company[]>([]);
  const [searching, setSearching] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : "";
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadBlocked = useCallback(() => {
    fetch("/api/users/blocks", { headers })
      .then((r) => r.json())
      .then((res) => { if (res.success) setBlocked(res.data || []); })
      .catch((e) => console.error("[blocks load]", e));
  }, [token]);

  useEffect(() => { if (open) { loadBlocked(); setQuery(""); setResults([]); } }, [open, loadBlocked]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      setSearching(true);
      fetch(`/api/companies/search?q=${encodeURIComponent(query)}`, { headers })
        .then((r) => r.json())
        .then((res) => { if (res.success) setResults(res.data || []); })
        .catch((e) => console.error("[company search]", e))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const addBlock = async (c: Company) => {
    if (blocked.some((b) => b.companyId === c.companyId)) return;
    setBlocked((prev) => [c, ...prev]);
    setQuery(""); setResults([]);
    try {
      await fetch("/api/users/blocks", {
        method: "POST", headers,
        body: JSON.stringify({ companyId: c.companyId, companyName: c.companyName }),
      });
    } catch (e) { console.error("[block add]", e); loadBlocked(); }
  };

  const removeBlock = async (companyId: string) => {
    setBlocked((prev) => prev.filter((b) => b.companyId !== companyId));
    try {
      await fetch(`/api/users/blocks/${companyId}`, { method: "DELETE", headers });
    } catch (e) { console.error("[block remove]", e); loadBlocked(); }
  };

  if (!open) return null;

  return (
    <div className="cv-overlay">
      <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cv-header">
          <h2 className="cv-title">이력서 공개 설정</h2>
          <button className="cv-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="cv-body">
          <p className="cv-desc">
            차단한 기업은 인재검색에서 내 프로필과 이력서를 볼 수 없어요.
            현재 다니는 회사 등 노출을 원치 않는 기업을 등록하세요.
          </p>

          <label className="cv-field-label">기업 검색</label>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: 13, color: "#999" }} />
            <input
              className="cv-input"
              style={{ paddingLeft: 36, width: "100%" }}
              placeholder="차단할 기업명을 검색하세요"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {query.trim() && (
            <div style={{ border: "1px solid #eee", borderRadius: 8, marginTop: 8, maxHeight: 200, overflowY: "auto" }}>
              {searching ? (
                <div style={{ padding: 16, textAlign: "center", color: "#999", fontSize: 13 }}>검색 중...</div>
              ) : results.length === 0 ? (
                <div style={{ padding: 16, textAlign: "center", color: "#999", fontSize: 13 }}>검색 결과가 없어요</div>
              ) : (
                results.map((c) => (
                  <div key={c.companyId}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #f5f5f5", cursor: "pointer" }}
                    onClick={() => addBlock(c)}>
                    <span style={{ fontSize: 14, color: "#333" }}>
                      {c.companyName}{c.brandName ? ` (${c.brandName})` : ""}
                    </span>
                    <button className="cv-skill-add-btn" style={{ padding: "4px 12px", fontSize: 12 }}>차단</button>
                  </div>
                ))
              )}
            </div>
          )}

          <label className="cv-field-label" style={{ marginTop: 20 }}>차단한 기업 ({blocked.length})</label>
          {blocked.length === 0 ? (
            <p style={{ fontSize: 13, color: "#aaa", padding: "12px 0" }}>아직 차단한 기업이 없어요.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              {blocked.map((b) => (
                <div key={b.companyId}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#faf5ff", borderRadius: 8 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#333" }}>
                    <Ban size={14} color="#5f0080" /> {b.companyName}
                  </span>
                  <button onClick={() => removeBlock(b.companyId)}
                    style={{ background: "none", border: "none", color: "#999", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}>
                    해제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
