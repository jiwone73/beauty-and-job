"use client";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { ChevronDown, Search, Trash2 } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  draft: "검토 대기",
  sent: "발송 완료",
  failed: "발송 실패",
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
  const [갈래, set갈래] = useState("전체");
  const [검색, set검색] = useState("");

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

  const 갈래수 = (v: string) => list.filter((n: any) =>
    v === "전체" || (STATUS_LABELS[n.status] || n.status) === v).length;
  const 찾는말 = 검색.trim();
  const 보일것 = list.filter((n: any) =>
    (갈래 === "전체" || (STATUS_LABELS[n.status] || n.status) === 갈래) &&
    (!찾는말 || (n.title || "").includes(찾는말)));

  return (
    <AdminLayout activeMenu="newsletters" 제목숨김>
      <div className="adm-mail">
        {/* 옆줄 — 상태. 「어느 함을 여는가」만 맡는다. */}
        <nav className="adm-mail-side" aria-label="뉴스레터 상태">
          <p className="adm-mail-side-h">뉴스레터<ChevronDown size={15} /></p>
          {["전체", "검토 대기", "발송 완료", "발송 실패"].map((v) => (
            <button key={v} type="button"
              className={`adm-mail-side-i${갈래 === v ? " on" : ""}`}
              onClick={() => { set갈래(v); setPreviewItem(null); }}>
              {v}<i>{갈래수(v)}</i>
            </button>
          ))}
        </nav>

        <div className="admin-card adm-mail-body">
          <h1 className="adm-mail-title">뉴스레터</h1>
          {!지금것 ? (
            <>
              <form className="nb-top adm-mail-find" onSubmit={(e) => e.preventDefault()}>
                <label className="nb-search">
                  <input value={검색} onChange={(e) => set검색(e.target.value)} placeholder="제목 검색" />
                  <button type="submit" aria-label="검색"><Search size={17} /></button>
                </label>
                <button onClick={toggleAutogen} disabled={autogenSaving} type="button"
                  title="매주 월요일 뉴스레터 자동 생성+발송 on/off"
                  style={{ flex: "none", display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 8, border: "1px solid #efeff1", background: "#fff", fontSize: 13.5, color: "#555", cursor: "pointer" }}>
                  자동 발송
                  <span style={{ width: 34, height: 20, borderRadius: 10, position: "relative", background: autogen ? "#582681" : "#ccc", transition: "background 0.2s", display: "inline-block", flexShrink: 0 }}>
                    <span style={{ position: "absolute", top: 2, left: autogen ? 16 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                  </span>
                </button>
                <button onClick={generate} disabled={generating} type="button" className="admin-primary-btn" style={{ flex: "none" }}>
                  {generating ? "생성 중…" : "뉴스레터 생성"}
                </button>
              </form>

              <div className="adm-mail-bar">
                <label className="adm-mail-all">
                  <input type="checkbox"
                    checked={보일것.length > 0 && checked.length === 보일것.length}
                    onChange={(e) => setChecked(e.target.checked ? 보일것.map((n: any) => n.id) : [])} />
                  전체 선택
                </label>
                {checked.length > 0 && (
                  <button type="button" className="adm-mail-del" onClick={handleBulkDelete} disabled={deleting}>
                    <Trash2 size={14} /> 삭제 ({checked.length})
                  </button>
                )}
                <span className="adm-mail-count">{보일것.length}건</span>
              </div>

              {loading ? (
                <div className="admin-empty" style={{ textAlign: "center" }}>불러오는 중…</div>
              ) : 보일것.length === 0 ? (
                <div className="admin-empty" style={{ textAlign: "center" }}>
                  {찾는말 ? `「${찾는말}」에 대한 뉴스레터가 없습니다.`
                          : "생성된 뉴스레터가 없습니다. 「뉴스레터 생성」을 눌러보세요."}
                </div>
              ) : (
                <div className="adm-mail-list">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: 38 }}></th>
                        <th>제목</th>
                        <th style={{ width: 100 }}>상태</th>
                        <th style={{ width: 110 }}>만든 날</th>
                        <th style={{ width: 150 }}>발송</th>
                      </tr>
                    </thead>
                    <tbody>
                      {보일것.map((n: any) => (
                        <tr key={n.id} className={n.status === "sent" ? undefined : "adm-mail-new"}>
                          <td onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={checked.includes(n.id)} onChange={() => toggleCheck(n.id)} />
                          </td>
                          <td onClick={() => setPreviewItem(n)} style={{ cursor: "pointer" }}>{n.title}</td>
                          <td onClick={() => setPreviewItem(n)} style={{ cursor: "pointer" }}>{STATUS_LABELS[n.status] || n.status}</td>
                          <td className="admin-td-date" onClick={() => setPreviewItem(n)} style={{ cursor: "pointer" }}>{(n.created_at || "").slice(0, 10)}</td>
                          <td onClick={() => setPreviewItem(n)} style={{ cursor: "pointer" }}>
                            {n.sent_at
                              ? `${(n.sent_at || "").slice(0, 10)} (${n.sent_count ?? 0}${n.target_count ? `/${n.target_count}` : ""})`
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="adm-mail-read" style={{ display: "flex", flexDirection: "column" }}>
              <div className="adm-mail-bar">
                <button type="button" className="adm-mail-back" onClick={() => setPreviewItem(null)}>‹ 목록</button>
                <span className="adm-mail-count">{STATUS_LABELS[지금것.status] || 지금것.status}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 20px", borderBottom: "1px solid #f2f2f4" }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#1f1f22", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{지금것.title}</span>
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
            </div>
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