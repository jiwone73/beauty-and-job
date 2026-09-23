"use client";
import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { unitLabelStyle, CHART_MARGIN, fmtNum } from "@/components/admin/DashboardParts";

/**
 * 회원 유입채널별 성과 — 방문자·가입·이력서·전환율.
 *
 * referrer로 자동 가른 채널(네이버 검색·인스타그램 등)과, 광고·이벤트·제휴·
 * 문자처럼 UTM을 단 링크의 캠페인이 한 표에 같이 선다. 이 기능을 켜기 전에
 * 가입한 사람은 「미확인」으로 묶인다 — 지어낸 값을 넣지 않는다.
 */
export default function AdminDashboardChannels() {
  const [rows, setRows] = useState<any[] | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    fetch(`/api/admin/dashboard/channels`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => { if (res.success) setRows(res.data.rows || []); })
      .catch(console.error);
  }, []);

  const chartData = (rows || []).map((r) => ({ name: r.channel, 방문자: r.방문자 }));

  return (
    <AdminLayout activeMenu="dashboard-channels">
      <div className="admin-card">
        <div className="admin-card-head">
          <h2 className="admin-card-title">회원 유입채널별 방문자</h2>
        </div>
        <div style={{ padding: "16px 8px", position: "relative" }}>
          <span style={unitLabelStyle}>명</span>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={CHART_MARGIN}>
              <XAxis dataKey="name" tick={{ fontSize: 12.5 }} interval={0} />
              <YAxis tick={{ fontSize: 13 }} allowDecimals={false} />
              <Tooltip formatter={(v) => [`${v}명`, "방문자"]} />
              <Bar dataKey="방문자" fill="#582681" radius={[6, 6, 0, 0]} maxBarSize={56} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: 16 }}>
        <div className="admin-card-head">
          <h2 className="admin-card-title">채널별 상세</h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>회원 유입채널</th>
                <th>방문자</th>
                <th>가입</th>
                <th>이력서</th>
                <th>방문→가입 전환율</th>
              </tr>
            </thead>
            <tbody>
              {rows == null ? (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "#555" }}>불러오는 중…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "#555" }}>아직 쌓인 방문 기록이 없습니다.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.channel}>
                    <td>{r.channel}</td>
                    <td>{fmtNum(r.방문자)}</td>
                    <td>{fmtNum(r.가입)}</td>
                    <td>{fmtNum(r.이력서)}</td>
                    <td>{r.전환율}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12.5, color: "#555", padding: "10px 14px 14px" }}>
          이 기능을 켜기 전에 가입한 회원은 유입채널이 남아 있지 않아 「미확인」으로 묶입니다.
        </p>
      </div>
    </AdminLayout>
  );
}
