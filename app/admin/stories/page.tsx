"use client";
import { useEffect, useState, Fragment } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
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

  return (
    <AdminLayout activeMenu="stories">
      <div style={{ padding: "8px 0", width: "fit-content", maxWidth: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <button onClick={() => { setTab("posts"); setChecked([]); }} style={tabStyle(tab === "posts")}>글 관리</button>
          <button onClick={() => { setTab("pending"); setChecked([]); }} style={tabStyle(tab === "pending")}>
            승인 대기{pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>

          {(
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={toggleAutogen} disabled={autogenSaving}
                title="현장이야기 매일 자동 생성+게시 on/off"
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8, border: "1.5px solid #e0e0e0", background: "#fff", fontSize: 14, fontWeight: 600, color: "#555", cursor: "pointer" }}>
                자동 게시
                <span style={{ width: 38, height: 22, borderRadius: 11, position: "relative", background: autogen ? "#5f0080" : "#ccc", transition: "background 0.2s", display: "inline-block", flexShrink: 0 }}>
                  <span style={{ position: "absolute", top: 2, left: autogen ? 18 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                </span>
              </button>
              <button onClick={generateAI} disabled={generating}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid #5f0080", background: "#fff", color: "#5f0080", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                {generating ? "생성 중..." : "✨ AI 글 생성"}
              </button>
              {tab === "posts" && (
                <button onClick={() => setWriting((v) => !v)}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#5f0080", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                  {writing ? "닫기" : "+ 발제 글 작성"}
                </button>
              )}
            </div>
          )}
        </div>

        {tab === "posts" && writing && (
          <div style={{ background: "#faf8fc", border: "1px solid #eee", borderRadius: 12, padding: 18, marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => setForm((f) => ({ ...f, category: c }))}
                  style={{ padding: "6px 14px", borderRadius: 100, fontSize: 14, cursor: "pointer",
                    border: form.category === c ? "1.5px solid #5f0080" : "1px solid #ddd",
                    background: form.category === c ? "#5f0080" : "#fff",
                    color: form.category === c ? "#fff" : "#666" }}>
                  {c}
                </button>
              ))}
            </div>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="제목 (선택)"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 15, marginBottom: 8, boxSizing: "border-box" }} />
            <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="발제 내용을 입력하세요. 질문이나 화두를 던지면 댓글이 잘 붙어요."
              rows={4}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 15, marginBottom: 10, boxSizing: "border-box", resize: "vertical" }} />
            <button onClick={submitPost} disabled={busy}
              style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: busy ? "#ccc" : "#5f0080", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
              게시하기
            </button>
          </div>
        )}

        {loading ? (
          <p style={{ textAlign: "center", padding: "40px 0", color: "#888" }}>불러오는 중...</p>
        ) : (
          <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: "1 1 200px", minWidth: 180 }}>
              <input
                type="text"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="제목·내용 검색"
                style={{
                  width: "100%", padding: "8px 34px 8px 12px", borderRadius: 8,
                  border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box", outline: "none",
                }}
              />
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="7" stroke="#bbb" strokeWidth="2" />
                <path d="M21 21l-4.3-4.3" stroke="#bbb" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <FilterDropdown label="카테고리" value={catFilter}
              options={["전체", "공감", "꿀팁", "질문", "정보"]} onChange={setCatFilter} />
            <button
              onClick={() => bulkChangeStatus("hidden")}
              disabled={checked.length === 0 || busy}
              style={{
                display: "flex", alignItems: "center", gap: 6, marginLeft: "auto",
                padding: "7px 14px", borderRadius: 8,
                border: `1px solid ${checked.length ? "#e0d0f0" : "#eee"}`, background: "#fff",
                color: checked.length ? "#5f0080" : "#bbb",
                fontSize: 14, fontWeight: 600,
                cursor: checked.length ? "pointer" : "default",
              }}
            >
              숨김{checked.length ? ` (${checked.length})` : ""}
            </button>
            <button
              onClick={() => bulkChangeStatus("published")}
              disabled={checked.length === 0 || busy}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 8,
                border: `1px solid ${checked.length ? "#cfe8d4" : "#eee"}`, background: "#fff",
                color: checked.length ? "#16a34a" : "#bbb",
                fontSize: 14, fontWeight: 600,
                cursor: checked.length ? "pointer" : "default",
              }}
            >
              복구
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={checked.length === 0 || busy}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 8, border: "none",
                background: checked.length ? "#e74c3c" : "#ededed",
                color: checked.length ? "#fff" : "#aaa",
                fontSize: 14, fontWeight: 600,
                cursor: checked.length ? "pointer" : "default",
              }}
            >
              선택 삭제{checked.length ? ` (${checked.length})` : ""}
            </button>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ ...th, width: 36 }}>
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                </th>
                <th style={th}>카테고리</th><th style={th}>제목/내용</th>
                {tab === "pending" ? <th style={th}>출처</th> : <><th style={th}>출처</th><th style={th}>공감</th><th style={th}>댓글</th><th style={th}>조회</th><th style={th}>신고</th></>}
                <th style={th}>상태</th>{tab === "pending" && <th style={th}>관리</th>}
              </tr>
            </thead>
            <tbody>
              {visiblePosts.map((p) => (
                <Fragment key={p.id}>
                <tr style={{ background: checked.includes(p.id) ? "#faf5ff" : p.status === "hidden" ? "#fff5f5" : p.status === "pending" ? "#fffdf5" : "#fff" }}>
                  <td style={td}>
                    <input type="checkbox" checked={checked.includes(p.id)} onChange={() => toggleCheck(p.id)} />
                  </td>
                  <td style={td}>{p.category}</td>
                  <td style={{ ...td, maxWidth: 340, cursor: "pointer", textAlign: "left" }} onClick={() => openExpand(p)}>
                    <div style={{ fontWeight: 600, color: "#1a1a1a", display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ color: "#bbb", fontSize: 12 }}>{expandedId === p.id ? "▼" : "▶"}</span>
                      {p.title || "(제목 없음)"}
                    </div>
                    <div style={{ color: "#999", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 320 }}>{p.body}</div>
                  </td>
                  {tab === "pending" ? (
                    <td style={{ ...td, color: "#888" }}>{p.source === "ai" ? "🤖 AI" : p.source === "user_story" ? "사용자" : "운영자"}</td>
                  ) : (
                    <>
                      <td style={{ ...td, color: "#888" }}>{p.source === "ai" ? "🤖 AI" : p.source === "user_story" ? "사용자" : "운영자"}</td>
                      <td style={td}>{p.like_count}</td>
                      <td style={td}>{p.comment_count}</td>
                      <td style={td}>{p.view_count ?? 0}</td>
                      <td style={{ ...td, color: p.report_count > 0 ? "#d32f2f" : "#bbb", fontWeight: p.report_count > 0 ? 700 : 400 }}>{p.report_count}</td>
                    </>
                  )}
                  <td style={td}><span style={{ fontSize: 13, color: p.status === "hidden" ? "#d32f2f" : p.status === "pending" ? "#e65100" : "#2e7d32", fontWeight: 600 }}>{STATUS_LABELS[p.status] || p.status}</span></td>
                  {tab === "pending" && (
                    <td style={td}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <button onClick={() => changeStatus("post", p.id, "published")} disabled={busy} style={btnGreen}>승인</button>
                        <button onClick={() => changeStatus("post", p.id, "hidden")} disabled={busy} style={btnRed}>반려</button>
                      </div>
                    </td>
                  )}
                </tr>
                {expandedId === p.id && (
                  <tr style={{ background: "#faf8fc" }}>
                    <td colSpan={tab === "pending" ? 6 : 9} style={{ padding: "16px 12px" }}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                        {CATEGORIES.map((c) => (
                          <button key={c} onClick={() => setEdit((e) => ({ ...e, category: c }))}
                            style={{ padding: "5px 13px", borderRadius: 100, fontSize: 13.5, cursor: "pointer",
                              border: edit.category === c ? "1.5px solid #5f0080" : "1px solid #ddd",
                              background: edit.category === c ? "#5f0080" : "#fff",
                              color: edit.category === c ? "#fff" : "#666" }}>
                            {c}
                          </button>
                        ))}
                      </div>
                      <input value={edit.title} onChange={(e) => setEdit((s) => ({ ...s, title: e.target.value }))}
                        placeholder="제목 (선택)"
                        style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 15, marginBottom: 8, boxSizing: "border-box" }} />
                      <textarea value={edit.body} onChange={(e) => setEdit((s) => ({ ...s, body: e.target.value }))}
                        rows={5}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 15, lineHeight: 1.7, marginBottom: 10, boxSizing: "border-box", resize: "vertical" }} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => saveEdit(p.id)} disabled={busy}
                          style={{ padding: "8px 18px", borderRadius: 8, border: "1.5px solid #5f0080", background: "#fff", color: "#5f0080", fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}>
                          저장
                        </button>
                        {tab === "pending" && (
                          <button onClick={() => saveEdit(p.id, "published")} disabled={busy}
                            style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#2e7d32", color: "#fff", fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}>
                            저장 후 승인
                          </button>
                        )}
                        <button onClick={() => setExpandedId(null)}
                          style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#888", fontSize: 14.5, cursor: "pointer", marginLeft: "auto" }}>
                          닫기
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
              {visiblePosts.length === 0 && (
                <tr><td colSpan={tab === "pending" ? 6 : 9} style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>
                  {tab === "pending" ? "승인 대기 중인 글이 없습니다. 'AI 글 생성'을 눌러보세요." : "글이 없습니다."}
                </td></tr>
              )}
            </tbody>
          </table>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

const th: React.CSSProperties = {};
const td: React.CSSProperties = {};
function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: "8px 18px", borderRadius: 8, fontSize: 15, cursor: "pointer", fontWeight: 600,
    border: active ? "1.5px solid #5f0080" : "1px solid #ddd",
    background: active ? "#5f0080" : "#fff",
    color: active ? "#fff" : "#666",
  };
}
const btnGreen: React.CSSProperties = { padding: "5px 12px", borderRadius: 6, border: "none", background: "#2e7d32", color: "#fff", fontSize: 13.5, cursor: "pointer" };
const btnRed: React.CSSProperties = { padding: "5px 12px", borderRadius: 6, border: "none", background: "#d32f2f", color: "#fff", fontSize: 13.5, cursor: "pointer" };
