"use client";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { ChevronDown, Plus, Search, Trash2 } from "lucide-react";

// 공지사항 — 왼쪽에서 고르고 오른쪽에서 본다.
//
// 예전에는 오른쪽이 늘 「새 공지 작성」 폼이었다. 공지는 하루에 한 번 쓸까 말까인데
// 화면 절반을 빈 폼이 차지하고, 정작 올린 글은 제목만 한 줄로 보였다. 쓰는 일은
// 단추 하나로 밀어 두고, 자리는 읽는 데 쓴다.

type Notice = {
  id: string; type: "notice" | "event"; target: "all" | "user" | "company";
  title: string; short_title: string | null; body: string; is_pinned: boolean; status: "draft" | "published";
  published_at: string | null; created_at: string;
};

const TYPE_LABELS: Record<string, string> = { notice: "공지", event: "이벤트" };

function fmtDate(s: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

const 빈값 = { type: "notice", target: "all", title: "", short_title: "", body: "", is_pinned: false, status: "published" };

export default function AdminNoticesPage() {
  const token = () => (typeof window !== "undefined" ? localStorage.getItem("admin_token") : null);
  const [list, setList] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [고른것, set고른것] = useState<string | null>(null);
  const [edit, setEdit] = useState({ ...빈값 });
  const [새공지열림, set새공지열림] = useState(false);
  const [form, setForm] = useState({ ...빈값 });
  const [갈래, set갈래] = useState("전체");
  // 임시저장은 쓰다 만 글이라 목록에 섞이면 눈에 안 띈다 — 유형별로 따로 세어 찾을 수 있게 한다.
  const [상태갈래, set상태갈래] = useState<"" | "draft">("");
  const [검색, set검색] = useState("");

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

  /* 첫 건을 자동으로 열던 것을 걷는다. 좌우로 나눠 두었을 때는 오른쪽이 비어
     있으면 무엇을 하는 화면인지 안 보여 열어 두었지만, 이제 목록이 그 자리를
     채운다 — 열어 두면 목록을 보러 온 사람이 매번 「목록」을 눌러야 한다. */

  const 고르기 = (n: Notice) => {
    set고른것(n.id);
    setEdit({ type: n.type, target: n.target ?? "all", title: n.title, short_title: n.short_title ?? "", body: n.body, is_pinned: n.is_pinned, status: n.status });
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

  /* 옆줄 건수와 목록은 받아 둔 것에서 센다 — 서버에 걸러 받으면 옆줄 숫자가
     지금 걸린 필터 안에서만 세어져 실제와 달라진다. */
  const 갈래수 = (v: string, st: "" | "draft" = "") => list.filter((n) =>
    (v === "전체" || TYPE_LABELS[n.type] === v) && (!st || n.status === st)).length;
  const 찾는말 = 검색.trim();
  const 보일것 = list.filter((n) =>
    (갈래 === "전체" || TYPE_LABELS[n.type] === 갈래) &&
    (!상태갈래 || n.status === 상태갈래) &&
    (!찾는말 || (n.title || "").includes(찾는말) || (n.body || "").includes(찾는말)));

  return (
    <AdminLayout activeMenu="notices" 제목숨김>
      <div className="adm-mail">
        {/* 옆줄 — 갈래. 「어느 함을 여는가」만 맡는다. */}
        <nav className="adm-mail-side" aria-label="공지 갈래">
          <p className="adm-mail-side-h">공지사항<ChevronDown size={15} /></p>
          {["전체", "공지", "이벤트"].map((v) => (
            <div key={v}>
              <button type="button"
                className={`adm-mail-side-i${갈래 === v && !상태갈래 ? " on" : ""}`}
                onClick={() => { set갈래(v); set상태갈래(""); set고른것(null); }}>
                {v}<i>{갈래수(v)}</i>
              </button>
              <button type="button"
                className={`adm-mail-side-i sub${갈래 === v && 상태갈래 === "draft" ? " on" : ""}`}
                onClick={() => { set갈래(v); set상태갈래("draft"); set고른것(null); }}>
                임시저장<i>{갈래수(v, "draft")}</i>
              </button>
            </div>
          ))}
        </nav>

        <div className="admin-card adm-mail-body">
          <h1 className="adm-mail-title">공지사항</h1>
          {새공지열림 ? (
            /* 쓰기 — 창을 따로 띄우지 않고 목록이 서던 자리에 선다.
               읽기(상세)와 같은 짜임이라 오가도 자리가 흔들리지 않는다. */
            <div className="adm-mail-read">
              <div className="adm-mail-bar">
                <button type="button" className="adm-mail-back" onClick={() => set새공지열림(false)}>‹ 목록</button>
              </div>

              <div style={{ padding: "0 20px 24px" }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
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
                  placeholder="제목" style={{ ...inputStyle, marginBottom: 8, fontSize: 16 }} />
                <input value={form.short_title} onChange={(e) => setForm({ ...form, short_title: e.target.value })}
                  placeholder="짧은 제목 (메인 배너용 · 비우면 위 제목을 씁니다)"
                  style={{ ...inputStyle, marginBottom: 10 }} />
                <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                  spellCheck lang="ko" placeholder="내용"
                  style={{ ...inputStyle, resize: "vertical", minHeight: 420, lineHeight: 1.7 }} />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                  <button type="button" className="admin-primary-btn" onClick={create} disabled={busy}>
                    {busy ? "올리는 중…" : "올리기"}
                  </button>
                </div>
              </div>
            </div>
          ) : !지금것 ? (
            <>
              <form className="nb-top adm-mail-find" onSubmit={(e) => e.preventDefault()}>
                <label className="nb-search">
                  <input value={검색} onChange={(e) => set검색(e.target.value)}
                         placeholder="제목·내용 검색" />
                  <button type="submit" aria-label="검색"><Search size={17} /></button>
                </label>
                <button type="button" onClick={() => { setForm({ ...빈값 }); set고른것(null); set새공지열림(true); }}
                        className="admin-primary-btn" style={{ flex: "none" }}>
                  <Plus size={15} /> 새 공지
                </button>
              </form>

              <div className="adm-mail-bar">
                <span className="adm-mail-count" style={{ marginLeft: 0 }}>{보일것.length}건</span>
              </div>

              {loading ? (
                <div className="admin-empty" style={{ textAlign: "center" }}>불러오는 중…</div>
              ) : 보일것.length === 0 ? (
                <div className="admin-empty" style={{ textAlign: "center" }}>
                  {찾는말 ? `「${찾는말}」에 대한 공지가 없습니다.` : "등록된 공지가 없습니다."}
                </div>
              ) : (
                <div className="adm-mail-list">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: 76 }}>갈래</th>
                        <th>제목</th>
                        <th style={{ width: 90 }}>상태</th>
                        <th style={{ width: 120 }}>게시일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {보일것.map((n) => (
                        <tr key={n.id} onClick={() => 고르기(n)} style={{ cursor: "pointer" }}>
                          <td>{TYPE_LABELS[n.type]}</td>
                          <td>
                            {n.is_pinned && <span className="adm-mail-chip">고정</span>}
                            {n.title}
                          </td>
                          <td>{n.status === "draft" ? "임시" : "게시중"}</td>
                          <td className="admin-td-date">{fmtDate(n.published_at || n.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="adm-mail-read">
              <div className="adm-mail-bar">
                <button type="button" className="adm-mail-back" onClick={() => set고른것(null)}>‹ 목록</button>
              </div>

              <div style={{ padding: "0 20px 24px" }}>
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
                placeholder="제목" style={{ ...inputStyle, marginBottom: 8, fontSize: 16 }} />
              {/* 메인 배너처럼 한 줄뿐인 자리에 건다. 비우면 위 제목을 그대로 쓴다. */}
              <input value={edit.short_title} onChange={(e) => setEdit({ ...edit, short_title: e.target.value })}
                placeholder="짧은 제목 (메인 배너용 · 비우면 위 제목을 씁니다)"
                style={{ ...inputStyle, marginBottom: 10 }} />
              <textarea value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })}
                spellCheck lang="ko" placeholder="내용"
                style={{ ...inputStyle, resize: "vertical", minHeight: 420, lineHeight: 1.7 }} />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                <button onClick={() => saveEdit(지금것.id)} disabled={busy} className="admin-primary-btn">
                  {busy ? "저장 중…" : "저장"}
                </button>
              </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </AdminLayout>
  );
}
