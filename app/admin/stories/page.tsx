"use client";
import { useEffect, useState, Fragment } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Plus, Search } from "lucide-react";
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

  return (
    <AdminLayout activeMenu="stories">
      {/* 왼쪽에서 고르고 오른쪽에서 본다. 표 안에서 행을 펴 고치던 방식은 글이
          길어지면 아래 목록이 통째로 밀려, 어디를 보고 있었는지 잃어버렸다.
          공지사항·뉴스레터·문의와 같은 짜임으로 맞춘다. */}
      <div style={{ display: "flex", gap: 18, alignItems: "stretch",
        /* 화면 아래가 비어 있는데 칸 안에서만 스크롤됐다. 남는 높이를 그대로 쓴다. */
        flex: 1, minHeight: 0 }}>

        {/* 왼쪽 — 목록 */}
        <div className="admin-card" style={{ width: 460, flexShrink: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div className="admin-table-meta" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => { setTab("posts"); setChecked([]); setExpandedId(null); }} style={tabStyle(tab === "posts")}>글 관리</button>
            <button onClick={() => { setTab("pending"); setChecked([]); setExpandedId(null); }} style={tabStyle(tab === "pending")}>
              승인대기{pendingCount > 0 ? ` ${pendingCount}` : ""}
            </button>
            {tab === "posts" && (
              <button onClick={() => setWriting(true)} className="admin-primary-btn" style={{ marginLeft: "auto" }}>
                <Plus size={15} /> 발제 글
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid #f2f2f4", flexWrap: "wrap" }}>
            <div className="admin-search-wrap" style={{ flex: "1 1 150px", minWidth: 140 }}>
              <Search size={15} className="admin-search-icon" />
              <input className="admin-search-input" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="제목·내용 검색" />
            </div>
            <FilterDropdown label="카테고리" value={catFilter}
              options={["전체", "공감", "꿀팁", "질문", "정보"]} onChange={setCatFilter} />
          </div>

          {checked.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderBottom: "1px solid #f2f2f4" }}>
              <span style={{ fontSize: 13, color: "#9a9aa0" }}>{checked.length}건</span>
              <button onClick={() => bulkChangeStatus("hidden")} disabled={busy} className="admin-secondary-btn" style={{ marginLeft: "auto" }}>숨김</button>
              <button onClick={() => bulkChangeStatus("published")} disabled={busy} className="admin-secondary-btn">복구</button>
              <button onClick={handleBulkDelete} disabled={busy}
                style={{ padding: "6px 11px", borderRadius: 6, border: "1px solid #efeff1", background: "#fff", color: "#c0392b", fontSize: 13.5, cursor: "pointer" }}>
                삭제
              </button>
            </div>
          )}

          {loading ? (
            <div className="admin-empty" style={{ textAlign: "center" }}>불러오는 중…</div>
          ) : visiblePosts.length === 0 ? (
            <div className="admin-empty" style={{ textAlign: "center" }}>
              {tab === "pending" ? "승인 대기 중인 글이 없습니다." : "글이 없습니다."}
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, flex: 1, overflowY: "auto" }}>
              {visiblePosts.map((p) => (
                <li key={p.id} style={{ display: "flex", alignItems: "center", gap: 8,
                  borderBottom: "1px solid #f6f6f8", padding: "10px 14px",
                  background: expandedId === p.id ? "#f7f7f8" : "#fff" }}>
                  <input type="checkbox" checked={checked.includes(p.id)} onChange={() => toggleCheck(p.id)} />
                  <button type="button" onClick={() => openExpand(p)}
                    style={{ flex: 1, minWidth: 0, textAlign: "left", border: "none", background: "none", cursor: "pointer", padding: 0 }}>
                    <div style={{ fontSize: 14.5, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.title || p.body?.slice(0, 40) || "(제목 없음)"}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#9a9aa0", marginTop: 2 }}>
                      {p.category}
                      {" · "}{p.source === "ai" ? "AI" : p.source === "user_story" ? "사용자" : "운영자"}
                      {" · "}{STATUS_LABELS[p.status] || p.status}
                      {tab !== "pending" ? ` · 공감 ${p.like_count} · 댓글 ${p.comment_count} · 조회 ${p.view_count ?? 0}` : ""}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 오른쪽 — 고른 글 */}
        <div className="admin-card" style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
          {!지금것 ? (
            <div className="admin-empty" style={{ textAlign: "center" }}>왼쪽에서 글을 고르세요.</div>
          ) : (
            <div style={{ padding: 18 }}>
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
          )}
        </div>
      </div>

      {/* 자동 게시·AI 생성은 늘 쓰는 것이 아니라 아래에 둔다 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
        <button onClick={toggleAutogen} disabled={autogenSaving}
          title="현장이야기 매일 자동 생성+게시 on/off"
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 8, border: "1px solid #efeff1", background: "#fff", fontSize: 13.5, color: "#555", cursor: "pointer" }}>
          자동 게시
          <span style={{ width: 34, height: 20, borderRadius: 10, position: "relative", background: autogen ? "#582681" : "#ccc", transition: "background 0.2s", display: "inline-block", flexShrink: 0 }}>
            <span style={{ position: "absolute", top: 2, left: autogen ? 16 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
          </span>
        </button>
        <button onClick={generateAI} disabled={generating} className="admin-secondary-btn">
          {generating ? "생성 중…" : "AI 글 생성"}
        </button>
      </div>

      {/* 발제 글 쓰기 — 가끔 하는 일이라 모달로 */}
      {writing && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => !busy && setWriting(false)}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 640, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <strong style={{ fontSize: 16, color: "#1a1a1a" }}>발제 글</strong>
              <button type="button" onClick={() => setWriting(false)} aria-label="닫기"
                style={{ border: "none", background: "none", fontSize: 20, color: "#aaa", cursor: "pointer" }}>×</button>
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
