const fs = require('fs');
let content = fs.readFileSync('app/company/dashboard/page.tsx', 'utf8');

// 1. companyType 조회 fetch 추가
content = content.replace(
  `    const headers = { Authorization: \`Bearer \${token}\` };
    Promise.all([
      fetch("/api/company/dashboard/stats", { headers }).then((r) => r.json()),`,
  `    const headers = { Authorization: \`Bearer \${token}\` };
    fetch("/api/company/me", { headers })
      .then((r) => r.json())
      .then((res) => { if (res.success) setCompanyType(res.data.company_type); })
      .catch(console.error);
    Promise.all([
      fetch("/api/company/dashboard/stats", { headers }).then((r) => r.json()),`
);

// 2. UI 토글 추가 (통계 카드 앞에)
content = content.replace(
  `      {/* 통계 카드 */}`,
  `      {/* 기업/매장 토글 (BOTH 회원만) */}
      {companyType === "BOTH" && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          {[
            { value: "전체", label: "전체" },
            { value: "OFFICE", label: "🏢 기업" },
            { value: "STORE", label: "🏪 매장" },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setJobTypeTab(t.value as "전체" | "OFFICE" | "STORE")}
              style={{
                padding: "8px 18px", borderRadius: "20px", fontSize: "14px", fontWeight: 600,
                border: jobTypeTab === t.value ? "2px solid #5f0080" : "2px solid #e0e0e0",
                background: jobTypeTab === t.value ? "#5f0080" : "#fff",
                color: jobTypeTab === t.value ? "#fff" : "#888",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* 통계 카드 */}`
);

fs.writeFileSync('app/company/dashboard/page.tsx', content, 'utf8');
console.log('완료');
