"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { 플랜, 기간들, 값, 원, type PlanId, type 기간 } from "@/lib/companyPlans";

/**
 * 이용권 주문 — 입금 확인하는 자리.
 *
 * 결제 모듈이 붙기 전에는 여기가 파는 창구다. 전화·문자로 받은 주문도 손으로
 * 넣고, 입금이 들어오면 「입금 확인」 하나로 이용권과 공고 기간이 같이 밀린다.
 */

type 주문 = {
  id: string; company_id: string; company_name: string;
  plan: PlanId; days: number; amount: number;
  status: "PENDING" | "PAID" | "CANCELED";
  depositor: string | null;
  applied_from: string | null; applied_until: string | null;
  created_at: string;
  company_plan: PlanId | null; company_paid_until: string | null;
};

const 상태이름: Record<주문["status"], string> = {
  PENDING: "입금대기", PAID: "적용됨", CANCELED: "취소",
};

/** 관리자 화면은 admin_token 으로 부른다 — 공개 사이트 세션과 다른 열쇠다. */
const 머리 = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${typeof window === "undefined" ? "" : localStorage.getItem("admin_token") || ""}`,
});

export default function AdminOrdersPage() {
  const [목록, set목록] = useState<주문[]>([]);
  const [기업들, set기업들] = useState<{ id: string; company_name: string }[]>([]);
  const [상태, set상태] = useState("");
  const [로딩, set로딩] = useState(true);
  const [바쁨, set바쁨] = useState(false);
  const [추가열림, set추가열림] = useState(false);
  const [새주문, set새주문] = useState<{ company: string; plan: PlanId; days: 기간; depositor: string }>({
    company: "", plan: "STANDARD", days: 30, depositor: "",
  });

  const 불러오기 = async (s = 상태) => {
    set로딩(true);
    const r = await fetch(`/api/admin/orders${s ? `?status=${s}` : ""}`, { headers: 머리() })
      .then((x) => x.json()).catch(() => null);
    set목록(r?.success && Array.isArray(r.data) ? r.data : []);
    set로딩(false);
  };

  useEffect(() => { 불러오기(); /* eslint-disable-next-line */ }, [상태]);
  useEffect(() => {
    fetch("/api/admin/companies?member=true", { headers: 머리() }).then((x) => x.json())
      .then((r) => {
        // 이 API 는 { items: [...] } 로 돌려준다. 예전에 data 가 곧 배열인 줄 알고
        // Array.isArray 로 걸렀더니 늘 거짓이라 기업 목록이 통째로 비어 있었다 —
        // 자동완성이 안 뜨고 「넣기」는 「목록에 있는 기업을 골라 주세요」만 냈다.
        const list = Array.isArray(r?.data) ? r.data : r?.data?.items;
        if (r?.success && Array.isArray(list)) {
          set기업들(list.map((c: any) => ({ id: c.id, company_name: c.company_name })));
        }
      })
      .catch(() => {});
  }, []);

  const 처리 = async (id: string, action: "confirm" | "cancel", 기업: string) => {
    if (action === "confirm" && !confirm(`${기업} — 입금을 확인하고 이용권을 적용합니다.`)) return;
    if (action === "cancel" && !confirm(`${기업} — 주문을 취소합니다.`)) return;
    set바쁨(true);
    const r = await fetch("/api/admin/orders", {
      method: "PATCH", headers: 머리(),
      body: JSON.stringify({ id, action }),
    }).then((x) => x.json()).catch(() => null);
    set바쁨(false);
    if (!r?.success) { alert(r?.error?.message || "처리하지 못했습니다."); return; }
    if (action === "confirm") alert(`적용되었습니다. ${r.data.planName} · ${r.data.paidUntil}까지`);
    불러오기();
  };

  const 주문넣기 = async () => {
    const 기업 = 기업들.find((c) => c.company_name === 새주문.company);
    if (!기업) { alert("목록에 있는 기업을 골라 주세요."); return; }
    set바쁨(true);
    const r = await fetch("/api/admin/orders", {
      method: "POST", headers: 머리(),
      body: JSON.stringify({ companyId: 기업.id, plan: 새주문.plan, days: 새주문.days, depositor: 새주문.depositor }),
    }).then((x) => x.json()).catch(() => null);
    set바쁨(false);
    if (!r?.success) { alert(r?.error?.message || "넣지 못했습니다."); return; }
    set추가열림(false);
    set새주문({ company: "", plan: "STANDARD", days: 30, depositor: "" });
    불러오기();
  };

  return (
    <AdminLayout activeMenu="orders">
      <div className="admin-card">
        <div className="admin-table-meta" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <select className="admin-filter-select" value={상태} onChange={(e) => set상태(e.target.value)}>
              <option value="">전체</option>
              <option value="PENDING">입금대기</option>
              <option value="PAID">적용됨</option>
              <option value="CANCELED">취소</option>
            </select>
            <span style={{ fontSize: 14, color: "#555" }}>{목록.length}건</span>
          </div>
          <button className="admin-primary-btn" onClick={() => set추가열림(true)}>주문 넣기</button>
        </div>

        {추가열림 && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid #f0f0f0" }}>
            <input list="기업목록" className="admin-filter-select" style={{ width: 240, padding: "0 12px" }}
              placeholder="기업 이름" value={새주문.company}
              onChange={(e) => set새주문({ ...새주문, company: e.target.value })} />
            <datalist id="기업목록">
              {기업들.map((c) => <option key={c.id} value={c.company_name} />)}
            </datalist>
            <select className="admin-filter-select" value={새주문.plan}
              onChange={(e) => set새주문({ ...새주문, plan: e.target.value as PlanId })}>
              {(Object.keys(플랜) as PlanId[]).map((p) => <option key={p} value={p}>{플랜[p].name}</option>)}
            </select>
            <select className="admin-filter-select" value={새주문.days}
              onChange={(e) => set새주문({ ...새주문, days: Number(e.target.value) as 기간 })}>
              {기간들.map((d) => <option key={d} value={d}>{d}일</option>)}
            </select>
            <span style={{ fontSize: 15, color: "#582681" }}>{원(값(새주문.plan, 새주문.days))}</span>
            <input className="admin-filter-select" style={{ width: 130, padding: "0 12px" }}
              placeholder="입금자명" value={새주문.depositor}
              onChange={(e) => set새주문({ ...새주문, depositor: e.target.value })} />
            <button className="admin-primary-btn" onClick={주문넣기} disabled={바쁨}>넣기</button>
            <button className="admin-secondary-btn" onClick={() => set추가열림(false)}>닫기</button>
          </div>
        )}

        {로딩 ? (
          <div className="admin-empty" style={{ textAlign: "center" }}>불러오는 중…</div>
        ) : 목록.length === 0 ? (
          <div className="admin-empty" style={{ textAlign: "center" }}>주문이 없습니다.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>기업</th><th>플랜</th><th>기간</th><th>금액</th><th>입금자</th>
                  <th>지금 이용권</th><th>적용</th><th>상태</th><th></th>
                </tr>
              </thead>
              <tbody>
                {목록.map((o) => (
                  <tr key={o.id}>
                    <td>{o.company_name}</td>
                    <td>{플랜[o.plan]?.name || o.plan}</td>
                    <td>{o.days}일</td>
                    <td>{원(o.amount)}</td>
                    <td>{o.depositor || "—"}</td>
                    <td>
                      {o.company_plan && o.company_paid_until
                        ? `${플랜[o.company_plan]?.name || o.company_plan} · ${o.company_paid_until}까지`
                        : "스타트"}
                    </td>
                    <td>{o.applied_until ? `${o.applied_until}까지` : "—"}</td>
                    <td style={{ color: o.status === "PENDING" ? "#582681" : "#555" }}>{상태이름[o.status]}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {o.status === "PENDING" && (
                        <>
                          <button className="admin-primary-btn" disabled={바쁨}
                            onClick={() => 처리(o.id, "confirm", o.company_name)}>입금 확인</button>
                          <button className="admin-secondary-btn" style={{ marginLeft: 6 }} disabled={바쁨}
                            onClick={() => 처리(o.id, "cancel", o.company_name)}>취소</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
