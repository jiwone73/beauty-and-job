"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { RefreshCw } from "lucide-react";

// 외부공고 불러오기 — 소스 하나의 목록.
//
// 여기서 하는 일은 「고르는 것」뿐이다. 제목을 누르면 공고 등록 폼으로 가고,
// 등록하거나 임시저장하면 그 상태가 이 목록에 그대로 남는다. 담아 두는 단추를
// 따로 두지 않는다 — 어차피 폼에서 확인해야 하니 길이 둘이면 헷갈리기만 한다.

const 이름: Record<string, string> = { hairinjob: "헤어인잡", selectme: "셀렉미", work24: "고용24" };

type 줄 = {
  id: string; url: string; title: string; company?: string; region?: string;
  salary?: string; contact: string; categories: string[]; 상태: string; 새것: boolean;
};

export default function ImportListPage() {
  const params = useParams();
  const router = useRouter();
  const source = String((params as any)?.source || "");
  const [목록, set목록] = useState<줄[]>([]);
  const [마지막, set마지막] = useState<string | null>(null);
  const [부르는중, set부르는중] = useState(true);
  const [받는중, set받는중] = useState(false);
  const [결과, set결과] = useState<any>(null);
  // 고용24는 조건을 걸어 찾은 목록이 로그인 뒤에 있어 우리가 받아 올 수 없다.
  // 알바가 그 화면에서 주소를 복사해 붙여넣는 길을 함께 둔다.
  const [붙임, set붙임] = useState("");
  const 붙여넣기가능 = source === "work24";

  const token = () => (typeof window === "undefined" ? "" : localStorage.getItem("admin_token") || "");

  const 불러오기 = useCallback(async () => {
    set부르는중(true);
    try {
      const res = await fetch(`/api/admin/external-jobs/inbox?source=${source}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const j = await res.json();
      if (j.success) { set목록(j.data.목록 || []); set마지막(j.data.마지막업데이트 || null); }
    } finally { set부르는중(false); }
  }, [source]);

  useEffect(() => { if (이름[source]) 불러오기(); }, [source, 불러오기]);

  const 업데이트 = async () => {
    set받는중(true); set결과(null);
    try {
      const res = await fetch(`/api/admin/external-jobs/inbox?source=${source}`, {
        method: "POST", headers: { Authorization: `Bearer ${token()}` },
      });
      const j = await res.json();
      set결과(j.success ? j.data : { 오류: j.error?.message || "가져오지 못했어요." });
      if (j.success) await 불러오기();
    } catch {
      set결과({ 오류: "네트워크 오류가 발생했어요." });
    } finally { set받는중(false); }
  };

  const 주소로받기 = async () => {
    set받는중(true); set결과(null);
    try {
      const res = await fetch(`/api/admin/external-jobs/inbox?source=${source}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ 붙임: 붙임.trim() }),
      });
      const j = await res.json();
      if (!j.success) { set결과({ 오류: j.error?.message || "가져오지 못했어요." }); return; }
      set결과(j.data);
      set붙임("");
      await 불러오기();
    } catch {
      set결과({ 오류: "네트워크 오류가 발생했어요." });
    } finally { set받는중(false); }
  };

  const 열기 = (u: string) =>
    router.push(`/admin/jobs/new?url=${encodeURIComponent(u)}&from=${source}`);

  const 시각 = (t: string | null) => {
    if (!t) return "아직 안 받음";
    const d = new Date(t);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  if (!이름[source]) {
    return <AdminLayout activeMenu="import"><div className="admin-card"><div className="admin-empty">없는 소스입니다.</div></div></AdminLayout>;
  }

  return (
    <AdminLayout activeMenu={`import-${source}`}>
      <div className="admin-card">
        <div className="admin-table-meta" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span>
            {이름[source]} <strong>{목록.length}</strong>건
            <span style={{ color: "#9a9aa0", marginLeft: 10 }}>마지막 업데이트 {시각(마지막)}</span>
          </span>
          <button className="admin-primary-btn" onClick={업데이트} disabled={받는중}>
            <RefreshCw size={15} /> {받는중 ? "받는 중…" : "업데이트"}
          </button>
        </div>

        {결과 && (
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #f2f2f4", fontSize: 13.5, color: 결과.오류 ? "#c0392b" : "#555" }}>
            {결과.오류 ? 결과.오류 : (
              <>공고 {결과.본것}건을 보고 <strong style={{ color: "#1a1a1a" }}>{결과.담음}건</strong>을 새로 받았습니다
                {결과.뷰티아님 ? ` · 뷰티 아님 ${결과.뷰티아님}건` : ""}
                {결과.연락처없음 ? ` · 연락처 없어 뺀 것 ${결과.연락처없음}건` : ""}
                {결과.마감 ? ` · 마감돼 지운 것 ${결과.마감}건` : ""}
              </>
            )}
          </div>
        )}

        {붙여넣기가능 && (
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #f2f2f4" }}>
            <textarea value={붙임} onChange={(e) => set붙임(e.target.value)} rows={3}
              placeholder="고용24 목록에서 복사한 공고 주소를 붙여넣으세요"
              style={{ width: "100%", boxSizing: "border-box", border: "1px solid #efeff1", borderRadius: 8,
                padding: "10px 12px", fontSize: 13.5, outline: "none", resize: "vertical",
                fontFamily: "inherit", lineHeight: 1.5 }} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button className="admin-secondary-btn" onClick={주소로받기} disabled={받는중 || !붙임.trim()}>
                붙여넣은 주소로 가져오기
              </button>
            </div>
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ minWidth: 1040 }}>
            <thead>
              <tr>
                <th style={{ width: 340 }}>공고명</th>
                <th style={{ width: 180 }}>매장</th>
                <th style={{ width: 120 }}>지역</th>
                <th style={{ width: 130 }}>급여</th>
                <th style={{ width: 140 }}>연락처</th>
                <th style={{ width: 70 }}>원문</th>
                <th style={{ width: 88 }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {부르는중 ? (
                <tr><td colSpan={7} className="admin-empty" style={{ textAlign: "center" }}>불러오는 중...</td></tr>
              ) : 목록.length === 0 ? (
                <tr><td colSpan={7} className="admin-empty" style={{ textAlign: "center" }}>「업데이트」를 눌러 공고를 받아 오세요.</td></tr>
              ) : 목록.map((x) => (
                <tr key={x.id} style={{ opacity: x.새것 ? 1 : 0.55 }}>
                  <td>
                    <span className="adm-td2" title={x.title}
                      style={{ maxWidth: 330, color: "#555", cursor: "pointer" }}
                      onClick={() => 열기(x.url)}>
                      {x.title}
                    </span>
                    <div style={{ fontSize: 12.5, color: "#9a9aa0", marginTop: 3 }}>{x.categories.join(" · ")}</div>
                  </td>
                  <td>{x.company || "-"}</td>
                  <td>{x.region || "-"}</td>
                  <td className="num">{x.salary || "-"}</td>
                  <td className="num">{x.contact || "-"}</td>
                  <td>
                    <a href={x.url} target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: 12.5, color: "#582681", textDecoration: "none", whiteSpace: "nowrap" }}>
                      보기 ↗
                    </a>
                  </td>
                  <td style={{ color: x.상태 === "미등록" ? "#582681" : "#9a9aa0", fontSize: 13 }}>{x.상태}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
