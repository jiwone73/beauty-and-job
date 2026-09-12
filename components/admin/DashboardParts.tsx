"use client";
import { useState, useEffect } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";

/**
 * 대시보드 조각들.
 *
 * 관리자 대시보드가 개인·기업으로 갈리면서 세 화면이 같은 카드를 쓰게 됐다.
 * 한 화면 안에만 있으면 옮길 때마다 복사해야 하므로 여기로 뺀다.
 */

export const PIE_COLORS = ["#582681", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

/** 차트 좌상단 단위 라벨 — recharts Y축 라벨 대신. 항상 안정적으로 보인다. */
export const unitLabelStyle: React.CSSProperties = {
  position: "absolute", top: 6, left: 12, fontSize: 12, color: "#555", zIndex: 2,
};
export const CHART_MARGIN = { top: 14, right: 8, left: 0, bottom: 0 };

export function fmtTrendDay(d: string | null, range: string) {
  if (!d) return "";
  const dt = new Date(d);
  if (range === "1y") return `${dt.getFullYear() % 100}/${dt.getMonth() + 1}`;
  return range === "1m" || range === "3m"
    ? `${dt.getMonth() + 1}/${dt.getDate()}~`
    : `${dt.getMonth() + 1}/${dt.getDate()}`;
}

/** 매장·본사 토글 단추 — 세 화면이 같은 모양을 쓴다. */
export const tabBtn = (active: boolean) => ({
  padding: "4px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600,
  cursor: "pointer", border: "none",
  background: active ? "#582681" : "#f7f7f8",
  color: active ? "#fff" : "#582681",
} as React.CSSProperties);

function ModeToggle({ mode, onChange }: { mode: string; onChange: (m: "new" | "cumulative") => void }) {
  return (
    <div style={{ display: "inline-flex", background: "#efeff1", borderRadius: "var(--chip-radius)", padding: 3, gap: 2 }}>
      {([["new", "신규"], ["cumulative", "누적"]] as const).map(([val, label]) => (
        <button key={val} onClick={() => onChange(val)}
          style={{
            padding: "3px 12px", borderRadius: "var(--chip-radius)", fontSize: 12, fontWeight: 600,
            cursor: "pointer", border: "none",
            background: mode === val ? "#fff" : "transparent",
            color: mode === val ? "#582681" : "#555",
            boxShadow: mode === val ? "0 1px 2px rgba(0,0,0,0.12)" : "none",
            transition: "all 0.15s",
          }}>
          {label}
        </button>
      ))}
    </div>
  );
}

function RangeToggle({ range, onChange }: { range: string; onChange: (r: "7d" | "1m" | "3m" | "1y") => void }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {([["7d", "7일"], ["1m", "1개월"], ["3m", "3개월"], ["1y", "1년"]] as const).map(([val, label]) => (
        <button key={val} onClick={() => onChange(val)}
          style={{
            padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
            cursor: "pointer", border: "1px solid #efeff1",
            background: range === val ? "#582681" : "#fff",
            color: range === val ? "#fff" : "#582681",
          }}>
          {label}
        </button>
      ))}
    </div>
  );
}

/** 추이 카드 — 기간·모드를 저마다 들고 따로 물어본다(여럿이 서로 독립). */
export function TrendCard({
  title, type, subFilter, unit, render, defaultMode,
}: {
  title: string;
  type: "signup" | "company" | "apply" | "job" | "completion" | "visit" | "company_completion";
  subFilter?: string;
  unit?: string;
  render: (rows: any[], range: string) => React.ReactNode;
  defaultMode?: "new" | "cumulative";
}) {
  const [range, setRange] = useState<"7d" | "1m" | "3m" | "1y">("7d");
  const [mode, setMode] = useState<"new" | "cumulative">(defaultMode || "new");
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    fetch(`/api/admin/dashboard/trend?type=${type}&range=${range}&mode=${mode}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => { if (res.success) setRows(res.data.rows || []); })
      .catch(console.error);
  }, [type, range, mode]);
  return (
    <div className="admin-card">
      <div className="admin-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="admin-card-title">{title}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {subFilter && <span style={{ fontSize: 12, color: "#555" }}>{subFilter}</span>}
          <ModeToggle mode={mode} onChange={setMode} />
          <RangeToggle range={range} onChange={setRange} />
        </div>
      </div>
      <div style={{ padding: "16px 8px", position: "relative" }}>
        {unit && <span style={unitLabelStyle}>{unit}</span>}
        {render(rows, range)}
      </div>
    </div>
  );
}

/** 파이차트 + 2열 범례 — 범례를 HTML로 직접 그린다. */
export function PieCard({ title, data, unit, colors, caption }: {
  title: string; data: { name: string; value: number }[]; unit: string; colors: string[]; caption?: string;
}) {
  return (
    <div className="admin-card">
      <div className="admin-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="admin-card-title">{title}</h2>
        {caption && <span style={{ fontSize: 12, color: "#555" }}>{caption}</span>}
      </div>
      <div style={{ padding: "16px 8px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: "0 0 45%" }}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={3}>
                {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => [`${v}${unit}`, ""]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{
          flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: "6px 8px", fontSize: 14, alignContent: "center",
        }}>
          {data.map((d, i) => (
            <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                background: colors[i % colors.length],
              }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#555" }}>{d.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 소분류 → 대분류 롤업. 세 화면이 같은 규칙으로 묶는다. */
export function rollup(rows: any[], jt: "STORE" | "OFFICE", getGroupOfItem: (t: any, n: string) => string | null) {
  const m: Record<string, number> = {};
  (rows || []).forEach((r: any) => {
    const g = getGroupOfItem(jt, r.name)
      || getGroupOfItem(jt === "STORE" ? "OFFICE" : "STORE", r.name)
      || "기타";
    m[g] = (m[g] || 0) + Number(r.value);
  });
  return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export const mapDist = (rows: any) => (rows || []).map((r: any) => ({ name: r.name, value: Number(r.value) }));
export const fmtNum = (n: any) => (n == null ? "-" : Number(n).toLocaleString());
