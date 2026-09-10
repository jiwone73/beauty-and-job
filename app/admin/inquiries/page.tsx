"use client";
import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import FilterDropdown from "@/components/company/FilterDropdown";
import { formatPhone } from "@/lib/phone";
import { Trash2 } from "lucide-react";

type Inquiry = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
  subject: string | null;
  message: string;
  status: string;
  user_id: string | null;
  created_at: string;
  replied_at: string | null;
};

const STATUS_TABS = [
  { key: "", label: "전체" },
  { key: "new", label: "신규" },
  { key: "done", label: "회신완료" },
];

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

export default function AdminInquiriesPage() {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [checked, setChecked] = useState<number[]>([]);
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("admin_token") : null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "100");
      const res = await fetch(`/api/admin/inquiries?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.success) setItems(data.data?.items || []);
    } catch (e) {
      console.error("[load inquiries]", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); setChecked([]); }, [statusFilter]);

  const openDetail = (it: Inquiry) => {
    setSelected(it);
    setReplySubject(`Re: ${it.subject || "뷰티워크 1:1 문의 답변"}`);
    setReplyBody(`안녕하세요, ${it.name || "고객"}님.\n뷰티워크입니다.\n\n문의 주신 내용에 대해 답변드립니다.\n\n\n\n──────────\n[문의 내용]\n${it.message}`);
    setFiles([]);
  };

  const markDone = async (id: number) => {
    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ id, status: "done" }),
      });
      const data = await res.json();
      if (data.success) {
        setSelected((p) => (p ? { ...p, status: "done" } : p));
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: "done" } : it)));
        window.dispatchEvent(new Event("admin:inquiries-changed"));
      }
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
      const res = await fetch("/api/admin/inquiries", {
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
      const res = await fetch("/api/admin/inquiries", {
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

  return (
    <AdminLayout activeMenu="inquiries">
      {/* 왼쪽에서 고르고 오른쪽에서 본다. 모달로 띄우면 목록이 가려져 다음 것을
          보려면 매번 닫아야 했다. 공지사항·뉴스레터와 같은 짜임으로 맞춘다. */}
      <div style={{ display: "flex", gap: 18, alignItems: "stretch",
        /* 화면 아래가 비어 있는데 칸 안에서만 스크롤됐다. 남는 높이를 그대로 쓴다. */
        flex: 1, minHeight: 0 }}>

        {/* 왼쪽 — 목록 */}
        <div className="admin-card" style={{ width: 460, flexShrink: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div className="admin-table-meta" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <FilterDropdown label="처리상태"
              value={STATUS_TABS.find((t) => t.key === statusFilter)?.label || "전체"}
              options={STATUS_TABS.map((t) => t.label)}
              onChange={(lbl) => setStatusFilter(STATUS_TABS.find((t) => t.label === lbl)?.key ?? "")} />
            {checked.length > 0 && (
              <button onClick={handleDelete}
                style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "6px 11px", borderRadius: 6, border: "1px solid #efeff1", background: "#fff",
                  color: "#c0392b", fontSize: 13.5, cursor: "pointer" }}>
                <Trash2 size={14} /> 삭제 ({checked.length})
              </button>
            )}
          </div>

          {loading ? (
            <div className="admin-empty" style={{ textAlign: "center" }}>불러오는 중…</div>
          ) : items.length === 0 ? (
            <div className="admin-empty" style={{ textAlign: "center" }}>문의가 없습니다.</div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, flex: 1, overflowY: "auto" }}>
              {items.map((item) => (
                <li key={item.id} style={{ display: "flex", alignItems: "center", gap: 8,
                  borderBottom: "1px solid #f6f6f8", padding: "10px 14px",
                  background: selected?.id === item.id ? "#f7f7f8" : "#fff" }}>
                  <input type="checkbox" checked={checked.includes(item.id)} onChange={() => toggleCheck(item.id)} style={{ cursor: "pointer" }} />
                  <button type="button" onClick={() => openDetail(item)}
                    style={{ flex: 1, minWidth: 0, textAlign: "left", border: "none", background: "none", cursor: "pointer", padding: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span style={{ fontSize: 14.5, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.subject || item.name || "-"}
                      </span>
                      <span style={{ marginLeft: "auto", flexShrink: 0, fontSize: 12.5, color: "#9a9aa0" }}>{badge(item.status)}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "#9a9aa0", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {fmtDate(item.created_at)}{item.email ? ` · ${item.email}` : ""}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 오른쪽 — 고른 문의 */}
        <div className="admin-card" style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
          {!selected ? (
            <div className="admin-empty" style={{ textAlign: "center" }}>왼쪽에서 문의를 고르세요.</div>
          ) : (
            <div style={{ padding: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "92px 1fr", rowGap: 10, columnGap: 12, fontSize: 14.5, marginBottom: 18 }}>
                <span style={{ color: "#888" }}>회원구분</span><span style={{ color: "#555" }}>{selected.type}</span>
                <span style={{ color: "#888" }}>이름</span><span>{selected.name}</span>
                <span style={{ color: "#888" }}>전화번호</span><span>{selected.phone ? formatPhone(selected.phone) : "-"}</span>
                <span style={{ color: "#888" }}>이메일</span><span style={{ wordBreak: "break-all" }}>{selected.email || "-"}</span>
                <span style={{ color: "#888" }}>제목</span><span>{selected.subject || "(제목 없음)"}</span>
                <span style={{ color: "#888" }}>접수일</span><span>{fmtDate(selected.created_at)}</span>
                <span style={{ color: "#888" }}>상태</span><span>{badge(selected.status)}</span>
                {selected.replied_at && (<><span style={{ color: "#888" }}>회신완료</span><span>{fmtDate(selected.replied_at)}</span></>)}
              </div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ color: "#888", fontSize: 13.5, marginBottom: 6 }}>문의 내용</div>
                <div style={{ background: "#f7f7f8", borderRadius: 10, padding: 14, fontSize: 14.5, lineHeight: 1.7, color: "#555", whiteSpace: "pre-wrap" }}>{selected.message}</div>
              </div>

              {selected.email ? (
                <div style={{ borderTop: "1px solid #f2f2f4", paddingTop: 16 }}>
                  <div style={{ fontSize: 14.5, color: "#1a1a1a", marginBottom: 10 }}>답변 메일 작성</div>
                  <textarea className="cv-input" value={replyBody} onChange={(e) => setReplyBody(e.target.value)}
                    spellCheck lang="ko"
                    style={{ minHeight: 320, resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }} />
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} style={{ fontSize: 13 }} />
                    {files.length > 0 && (
                      <span style={{ fontSize: 12, color: "#888" }}>
                        첨부 {files.length}개 · {(files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)}MB / 3MB
                      </span>
                    )}
                    <button onClick={sendReply} className="admin-primary-btn" style={{ marginLeft: "auto" }}>
                      답변 메일 보내기
                    </button>
                  </div>
                  <p style={{ fontSize: 12.5, color: "#9a9aa0", marginTop: 8 }}>
                    support@beautywork.co.kr 에서 나갑니다. 보내면 상태가 회신완료로 바뀌고 시각이 남습니다. (첨부 3MB 이하)
                  </p>
                </div>
              ) : (
                <div style={{ borderTop: "1px solid #f2f2f4", paddingTop: 16, fontSize: 14, color: "#999" }}>
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