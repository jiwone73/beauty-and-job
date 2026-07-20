"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ThumbsUp } from "lucide-react";

const CAT_STYLE: Record<string, { bg: string; color: string }> = {
  공감: { bg: "#f3e5f5", color: "#5f0080" },
  꿀팁: { bg: "#e8f5e9", color: "#2e7d32" },
  질문: { bg: "#fff3e0", color: "#e65100" },
  정보: { bg: "#e3f2fd", color: "#1565c0" },
};

export default function StoryDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentInput, setCommentInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const fmtDate = (d: string) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/community/posts/${id}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setPost(res.data.post);
          setComments(res.data.comments || []);
          setLikeCount(res.data.post.like_count);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleLike = async () => {
    const token = getToken();
    if (!token) {
      alert("로그인이 필요해요.");
      router.push("/login");
      return;
    }
    try {
      const r = await fetch(`/api/community/posts/${id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await r.json();
      if (res.success) {
        setLiked(res.data.liked);
        setLikeCount(res.data.like_count);
      } else {
        alert(res.error?.message || "처리에 실패했어요.");
      }
    } catch {
      alert("처리에 실패했어요.");
    }
  };

  const handleComment = async () => {
    const token = getToken();
    if (!token) {
      alert("로그인이 필요해요.");
      router.push("/login");
      return;
    }
    const body = commentInput.trim();
    if (!body) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/community/posts/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body }),
      });
      const res = await r.json();
      if (res.success) {
        setComments((prev) => [...prev, res.data]);
        setCommentInput("");
      } else {
        alert(res.error?.message || "댓글 등록에 실패했어요.");
      }
    } catch {
      alert("댓글 등록에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  };


  if (loading) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px" }}>
        <p style={{ textAlign: "center", padding: "80px 0", color: "#888" }}>불러오는 중...</p>
      </main>
    );
  }
  if (notFound || !post) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px" }}>
        <p style={{ textAlign: "center", padding: "80px 0", color: "#888" }}>글을 찾을 수 없어요.</p>
        <p style={{ textAlign: "center" }}>
          <Link href="/stories" style={{ color: "#5f0080" }}>이야기 목록으로</Link>
        </p>
      </main>
    );
  }

  const cs = CAT_STYLE[post.category] || { bg: "#f0f0f0", color: "#666" };

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px 40px" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 0" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#333", lineHeight: 1 }}>‹</button>
        <Link href="/stories" style={{ fontSize: 15, fontWeight: 600, color: "#5f0080", textDecoration: "none" }}>현장이야기</Link>
      </header>

      <article style={{ paddingBottom: 24, borderBottom: "8px solid #f7f3fb", marginBottom: 20 }}>
        <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600, background: cs.bg, color: cs.color, marginBottom: 12 }}>{post.category}</span>
        {post.title && <h1 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginBottom: 10, lineHeight: 1.4 }}>{post.title}</h1>}
        <p style={{ fontSize: 16, color: "#333", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{post.body}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 18 }}>
          <button onClick={handleLike}
            style={{
              display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
              cursor: "pointer", fontSize: 14, fontWeight: 500, padding: 0,
              color: liked ? "#5f0080" : "#888",
            }}>
            <ThumbsUp size={18} strokeWidth={2} fill={liked ? "#5f0080" : "none"} />
            공감 {likeCount}
          </button>
          <span style={{ fontSize: 13, color: "#bbb" }}>조회 {post.view_count ?? 0}</span>
          <span style={{ fontSize: 13, color: "#bbb" }}>{fmtDate(post.published_at || post.created_at)}</span>
        </div>
      </article>

      <section>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#333", marginBottom: 14 }}>댓글 {comments.length}</h2>

        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <input
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !(e.nativeEvent as any).isComposing) handleComment(); }}
            placeholder="따뜻한 댓글을 남겨주세요"
            style={{ flex: 1, padding: "12px 14px", borderRadius: 24, border: "1px solid #ddd", fontSize: 14, outline: "none" }}
          />
          <button onClick={handleComment} disabled={submitting || !commentInput.trim()}
            style={{ padding: "0 20px", borderRadius: 24, border: "none", background: submitting || !commentInput.trim() ? "#ccc" : "#5f0080", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            등록
          </button>
        </div>

        {comments.length === 0 ? (
          <p style={{ fontSize: 14, color: "#aaa", padding: "24px 0", textAlign: "center" }}>첫 댓글을 남겨보세요</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {comments.map((c) => (
              <div key={c.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#5f0080" }}>{c.anon_label || "익명"}</span>
                </div>
                <p style={{ fontSize: 14, color: "#333", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{c.body}</p>
                <span style={{ fontSize: 12, color: "#bbb" }}>{fmtDate(c.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
