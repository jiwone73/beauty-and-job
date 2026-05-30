const fs = require('fs');
let content = fs.readFileSync('components/company/CompanyLayout.tsx', 'utf8');

// 1. ChevronDown import 추가
content = content.replace(
  `  Briefcase, Users, FileText, Settings,
  Bell, LogOut, Search, BookmarkCheck, Menu, X
} from "lucide-react";`,
  `  Briefcase, Users, FileText, Settings,
  Bell, LogOut, Search, BookmarkCheck, Menu, X, ChevronDown
} from "lucide-react";`
);

// 2. 드롭다운 state 추가
content = content.replace(
  `  const [companyInfo, setCompanyInfo] = useState({ name: "", category: "" });`,
  `  const [companyInfo, setCompanyInfo] = useState({ name: "", category: "" });
  const [profileOpen, setProfileOpen] = useState(false);`
);

// 3. 헤더 우측 회사명 → 아바타+드롭다운
content = content.replace(
  `            <div className="company-profile">
              <span className="company-name">{companyInfo.name}</span>
            </div>`,
  `            <div className="company-profile-wrap">
              <button className="company-profile-btn" onClick={() => setProfileOpen(!profileOpen)}>
                <span className="company-name">{companyInfo.name}</span>
                <ChevronDown size={16} color="#888" />
              </button>
              {profileOpen && (
                <div className="company-profile-dropdown">
                  <button className="company-profile-item" onClick={() => { setProfileOpen(false); router.push("/company/dashboard/settings"); }}>
                    <Settings size={15} /> 기업 정보
                  </button>
                  <div className="company-profile-divider" />
                  <button className="company-profile-item logout" onClick={() => {
                    localStorage.removeItem("access_token");
                    router.push("/login");
                  }}>
                    <LogOut size={15} /> 로그아웃
                  </button>
                </div>
              )}
            </div>`
);

fs.writeFileSync('components/company/CompanyLayout.tsx', content, 'utf8');
console.log('완료');
