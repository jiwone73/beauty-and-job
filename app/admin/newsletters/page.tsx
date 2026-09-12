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
  const [previewItem, setPreviewItem] = useState<any | null>(null);

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
        setPreviewItem(null);
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

  const 지금것 = list.find((n) => n.id === previewItem?.id) || previewItem;

  return (
    <AdminLayout activeMenu="newsletters">
      {/* 왼쪽에서 고르고 오른쪽에서 본다. 미리보기를 모달로 띄우면 목록이 가려져
          「다음 것」을 보려면 매번 닫아야 했다. 공지사항과 같은 짜임으로 맞춘다. */}
      <div style={{ display: "flex", gap: 18, alignItems: "stretch",
        /* 화면 아래가 비어 있는데 칸 안에서만 스크롤됐다. 남는 높이를 그대로 쓴다. */
        flex: 1, minHeight: 0 }}>

        {/* 왼쪽 — 목록 */}
        <div className="admin-card" style={{ width: 460, flexShrink: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div className="admin-table-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={toggleAutogen} disabled={autogenSaving}
                title="매주 월요일 뉴스레터 자동 생성+발송 on/off"
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 8, border: "1px solid #efeff1", background: "#fff", fontSize: 13.5, color: "#555", cursor: "pointer" }}>
                자동 발송
                <span style={{ width: 34, height: 20, borderRadius: 10, position: "relative", background: autogen ? "#582681" : "#ccc", transition: "background 0.2s", display: "inline-block", flexShrink: 0 }}>
                  <span style={{ position: "absolute", top: 2, left: autogen ? 16 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                </span>
              </button>
              <button onClick={generate} disabled={generating} className="admin-primary-btn">
                {generating ? "생성 중…" : "뉴스레터 생성"}
              </button>
            </div>
            <button onClick={handleBulkDelete} disabled={checked.length === 0 || deleting}
              style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #efeff1", background: "#fff",
                color: checked.length ? "#c0392b" : "#c4c4c9", fontSize: 13.5,
                cursor: checked.length ? "pointer" : "default" }}>
              선택 삭제{checked.length ? ` (${checked.length})` : ""}
            </button>
          </div>

          {loading ? (
            <div className="admin-empty" style={{ textAlign: "center" }}>불러오는 중…</div>
          ) : list.length === 0 ? (
            <div className="admin-empty" style={{ textAlign: "center" }}>
              생성된 뉴스레터가 없습니다. 「뉴스레터 생성」을 눌러보세요.
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, flex: 1, overflowY: "auto" }}>
              {list.map((n) => (
                <li key={n.id} style={{ display: "flex", alignItems: "center", gap: 8,
                  borderBottom: "1px solid #f6f6f8", padding: "10px 14px",
                  background: previewItem?.id === n.id ? "#f7f7f8" : "#fff" }}>
                  <input type="checkbox" checked={checked.includes(n.id)} onChange={() => toggleCheck(n.id)} />
                  <button type="button" onClick={() => setPreviewItem(n)}
                    style={{ flex: 1, minWidth: 0, textAlign: "left", border: "none", background: "none", cursor: "pointer", padding: 0 }}>
                    <div style={{ fontSize: 14.5, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#555", marginTop: 2 }}>
                      {STATUS_LABELS[n.status] || n.status}
                      {" · "}{(n.created_at || "").slice(0, 10)}
                      {n.sent_at ? ` · 발송 ${(n.sent_at || "").slice(0, 10)} (${n.sent_count ?? 0})` : ""}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 오른쪽 — 고른 뉴스레터 */}
        <div className="admin-card" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {!지금것 ? (
            <div className="admin-empty" style={{ textAlign: "center" }}>왼쪽에서 뉴스레터를 고르세요.</div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderBottom: "1px solid #f2f2f4" }}>
                <span style={{ fontSize: 15, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{지금것.title}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => testSend(지금것.id)} disabled={busyId === 지금것.id} style={btnPurpleOutline}>테스트 발송</button>
                  {지금것.status !== "sent" && (
                    <button onClick={() => sendAll(지금것.id, 지금것.title)} disabled={busyId === 지금것.id} className="admin-primary-btn">전체발송</button>
                  )}
                </div>
              </div>
              <iframe title="뉴스레터 미리보기"
                srcDoc={(지금것.content_html || "").replace(/\{\{UNSUBSCRIBE_URL\}\}/g, "#")}
                style={{ flex: 1, width: "100%", border: "none", minHeight: 560 }} />
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

const th: React.CSSProperties = {};
const td: React.CSSProperties = {};
const btnGray: React.CSSProperties = { padding: "5px 12px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", color: "#555", fontSize: 13.5, cursor: "pointer" };
const btnPurpleOutline: React.CSSProperties = { padding: "5px 12px", borderRadius: 6, border: "1px solid #efeff1", background: "#fff", color: "#555", fontSize: 13.5, cursor: "pointer" };
const btnPurple: React.CSSProperties = { padding: "5px 12px", borderRadius: 6, border: "none", background: "#582681", color: "#fff", fontSize: 13.5, cursor: "pointer" };