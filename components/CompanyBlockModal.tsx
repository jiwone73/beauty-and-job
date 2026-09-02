"use client";
import { useState, useEffect, useCallback } from "react";
import { X, Search, Ban } from "lucide-react";

// 이름만으로는 지점을 가릴 수 없다(같은 상호의 지점이 여럿). 주소를 함께
// 들고 다녀야 엉뚱한 곳을 막지 않는다.
type Company = { companyId: string; companyName: string; brandName?: string | null; logoUrl?: string | null; address?: string | null };

export default function CompanyBlockModal({
  open, onClose, noun = "기업", onChange,
}: {
  open: boolean;
  onClose: () => void;
  /** 목록이 바뀌면 부른 쪽도 같이 바뀌어야 한다 — 설정 화면이 이 목록을
   *  「일부 매장만 빼고」 칸 안에 그대로 펼쳐 두기 때문이다. */
  onChange?: (blocked: { companyId: string; companyName: string }[]) => void;
  /** 매장 회원에게는 "매장", 본사 회원에게는 "기업"으로 부른다. 미용실을
   *  "기업"이라 부르면 남 이야기처럼 들려 자기 설정으로 읽히지 않는다.
   *  둘 다 받침으로 끝나 조사("으로부터"·"이")가 갈라지지 않는다. */
  noun?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Company[]>([]);
  const [blocked, setBlocked] = useState<Company[]>([]);
  const [searching, setSearching] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : "";
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadBlocked = useCallback(() => {
    fetch("/api/users/blocks", { headers })
      .then((r) => r.json())
      .then((res) => { if (res.success) { setBlocked(res.data || []); onChange?.(res.data || []); } })
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
    setBlocked((prev) => { const 다음 = [c, ...prev]; onChange?.(다음); return 다음; });
    setQuery(""); setResults([]);
    try {
      await fetch("/api/users/blocks", {
        method: "POST", headers,
        body: JSON.stringify({ companyId: c.companyId, companyName: c.companyName }),
      });
    } catch (e) { console.error("[block add]", e); loadBlocked(); }
  };

  const removeBlock = async (companyId: string) => {
    setBlocked((prev) => { const 다음 = prev.filter((b) => b.companyId !== companyId); onChange?.(다음); return 다음; });
    try {
      await fetch(`/api/users/blocks/${companyId}`, { method: "DELETE", headers });
    } catch (e) { console.error("[block remove]", e); loadBlocked(); }
  };

  if (!open) return null;

  return (
    <div className="cv-overlay">
      <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cv-header">
          {/* 계정 설정에서 넘어오는 자리다. 부르는 이름이 같아야 같은
              이야기의 연장으로 읽힌다. */}
          <h2 className="cv-title">열람 제한 {noun}</h2>
          <button className="cv-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="cv-body">
          <p className="cv-desc">
            여기 등록한 곳은 내 이력서를 검색할 수도, 열람할 수도 없어요.
          </p>

          <label className="cv-field-label">{noun} 검색</label>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: 13, color: "#999" }} />
            <input
              className="cv-input"
              style={{ paddingLeft: 36, width: "100%" }}
              placeholder={`${noun}명을 검색하세요`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {query.trim() && (
            <div style={{ border: "1px solid #eee", borderRadius: 8, marginTop: 8, maxHeight: 200, overflowY: "auto" }}>
              {searching ? (
                <div style={{ padding: 16, textAlign: "center", color: "#999", fontSize: 13 }}>검색 중...</div>
              ) : results.length === 0 ? (
                /* 차단은 상대의 계정에 걸린다. 뷰티워크에 없는 곳은 애초에
                   내 프로필을 볼 수 없으니 막을 것도 없다 — 이름만 적어 두면
                   막았다고 착각하게 되므로, 그 대신 사실을 알린다. */
                <div style={{ padding: "14px 16px", color: "#888", fontSize: 12.5, lineHeight: 1.6 }}>
                  검색되지 않는 곳은 아직 뷰티워크에 없어요.
                  <br />없는 곳은 내 이력서를 볼 수 없으니 등록하지 않아도 괜찮아요.
                </div>
              ) : (
                results.map((c) => (
                  <div key={c.companyId}
                    style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #f5f5f5", cursor: "pointer" }}
                    onClick={() => addBlock(c)}>
                    <span style={{ minWidth: 0, marginRight: 10 }}>
                      <span style={{ display: "block", fontSize: 14, color: "#333" }}>
                        {c.companyName}{c.brandName ? ` (${c.brandName})` : ""}
                      </span>
                      {/* 주소가 있어야 '홍대점'이 여럿일 때 내 가게를 고른다. */}
                      <span style={{ display: "block", fontSize: 12, color: "#999", marginTop: 2, lineHeight: 1.45, overflowWrap: "anywhere" }}>
                        {c.address || "주소 미등록"}
                      </span>
                    </span>
                    <button className="cv-skill-add-btn" style={{ padding: "4px 12px", fontSize: 12, flexShrink: 0 }}>제한</button>
                  </div>
                ))
              )}
            </div>
          )}

          <label className="cv-field-label" style={{ marginTop: 20 }}>열람 제한 {noun} ({blocked.length})</label>
          {blocked.length === 0 ? (
            <p style={{ fontSize: 13, color: "#aaa", padding: "12px 0" }}>아직 등록한 {noun}이 없어요.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              {blocked.map((b) => (
                <div key={b.companyId}
                  style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, padding: "10px 14px", background: "#f7f7f8", borderRadius: 8 }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#333" }}>
                      <Ban size={14} color="#582681" style={{ flexShrink: 0 }} /> {b.companyName}
                    </span>
                    {/* 막아 둔 곳이 정말 그곳인지 나중에도 확인할 수 있어야 한다. */}
                    <span style={{ display: "block", fontSize: 12, color: "#999", marginTop: 2, paddingLeft: 20, lineHeight: 1.45, overflowWrap: "anywhere" }}>
                      {b.address || "주소 미등록"}
                    </span>
                  </span>
                  <button onClick={() => removeBlock(b.companyId)}
                    style={{ background: "none", border: "none", color: "#999", cursor: "pointer", fontSize: 13, textDecoration: "underline", flexShrink: 0 }}>
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
