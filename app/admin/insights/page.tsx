"use client";
import { useState } from "react";
import { AdminLayout } from "../page";
import { Search, Plus, Eye, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

/* ============================================
   회원관리 페이지
   ============================================ */
const MEMBERS = [
  { id: 1, name: "김지수", type: "개인", email: "jisoo@email.com", phone: "010-1234-5678", job: "마케팅", date: "2025.01.20", status: "정상" },
  { id: 2, name: "(주)올리브영", type: "기업", email: "hr@oliveyoung.com", phone: "02-1234-5678", job: "-", date: "2025.01.20", status: "정상" },
  { id: 3, name: "박민준", type: "개인", email: "minjun@email.com", phone: "010-2345-6789", job: "MD", date: "2025.01.19", status: "정상" },
  { id: 4, name: "이수진", type: "개인", email: "sujin@email.com", phone: "010-3456-7890", job: "영업", date: "2025.01.19", status: "정상" },
  { id: 5, name: "(주)아모레퍼시픽", type: "기업", email: "recruit@amorepacific.com", phone: "02-2345-6789", job: "-", date: "2025.01.18", status: "정상" },
];

export function AdminMembersPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("전체");

  const filtered = MEMBERS.filter((m) => {
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
                    <button className="admin-action-icon danger"><Trash2 size={15} /></button>
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

/* ============================================
   인사이트 관리 페이지
   ============================================ */
const INSIGHTS = [
  { id: 1, title: "2025 뷰티 업계를 뒤흔들 10가지 트렌드", category: "트렌드", date: "2025.01.20", views: 1234, status: "게시중" },
  { id: 2, title: "뷰티 MD가 되기 위한 5가지 필수 역량", category: "커리어", date: "2025.01.17", views: 987, status: "게시중" },
  { id: 3, title: "뷰티 업계 직무별 연봉 리포트 2025", category: "연봉정보", date: "2025.01.15", views: 2341, status: "게시중" },
  { id: 4, title: "아누아는 어떻게 틱톡에서 글로벌 브랜드가 됐나", category: "브랜드스토리", date: "2025.01.12", views: 756, status: "게시중" },
  { id: 5, title: "뷰티 회사 면접, 이것만 알면 합격한다", category: "취업팁", date: "2025.01.10", views: 1567, status: "임시저장" },
];

export default function AdminInsightsPage() {
  const router = useRouter();
  const [insights, setInsights] = useState(INSIGHTS);
  const [search, setSearch] = useState("");

  const filtered = insights.filter(i => !search || i.title.includes(search));

  return (
    <AdminLayout activeMenu="insights">
      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="제목 검색"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <button className="admin-primary-btn" onClick={() => router.push("/admin/insights/new")}>
          <Plus size={16} /> 글 작성
        </button>
      </div>
      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr><th>제목</th><th>카테고리</th><th>작성일</th><th>조회수</th><th>상태</th><th>관리</th></tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td className="admin-td-title">{item.title}</td>
                <td><span className="admin-badge admin-badge-neutral">{item.category}</span></td>
                <td className="admin-td-date">{item.date}</td>
                <td className="admin-td-date">{item.views.toLocaleString()}</td>
                <td><span className={`admin-badge ${item.status === "게시중" ? "admin-badge-success" : "admin-badge-warning"}`}>{item.status}</span></td>
                <td>
                  <div className="admin-actions">
                    <button className="admin-action-icon"><Edit size={15} /></button>
                    <button className="admin-action-icon danger" onClick={() => setInsights(insights.filter(i => i.id !== item.id))}><Trash2 size={15} /></button>
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

/* ============================================
   브랜드 관리 페이지
   ============================================ */
const BRANDS = [
  { id: 1, name: "아누아", category: "화장품 브랜드", jobs: 3, date: "2024.12.01", status: "정상" },
  { id: 2, name: "달바", category: "화장품 브랜드", jobs: 5, date: "2024.11.15", status: "정상" },
  { id: 3, name: "올리브영", category: "리테일", jobs: 12, date: "2024.10.01", status: "정상" },
  { id: 4, name: "코스맥스", category: "제조·유통", jobs: 15, date: "2024.09.20", status: "정상" },
  { id: 5, name: "에이피알", category: "화장품 브랜드", jobs: 9, date: "2024.09.10", status: "정상" },
];

export function AdminBrandsPage() {
  const router = useRouter();
  const [brands, setBrands] = useState(BRANDS);
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
                    <button className="admin-action-icon danger" onClick={() => setBrands(brands.filter(br => br.id !== b.id))}><Trash2 size={15} /></button>
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
