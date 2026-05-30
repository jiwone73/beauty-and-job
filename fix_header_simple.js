const fs = require('fs');
let content = fs.readFileSync('components/company/CompanyLayout.tsx', 'utf8');

// 헤더 우측 드롭다운 → 로그아웃 버튼 하나로
content = content.replace(
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
            </div>`,
  `            <button className="company-logout-btn" onClick={() => {
              localStorage.removeItem("access_token");
              router.push("/login");
            }}>
              <LogOut size={15} /> 로그아웃
            </button>`
);

fs.writeFileSync('components/company/CompanyLayout.tsx', content, 'utf8');
console.log('완료');
