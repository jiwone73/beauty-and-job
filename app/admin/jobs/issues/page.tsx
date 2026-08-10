"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";

type Issue = { field: string; note: string };
type PostingIssues = { url: string; title: string; items: Issue[]; updated_at: string };

export default function JobIssuesPage() {
  const [list, setList] = useState<PostingIssues[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  const load = () => {
    setLoading(true);
    fetch("/api/admin/app-notes?list=jobissue", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => { if (res.success) setList(res.data.items || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const remove = async (url: string) => {
    if (!confirm("이 공고의 이슈 기록을 삭제할까요? (수정 완료 후 정리용)")) return;
    await fetch(`/api/admin/app-notes?key=${encodeURIComponent(`jobissue:${url}`)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setList((prev) => prev.filter((p) => p.url !== url));
  };

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return list;
    return list.filter((p) => `${p.title} ${p.url} ${p.items.map((i) => `${i.field} ${i.note}`).join(" ")}`.toLowerCase().includes(k));
  }, [list, q]);

  const totalIssues = list.reduce((s, p) => s + p.items.length, 0);
  const fmtDate = (s?: string) => { if (!s) return ""; try { return new Date(s).toLocaleDateString("ko-KR"); } catch { return ""; } };

  return (
    <AdminLayout activeMenu="jobs-issues">
      <div style={{ padding: "4px 4px 40px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 400, color: "#2b2533", margin: 0 }}>등록 이슈</h1>
          <span style={{ fontSize: 14, color: "#9a92a6" }}>공고 {list.length}건 · 이슈 {totalIssues}개</span>
        </div>
        <p style={{ fontSize: 13.5, color: "#9a92a6", margin: "0 0 14px" }}>
          공고 직접 등록에서 불러오기 후 기록한 이슈들이에요. <b>불러와 수정</b>을 누르면 그 원문을 자동으로 불러와 고칠 수 있고, 정리되면 <b>삭제</b>하세요.
        </p>

        <div className="admin-search-wrap" style={{ width: 320, marginBottom: 14 }}>
          <Search size={16} className="admin-search-icon" />
          <input className="admin-search-input" placeholder="공고명·URL·필드·메모 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {loading ? (
          <div style={{ color: "#9a92a6", padding: 30 }}>불러오는 중…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: "#9a92a6", padding: 30, border: "1px dashed #e5e0eb", borderRadius: 10, textAlign: "center" }}>
            {list.length ? "검색 결과가 없어요." : "기록된 이슈가 없어요."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((p) => (
              <div key={p.url} style={{ border: "1px solid #f0e0dd", background: "#fff8f6", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#2b2533", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{p.title || "(제목 없음)"}</span>
                  <a href={p.url} target="_blank" rel="noreferrer" style={{ flexShrink: 0, fontSize: 13, color: "#5f0080", textDecoration: "none" }}>원문 ↗</a>
                  {p.updated_at && <span style={{ flexShrink: 0, fontSize: 12, color: "#b3adbd" }}>{fmtDate(p.updated_at)}</span>}
                  <span style={{ marginLeft: "auto", flexShrink: 0, display: "flex", gap: 6 }}>
                    <Link href={`/admin/jobs/new?url=${encodeURIComponent(p.url)}`}
                      style={{ padding: "6px 12px", borderRadius: 6, background: "#5f0080", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>불러와 수정</Link>
                    <button onClick={() => remove(p.url)}
                      style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e6cfca", background: "#fff", color: "#c0392b", fontSize: 13, cursor: "pointer" }}>삭제</button>
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {p.items.map((it, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 13.5 }}>
                      <span style={{ flexShrink: 0, minWidth: 130, fontWeight: 600, color: "#c0392b" }}>{it.field || "(필드 미지정)"}</span>
                      <span style={{ color: "#4a4453", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{it.note}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
