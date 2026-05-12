"use client";
import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

const BRANDS_DATA = [
  { id: 1, name: "아누아", category: "화장품 브랜드", jobs: 3, date: "2024.12.01", status: "정상" },
  { id: 2, name: "달바", category: "화장품 브랜드", jobs: 5, date: "2024.11.15", status: "정상" },
  { id: 3, name: "올리브영", category: "리테일", jobs: 12, date: "2024.10.01", status: "정상" },
  { id: 4, name: "코스맥스", category: "제조·유통", jobs: 15, date: "2024.09.20", status: "정상" },
  { id: 5, name: "에이피알", category: "화장품 브랜드", jobs: 9, date: "2024.09.10", status: "정상" },
];

export default function AdminBrandsPage() {
  const router = useRouter();
  const [brands, setBrands] = useState(BRANDS_DATA);
  const [search, setSearch] = useState("");

  const filtered = brands.filter(b => !search || b.name.includes(search));

  return (
    <AdminLayout activeMenu="brands">
      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="브랜드명 검색"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <button className="admin-primary-btn" onClick={() => router.push("/admin/brands/new")}>
          <Plus size={16} /> 브랜드 등록
        </button>
      </div>
      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr><th>브랜드명</th><th>카테고리</th><th>채용공고</th><th>등록일</th><th>상태</th><th>관리</th></tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id}>
                <td className="admin-td-brand">{b.name}</td>
                <td className="admin-td-date">{b.category}</td>
                <td className="admin-td-date">{b.jobs}건</td>
                <td className="admin-td-date">{b.date}</td>
                <td><span className="admin-badge admin-badge-success">{b.status}</span></td>
                <td>
                  <div className="admin-actions">
                    <button className="admin-action-icon"><Edit size={15} /></button>
                    <button className="admin-action-icon danger" onClick={() => setBrands(brands.filter(x => x.id !== b.id))}><Trash2 size={15} /></button>
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
