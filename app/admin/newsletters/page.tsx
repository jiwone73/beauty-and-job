"use client";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";

const STATUS_LABELS: Record<string, string> = {
  draft: "검토 대기",
  sent: "발송 완료",
};

export default function AdminNewslettersPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("admin_token") : null);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/newsletters", { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (data.success) setList(data.data || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchList(); }, []);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/newsletters/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.success) {
        alert(`뉴스레터를 만들었어요. 뷰티 기사 ${data.data.article_count}개로 구성됐어요.`);
        fetchList();
      } else {
        alert(data.error?.message || "생성에 실패했습니다.");
      }
    } catch {
      alert("생성에 실패했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  const preview = (html: string) => {
    const w = window.open("", "_blank");
    if (w) {
      w.document.write((html || "").replace(/\{\{UNSUBSCRIBE_URL\}\}/g, "#"));
      w.document.close();
    } else {
      alert("팝업이 차단됐어요. 팝업 허용 후 다시 시도해주세요.");
    }
  };

  const testSend = async (id: string) => {
    const email = prompt("테스트로 받아볼 이메일 주소를 입력하세요");
    if (!email) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/newsletters/${id}/send?onlyEmail=${encodeURIComponent(email)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.success) alert(`${email} 로 테스트 발송했어요. 받은편지함·스팸함을 확인하세요.`);
      else alert(data.error?.message || "발송에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  const sendAll = async (id: string, title: string) => {
    if (!confirm(`"${title}"\n\n구독자 전체에게 발송할까요?\n발송 후에는 되돌릴 수 없어요.`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/newsletters/${id}/send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.success) {
        alert(`발송 완료! ${data.data.sent}명에게 보냈어요.`);
        fetchList();
      } else {
        alert(data.error?.message || "발송에 실패했습니다.");
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminLayout activeMenu="newsletters">
      <div style={{ padding: "8px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>뉴스레터</h2>
          <button onClick={generate} disabled={generating}
            style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: 8, border: "none", background: "#5f0080", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            {generating ? "생성 중..." : "✨ 뉴스레터 생성"}
          </button>
        </div>

        {loading ? (
          <p style={{ textAlign: "center", padding: "40px 0", color: "#888" }}>불러오는 중...</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee", textAlign: "left", color: "#888" }}>
                <th style={th}>제목</th><th style={th}>상태</th><th style={th}>생성일</th><th style={th}>발송수</th><th style={th}>관리</th>
              </tr>
            </thead>
            <tbody>
              {list.map((n) => (
                <tr key={n.id} style={{ borderBottom: "1px solid #f0f0f0", background: n.status === "sent" ? "#f6fbf6" : "#fff" }}>
                  <td style={{ ...td, maxWidth: 360, fontWeight: 600, color: "#1a1a1a" }}>{n.title}</td>
                  <td style={td}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: n.status === "sent" ? "#2e7d32" : "#e65100" }}>
                      {STATUS_LABELS[n.status] || n.status}
                    </span>
                  </td>
                  <td style={{ ...td, color: "#888" }}>{(n.created_at || "").slice(0, 10)}</td>
                  <td style={td}>{n.sent_count ?? "-"}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => preview(n.content_html)} style={btnGray}>미리보기</button>
                      <button onClick={() => testSend(n.id)} disabled={busyId === n.id} style={btnPurpleOutline}>테스트</button>
                      {n.status !== "sent" && (
                        <button onClick={() => sendAll(n.id, n.title)} disabled={busyId === n.id} style={btnPurple}>발송</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>
                  생성된 뉴스레터가 없습니다. '뉴스레터 생성'을 눌러보세요.
                </td></tr>
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
const btnGray: React.CSSProperties = { padding: "5px 12px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", color: "#666", fontSize: 12.5, cursor: "pointer" };
const btnPurpleOutline: React.CSSProperties = { padding: "5px 12px", borderRadius: 6, border: "1.5px solid #5f0080", background: "#fff", color: "#5f0080", fontSize: 12.5, cursor: "pointer" };
const btnPurple: React.CSSProperties = { padding: "5px 12px", borderRadius: 6, border: "none", background: "#5f0080", color: "#fff", fontSize: 12.5, cursor: "pointer" };