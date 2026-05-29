const fs = require('fs');
let content = fs.readFileSync('app/company/dashboard/jobs/new/page.tsx', 'utf8');

// 1. BOTH일 때 jobGroupType 초기값 null로
content = content.replace(
  `        setJobGroupType(type === "STORE" ? "매장" : "기업");`,
  `        if (type === "BOTH") {
          setJobGroupType("기업"); // BOTH면 기본값 기업, UI에서 선택 가능
        } else {
          setJobGroupType(type === "STORE" ? "매장" : "기업");
        }`
);

// 2. 채용 유형 UI - BOTH일 때 선택 가능하게
content = content.replace(
  `              <label className="admin-form-label">채용 유형</label>
              <div style={{
                padding: "12px 16px",
                background: "#faf5ff",
                border: "1px solid #ede0f8",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#5f0080" }}>
                  {jobGroupType === "기업" ? "🏢 기업·브랜드 채용" : "🏪 매장·살롱 채용"}
                </span>
                <span style={{ fontSize: "11px", color: "#888" }}>
                  회사 정보에 따라 자동 설정
                </span>
              </div>`,
  `              <label className="admin-form-label">채용 유형</label>
              {companyType === "BOTH" ? (
                <div style={{ display: "flex", gap: "8px" }}>
                  {[{ value: "기업", label: "🏢 기업·브랜드 채용" }, { value: "매장", label: "🏪 매장·살롱 채용" }].map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => { setJobGroupType(t.value as "기업" | "매장"); setCategories([]); }}
                      style={{
                        flex: 1, padding: "12px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
                        border: jobGroupType === t.value ? "2px solid #5f0080" : "2px solid #e0e0e0",
                        background: jobGroupType === t.value ? "#faf5ff" : "#fff",
                        color: jobGroupType === t.value ? "#5f0080" : "#888",
                        cursor: "pointer",
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: "12px 16px", background: "#faf5ff",
                  border: "1px solid #ede0f8", borderRadius: "8px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#5f0080" }}>
                    {jobGroupType === "기업" ? "🏢 기업·브랜드 채용" : "🏪 매장·살롱 채용"}
                  </span>
                  <span style={{ fontSize: "11px", color: "#888" }}>회사 정보에 따라 자동 설정</span>
                </div>
              )}`
);

fs.writeFileSync('app/company/dashboard/jobs/new/page.tsx', content, 'utf8');
console.log('완료');
