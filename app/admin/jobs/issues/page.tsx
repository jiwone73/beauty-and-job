"use client";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";

type Issue = { field: string; note: string };
type Reply = { at: string; by: string; text: string };
type PostingIssues = { url: string; title: string; items: Issue[]; replies: Reply[]; updated_at: string };

export default function JobIssuesPage() {
  const [list, setList] = useState<PostingIssues[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [탭, set탭] = useState<"미해결" | "해결" | "전체">("미해결");
  const [draft, setDraft] = useState<Record<string, string>>({}); // 이슈별 코멘트 입력값
  const [saving, setSaving] = useState<string | null>(null);
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

  // 이슈 밑에 수정내용·코멘트를 남긴다. 이슈 본문은 그대로 두고 뒤에 붙는다.
  const addReply = async (url: string) => {
    const text = (draft[url] || "").trim();
    if (!text) return;
    setSaving(url);
    try {
      const res = await fetch("/api/admin/app-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key: `jobissue:${url}`, text }),
      });
      const d = await res.json();
      if (!d.success) { alert(d.error?.message || "남기지 못했어요."); return; }
      setDraft((prev) => ({ ...prev, [url]: "" }));
      load();
    } finally {
      setSaving(null);
    }
  };

  const removeReply = async (url: string, idx: number) => {
    if (!confirm("이 코멘트를 지울까요?")) return;
    await fetch(`/api/admin/app-notes?key=${encodeURIComponent(`jobissue:${url}`)}&reply=${idx}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    load();
  };

  const remove = async (url: string) => {
    if (!confirm("이 공고의 이슈 기록을 삭제할까요? (수정 완료 후 정리용)")) return;
    await fetch(`/api/admin/app-notes?key=${encodeURIComponent(`jobissue:${url}`)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setList((prev) => prev.filter((p) => p.url !== url));
  };

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    const 해결 = (p: any) => (p.replies || []).some((r: any) => /\[해결\]/.test(r.text || ""));
    const 탭걸러 = 탭 === "전체" ? list : list.filter((p) => (탭 === "해결") === 해결(p));
    if (!k) return 탭걸러;
    return 탭걸러.filter((p) => `${p.title} ${p.url} ${p.items.map((i) => `${i.field} ${i.note}`).join(" ")}`.toLowerCase().includes(k));
  }, [list, q, 탭]);

  // 답글에 「[해결]」이 있으면 정리된 것으로 본다. 해결된 것이 미해결과 섞여 있어
  // 정작 봐야 할 것이 묻혔다 — 기본은 미해결만 보여 준다.
  const 해결됐나 = (p: any) => (p.replies || []).some((r: any) => /\[해결\]/.test(r.text || ""));
  const 미해결수 = list.filter((p) => !해결됐나(p)).length;
  const 해결수 = list.length - 미해결수;
  const totalIssues = list.reduce((s, p) => s + p.items.length, 0);
  const fmtDate = (s?: string) => { if (!s) return ""; try { return new Date(s).toLocaleDateString("ko-KR"); } catch { return ""; } };

  return (
    <AdminLayout activeMenu="jobs-issues">
      {/* 답글 한 줄이 화면 끝까지 늘어나면 눈이 되돌아올 자리를 잃는다. 900 으로 묶는다. */}
      <div style={{ padding: "4px 4px 40px", maxWidth: 900, margin: "0 auto", width: "100%" }}>
        {/* 제목은 레이아웃이 그린다(.admin-page-title) — 여기선 건수만 적는다. */}
        <div style={{ marginBottom: 12, fontSize: 14, color: "#9a92a6" }}>
          미해결 {미해결수} · 해결 {해결수}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {(["미해결", "해결", "전체"] as const).map((t) => (
            <button key={t} type="button" onClick={() => set탭(t)}
              style={{ padding: "6px 14px", borderRadius: "var(--chip-radius)", fontSize: 13.5, cursor: "pointer",
                border: `1px solid ${탭 === t ? "#582681" : "#efeff1"}`,
                background: 탭 === t ? "#582681" : "#fff",
                color: 탭 === t ? "#fff" : "#6f6f75" }}>
              {t}{t === "미해결" ? ` ${미해결수}` : t === "해결" ? ` ${해결수}` : ` ${list.length}`}
            </button>
          ))}
        </div>

        <div className="admin-search-wrap" style={{ width: 320, marginBottom: 14 }}>
          <Search size={16} className="admin-search-icon" />
          <input className="admin-search-input" placeholder="공고명·URL·필드·메모 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {loading ? (
          <div style={{ color: "#9a92a6", padding: 30 }}>불러오는 중…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: "#9a92a6", padding: 30, border: "1px dashed #efeff1", borderRadius: 10, textAlign: "center" }}>
            {list.length ? "검색 결과가 없어요." : "기록된 이슈가 없어요."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((p) => (
              <div key={p.url} style={{ border: "1px solid #efeff1", background: "#fff", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#2b2533", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{p.title || "(제목 없음)"}</span>
                  <a href={p.url} target="_blank" rel="noreferrer" style={{ flexShrink: 0, fontSize: 13, color: "#582681", textDecoration: "none" }}>원문 ↗</a>
                  {p.updated_at && <span style={{ flexShrink: 0, fontSize: 12, color: "#b3adbd" }}>{fmtDate(p.updated_at)}</span>}
                  <span style={{ marginLeft: "auto", flexShrink: 0, display: "flex", gap: 6 }}>
                    {/* 「불러와 수정」은 없앴다 — 공고를 다시 불러 고치는 일은
                        「외부공고 불러오기」 목록에서 한다. */}
                    <button onClick={() => remove(p.url)}
                      style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #efeff1", background: "#fff", color: "#c0392b", fontSize: 13, cursor: "pointer" }}>삭제</button>
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {/* 칸 이름(「기타」)은 안 적는다. 일흔여섯 개가 전부 기타였다 —
                      고르는 게 귀찮아 다들 기타를 눌렀고, 그래서 아무것도 안 알려 준다. */}
                  {p.items.map((it, i) => (
                    <div key={i} style={{ fontSize: 13.5, color: "#4a4453", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {it.field && it.field !== "기타" && (
                        <b style={{ color: "#c0392b", marginRight: 6 }}>{it.field}</b>
                      )}
                      {it.note}
                    </div>
                  ))}
                </div>

                {/* 수정내용·코멘트 — 이슈 아래에 시간순으로 쌓인다 */}
                <div style={{ marginTop: 10, borderTop: "1px solid #f4f4f6", paddingTop: 10 }}>
                  {(p.replies || []).length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                      {(p.replies || []).map((r, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 13 }}>
                          <span style={{ flexShrink: 0, minWidth: 130, color: "#7b7387" }}>
                            {r.by} · {fmtDate(r.at)}
                          </span>
                          <span style={{ color: "#2b2533", whiteSpace: "pre-wrap", wordBreak: "break-word", flex: 1, minWidth: 0 }}>{r.text}</span>
                          <button onClick={() => removeReply(p.url, i)} title="코멘트 삭제"
                            style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "#c8c8c8", fontSize: 12 }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      value={draft[p.url] || ""}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [p.url]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") addReply(p.url); }}
                      placeholder="수정한 내용이나 코멘트를 남겨주세요"
                      style={{ flex: 1, minWidth: 0, height: 34, padding: "0 10px", border: "1px solid #efeff1", borderRadius: 6, fontSize: 13, background: "#fff" }}
                    />
                    <button onClick={() => addReply(p.url)} disabled={saving === p.url || !(draft[p.url] || "").trim()}
                      style={{ flexShrink: 0, height: 34, padding: "0 14px", borderRadius: 6, border: "none", background: "#582681", color: "#fff", fontSize: 13, cursor: "pointer", opacity: saving === p.url || !(draft[p.url] || "").trim() ? 0.45 : 1 }}>
                      {saving === p.url ? "등록 중…" : "등록"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
