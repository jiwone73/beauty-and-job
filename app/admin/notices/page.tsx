"use client";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Plus, Trash2 } from "lucide-react";

// 공지사항 — 왼쪽에서 고르고 오른쪽에서 본다.
//
// 예전에는 오른쪽이 늘 「새 공지 작성」 폼이었다. 공지는 하루에 한 번 쓸까 말까인데
// 화면 절반을 빈 폼이 차지하고, 정작 올린 글은 제목만 한 줄로 보였다. 쓰는 일은
// 단추 하나로 밀어 두고, 자리는 읽는 데 쓴다.

type Notice = {
  id: string; type: "notice" | "event"; target: "all" | "user" | "company";
  title: string; body: string; is_pinned: boolean; status: "draft" | "published";
  published_at: string | null; created_at: string;
};

const TYPE_LABELS: Record<string, string> = { notice: "공지", event: "이벤트" };

function fmtDate(s: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

const 빈값 = { type: "notice", target: "all", title: "", body: "", is_pinned: false, status: "published" };

export default function AdminNoticesPage() {
  const token = () => (typeof window !== "undefined" ? localStorage.getItem("admin_token") : null);
  const [list, setList] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [고른것, set고른것] = useState<string | null>(null);
  const [edit, setEdit] = useState({ ...빈값 });
  const [새공지열림, set새공지열림] = useState(false);
  const [form, setForm] = useState({ ...빈값 });

  const inputStyle = { width: "100%", padding: "9px 11px", border: "1px solid #efeff1", borderRadius: 8, fontSize: 14.5, boxSizing: "border-box" as const, outline: "none" };
  const selStyle = { padding: "8px 10px", border: "1px solid #efeff1", borderRadius: 8, fontSize: 14, background: "#fff" };

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notices", { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      if (json.success) setList(json.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { fetchList(); }, []);

  // 목록이 오면 첫 건을 열어 둔다. 오른쪽이 비어 있으면 무엇을 하는 화면인지 안 보인다.
  useEffect(() => {
    if (고른것 || !list.length) return;
    고르기(list[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list]);

  const 고르기 = (n: Notice) => {
    set고른것(n.id);
    setEdit({ type: n.type, target: n.target ?? "all", title: n.title, body: n.body, is_pinned: n.is_pinned, status: n.status });
  };

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
      setForm({ ...빈값 }); set새공지열림(false); set고른것(null);
      fetchList();
    } finally { setBusy(false); }
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
      fetchList();
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("이 공지를 삭제할까요?")) return;
    setBusy(true);
    try {
      await fetch("/api/admin/notices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ids: [id] }),
      });
      set고른것(null);
      fetchList();
    } finally { setBusy(false); }
  };

  const 지금것 = list.find((n) => n.id === 고른것) || null;

  return (
    <AdminLayout activeMenu="notices">
      <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>

        {/* 왼쪽 — 목록 */}
        <div className="admin-card" style={{ width: 380, flexShrink: 0, overflow: "hidden" }}>
          <div className="admin-table-meta" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>전체 <strong>{list.length}</strong>건</span>
            <button onClick={() => { setForm({ ...빈값 }); set새공지열림(true); }} className="admin-primary-btn">
              <Plus size={15} /> 새 공지
            </button>
          </div>
          {loading ? (
            <div className="admin-empty" style={{ textAlign: "center" }}>불러오는 중…</div>
          ) : list.length === 0 ? (
            <div className="admin-empty" style={{ textAlign: "center" }}>등록된 공지가 없습니다.</div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {list.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => 고르기(n)}
                    style={{ display: "block", width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                      borderBottom: "1px solid #f6f6f8", padding: "12px 16px",
                      background: 고른것 === n.id ? "#f7f7f8" : "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: "#555", background: "#f7f7f8", borderRadius: 6, padding: "1px 7px" }}>
                        {TYPE_LABELS[n.type]}
                      </span>
                      {n.is_pinned && <span style={{ fontSize: 12, color: "#555", border: "1px solid #efeff1", borderRadius: 4, padding: "0 5px" }}>고정</span>}
                      {n.status === "draft" && <span style={{ fontSize: 12, color: "#999", border: "1px solid #efeff1", borderRadius: 4, padding: "0 5px" }}>임시</span>}
                      <span style={{ marginLeft: "auto", fontSize: 12.5, color: "#9a9aa0" }}>{fmtDate(n.published_at || n.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 14.5, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {n.title}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 오른쪽 — 고른 공지 */}
        <div className="admin-card" style={{ flex: 1, minWidth: 0 }}>
          {!지금것 ? (
            <div className="admin-empty" style={{ textAlign: "center" }}>왼쪽에서 공지를 고르세요.</div>
          ) : (
            <div style={{ padding: 18 }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
                <select value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })} style={selStyle}>
                  <option value="notice">공지(필수)</option>
                  <option value="event">이벤트·혜택(광고성)</option>
                </select>
                <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })} style={selStyle}>
                  <option value="published">게시</option>
                  <option value="draft">임시저장</option>
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#555" }}>
                  <input type="checkbox" checked={edit.is_pinned} onChange={(e) => setEdit({ ...edit, is_pinned: e.target.checked })} />
                  상단 고정
                </label>
                <button onClick={() => remove(지금것.id)} disabled={busy} title="이 공지 삭제"
                  style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "7px 12px", borderRadius: 6, border: "1px solid #efeff1", background: "#fff",
                    color: "#c0392b", fontSize: 13.5, cursor: "pointer" }}>
                  <Trash2 size={14} /> 삭제
                </button>
              </div>
              <input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                placeholder="제목" style={{ ...inputStyle, marginBottom: 10, fontSize: 16 }} />
              <textarea value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })}
                spellCheck lang="ko" placeholder="내용"
                style={{ ...inputStyle, resize: "vertical", minHeight: 420, lineHeight: 1.7 }} />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                <button onClick={() => saveEdit(지금것.id)} disabled={busy} className="admin-primary-btn">
                  {busy ? "저장 중…" : "저장"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 새 공지 — 쓰는 일은 가끔이라 모달로 밀어 둔다 */}
      {새공지열림 && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => !busy && set새공지열림(false)}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 720, maxHeight: "86vh", overflow: "auto", padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <strong style={{ fontSize: 16, color: "#1a1a1a" }}>새 공지</strong>
              <button type="button" onClick={() => set새공지열림(false)} aria-label="닫기"
                style={{ border: "none", background: "none", fontSize: 20, color: "#aaa", cursor: "pointer" }}>×</button>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={selStyle}>
                <option value="notice">공지(필수)</option>
                <option value="event">이벤트·혜택(광고성)</option>
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
              placeholder="제목" style={{ ...inputStyle, marginBottom: 10, fontSize: 16 }} />
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
              spellCheck lang="ko" placeholder="내용"
              style={{ ...inputStyle, resize: "vertical", minHeight: 300, lineHeight: 1.7 }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button type="button" className="admin-secondary-btn" onClick={() => set새공지열림(false)} disabled={busy}>닫기</button>
              <button type="button" className="admin-primary-btn" onClick={create} disabled={busy}>
                {busy ? "올리는 중…" : "올리기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
