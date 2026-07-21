"use client";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import FilterDropdown from "@/components/company/FilterDropdown";
import { formatPhone } from "@/lib/phone";
import { Trash2 } from "lucide-react";

const STATUS_TABS = [
  { key: "", label: "전체" },
  { key: "new", label: "신규" },
  { key: "done", label: "완료" },
];
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
};

function fmtDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
    try {
      const res = await fetch("/api/admin/ads/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ id: selected.id, to: selected.email, subject: replySubject, body: replyBody }),
      });
      const data = await res.json();
      if (data.success) {
        setSelected((p) => (p ? { ...p, status: "done" } : p));
        setItems((prev) => prev.map((it) => (it.id === selected.id ? { ...it, status: "done" } : it)));
        window.dispatchEvent(new Event("admin:inquiries-changed"));
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
    <span style={{ fontSize: 13, fontWeight: 600, color: status === "done" ? "#888" : "#5f0080" }}>
      {status === "done" ? "완료" : "신규"}
    </span>
  );

  return (
    <AdminLayout activeMenu="ads">
      <div style={{ width: "fit-content", maxWidth: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <FilterDropdown label="처리상태"
          value={STATUS_TABS.find((t) => t.key === statusFilter)?.label || "전체"}
          options={STATUS_TABS.map((t) => t.label)}
          onChange={(lbl) => setStatusFilter(STATUS_TABS.find((t) => t.label === lbl)?.key ?? "")} />
        <FilterDropdown label="유형"
          value={typeFilter === "" ? "전체" : typeFilter}
          options={["전체", "광고", "제휴", "기타"]}
          onChange={(v) => setTypeFilter(v === "전체" ? "" : v)} />
        {checked.length > 0 && (
          <button onClick={handleDelete}
            style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#e74c3c", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            <Trash2 size={15} /> 선택 삭제 ({checked.length})
          </button>
        )}
      </div>

      {loading ? (
        <div className="admin-empty">불러오는 중...</div>
      ) : items.length === 0 ? (
        <div className="admin-empty">문의가 없습니다.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: "center" }}>
                  <input type="checkbox" checked={checked.length === items.length && items.length > 0} onChange={toggleAll} style={{ cursor: "pointer" }} />
                </th>
                <th style={{ width: 80 }}>유형</th>
                <th>회사명</th>
                <th style={{ width: 100 }}>담당자</th>
                <th style={{ width: 130 }}>전화번호</th>
                <th>이메일</th>
                <th style={{ width: 150 }}>접수일시</th>
                <th style={{ width: 70 }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} onClick={() => openDetail(item)} style={{ cursor: "pointer", background: checked.includes(item.id) ? "#faf5ff" : undefined }}>
                  <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={checked.includes(item.id)} onChange={() => toggleCheck(item.id)} style={{ cursor: "pointer" }} />
                  </td>
                  <td className="admin-td-type">
                    <span style={{ fontSize: 13, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "#f3eafa", color: "#5f0080", whiteSpace: "nowrap" }}>
                      {item.type || "광고"}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{item.company_name || "-"}</td>
                  <td>{item.contact_name}</td>
                  <td style={{ fontSize: 14, whiteSpace: "nowrap" }}>{item.phone ? formatPhone(item.phone) : "-"}</td>
                  <td style={{ fontSize: 14, color: "#555", wordBreak: "break-all" }}>{item.email || "-"}</td>
                  <td style={{ fontSize: 14, color: "#888" }}>{fmtDate(item.created_at)}</td>
                  <td>{badge(item.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {selected && (
        <div className="cv-overlay">
          <div className="cv-modal" style={{ maxWidth: 1080, width: "94vw", maxHeight: "95vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="cv-body">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <h2 style={{ fontSize: 19, fontWeight: 700, margin: 0 }}>사업문의 상세</h2>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: 21, cursor: "pointer", color: "#999" }}>✕</button>
              </div>
              <div style={{ display: "flex", gap: 22, alignItems: "flex-start", flexWrap: "wrap" }}>
                {/* 왼쪽: 문의 정보 + 내용 */}
                <div style={{ flex: "1 1 300px", minWidth: 0 }}>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", rowGap: 12, columnGap: 12, fontSize: 15, marginBottom: 18 }}>
                <span style={{ color: "#888" }}>유형</span><span style={{ fontWeight: 600, color: "#5f0080" }}>{selected.type || "광고"}</span>
                <span style={{ color: "#888" }}>회사명</span><span>{selected.company_name || "-"}</span>
                <span style={{ color: "#888" }}>담당자</span><span>{selected.contact_name}</span>
                <span style={{ color: "#888" }}>전화번호</span><span>{selected.phone ? formatPhone(selected.phone) : "-"}</span>
                <span style={{ color: "#888" }}>이메일</span><span style={{ wordBreak: "break-all" }}>{selected.email || "-"}</span>
                {selected.product && (<><span style={{ color: "#888" }}>관심상품</span><span>{PRODUCT_LABELS[selected.product] ?? selected.product}</span></>)}
                <span style={{ color: "#888" }}>접수일</span><span>{fmtDate(selected.created_at)}</span>
                <span style={{ color: "#888" }}>상태</span><span>{badge(selected.status)}</span>
              </div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ color: "#888", fontSize: 14, marginBottom: 6 }}>문의 내용</div>
                <div style={{ background: "#faf7fc", borderRadius: 10, padding: 14, fontSize: 15, lineHeight: 1.7, color: "#333", whiteSpace: "pre-wrap" }}>{selected.message}</div>
              </div>

              </div>{/* 왼쪽 끝 */}
              {/* 오른쪽: 답변 작성 */}
              {selected.email ? (
                <div style={{ flex: "1 1 420px", minWidth: 0, borderLeft: "1px solid #eee", paddingLeft: 22 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>답변 메일 작성</div>
                  <textarea className="cv-input" value={replyBody} onChange={(e) => setReplyBody(e.target.value)}
                    style={{ minHeight: "min(68vh, 720px)", resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }} />
                  <button onClick={sendReply}
                    style={{ width: "100%", marginTop: 14, padding: "12px", background: "#5f0080", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                    답변 메일 보내기
                  </button>
                  <p style={{ fontSize: 13, color: "#999", textAlign: "center", marginTop: 8 }}>
                    support@beautywork.co.kr에서 발송되며, 발송과 동시에 상태가 완료로 변경됩니다.
                  </p>
                </div>
              ) : (
                <div style={{ flex: "1 1 420px", minWidth: 0, fontSize: 14, color: "#999", textAlign: "center", paddingTop: 40, borderLeft: "1px solid #eee", paddingLeft: 22 }}>
                  이메일 주소가 없어 답변 메일을 보낼 수 없습니다. 전화로 연락해주세요.
                  {selected.status !== "done" && (
                    <button onClick={() => markDone(selected.id)}
                      style={{ display: "block", width: "100%", marginTop: 12, padding: "10px", background: "#fff", color: "#5f0080", border: "1.5px solid #5f0080", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                      완료로 표시
                    </button>
                  )}
                </div>
              )}
              </div>{/* flex 끝 */}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}