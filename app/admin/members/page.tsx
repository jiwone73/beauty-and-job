"use client";
import { useState } from "react";
import { AdminLayout } from "../page";
import { Search, Eye, Trash2 } from "lucide-react";

const MEMBERS = [
  { id: 1, name: "김지수", type: "개인", email: "jisoo@email.com", phone: "010-1234-5678", job: "마케팅", date: "2025.01.20", status: "정상" },
  { id: 2, name: "(주)올리브영", type: "기업", email: "hr@oliveyoung.com", phone: "02-1234-5678", job: "-", date: "2025.01.20", status: "정상" },
  { id: 3, name: "박민준", type: "개인", email: "minjun@email.com", phone: "010-2345-6789", job: "MD", date: "2025.01.19", status: "정상" },
  { id: 4, name: "이수진", type: "개인", email: "sujin@email.com", phone: "010-3456-7890", job: "영업", date: "2025.01.19", status: "정상" },
  { id: 5, name: "(주)아모레퍼시픽", type: "기업", email: "recruit@amorepacific.com", phone: "02-2345-6789", job: "-", date: "2025.01.18", status: "정상" },
];

export default function AdminMembersPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("전체");
  const [members, setMembers] = useState(MEMBERS);

  const filtered = members.filter((m) => {
    const matchSearch = !search || m.name.includes(search) || m.email.includes(search);
    const matchType = typeFilter === "전체" || m.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <AdminLayout activeMenu="members">
      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="이름, 이메일 검색"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="admin-filter-tabs">
            {["전체", "개인", "기업"].map((t) => (
              <button key={t} className={`admin-filter-tab ${typeFilter === t ? "active" : ""}`}
                onClick={() => setTypeFilter(t)}>{t}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr><th>이름</th><th>유형</th><th>이메일</th><th>연락처</th><th>직군</th><th>가입일</th><th>상태</th><th>관리</th></tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id}>
                <td className="admin-td-brand">{m.name}</td>
                <td><span className={`admin-badge ${m.type === "기업" ? "admin-badge-info" : "admin-badge-neutral"}`}>{m.type}</span></td>
                <td className="admin-td-date">{m.email}</td>
                <td className="admin-td-date">{m.phone}</td>
                <td className="admin-td-date">{m.job}</td>
                <td className="admin-td-date">{m.date}</td>
                <td><span className="admin-badge admin-badge-success">{m.status}</span></td>
                <td>
                  <div className="admin-actions">
                    <button className="admin-action-icon"><Eye size={15} /></button>
                    <button className="admin-action-icon danger" onClick={() => setMembers(members.filter(x => x.id !== m.id))}><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
