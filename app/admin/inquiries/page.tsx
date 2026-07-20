"use client";
import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import FilterDropdown from "@/components/company/FilterDropdown";
import { formatPhone } from "@/lib/phone";
import { Trash2 } from "lucide-react";

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
  const [checked, setChecked] = useState<number[]>([]);
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

  useEffect(() => { load(); setChecked([]); }, [statusFilter]);

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

  const toggleCheck = (id: number) =>
    setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const toggleAll = () =>
    setChecked((c) => (c.length === items.length ? [] : items.map((it) => it.id)));

  const handleDelete = async () => {
    if (checked.length === 0) return;
    if (!confirm(`선택한 ${checked.length}건의 문의를 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.`)) return;
    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ids: checked }),
      });
      const data = await res.json();
      if (data.success) {
        setItems((prev) => prev.filter((it) => !checked.includes(it.id)));
        setChecked([]);
        window.dispatchEvent(new Event("admin:inquiries-changed"));
      } else {
        alert("삭제에 실패했습니다.");
      }
    } catch (e) {
      console.error("[delete]", e);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const badge = (status: string) => (
    <span style={{ fontSize: 13, fontWeight: 600, color: status === "done" ? "#888" : "#5f0080" }}>
      {status === "done" ? "완료" : "신규"}
    </span>
  );

  return (
    <AdminLayout activeMenu="inquiries">
      <div style={{ width: "fit-content", maxWidth: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <FilterDropdown label="처리상태"
          value={STATUS_TABS.find((t) => t.key === statusFilter)?.label || "전체"}
          options={STATUS_TABS.map((t) => t.label)}
          onChange={(lbl) => setStatusFilter(STATUS_TABS.find((t) => t.label === lbl)?.key ?? "")} />
        {checked.length > 0 && (
          <button onClick={handleDelete}
            style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#e74c3c", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            <Trash2 size={15} /> 선택 삭제 ({checked.length})
          </button>
        )}
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
                <th style={{ width: 40, textAlign: "center" }}>
                  <input type="checkbox" checked={checked.length === items.length && items.length > 0} onChange={toggleAll} style={{ cursor: "pointer" }} />
                </th>
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
                <tr key={it.id} onClick={() => openDetail(it)} style={{ cursor: "pointer", background: checked.includes(it.id) ? "#faf5ff" : undefined }}>
                  <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={checked.includes(it.id)} onChange={() => toggleCheck(it.id)} style={{ cursor: "pointer" }} />
                  </td>
                  <td className="admin-td-type">
                    <span style={{ fontSize: 13, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "#f3eafa", color: "#5f0080", whiteSpace: "nowrap" }}>
                      {it.type}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{it.name}</td>
                  <td style={{ fontSize: 14, whiteSpace: "nowrap" }}>{it.phone ? formatPhone(it.phone) : "-"}</td>
                  <td style={{ fontSize: 14, color: "#555", wordBreak: "break-all" }}>{it.email || "-"}</td>
                  <td style={{ fontWeight: 500 }}>{it.subject || "(제목 없음)"}</td>
                  <td style={{ fontSize: 14, color: "#888" }}>{fmtDate(it.created_at)}</td>
                  <td>{badge(it.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {selected && (
        <div className="cv-overlay">
          <div className="cv-modal" style={{ maxWidth: 1080, width: "94vw", maxHeight: "95vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="cv-body">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <h2 style={{ fontSize: 19, fontWeight: 700, margin: 0 }}>1:1 문의 상세</h2>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: 21, cursor: "pointer", color: "#999" }}>✕</button>
              </div>
              <div style={{ display: "flex", gap: 22, alignItems: "flex-start", flexWrap: "wrap" }}>
                {/* 왼쪽: 문의 정보 + 내용 */}
                <div style={{ flex: "1 1 300px", minWidth: 0 }}>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", rowGap: 12, columnGap: 12, fontSize: 15, marginBottom: 18 }}>
                <span style={{ color: "#888" }}>유형</span><span style={{ fontWeight: 600, color: "#5f0080" }}>{selected.type}</span>
                <span style={{ color: "#888" }}>이름</span><span>{selected.name}</span>
                <span style={{ color: "#888" }}>전화번호</span><span>{selected.phone ? formatPhone(selected.phone) : "-"}</span>
                <span style={{ color: "#888" }}>이메일</span><span style={{ wordBreak: "break-all" }}>{selected.email || "-"}</span>
                <span style={{ color: "#888" }}>제목</span><span style={{ fontWeight: 500 }}>{selected.subject || "(제목 없음)"}</span>
                <span style={{ color: "#888" }}>접수일</span><span>{fmtDate(selected.created_at)}</span>
                <span style={{ color: "#888" }}>상태</span><span>{badge(selected.status)}</span>
              </div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ color: "#888", fontSize: 14, marginBottom: 6 }}>문의 내용</div>
                <div style={{ background: "#faf7fc", borderRadius: 10, padding: 14, fontSize: 15, lineHeight: 1.7, color: "#333", whiteSpace: "pre-wrap" }}>{selected.message}</div>
              </div>

              </div>{/* 왼쪽 끝 */}
                {/* 오른쪽: 답변 작성 */}
                {selected.email ? (
                <div style={{ flex: "1 1 420px", minWidth: 0, borderLeft: "1px solid #eee", paddingLeft: 22 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>답변 메일 작성</div>
                  <textarea className="cv-input" value={replyBody} onChange={(e) => setReplyBody(e.target.value)}
                    style={{ minHeight: "min(68vh, 720px)", resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }} />
                  <button onClick={sendReply}
                    style={{ width: "100%", marginTop: 14, padding: "12px", background: "#5f0080", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                    답변 메일 보내기
                  </button>
                  <p style={{ fontSize: 13, color: "#999", textAlign: "center", marginTop: 8 }}>
                    메일 앱이 열리며, 보내기와 동시에 상태가 완료로 변경됩니다.
                  </p>
                </div>
              ) : (
                <div style={{ flex: "1 1 420px", minWidth: 0, fontSize: 14, color: "#999", textAlign: "center", paddingTop: 40, borderLeft: "1px solid #eee", paddingLeft: 22 }}>
                  이메일 주소가 없어 답변 메일을 보낼 수 없습니다.
                  {selected.status !== "done" && (
                    <button onClick={() => markDone(selected.id)}
                      style={{ display: "block", width: "100%", marginTop: 12, padding: "10px", background: "#fff", color: "#5f0080", border: "1.5px solid #5f0080", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                      완료로 표시
                    </button>
                  )}
                </div>
              )}
              </div>{/* flex 끝 */}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}