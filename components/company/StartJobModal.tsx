"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

// 공고를 새로 쓰러 들어오면 대개 지난 공고를 조금 고쳐 올린다. 같은 매장이 같은
// 자리를 반복해서 뽑기 때문이다. 그런데 '복사해서 등록'도 '이어서 작성'도 공고
// 관리 목록의 카드 안에 있어서, 공고 등록을 누른 사람은 그 길을 모른 채 빈 폼을
// 만났다. 들어오는 길목에서 한 번에 고르게 한다.
//
// 임시저장은 그 공고를 이어서 고치는 것(?id=)이고 지난 공고는 복사(?copy=)라
// 동작이 다르다. 한 목록에 섞지 않고 두 덩이로 나눠 각자 제 버튼을 갖는다.

type 공고 = { id: string; title: string; status: string; deadline: string | null; created_at: string };

const 날짜 = (s: string | null) => (s ? String(s).slice(0, 10).replace(/-/g, ".") : "");

export default function StartJobModal({
  onPick,
  onClose,
}: {
  onPick: (href: string) => void;
  onClose: () => void;
}) {
  const [임시저장, set임시저장] = useState<공고[]>([]);
  const [지난공고, set지난공고] = useState<공고[]>([]);
  const [고른것, set고른것] = useState<string | null>(null);
  const [열림, set열림] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch("/api/company/jobs?limit=30", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        const 목록: 공고[] = Array.isArray(d?.data) ? d.data : (d?.data?.jobs || []);
        const 초안 = 목록.filter((j) => j.status === "DRAFT");
        // 지난 공고는 최근 5건까지. 미용실은 같은 자리를 반복해 뽑아 맨 위 한둘이면
        // 끝나고, 목록이 길면 고르는 일이 일이 된다.
        const 지난 = 목록.filter((j) => j.status !== "DRAFT").slice(0, 5);
        set임시저장(초안);
        set지난공고(지난);
        // 고를 것이 하나도 없으면 굳이 막아서지 않는다.
        if (초안.length || 지난.length) set열림(true);
        else onClose();
      })
      .catch(() => onClose());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!열림) return null;

  const 줄: React.CSSProperties = {
    display: "flex", alignItems: "flex-start", gap: 10, padding: "13px 14px",
    border: "1px solid #efeff1", borderRadius: 10, cursor: "pointer", background: "#fff",
  };
  const 뱃지 = (색: string, 바탕: string): React.CSSProperties => ({
    flexShrink: 0, fontSize: 11.5, color: 색, background: 바탕,
    borderRadius: 5, padding: "2px 7px", lineHeight: 1.5,
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1300, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 520, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        <div style={{ display: "flex", alignItems: "center", padding: "18px 20px 14px" }}>
          <h2 style={{ margin: 0, marginRight: "auto", fontSize: 17, fontWeight: 600, color: "#222" }}>이전 공고 불러오기</h2>
          <button type="button" onClick={onClose} aria-label="닫기"
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#999", padding: 4, display: "flex" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 4px" }}>
          {임시저장.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 13, color: "#999", marginBottom: 8 }}>임시저장 {임시저장.length}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {임시저장.map((j) => (
                  <button key={j.id} type="button" style={{ ...줄, textAlign: "left", width: "100%" }}
                    onClick={() => onPick(`/company/dashboard/jobs/new?id=${j.id}`)}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: "#333", lineHeight: 1.45 }}>
                      {j.title || "제목 없음"}
                      <span style={{ display: "block", fontSize: 12.5, color: "#aaa", marginTop: 3 }}>{날짜(j.created_at)}</span>
                    </span>
                    <span style={뱃지("#582681", "#f4f0f8")}>이어서 작성</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {지난공고.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, color: "#999", marginBottom: 8 }}>최근 등록한 공고 {지난공고.length}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {지난공고.map((j) => {
                  const 고름 = 고른것 === j.id;
                  const 마감 = j.deadline ? new Date(j.deadline) < new Date() : false;
                  return (
                    <label key={j.id}
                      style={{ ...줄, borderColor: 고름 ? "#582681" : "#efeff1", background: 고름 ? "#faf8fc" : "#fff" }}>
                      <input type="radio" name="지난공고" checked={고름} onChange={() => set고른것(j.id)}
                        style={{ marginTop: 3, accentColor: "#582681", flexShrink: 0 }} />
                      <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: "#333", lineHeight: 1.45 }}>
                        {j.title || "제목 없음"}
                        <span style={{ display: "block", fontSize: 12.5, color: "#aaa", marginTop: 3 }}>
                          {j.deadline ? `마감일 ${날짜(j.deadline)}` : "상시채용"}
                        </span>
                      </span>
                      <span style={마감 ? 뱃지("#8a8a8f", "#f2f2f4") : 뱃지("#1f7a4d", "#e8f5ee")}>{마감 ? "마감" : "진행중"}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 20px 18px" }}>
          <button type="button" onClick={onClose}
            style={{ border: "1px solid #e5e5ea", background: "#fff", color: "#555", borderRadius: 8, padding: "10px 18px", fontSize: 14.5, cursor: "pointer" }}>
            새로 등록
          </button>
          <button type="button" disabled={!고른것}
            onClick={() => 고른것 && onPick(`/company/dashboard/jobs/new?copy=${고른것}`)}
            style={{ border: "none", background: 고른것 ? "#582681" : "#d8d3de", color: "#fff", borderRadius: 8, padding: "10px 18px", fontSize: 14.5, fontWeight: 600, cursor: 고른것 ? "pointer" : "default" }}>
            불러오기
          </button>
        </div>
      </div>
    </div>
  );
}
