"use client";
import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";

type Inquiry = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
  subject: string | null;
  message: string;
  status: string;
  user_id: string | null;
  created_at: string;
};

const STATUS_TABS = [
  { key: "", label: "전체" },
  { key: "new", label: "신규" },
  { key: "done", label: "완료" },
];

function fmtDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function AdminInquiriesPage() {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("admin_token") : null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "100");
      const res = await fetch(`/api/admin/inquiries?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.success) setItems(data.data?.items || []);
    } catch (e) {
      console.error("[load inquiries]", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const openDetail = (it: Inquiry) => {
    setSelected(it);
    setReplySubject(`Re: ${it.subject || "뷰티워크 1:1 문의 답변"}`);
    setReplyBody(`안녕하세요, ${it.name || "고객"}님.\n뷰티워크입니다.\n\n문의 주신 내용에 대해 답변드립니다.\n\n\n\n──────────\n[문의 내용]\n${it.message}`);
  };

  const markDone = async (id: number) => {
    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ id, status: "done" }),
      });
      const data = await res.json();
      if (data.success) {
        setSelected((p) => (p ? { ...p, status: "done" } : p));
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: "done" } : it)));
        window.dispatchEvent(new Event("admin:inquiries-changed"));
      }
    } catch (e) {
      console.error("[mark done]", e);
    }
  };

  const sendReply = () => {
    if (!selected?.email) { alert("이메일 주소가 없어 답변을 보낼 수 없습니다."); return; }
    const url = `mailto:${selected.email}?subject=${encodeURIComponent(replySubject)}&body=${encodeURIComponent(replyBody)}`;
    window.location.href = url;
    markDone(selected.id);
  };

  const badge = (status: string) => (
    <span style={{ fontSize: 12, fontWeight: 600, color: status === "done" ? "#888" : "#5f0080" }}>
      {status === "done" ? "완료" : "신규"}
    </span>
  );

  return (
    <AdminLayout activeMenu="inquiries">
      <div className="admin-filter-tabs" style={{ marginBottom: 20 }}>
        {STATUS_TABS.map((t) => (
          <button key={t.key} className={`admin-filter-tab ${statusFilter === t.key ? "active" : ""}`}
            onClick={() => setStatusFilter(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-empty">불러오는 중...</div>
      ) : items.length === 0 ? (
        <div className="admin-empty">문의가 없습니다.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>유형</th>
                <th style={{ width: 100 }}>이름</th>
                <th style={{ width: 130 }}>전화번호</th>
                <th>이메일</th>
                <th>제목</th>
                <th style={{ width: 150 }}>접수일시</th>
                <th style={{ width: 70 }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} onClick={() => openDetail(it)} style={{ cursor: "pointer" }}>
                  <td className="admin-td-type">
                    <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "#f3eafa", color: "#5f0080", whiteSpace: "nowrap" }}>
                      {it.type}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{it.name}</td>
                  <td style={{ fontSize: 13 }}>{it.phone || "-"}</td>
                  <td style={{ fontSize: 13, color: "#555", wordBreak: "break-all" }}>{it.email || "-"}</td>
                  <td style={{ fontWeight: 500 }}>{it.subject || "(제목 없음)"}</td>
                  <td style={{ fontSize: 13, color: "#888" }}>{fmtDate(it.created_at)}</td>
                  <td>{badge(it.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="cv-overlay" onClick={() => setSelected(null)}>
          <div className="cv-modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="cv-body">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>1:1 문의 상세</h2>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999" }}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", rowGap: 12, columnGap: 12, fontSize: 14, marginBottom: 18 }}>
                <span style={{ color: "#888" }}>유형</span><span style={{ fontWeight: 600, color: "#5f0080" }}>{selected.type}</span>
                <span style={{ color: "#888" }}>이름</span><span>{selected.name}</span>
                <span style={{ color: "#888" }}>전화번호</span><span>{selected.phone || "-"}</span>
                <span style={{ color: "#888" }}>이메일</span><span style={{ wordBreak: "break-all" }}>{selected.email || "-"}</span>
                <span style={{ color: "#888" }}>제목</span><span style={{ fontWeight: 500 }}>{selected.subject || "(제목 없음)"}</span>
                <span style={{ color: "#888" }}>접수일</span><span>{fmtDate(selected.created_at)}</span>
                <span style={{ color: "#888" }}>상태</span><span>{badge(selected.status)}</span>
              </div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ color: "#888", fontSize: 13, marginBottom: 6 }}>문의 내용</div>
                <div style={{ background: "#faf7fc", borderRadius: 10, padding: 14, fontSize: 14, lineHeight: 1.7, color: "#333", whiteSpace: "pre-wrap" }}>{selected.message}</div>
              </div>

              {selected.email ? (
                <div style={{ borderTop: "1px solid #eee", paddingTop: 18 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>답변 메일 작성</div>
                  <label className="cv-field-label">제목</label>
                  <input className="cv-input" value={replySubject} onChange={(e) => setReplySubject(e.target.value)} />
                  <label className="cv-field-label" style={{ marginTop: 10 }}>내용</label>
                  <textarea className="cv-input" value={replyBody} onChange={(e) => setReplyBody(e.target.value)}
                    style={{ minHeight: 160, resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }} />
                  <button onClick={sendReply}
                    style={{ width: "100%", marginTop: 14, padding: "12px", background: "#5f0080", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                    답변 메일 보내기
                  </button>
                  <p style={{ fontSize: 12, color: "#999", textAlign: "center", marginTop: 8 }}>
                    메일 앱이 열리며, 보내기와 동시에 상태가 완료로 변경됩니다.
                  </p>
                </div>
              ) : (
                <div style={{ borderTop: "1px solid #eee", paddingTop: 18, fontSize: 13, color: "#999", textAlign: "center" }}>
                  이메일 주소가 없어 답변 메일을 보낼 수 없습니다.
                  {selected.status !== "done" && (
                    <button onClick={() => markDone(selected.id)}
                      style={{ display: "block", width: "100%", marginTop: 12, padding: "10px", background: "#fff", color: "#5f0080", border: "1.5px solid #5f0080", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      완료로 표시
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
