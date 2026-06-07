"use client";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";

const CATEGORIES = ["공감", "꿀팁", "질문", "정보"];

const STATUS_LABELS: Record<string, string> = {
  published: "게시중", hidden: "숨김", draft: "임시", pending: "대기",
};

export default function AdminStoriesPage() {
  const [tab, setTab] = useState<"posts" | "comments">("posts");
  const [posts, setPosts] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);
  const [form, setForm] = useState({ category: "공감", title: "", body: "" });
  const [busy, setBusy] = useState(false);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("admin_token") : null);

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

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stories?type=comments", { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (data.success) setComments(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "posts") fetchPosts();
    else fetchComments();
  }, [tab]);

  const changeStatus = async (target_type: "post" | "comment", target_id: string, status: string) => {
    setBusy(true);
    try {
      await fetch("/api/admin/stories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ target_type, target_id, status }),
      });
      if (target_type === "post") fetchPosts();
      else fetchComments();
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

  const fmt = (d: string) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
  };

  return (
    <AdminLayout activeMenu="stories">
      <div style={{ padding: "8px 0" }}>
        {/* 탭 + 글쓰기 버튼 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <button onClick={() => setTab("posts")}
            style={tabStyle(tab === "posts")}>글 관리</button>
          <button onClick={() => setTab("comments")}
            style={tabStyle(tab === "comments")}>신고 댓글</button>
          {tab === "posts" && (
            <button onClick={() => setWriting((v) => !v)}
              style={{ marginLeft: "auto", padding: "8px 18px", borderRadius: 8, border: "none", background: "#5f0080", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              {writing ? "닫기" : "+ 발제 글 작성"}
            </button>
          )}
        </div>

        {/* 글 작성 폼 */}
        {tab === "posts" && writing && (
          <div style={{ background: "#faf8fc", border: "1px solid #eee", borderRadius: 12, padding: 18, marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => setForm((f) => ({ ...f, category: c }))}
                  style={{ padding: "6px 14px", borderRadius: 100, fontSize: 13, cursor: "pointer",
                    border: form.category === c ? "1.5px solid #5f0080" : "1px solid #ddd",
                    background: form.category === c ? "#5f0080" : "#fff",
                    color: form.category === c ? "#fff" : "#666" }}>
                  {c}
                </button>
              ))}
            </div>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="제목 (선택)"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, marginBottom: 8, boxSizing: "border-box" }} />
            <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="발제 내용을 입력하세요. 질문이나 화두를 던지면 댓글이 잘 붙어요."
              rows={4}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, marginBottom: 10, boxSizing: "border-box", resize: "vertical" }} />
            <button onClick={submitPost} disabled={busy}
              style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: busy ? "#ccc" : "#5f0080", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              게시하기
            </button>
          </div>
        )}

        {loading ? (
          <p style={{ textAlign: "center", padding: "40px 0", color: "#888" }}>불러오는 중...</p>
        ) : tab === "posts" ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee", textAlign: "left", color: "#888" }}>
                <th style={th}>카테고리</th>
                <th style={th}>제목/내용</th>
                <th style={th}>공감</th>
                <th style={th}>댓글</th>
                <th style={th}>신고</th>
                <th style={th}>상태</th>
                <th style={th}>관리</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #f0f0f0", background: p.status === "hidden" ? "#fff5f5" : "#fff" }}>
                  <td style={td}>{p.category}</td>
                  <td style={{ ...td, maxWidth: 320 }}>
                    <div style={{ fontWeight: 600, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title || "(제목 없음)"}</div>
                    <div style={{ color: "#999", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.body}</div>
                  </td>
                  <td style={td}>{p.like_count}</td>
                  <td style={td}>{p.comment_count}</td>
                  <td style={{ ...td, color: p.report_count > 0 ? "#d32f2f" : "#bbb", fontWeight: p.report_count > 0 ? 700 : 400 }}>{p.report_count}</td>
                  <td style={td}>
                    <span style={{ fontSize: 12, color: p.status === "hidden" ? "#d32f2f" : "#2e7d32", fontWeight: 600 }}>
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  </td>
                  <td style={td}>
                    {p.status === "hidden" ? (
                      <button onClick={() => changeStatus("post", p.id, "published")} disabled={busy} style={btnGreen}>복구</button>
                    ) : (
                      <button onClick={() => changeStatus("post", p.id, "hidden")} disabled={busy} style={btnRed}>숨김</button>
                    )}
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>글이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee", textAlign: "left", color: "#888" }}>
                <th style={th}>작성자</th>
                <th style={th}>내용</th>
                <th style={th}>원글</th>
                <th style={th}>신고</th>
                <th style={th}>상태</th>
                <th style={th}>관리</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #f0f0f0", background: c.status === "hidden" ? "#fff5f5" : "#fff" }}>
                  <td style={td}>{c.anon_label || "익명"}</td>
                  <td style={{ ...td, maxWidth: 300, color: "#444" }}>{c.body}</td>
                  <td style={{ ...td, maxWidth: 160, color: "#999", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.post_title || "-"}</td>
                  <td style={{ ...td, color: c.report_count > 0 ? "#d32f2f" : "#bbb", fontWeight: 700 }}>{c.report_count}</td>
                  <td style={td}>
                    <span style={{ fontSize: 12, color: c.status === "hidden" ? "#d32f2f" : "#2e7d32", fontWeight: 600 }}>
                      {c.status === "hidden" ? "숨김" : "노출"}
                    </span>
                  </td>
                  <td style={td}>
                    {c.status === "hidden" ? (
                      <button onClick={() => changeStatus("comment", c.id, "visible")} disabled={busy} style={btnGreen}>복구</button>
                    ) : (
                      <button onClick={() => changeStatus("comment", c.id, "hidden")} disabled={busy} style={btnRed}>숨김</button>
                    )}
                  </td>
                </tr>
              ))}
              {comments.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>신고된 댓글이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}

const th: React.CSSProperties = { padding: "10px 8px", fontWeight: 600, fontSize: 12.5 };
const td: React.CSSProperties = { padding: "12px 8px", verticalAlign: "middle" };
function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: "8px 18px", borderRadius: 8, fontSize: 14, cursor: "pointer", fontWeight: 600,
    border: active ? "1.5px solid #5f0080" : "1px solid #ddd",
    background: active ? "#5f0080" : "#fff",
    color: active ? "#fff" : "#666",
  };
}
const btnGreen: React.CSSProperties = { padding: "5px 12px", borderRadius: 6, border: "none", background: "#2e7d32", color: "#fff", fontSize: 12.5, cursor: "pointer" };
const btnRed: React.CSSProperties = { padding: "5px 12px", borderRadius: 6, border: "none", background: "#d32f2f", color: "#fff", fontSize: 12.5, cursor: "pointer" };
