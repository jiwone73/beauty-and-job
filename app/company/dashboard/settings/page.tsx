"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase, Users, FileText, Settings,
  Bell, LogOut, Save, Camera
} from "lucide-react";

const COMPANY = { name: "(주)올리브영", category: "리테일" };

function CompanyLayout({ children, activePage }: { children: React.ReactNode; activePage: string }) {
  const router = useRouter();
  const NAV = [
    { id: "dashboard", label: "대시보드", icon: Briefcase, href: "/company/dashboard" },
    { id: "jobs", label: "채용공고 관리", icon: FileText, href: "/company/dashboard/jobs" },
    { id: "applicants", label: "지원자 관리", icon: Users, href: "/company/dashboard/applicants" },
    { id: "settings", label: "기업 정보", icon: Settings, href: "/company/dashboard/settings" },
  ];
  return (
    <div className="company-layout">
      <aside className="company-sidebar">
        <div className="company-sidebar-logo">
          <Link href="/company/dashboard" className="company-logo-link">
            <div className="company-logo-avatar">{COMPANY.name.slice(0,1)}</div>
            <div className="company-logo-info">
              <span className="company-logo-name">{COMPANY.name}</span>
              <span className="company-logo-category">{COMPANY.category}</span>
            </div>
          </Link>
        </div>
        <nav className="company-nav">
          {NAV.map((item) => (
            <Link key={item.id} href={item.href}
              className={`company-nav-item ${activePage === item.id ? "active" : ""}`}>
              <item.icon size={20} /><span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="company-sidebar-bottom">
          <button className="company-nav-item" onClick={() => router.push("/")}>
            <LogOut size={20} /><span>사이트로 이동</span>
          </button>
        </div>
      </aside>
      <div className="company-main">
        <header className="company-header">
          <h1 className="company-page-title">기업 정보</h1>
          <div className="company-header-right">
            <button className="company-header-btn"><Bell size={18} /><span className="company-notif-dot" /></button>
            <div className="company-profile">
              <div className="company-avatar">{COMPANY.name.slice(0,1)}</div>
              <span className="company-name">{COMPANY.name}</span>
            </div>
          </div>
        </header>
        <main className="company-content">{children}</main>
      </div>
    </div>
  );
}

export default function CompanySettingsPage() {
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"brand" | "account">("brand");
  const [brandForm, setBrandForm] = useState({
    name: "(주)올리브영",
    category: "리테일",
    size: "1000명+",
    location: "서울 중구",
    website: "https://www.oliveyoung.co.kr",
    intro: "국내 최대 H&B 스토어. 다양한 뷰티 브랜드의 판매 플랫폼으로, 올리브영만의 독자적인 큐레이션으로 고객들에게 최적의 뷰티 경험을 제공합니다.",
    tags: "리테일, 오프라인, 온라인, H&B",
  });
  const [accountForm, setAccountForm] = useState({
    ceo: "이선정",
    bizNo: "123-45-67890",
    email: "hr@oliveyoung.com",
    phone: "02-1234-5678",
    currentPw: "",
    newPw: "",
    confirmPw: "",
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <CompanyLayout activePage="settings">
      {/* 탭 */}
      <div className="admin-tab-row1" style={{marginBottom:"0"}}>
        <button className={`admin-tab1 ${activeTab === "brand" ? "active" : ""}`}
          onClick={() => setActiveTab("brand")}>브랜드 정보</button>
        <button className={`admin-tab1 ${activeTab === "account" ? "active" : ""}`}
          onClick={() => setActiveTab("account")}>계정 정보</button>
      </div>

      {activeTab === "brand" && (
        <div className="admin-form-grid">
          {/* 로고 + 소개 */}
          <div className="company-card">
            <div className="company-card-head">
              <h2 className="company-card-title">브랜드 소개</h2>
            </div>
            <div className="admin-form-body">
              {/* 로고 업로드 */}
              <div className="admin-form-row">
                <label className="admin-form-label">로고</label>
                <div className="company-logo-upload">
                  <div className="company-logo-preview">
                    <span style={{fontSize:"28px", fontWeight:"800", color:"#5f0080"}}>O</span>
                  </div>
                  <div>
                    <button className="admin-secondary-btn" style={{fontSize:"13px"}}>
                      <Camera size={14} /> 로고 변경
                    </button>
                    <p style={{fontSize:"11px", color:"#aaa", marginTop:"6px"}}>
                      권장: 200x200px, PNG/JPG
                    </p>
                  </div>
                </div>
              </div>

              {[
                { key: "name", label: "기업명 *", placeholder: "기업명" },
                { key: "website", label: "웹사이트", placeholder: "https://" },
                { key: "location", label: "위치", placeholder: "예) 서울 중구" },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="admin-form-row">
                  <label className="admin-form-label">{label}</label>
                  <input className="admin-form-input" placeholder={placeholder}
                    value={(brandForm as any)[key]}
                    onChange={(e) => setBrandForm({...brandForm, [key]: e.target.value})} />
                </div>
              ))}

              <div className="admin-form-row">
                <label className="admin-form-label">카테고리</label>
                <select className="admin-form-select" value={brandForm.category}
                  onChange={(e) => setBrandForm({...brandForm, category: e.target.value})}>
                  {["리테일", "화장품 브랜드", "ODM", "MCN·미디어", "플랫폼·유통", "기타"].map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div className="admin-form-row">
                <label className="admin-form-label">기업 규모</label>
                <select className="admin-form-select" value={brandForm.size}
                  onChange={(e) => setBrandForm({...brandForm, size: e.target.value})}>
                  {["10명 미만", "10-50명", "50-200명", "200-500명", "500-1000명", "1000명+"].map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div className="admin-form-row">
                <label className="admin-form-label">태그</label>
                <input className="admin-form-input" placeholder="쉼표로 구분"
                  value={brandForm.tags}
                  onChange={(e) => setBrandForm({...brandForm, tags: e.target.value})} />
                <span style={{fontSize:"11px", color:"#aaa", marginTop:"4px"}}>
                  구직자 검색에 노출되는 키워드예요
                </span>
              </div>
            </div>
          </div>

          {/* 기업 소개 */}
          <div className="company-card">
            <div className="company-card-head">
              <h2 className="company-card-title">기업 소개</h2>
            </div>
            <div className="admin-form-body">
              <div className="admin-form-row">
                <label className="admin-form-label">기업 소개 *</label>
                <textarea className="admin-form-textarea" style={{minHeight:"200px"}}
                  placeholder="구직자에게 보여질 기업 소개를 입력하세요"
                  value={brandForm.intro}
                  onChange={(e) => setBrandForm({...brandForm, intro: e.target.value})} />
              </div>

              {/* 미리보기 */}
              <div className="company-settings-preview">
                <p style={{fontSize:"12px", fontWeight:"600", color:"#888", marginBottom:"10px"}}>
                  구직자 화면 미리보기
                </p>
                <div className="company-brand-preview-card">
                  <div className="company-brand-preview-logo">O</div>
                  <div>
                    <p style={{fontWeight:"700", fontSize:"15px", margin:"0 0 4px"}}>{brandForm.name}</p>
                    <p style={{fontSize:"12px", color:"#888", margin:"0 0 8px"}}>{brandForm.category} · {brandForm.size} · {brandForm.location}</p>
                    <div style={{display:"flex", gap:"4px", flexWrap:"wrap"}}>
                      {brandForm.tags.split(",").map(t => t.trim()).filter(Boolean).map(t => (
                        <span key={t} className="admin-badge admin-badge-neutral" style={{fontSize:"11px"}}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <p style={{fontSize:"13px", color:"#555", lineHeight:"1.7", marginTop:"12px"}}>
                  {brandForm.intro.slice(0, 100)}{brandForm.intro.length > 100 ? "..." : ""}
                </p>
              </div>

              <div className="admin-modal-actions" style={{justifyContent:"flex-end"}}>
                <button className="company-primary-btn" onClick={handleSave}>
                  <Save size={15} /> {saved ? "✅ 저장됨" : "저장하기"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "account" && (
        <div style={{maxWidth:"560px"}}>
          <div className="company-card">
            <div className="company-card-head">
              <h2 className="company-card-title">계정 정보</h2>
            </div>
            <div className="admin-form-body">
              {[
                { key: "ceo", label: "대표자명", placeholder: "대표자명" },
                { key: "bizNo", label: "사업자번호", placeholder: "000-00-00000" },
                { key: "email", label: "담당자 이메일 *", placeholder: "이메일" },
                { key: "phone", label: "담당자 연락처 *", placeholder: "연락처" },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="admin-form-row">
                  <label className="admin-form-label">{label}</label>
                  <input className="admin-form-input" placeholder={placeholder}
                    value={(accountForm as any)[key]}
                    onChange={(e) => setAccountForm({...accountForm, [key]: e.target.value})} />
                </div>
              ))}
              <div className="admin-modal-actions" style={{justifyContent:"flex-end"}}>
                <button className="company-primary-btn" onClick={handleSave}>
                  <Save size={15} /> {saved ? "✅ 저장됨" : "저장하기"}
                </button>
              </div>
            </div>
          </div>

          <div className="company-card" style={{marginTop:"16px"}}>
            <div className="company-card-head">
              <h2 className="company-card-title">비밀번호 변경</h2>
            </div>
            <div className="admin-form-body">
              {[
                { key: "currentPw", label: "현재 비밀번호", placeholder: "현재 비밀번호" },
                { key: "newPw", label: "새 비밀번호", placeholder: "새 비밀번호 (8자 이상)" },
                { key: "confirmPw", label: "새 비밀번호 확인", placeholder: "새 비밀번호 재입력" },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="admin-form-row">
                  <label className="admin-form-label">{label}</label>
                  <input className="admin-form-input" type="password" placeholder={placeholder}
                    value={(accountForm as any)[key]}
                    onChange={(e) => setAccountForm({...accountForm, [key]: e.target.value})} />
                </div>
              ))}
              <div className="admin-modal-actions" style={{justifyContent:"flex-end"}}>
                <button className="company-primary-btn" onClick={handleSave}>
                  <Save size={15} /> {saved ? "✅ 저장됨" : "저장하기"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CompanyLayout>
  );
}
