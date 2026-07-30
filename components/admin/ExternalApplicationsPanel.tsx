"use client";
import { useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  applied_at: string;
  delivery_status: string | null;
  forwarded_at: string | null;
  forwarded_channel: string | null;
  third_party_consent: boolean;
  admin_note: string | null;
  cover_letter: string | null;
  applicant_name: string;
  applicant_phone: string | null;
  applicant_email: string | null;
  applicant_job_type: string | null;
  job_id: string;
  job_title: string;
  job_type: string;
  apply_method: string;
  external_contact_email: string | null;
  company_name: string | null;
  ec_contact_email: string | null;
  claimed_company_id: string | null;
};

const token = () => (typeof window !== "undefined" ? localStorage.getItem("admin_token") : null);
const METHOD: Record<string, { t: string; c: string }> = {
  EMAIL: { t: "이메일 중계", c: "#0ea5e9" },
  MANAGED: { t: "관리자 대행", c: "#5f0080" },
};
const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }) : "-";

export default function ExternalApplicationsPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"PENDING" | "FORWARDED" | "FAILED" | "ALL">("PENDING");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/external-applications", { headers: { Authorization: `Bearer ${token()}` } });
      const j = await res.json();
      if (j.success) setRows(j.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    PENDING: rows.filter((r) => r.delivery_status === "PENDING").length,
    FORWARDED: rows.filter((r) => r.delivery_status === "FORWARDED").length,
    FAILED: rows.filter((r) => r.delivery_status === "FAILED").length,
    claimed: new Set(rows.filter((r) => r.claimed_company_id).map((r) => r.company_name)).size,
  }), [rows]);

  const shown = useMemo(() => tab === "ALL" ? rows : rows.filter((r) => r.delivery_status === tab), [rows, tab]);

  const forward = async (r: Row) => {
    const target = (r.external_contact_email || r.ec_contact_email || "").trim();
    const msg = target
      ? `${r.company_name}(${target})에 「${r.job_title}」 지원자 ${r.applicant_name}님을 이메일로 전달할까요?`
      : `${r.company_name}에 전달할 채용 이메일이 없어요. ‘수동 전달함’으로만 표시할까요? (실제 전달은 관리자가 직접)`;
    if (typeof window !== "undefined" && !window.confirm(msg)) return;
    setBusy(r.id);
    try {
      const res = await fetch(`/api/admin/external-applications/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ action: "forward" }),
      });
      const j = await res.json();
      if (!j.success) { window.alert(j.error?.message || "전달 실패"); }
      await load();
    } catch (e) { window.alert("오류가 발생했습니다."); }
    finally { setBusy(null); }
  };

  const TABS: [typeof tab, string, number][] = [
    ["PENDING", "전달 대기", counts.PENDING],
    ["FORWARDED", "전달됨", counts.FORWARDED],
    ["FAILED", "실패", counts.FAILED],
    ["ALL", "전체", rows.length],
  ];

  return (
    <>
      <p style={{ fontSize: 13, color: "#888", margin: "0 0 14px" }}>
        비회원(미가입) 기업 공고에 들어온 지원을 확인하고, 해당 기업에 전달·상태 관리합니다.
      </p>

      <div className="admin-mini-stats">
        {[["전달 대기", counts.PENDING, true], ["전달됨", counts.FORWARDED, false], ["실패", counts.FAILED, false], ["가입 전환", counts.claimed, false]].map(([l, v, warn], i) => (
          <div key={i} className="admin-mini-stat" style={warn ? { outline: "2px solid #ffd9be", outlineOffset: -2 } : undefined}>
            <span className="admin-mini-stat-label">{l as string}</span>
            <span className="admin-mini-stat-value" style={{ color: warn ? "#FA6400" : undefined }}>{v as number}<span className="admin-mini-unit">건</span></span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, margin: "14px 0" }}>
        {TABS.map(([val, label, cnt]) => (
          <button key={val} onClick={() => setTab(val)}
            style={{ fontSize: 13.5, fontWeight: 700, padding: "7px 15px", borderRadius: 20, cursor: "pointer",
              border: `1px solid ${tab === val ? "#5f0080" : "#e0dce9"}`, background: tab === val ? "#5f0080" : "#fff", color: tab === val ? "#fff" : "#777" }}>
            {label} <span style={{ opacity: 0.8, marginLeft: 4 }}>{cnt}</span>
          </button>
        ))}
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="admin-empty">불러오는 중...</div>
        ) : shown.length === 0 ? (
          <div className="admin-empty">해당 상태의 지원이 없습니다.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table" style={{ width: "100%", minWidth: 860 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>지원자</th>
                  <th style={{ textAlign: "left" }}>지원 공고 (외부 기업)</th>
                  <th>지원방식</th>
                  <th>제3자동의</th>
                  <th>지원일</th>
                  <th>상태</th>
                  <th style={{ textAlign: "right" }}>처리</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const m = METHOD[r.apply_method] || { t: r.apply_method, c: "#888" };
                  const st = r.delivery_status;
                  return (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{r.applicant_name}</div>
                        <div style={{ fontSize: 12, color: "#999" }}>{[r.applicant_phone, r.applicant_email].filter(Boolean).join(" · ") || "-"}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{r.company_name || "—"}
                          {r.claimed_company_id && <span style={{ fontSize: 11, marginLeft: 6, color: "#10b981", fontWeight: 700 }}>가입전환</span>}
                        </div>
                        <div style={{ fontSize: 12.5, color: "#777" }}>{r.job_title}</div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ fontSize: 11.5, fontWeight: 800, padding: "3px 9px", borderRadius: 20, color: m.c, background: m.c + "1a" }}>{m.t}</span>
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 800, color: r.third_party_consent ? "#0a9d6e" : "#c0392b" }}>
                        {r.third_party_consent ? "✔ 동의" : "✘ 미동의"}
                      </td>
                      <td style={{ textAlign: "center", color: "#888" }}>{fmt(r.applied_at)}</td>
                      <td style={{ textAlign: "center" }}>
                        {st === "FORWARDED" ? (
                          <span style={{ fontSize: 11.5, fontWeight: 800, padding: "3px 9px", borderRadius: 20, color: "#0a7d55", background: "#e9f9f1" }}>
                            전달됨{r.forwarded_channel === "MANUAL" ? "(수동)" : ""} · {fmt(r.forwarded_at)}
                          </span>
                        ) : st === "FAILED" ? (
                          <span style={{ fontSize: 11.5, fontWeight: 800, padding: "3px 9px", borderRadius: 20, color: "#b91c1c", background: "#fee2e2" }}>반송 실패</span>
                        ) : (
                          <span style={{ fontSize: 11.5, fontWeight: 800, padding: "3px 9px", borderRadius: 20, color: "#b23b00", background: "#fff3ea" }}>전달 대기</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {st === "FORWARDED" ? (
                          <button onClick={() => forward(r)} disabled={busy === r.id}
                            style={{ fontSize: 12.5, fontWeight: 700, borderRadius: 7, padding: "6px 11px", cursor: "pointer", border: "1px solid #ddd", background: "#fff", color: "#666" }}>재전송</button>
                        ) : (
                          <button onClick={() => forward(r)} disabled={busy === r.id || !r.third_party_consent}
                            style={{ fontSize: 12.5, fontWeight: 700, borderRadius: 7, padding: "6px 12px", cursor: "pointer", border: "none", background: r.third_party_consent ? "#5f0080" : "#ccc", color: "#fff" }}>
                            {busy === r.id ? "처리 중..." : (r.external_contact_email || r.ec_contact_email) ? "기업에 전달" : "수동 전달함"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
