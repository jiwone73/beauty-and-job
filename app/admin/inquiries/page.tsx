"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";

type Inquiry = {
  id: number;
  name: string;
  email: string | null;
  type: string;
  subject: string | null;
  message: string;
  status: string;
  user_id: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = { new: "신규", contacted: "연락함", done: "완료" };
const STATUS_TABS = [
  { key: "", label: "전체" },
  { key: "new", label: "신규" },
  { key: "contacted", label: "연락함" },
  { key: "done", label: "완료" },
];

function fmtDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function AdminInquiriesPage() {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

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

  useEffect(() => { load(); }, [statusFilter]);

  const changeStatus = async (id: number, status: string) => {
    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status } : it)));
      }
    } catch (e) {
      console.error("[change status]", e);
    }
  };

  const counts = {
    전체: items.length,
    신규: items.filter((i) => i.status === "new").length,
  };

  return (
    <AdminLayout activeMenu="inquiries">
      <div className="admin-page-header">
        <h1 className="admin-page-title">1:1 문의</h1>
        <p className="admin-page-desc">사용자가 남긴 문의를 확인하고 이메일로 답변한 뒤 상태를 변경하세요.</p>
      </div>

      <div className="admin-filter-tabs" style={{ marginBottom: 20 }}>
        {STATUS_TABS.map((t) => (
          <button key={t.key} className={`admin-filter-tab ${statusFilter === t.key ? "active" : ""}`}
            onClick={() => setStatusFilter(t.key)}>
            {t.label}
          </button>
        ))}
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
                <th style={{ width: 90 }}>유형</th>
                <th style={{ width: 100 }}>이름</th>
                <th>제목 / 내용</th>
                <th style={{ width: 150 }}>접수일시</th>
                <th style={{ width: 200 }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <>
                  <tr key={it.id} onClick={() => setExpanded(expanded === it.id ? null : it.id)} style={{ cursor: "pointer" }}>
                    <td className="admin-td-type">
                      <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "#f3eafa", color: "#5f0080", whiteSpace: "nowrap" }}>
                        {it.type}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{it.name}</div>
                      {it.email && (
                        <a href={`mailto:${it.email}`} onClick={(e) => e.stopPropagation()}
                          style={{ fontSize: 12, color: "#5f0080", textDecoration: "underline" }}>
                          {it.email}
                        </a>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, marginBottom: 2 }}>{it.subject || "(제목 없음)"}</div>
                      <div style={{ fontSize: 13, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: expanded === it.id ? "normal" : "nowrap", maxWidth: 400 }}>
                        {it.message}
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: "#888" }}>{fmtDate(it.created_at)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {["new", "contacted", "done"].map((st) => (
                          <button key={st} onClick={() => changeStatus(it.id, st)}
                            style={{
                              padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                              border: it.status === st ? "1.5px solid #5f0080" : "1px solid #e0e0e0",
                              background: it.status === st ? "#5f0080" : "#fff",
                              color: it.status === st ? "#fff" : "#666",
                            }}>
                            {STATUS_LABEL[st]}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                  {expanded === it.id && (
                    <tr key={`${it.id}-detail`}>
                      <td colSpan={5} style={{ background: "#faf7fc", padding: "16px 20px" }}>
                        <div style={{ fontSize: 14, color: "#333", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{it.message}</div>
                        {it.email && (
                          <a href={`mailto:${it.email}?subject=Re: ${encodeURIComponent(it.subject || "뷰티워크 문의 답변")}`}
                            style={{ display: "inline-block", marginTop: 12, padding: "8px 16px", background: "#5f0080", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                            이메일로 답변하기
                          </a>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
