"use client";
import { useEffect, useState, Fragment } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { ChevronDown, Plus, Search, Trash2 } from "lucide-react";
import FilterDropdown from "@/components/company/FilterDropdown";

const CATEGORIES = ["공감", "꿀팁", "질문", "정보"];

const STATUS_LABELS: Record<string, string> = {
  published: "게시중", hidden: "숨김", draft: "임시", pending: "대기",
};

export default function AdminStoriesPage() {
  const [tab, setTab] = useState<"posts" | "pending">("posts");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);
  const [form, setForm] = useState({ category: "공감", title: "", body: "" });
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ category: "공감", title: "", body: "" });
  const [autogen, setAutogen] = useState(false);
  const [autogenSaving, setAutogenSaving] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const [catFilter, setCatFilter] = useState("전체");
  const [searchQ, setSearchQ] = useState("");

  const openExpand = (p: any) => {
    if (expandedId === p.id) { setExpandedId(null); return; }
    setExpandedId(p.id);
    setEdit({ category: p.category || "공감", title: p.title || "", body: p.body || "" });
  };

  const saveEdit = async (id: string, alsoStatus?: string) => {
    setBusy(true);
    try {
      await fetch("/api/admin/stories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          target_type: "post",
          target_id: id,
          category: edit.category,
          title: edit.title,
          body: edit.body,
          ...(alsoStatus ? { status: alsoStatus } : {}),
        }),
      });
      setExpandedId(null);
      fetchPosts();
    } finally {
      setBusy(false);
    }
  };

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("admin_token") : null);

  const fetchAutogen = async () => {
    try {
      const res = await fetch("/api/admin/settings", { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      if (json.success) setAutogen(json.data?.story_autogen === "on");
    } catch (e) {
      console.error("[fetchAutogen]", e);
    }
  };
  const toggleAutogen = async () => {
    const next = autogen ? "off" : "on";
    setAutogenSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ key: "story_autogen", value: next }),
      });
      const json = await res.json();
      if (json.success) setAutogen(next === "on");
      else alert(json.error?.message || "변경에 실패했습니다.");
    } catch (e) {
      console.error("[toggleAutogen]", e);
      alert("변경에 실패했습니다.");
    } finally {
      setAutogenSaving(false);
    }
  };
  useEffect(() => { fetchAutogen(); }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stories", { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (data.success) setPosts(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [tab]);

  const changeStatus = async (target_type: "post" | "comment", target_id: string, status: string) => {
    setBusy(true);
    try {
      await fetch("/api/admin/stories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ target_type, target_id, status }),
      });
      fetchPosts();
    } finally {
      setBusy(false);
    }
  };

  // 선택 항목 일괄 숨김/복구
  const bulkChangeStatus = async (status: "hidden" | "published") => {
    if (!checked.length || busy) return;
    setBusy(true);
    try {
      for (const id of checked) {
        await fetch("/api/admin/stories", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ target_type: "post", target_id: id, status }),
        });
      }
      setChecked([]);
      fetchPosts();
    } finally {
      setBusy(false);
    }
  };

  const submitPost = async () => {
    if (!form.body.trim()) { alert("본문을 입력해주세요."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...form, status: "published" }),
      });
      const data = await res.json();
      if (data.success) {
        setForm({ category: "공감", title: "", body: "" });
        setWriting(false);
        fetchPosts();
      } else {
        alert(data.error?.message || "작성에 실패했습니다.");
      }
    } finally {
      setBusy(false);
    }
  };

  const generateAI = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/stories/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        alert("AI가 발제 글을 만들었어요. '승인 대기' 탭에서 확인하세요.");
        setTab("pending");
        fetchPosts();
      } else {
        alert(data.error?.message || "생성에 실패했습니다.");
      }
    } catch {
      alert("생성에 실패했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!checked.length) return;
    if (!confirm(`선택한 ${checked.length}건을 완전히 삭제하시겠습니까? (복구 불가)`)) return;
    setBusy(true);
    try {
      await fetch("/api/admin/stories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ids: checked }),
      });
      setChecked([]);
      fetchPosts();
    } finally {
      setBusy(false);
    }
  };

  const toggleCheck = (id: string) =>
    setChecked((c) => c.includes(id) ? c.filter((x) => x !== id) : [...c, id]);

  const visiblePosts = posts.filter((p) => {
    const tabMatch = tab === "pending" ? p.status === "pending" : p.status !== "pending";
    const catMatch = catFilter === "전체" || p.category === catFilter;
    const q = searchQ.trim().toLowerCase();
    const searchMatch = !q || (p.title || "").toLowerCase().includes(q) || (p.body || "").toLowerCase().includes(q);
    return tabMatch && catMatch && searchMatch;
  });
  const pendingCount = posts.filter((p) => p.status === "pending").length;

  const allChecked = visiblePosts.length > 0 && visiblePosts.every((p) => checked.includes(p.id));
  const toggleAll = () => {
    const ids = visiblePosts.map((p) => p.id);
    if (allChecked) setChecked((prev) => prev.filter((id) => !ids.includes(id)));
    else setChecked((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const 지금것 = visiblePosts.find((x) => x.id === expandedId) || null;

  /* 옆줄 건수는 지금 보고 있는 갈래(글 관리·승인대기) 안에서 센다 — 카테고리는
     그 안을 다시 나누는 것이라 같은 모수를 써야 숫자가 맞는다. */
  const 갈래안 = posts.filter((p: any) =>
    tab === "pending" ? p.status === "pending" : p.status !== "pending");
  const 카테고리수 = (v: string) => 갈래안.filter((p: any) => v === "전체" || p.category === v).length;

  return (
    <AdminLayout activeMenu="stories" 제목숨김>
      <div className="adm-mail">
        {/* 옆줄 — 갈래. 「어느 함을 여는가」만 맡는다. 글 관리와 승인대기가 먼저고,
            그 아래 카테고리다. */}
        <nav className="adm-mail-side" aria-label="글 갈래">
          <p className="adm-mail-side-h">현장이야기<ChevronDown size={15} /></p>
          {["전체", "공감", "꿀팁", "질문", "정보"].map((v) => (
            <button key={v} type="button"
              className={`adm-mail-side-i${catFilter === v ? " on" : ""}`}
              onClick={() => { setCatFilter(v); setExpandedId(null); }}>
              {v}<i>{카테고리수(v)}</i>
            </button>
          ))}
        </nav>

        <div className="admin-card adm-mail-body">
          <h1 className="adm-mail-title">현장이야기</h1>
          {!지금것 ? (
            <>
              {/* 보기(글 관리·승인대기)와 글 만드는 장치는 목록 위에 둔다. 옆줄에
                  두었을 때는 카테고리와 같은 무게로 읽혔고, 자동 게시·AI 글 생성은
                  화면 맨 아래에 있어 매번 끝까지 내려가야 했다. */}
              <form className="nb-top adm-mail-find" onSubmit={(e) => e.preventDefault()}>
                <select className="nb-pick" aria-label="보기" value={tab}
                        onChange={(e) => { setTab(e.target.value as "posts" | "pending"); setChecked([]); setExpandedId(null); }}>
                  <option value="posts">글 관리 {posts.filter((p: any) => p.status !== "pending").length}</option>
                  <option value="pending">승인대기 {pendingCount}</option>
                </select>
                <label className="nb-search">
                  <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="제목·내용 검색" />
                  <button type="submit" aria-label="검색"><Search size={17} /></button>
                </label>
                <button onClick={toggleAutogen} disabled={autogenSaving} type="button"
                  title="현장이야기 매일 자동 생성+게시 on/off"
                  style={{ flex: "none", display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 8, border: "1px solid #efeff1", background: "#fff", fontSize: 13.5, color: "#555", cursor: "pointer" }}>
                  자동 게시
                  <span style={{ width: 34, height: 20, borderRadius: 10, position: "relative", background: autogen ? "#582681" : "#ccc", transition: "background 0.2s", display: "inline-block", flexShrink: 0 }}>
                    <span style={{ position: "absolute", top: 2, left: autogen ? 16 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                  </span>
                </button>
                <button onClick={generateAI} disabled={generating} type="button" className="admin-secondary-btn" style={{ flex: "none" }}>
                  {generating ? "생성 중…" : "AI 글 생성"}
                </button>
                {tab === "posts" && (
                  <button type="button" onClick={() => setWriting(true)} className="admin-primary-btn" style={{ flex: "none" }}>
                    <Plus size={15} /> 발제 글
                  </button>
                )}
              </form>

              <div className="adm-mail-bar">
                <label className="adm-mail-all">
                  <input type="checkbox"
                    checked={visiblePosts.length > 0 && checked.length === visiblePosts.length}
                    onChange={(e) => setChecked(e.target.checked ? visiblePosts.map((p: any) => p.id) : [])} />
                  전체 선택
                </label>
                {checked.length > 0 && (
                  <>
                    <button onClick={() => bulkChangeStatus("hidden")} disabled={busy} className="admin-secondary-btn">숨김</button>
                    <button onClick={() => bulkChangeStatus("published")} disabled={busy} className="admin-secondary-btn">복구</button>
                    <button type="button" className="adm-mail-del" onClick={handleBulkDelete} disabled={busy}>
                      <Trash2 size={14} /> 삭제 ({checked.length})
                    </button>
                  </>
                )}
                <span className="adm-mail-count">{visiblePosts.length}건</span>
              </div>

              {loading ? (
                <div className="admin-empty" style={{ textAlign: "center" }}>불러오는 중…</div>
              ) : visiblePosts.length === 0 ? (
                <div className="admin-empty" style={{ textAlign: "center" }}>
                  {tab === "pending" ? "승인 대기 중인 글이 없습니다." : "글이 없습니다."}
                </div>
              ) : (
                <div className="adm-mail-list">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: 38 }}></th>
                        <th style={{ width: 66 }}>갈래</th>
                        <th>제목</th>
                        <th style={{ width: 76 }}>쓴 곳</th>
                        <th style={{ width: 80 }}>상태</th>
                        {tab !== "pending" && <th style={{ width: 150 }}>공감·댓글·조회</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePosts.map((p: any) => (
                        <tr key={p.id} className={p.status === "pending" ? "adm-mail-new" : undefined}>
                          <td onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={checked.includes(p.id)} onChange={() => toggleCheck(p.id)} />
                          </td>
                          <td onClick={() => openExpand(p)} style={{ cursor: "pointer" }}>{p.category}</td>
                          <td onClick={() => openExpand(p)} style={{ cursor: "pointer" }}>
                            {p.title || p.body?.slice(0, 40) || "(제목 없음)"}
                          </td>
                          <td onClick={() => openExpand(p)} style={{ cursor: "pointer" }}>
                            {p.source === "ai" ? "AI" : p.source === "user_story" ? "사용자" : "운영자"}
                          </td>
                          <td onClick={() => openExpand(p)} style={{ cursor: "pointer" }}>{STATUS_LABELS[p.status] || p.status}</td>
                          {tab !== "pending" && (
                            <td onClick={() => openExpand(p)} style={{ cursor: "pointer" }}>
                              {p.like_count} · {p.comment_count} · {p.view_count ?? 0}
                            </td>
                          )}
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
                <button type="button" className="adm-mail-back" onClick={() => setExpandedId(null)}>‹ 목록</button>
              </div>
              <div style={{ padding: "0 20px 24px" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                {CATEGORIES.map((c) => (
                  <button key={c} onClick={() => setEdit((e) => ({ ...e, category: c }))}
                    style={{ padding: "5px 13px", borderRadius: "var(--chip-radius)", fontSize: 13.5, cursor: "pointer",
                      border: edit.category === c ? "1px solid #582681" : "1px solid #efeff1",
                      background: edit.category === c ? "#582681" : "#fff",
                      color: edit.category === c ? "#fff" : "#666" }}>
                    {c}
                  </button>
                ))}
              </div>
              <input value={edit.title} onChange={(e) => setEdit((s) => ({ ...s, title: e.target.value }))}
                placeholder="제목 (선택)"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #efeff1", fontSize: 16, marginBottom: 8, boxSizing: "border-box", outline: "none" }} />
              <textarea value={edit.body} onChange={(e) => setEdit((s) => ({ ...s, body: e.target.value }))}
                spellCheck lang="ko"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #efeff1", fontSize: 15, lineHeight: 1.75, minHeight: 380, boxSizing: "border-box", resize: "vertical", outline: "none" }} />
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={() => saveEdit(지금것.id)} disabled={busy} className="admin-secondary-btn">저장</button>
                {tab === "pending" && (
                  <>
                    <button onClick={() => saveEdit(지금것.id, "published")} disabled={busy} className="admin-primary-btn">저장 후 승인</button>
                    <button onClick={() => changeStatus("post", 지금것.id, "hidden")} disabled={busy}
                      style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid #efeff1", background: "#fff", color: "#c0392b", fontSize: 13.5, cursor: "pointer" }}>
                      반려
                    </button>
                  </>
                )}
                <button onClick={() => changeStatus("post", 지금것.id, 지금것.status === "hidden" ? "published" : "hidden")} disabled={busy}
                  className="admin-secondary-btn" style={{ marginLeft: "auto" }}>
                  {지금것.status === "hidden" ? "복구" : "숨김"}
                </button>
              </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 발제 글 쓰기 — 가끔 하는 일이라 모달로 */}
      {writing && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => !busy && setWriting(false)}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 640, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <strong style={{ fontSize: 16, color: "#555" }}>발제 글</strong>
              <button type="button" onClick={() => setWriting(false)} aria-label="닫기"
                style={{ border: "none", background: "none", fontSize: 20, color: "#555", cursor: "pointer" }}>×</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => setForm((f) => ({ ...f, category: c }))}
                  style={{ padding: "6px 14px", borderRadius: "var(--chip-radius)", fontSize: 14, cursor: "pointer",
                    border: form.category === c ? "1px solid #582681" : "1px solid #efeff1",
                    background: form.category === c ? "#582681" : "#fff",
                    color: form.category === c ? "#fff" : "#666" }}>
                  {c}
                </button>
              ))}
            </div>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="제목 (선택)"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #efeff1", fontSize: 16, marginBottom: 8, boxSizing: "border-box", outline: "none" }} />
            <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              spellCheck lang="ko" placeholder="발제 내용"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #efeff1", fontSize: 15, lineHeight: 1.7, minHeight: 220, boxSizing: "border-box", resize: "vertical", outline: "none" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button type="button" className="admin-secondary-btn" onClick={() => setWriting(false)} disabled={busy}>닫기</button>
              <button type="button" className="admin-primary-btn" onClick={async () => { await submitPost(); setWriting(false); }} disabled={busy}>게시하기</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

const th: React.CSSProperties = {};
const td: React.CSSProperties = {};
function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: "8px 18px", borderRadius: 8, fontSize: 15, cursor: "pointer", fontWeight: 600,
    border: active ? "1.5px solid #582681" : "1px solid #ddd",
    background: active ? "#582681" : "#fff",
    color: active ? "#fff" : "#666",
  };
}
const btnGreen: React.CSSProperties = { padding: "5px 12px", borderRadius: 6, border: "none", background: "#2e7d32", color: "#fff", fontSize: 13.5, cursor: "pointer" };
const btnRed: React.CSSProperties = { padding: "5px 12px", borderRadius: 6, border: "none", background: "#d32f2f", color: "#fff", fontSize: 13.5, cursor: "pointer" };
