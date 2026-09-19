"use client";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { formatPhone } from "@/lib/phone";
import { Trash2 } from "lucide-react";

const PRODUCT_LABELS: Record<string, string> = {
  top_exposure: "공고 상단 노출",
  brand_page: "브랜드 페이지 제작",
  banner: "배너 광고",
  other: "기타 문의",
};

type Inquiry = {
  id: number;
  company_name: string | null;
  contact_name: string;
  phone: string | null;
  email: string | null;
  product: string | null;
  message: string;
  status: string;
  type: string;
  created_at: string;
  replied_at: string | null;
};

function fmtDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

async function filesToAttachments(files: File[]) {
  return Promise.all(
    files.map(
      (file) =>
        new Promise<{ filename: string; content: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ filename: file.name, content: String(reader.result).split(",")[1] || "" });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    )
  );
}

export default function AdminAdsPage() {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [checked, setChecked] = useState<number[]>([]);
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("admin_token") : null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set("status", statusFilter);
      if (typeFilter) qs.set("type", typeFilter);
      const res = await fetch(`/api/admin/ads/inquiries?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      setItems(data.data?.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); setChecked([]); }, [statusFilter, typeFilter]);

  const openDetail = (item: Inquiry) => {
    setSelected(item);
    setReplySubject(`[뷰티워크] ${item.type || "광고"} 문의 답변`);
    setReplyBody(`안녕하세요, ${item.contact_name || "고객"}님.\n뷰티워크입니다.\n\n문의 주신 내용에 대해 답변드립니다.\n\n\n\n──────────\n[문의 내용]\n${item.message}`);
    setFiles([]);
  };

  const markDone = async (id: number) => {
    try {
      await fetch("/api/admin/ads/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ id, status: "done" }),
      });
      setSelected((p) => (p ? { ...p, status: "done" } : p));
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: "done" } : it)));
      window.dispatchEvent(new Event("admin:inquiries-changed"));
    } catch (e) {
      console.error("[mark done]", e);
    }
  };

  const sendReply = async () => {
    if (!selected?.email) { alert("이메일 주소가 없어 답변을 보낼 수 없습니다."); return; }
    if (!replyBody.trim()) { alert("답변 내용을 입력해 주세요."); return; }
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > 3 * 1024 * 1024) { alert("첨부파일 총 용량은 3MB 이하여야 합니다."); return; }
    try {
      const attachments = await filesToAttachments(files);
      const res = await fetch("/api/admin/ads/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ id: selected.id, to: selected.email, subject: replySubject, body: replyBody, attachments }),
      });
      const data = await res.json();
      if (data.success) {
        setSelected((p) => (p ? { ...p, status: "done" } : p));
        setItems((prev) => prev.map((it) => (it.id === selected.id ? { ...it, status: "done" } : it)));
        window.dispatchEvent(new Event("admin:inquiries-changed"));
        setFiles([]);
        alert("support@beautywork.co.kr에서 답변 메일을 발송했습니다.");
      } else {
        alert(data.error?.message || "메일 발송에 실패했습니다.");
      }
    } catch (e) {
      console.error("[send reply]", e);
      alert("메일 발송 중 오류가 발생했습니다.");
    }
  };

  const toggleCheck = (id: number) =>
    setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const toggleAll = () =>
    setChecked((c) => (c.length === items.length ? [] : items.map((it) => it.id)));

  const handleDelete = async () => {
    if (checked.length === 0) return;
    if (!confirm(`선택한 ${checked.length}건의 문의를 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.`)) return;
    try {
      const res = await fetch("/api/admin/ads/inquiries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ids: checked }),
      });
      const data = await res.json();
      if (data.success) {
        setItems((prev) => prev.filter((it) => !checked.includes(it.id)));
        setChecked([]);
        window.dispatchEvent(new Event("admin:inquiries-changed"));
      } else {
        alert("삭제에 실패했습니다.");
      }
    } catch (e) {
      console.error("[delete]", e);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const badge = (status: string) => (
    <span style={{ fontSize: 13, whiteSpace: "nowrap", color: "#555" }}>
      {status === "done" ? "회신완료" : "신규"}
    </span>
  );

  /* 갈래는 옆줄이 맡는다. 드롭다운 둘로 두었을 때는 지금 무엇을 보고 있는지가
     접힌 채였다 — 열어 봐야 알았다. 네이버 메일함처럼 늘 펼쳐 두고, 고른 것만
     켠다. */
  const 상태갈래 = [
    { key: "", label: "전체" },
    { key: "new", label: "신규" },
    { key: "done", label: "회신완료" },
  ];
  const 유형갈래 = ["전체", "광고", "제휴", "기타"];
  const 갈래수 = (st: string, ty: string) => items.filter((it) =>
    (!st || it.status === st) && (ty === "전체" || (it.type || "광고") === ty)).length;

  /* 고르면 목록 자리에 상세가 선다. 좌우로 나눠 두었을 때는 목록이 460px 에
     갇혀 회사명·담당자·접수일이 두 줄로 접혔고, 상세는 라벨-값 일곱 줄이
     세로로 길었다. 메일함이 그렇듯 한 자리를 번갈아 쓴다. */
  const 목록으로 = () => { setSelected(null); setReplyBody(""); setFiles([]); };

  return (
    <AdminLayout activeMenu="ads">
      <div className="adm-mail">
        {/* 옆줄 — 갈래 */}
        <nav className="adm-mail-side" aria-label="문의 갈래">
          <p className="adm-mail-side-t">처리상태</p>
          {상태갈래.map((t) => (
            <button key={t.key} type="button"
              className={`adm-mail-side-i${statusFilter === t.key ? " on" : ""}`}
              onClick={() => { setStatusFilter(t.key); 목록으로(); }}>
              {t.label}<i>{갈래수(t.key, typeFilter === "" ? "전체" : typeFilter)}</i>
            </button>
          ))}
          <p className="adm-mail-side-t">유형</p>
          {유형갈래.map((v) => (
            <button key={v} type="button"
              className={`adm-mail-side-i${(typeFilter === "" ? "전체" : typeFilter) === v ? " on" : ""}`}
              onClick={() => { setTypeFilter(v === "전체" ? "" : v); 목록으로(); }}>
              {v}<i>{갈래수(statusFilter, v)}</i>
            </button>
          ))}
        </nav>

        {/* 오른쪽 — 목록과 상세가 한 자리를 번갈아 쓴다 */}
        <div className="admin-card adm-mail-body">
          {!selected ? (
            <>
              <div className="adm-mail-bar">
                <label className="adm-mail-all">
                  <input type="checkbox"
                    checked={items.length > 0 && checked.length === items.length}
                    onChange={(e) => setChecked(e.target.checked ? items.map((i2) => i2.id) : [])} />
                  전체 선택
                </label>
                {checked.length > 0 && (
                  <button type="button" className="adm-mail-del" onClick={handleDelete}>
                    <Trash2 size={14} /> 삭제 ({checked.length})
                  </button>
                )}
                <span className="adm-mail-count">{items.length}건</span>
              </div>

              {loading ? (
                <div className="admin-empty" style={{ textAlign: "center" }}>불러오는 중…</div>
              ) : items.length === 0 ? (
                <div className="admin-empty" style={{ textAlign: "center" }}>문의가 없습니다.</div>
              ) : (
                <div className="adm-mail-list">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: 38 }}></th>
                        <th style={{ width: 84 }}>상태</th>
                        <th>회사명</th>
                        <th style={{ width: 120 }}>담당자</th>
                        <th style={{ width: 70 }}>유형</th>
                        <th style={{ width: 150 }}>접수일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className={item.status === "done" ? undefined : "adm-mail-new"}>
                          <td onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={checked.includes(item.id)}
                              onChange={() => toggleCheck(item.id)} style={{ cursor: "pointer" }} />
                          </td>
                          <td onClick={() => openDetail(item)} style={{ cursor: "pointer" }}>{badge(item.status)}</td>
                          <td onClick={() => openDetail(item)} style={{ cursor: "pointer" }}>
                            {item.company_name || item.contact_name || "-"}
                          </td>
                          <td onClick={() => openDetail(item)} style={{ cursor: "pointer" }}>{item.contact_name}</td>
                          <td onClick={() => openDetail(item)} style={{ cursor: "pointer" }}>{item.type || "광고"}</td>
                          <td onClick={() => openDetail(item)} style={{ cursor: "pointer" }}>{fmtDate(item.created_at)}</td>
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
                <button type="button" className="adm-mail-back" onClick={목록으로}>‹ 목록</button>
                <span className="adm-mail-count">{badge(selected.status)}</span>
              </div>

              <h2 className="adm-mail-subj">{selected.company_name || selected.contact_name || "문의"}</h2>
              <div className="adm-mail-from">
                <b>{selected.contact_name}</b>
                <span>{selected.email || "이메일 없음"}</span>
                <span>{selected.phone ? formatPhone(selected.phone) : "전화번호 없음"}</span>
                <em>{fmtDate(selected.created_at)}</em>
              </div>
              <div className="adm-mail-tags">
                <span>{selected.type || "광고"}</span>
                {selected.product && <span>{PRODUCT_LABELS[selected.product] ?? selected.product}</span>}
                {selected.replied_at && <span>회신 {fmtDate(selected.replied_at)}</span>}
              </div>

              <div className="adm-mail-msg">{selected.message}</div>

              {selected.email ? (
                <div className="adm-mail-reply">
                  <div className="adm-mail-reply-t">답변 메일 작성</div>
                  <textarea className="cv-input" value={replyBody} onChange={(e) => setReplyBody(e.target.value)}
                    spellCheck lang="ko"
                    style={{ minHeight: 320, resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }} />
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} style={{ fontSize: 13 }} />
                    {files.length > 0 && (
                      <span style={{ fontSize: 12, color: "#555" }}>
                        첨부 {files.length}개 · {(files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)}MB / 3MB
                      </span>
                    )}
                    <button onClick={sendReply} className="admin-primary-btn" style={{ marginLeft: "auto" }}>
                      답변 메일 보내기
                    </button>
                  </div>
                  <p style={{ fontSize: 12.5, color: "#555", marginTop: 8 }}>
                    support@beautywork.co.kr 에서 나갑니다. 보내면 상태가 회신완료로 바뀌고 시각이 남습니다. (첨부 3MB 이하)
                  </p>
                </div>
              ) : (
                <div className="adm-mail-reply" style={{ fontSize: 14, color: "#555" }}>
                  이메일 주소가 없어 답변 메일을 보낼 수 없습니다. 전화로 연락해 주세요.
                  {selected.status !== "done" && (
                    <button onClick={() => markDone(selected.id)} className="admin-secondary-btn" style={{ marginLeft: 10 }}>
                      완료로 표시
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
