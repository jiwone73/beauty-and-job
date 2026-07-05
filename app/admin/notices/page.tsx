"use client";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";

type Notice = {
  id: string; type: "notice" | "event"; target: "all" | "user" | "company";
  title: string; body: string; is_pinned: boolean; status: "draft" | "published";
  published_at: string | null; created_at: string;
};

const TYPE_LABELS: Record<string, string> = { notice: "공지", event: "이벤트" };
const TARGET_LABELS: Record<string, string> = { all: "전체", user: "개인", company: "기업" };
const targetStyle = (t: string) => {
  if (t === "user") return { background: "#e6f0fb", color: "#1565c0" };
  if (t === "company") return { background: "#e1f5ee", color: "#0f6e56" };
  return { background: "#f1f1f1", color: "#666" };
};

function fmtDate(s: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function AdminNoticesPage() {
  const token = () => (typeof window !== "undefined" ? localStorage.getItem("admin_token") : null);
  const [list, setList] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ type: "notice", target: "all", title: "", body: "", is_pinned: false, status: "published" });
  const [edit, setEdit] = useState({ type: "notice", target: "all", title: "", body: "", is_pinned: false, status: "published" });

  const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, boxSizing: "border-box" as const };
  const selStyle = { padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14 };

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notices", { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      if (json.success) setList(json.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { fetchList(); }, []);

  const create = async () => {
    if (!form.title.trim()) { alert("제목을 입력해주세요."); return; }
    if (!form.body.trim()) { alert("내용을 입력해주세요."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) { alert(json.error?.message || "작성 실패"); return; }
      setForm({ type: "notice", target: "all", title: "", body: "", is_pinned: false, status: "published" });
      fetchList();
    } finally { setBusy(false); }
  };

  const openExpand = (n: Notice) => {
    if (expandedId === n.id) { setExpandedId(null); return; }
    setExpandedId(n.id);
    setEdit({ type: n.type, target: n.target ?? "all", title: n.title, body: n.body, is_pinned: n.is_pinned, status: n.status });
  };

  const saveEdit = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/notices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ id, ...edit }),
      });
      const json = await res.json();
      if (!json.success) { alert(json.error?.message || "수정 실패"); return; }
      setExpandedId(null);
      fetchList();
    } finally { setBusy(false); }
  };

  const removeOne = async (id: string) => {
    if (!confirm("이 공지를 삭제할까요?")) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/notices?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
      setChecked((c) => c.filter((x) => x !== id));
      fetchList();
    } finally { setBusy(false); }
  };

  const removeChecked = async () => {
    if (checked.length === 0) return;
    if (!confirm(`${checked.length}개를 삭제할까요?`)) return;
    setBusy(true);
    try {
      await fetch("/api/admin/notices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ids: checked }),
      });
      setChecked([]);
      fetchList();
    } finally { setBusy(false); }
  };

  const toggleCheck = (id: string) =>
    setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <AdminLayout activeMenu="notices">
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 28, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* 왼쪽: 작성 폼 */}
          <div style={{ flexGrow: 0, flexShrink: 0, flexBasis: "400px", position: "sticky", top: 80, alignSelf: "flex-start" }}>
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 20, marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px" }}>새 공지 작성</h2>
          <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={selStyle}>
              <option value="notice">공지(필수)</option>
              <option value="event">이벤트·혜택(광고성)</option>
            </select>
            <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} style={selStyle}>
              <option value="all">전체</option>
              <option value="user">개인회원</option>
              <option value="company">기업회원</option>
            </select>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={selStyle}>
              <option value="published">게시</option>
              <option value="draft">임시저장</option>
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#555" }}>
              <input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} />
              상단 고정
            </label>
          </div>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="제목" style={{ ...inputStyle, marginBottom: 10 }} />
          <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="내용" rows={12} style={{ ...inputStyle, resize: "vertical", marginBottom: 12, minHeight: 280, lineHeight: 1.6 }} />
          <button onClick={create} disabled={busy}
            style={{ padding: "10px 20px", background: "#5f0080", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            {busy ? "처리 중..." : "작성"}
          </button>
        </div>
          </div>{/* 왼쪽 끝 */}
          {/* 오른쪽: 목록 */}
          <div style={{ flex: "1 1 480px", minWidth: 0 }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 14, color: "#888" }}>전체 {list.length}건</span>
          <button onClick={removeChecked} disabled={checked.length === 0 || busy}
            style={{ padding: "6px 14px", border: "1px solid #e0e0e0", background: "#fff", color: checked.length ? "#d33" : "#bbb", borderRadius: 8, fontSize: 13, cursor: checked.length ? "pointer" : "default" }}>
            선택 삭제 ({checked.length})
          </button>
        </div>

        {loading ? (
          <p style={{ color: "#999", padding: "40px 0", textAlign: "center" }}>불러오는 중...</p>
        ) : list.length === 0 ? (
          <p style={{ color: "#999", padding: "40px 0", textAlign: "center" }}>등록된 공지가 없습니다.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, borderTop: "1px solid #eee" }}>
            {list.map((n) => (
              <li key={n.id} style={{ borderBottom: "1px solid #eee", padding: "12px 4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={checked.includes(n.id)} onChange={() => toggleCheck(n.id)} />
                  <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                    background: n.type === "event" ? "#fdeef5" : "#f3eafa", color: n.type === "event" ? "#c2185b" : "#5f0080" }}>
                    {TYPE_LABELS[n.type]}
                  </span>
                  <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 6, ...targetStyle(n.target) }}>
                    {TARGET_LABELS[n.target] || "전체"}
                  </span>
                  {n.is_pinned && <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: "#5f0080", border: "1px solid #5f0080", borderRadius: 4, padding: "1px 5px" }}>고정</span>}
                  {n.status === "draft" && <span style={{ flexShrink: 0, fontSize: 11, color: "#999", border: "1px solid #ddd", borderRadius: 4, padding: "1px 5px" }}>임시</span>}
                  <span onClick={() => openExpand(n)} style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 500, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {n.title}
                  </span>
                  <span style={{ flexShrink: 0, fontSize: 13, color: "#aaa" }}>{fmtDate(n.published_at || n.created_at)}</span>
                  <button onClick={() => removeOne(n.id)} style={{ flexShrink: 0, padding: "4px 10px", border: "1px solid #eee", background: "#fff", color: "#d33", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>삭제</button>
                </div>

                {expandedId === n.id && (
                  <div style={{ marginTop: 12, padding: 16, background: "#faf7fd", borderRadius: 10 }}>
                    <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                      <select value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })} style={{ ...selStyle, padding: "8px 10px", fontSize: 13 }}>
                        <option value="notice">공지(필수)</option>
                        <option value="event">이벤트·혜택(광고성)</option>
                      </select>
                      <select value={edit.target} onChange={(e) => setEdit({ ...edit, target: e.target.value })} style={{ ...selStyle, padding: "8px 10px", fontSize: 13 }}>
                        <option value="all">전체</option>
                        <option value="user">개인회원</option>
                        <option value="company">기업회원</option>
                      </select>
                      <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })} style={{ ...selStyle, padding: "8px 10px", fontSize: 13 }}>
                        <option value="published">게시</option>
                        <option value="draft">임시저장</option>
                      </select>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#555" }}>
                        <input type="checkbox" checked={edit.is_pinned} onChange={(e) => setEdit({ ...edit, is_pinned: e.target.checked })} />
                        상단 고정
                      </label>
                    </div>
                    <input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                      style={{ ...inputStyle, marginBottom: 10 }} />
                    <textarea value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })}
                      rows={10} style={{ ...inputStyle, resize: "vertical", marginBottom: 12, minHeight: 240, lineHeight: 1.6 }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => saveEdit(n.id)} disabled={busy}
                        style={{ padding: "8px 18px", background: "#5f0080", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>저장</button>
                      <button onClick={() => setExpandedId(null)}
                        style={{ padding: "8px 14px", background: "#fff", color: "#999", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>취소</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
          </div>{/* 오른쪽 끝 */}
        </div>{/* flex 래퍼 끝 */}
      </div>
    </AdminLayout>
  );
}