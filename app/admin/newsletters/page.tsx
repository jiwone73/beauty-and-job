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
  const [autogen, setAutogen] = useState(false);
  const [autogenSaving, setAutogenSaving] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

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

  const fetchAutogen = async () => {
    try {
      const res = await fetch("/api/admin/settings", { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      if (json.success) setAutogen(json.data?.newsletter_autogen === "on");
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
        body: JSON.stringify({ key: "newsletter_autogen", value: next }),
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

  useEffect(() => { fetchList(); fetchAutogen(); }, []);

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

  const toggleCheck = (id: string) =>
    setChecked((c) => c.includes(id) ? c.filter((x) => x !== id) : [...c, id]);

  const allChecked = list.length > 0 && list.every((n) => checked.includes(n.id));
  const toggleAll = () => {
    if (allChecked) setChecked([]);
    else setChecked(list.map((n) => n.id));
  };

  const handleBulkDelete = async () => {
    if (!checked.length) return;
    if (!confirm(`선택한 ${checked.length}건을 완전히 삭제할까요? (복구 불가)`)) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/newsletters", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ids: checked }),
      });
      const data = await res.json();
      if (data.success) {
        setChecked([]);
        fetchList();
      } else {
        alert(data.error?.message || "삭제에 실패했습니다.");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout activeMenu="newsletters">
      <div style={{ padding: "8px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={toggleAutogen} disabled={autogenSaving}
              title="매주 월요일 뉴스레터 자동 생성+발송 on/off"
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8, border: "1.5px solid #e0e0e0", background: "#fff", fontSize: 14, fontWeight: 600, color: "#555", cursor: "pointer" }}>
              자동 발송
              <span style={{ width: 38, height: 22, borderRadius: 11, position: "relative", background: autogen ? "#5f0080" : "#ccc", transition: "background 0.2s", display: "inline-block", flexShrink: 0 }}>
                <span style={{ position: "absolute", top: 2, left: autogen ? 18 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </span>
            </button>
            <button onClick={generate} disabled={generating}
              style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#5f0080", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
              {generating ? "생성 중..." : "✨ 뉴스레터 생성"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", marginBottom: 12 }}>
          <button onClick={handleBulkDelete} disabled={checked.length === 0 || deleting}
            style={{
              display: "flex", alignItems: "center", gap: 6, marginLeft: "auto",
              padding: "7px 14px", borderRadius: 8, border: "none",
              background: checked.length ? "#e74c3c" : "#ededed",
              color: checked.length ? "#fff" : "#aaa",
              fontSize: 14, fontWeight: 600,
              cursor: checked.length ? "pointer" : "default",
            }}>
            선택 삭제{checked.length ? ` (${checked.length})` : ""}
          </button>
        </div>

        {loading ? (
          <p style={{ textAlign: "center", padding: "40px 0", color: "#888" }}>불러오는 중...</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ ...th, width: 36 }}>
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                </th>
                <th style={{ ...th, textAlign: "left" }}>제목</th><th style={th}>상태</th><th style={th}>생성일</th><th style={th}>발송수</th><th style={th}>관리</th>
              </tr>
            </thead>
            <tbody>
              {list.map((n) => (
                <tr key={n.id} style={{ background: checked.includes(n.id) ? "#faf5ff" : n.status === "sent" ? "#f6fbf6" : "#fff" }}>
                  <td style={td}>
                    <input type="checkbox" checked={checked.includes(n.id)} onChange={() => toggleCheck(n.id)} />
                  </td>
                  <td style={{ ...td, maxWidth: 360, fontWeight: 600, color: "#1a1a1a", textAlign: "left" }}>{n.title}</td>
                  <td style={td}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: n.status === "sent" ? "#2e7d32" : "#e65100" }}>
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
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>
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

const th: React.CSSProperties = {};
const td: React.CSSProperties = {};
const btnGray: React.CSSProperties = { padding: "5px 12px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", color: "#666", fontSize: 13.5, cursor: "pointer" };
const btnPurpleOutline: React.CSSProperties = { padding: "5px 12px", borderRadius: 6, border: "1.5px solid #5f0080", background: "#fff", color: "#5f0080", fontSize: 13.5, cursor: "pointer" };
const btnPurple: React.CSSProperties = { padding: "5px 12px", borderRadius: 6, border: "none", background: "#5f0080", color: "#fff", fontSize: 13.5, cursor: "pointer" };