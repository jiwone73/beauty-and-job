const fs = require('fs');
let content = fs.readFileSync('app/company/dashboard/page.tsx', 'utf8');

content = content.replace(
  `        <p style={{ fontSize: "14px", color: "#888" }}>
          오늘도 좋은 인재를 만나보세요 👋
        </p>
      </div>
      {/* 통계 카드 */}`,
  `        <p style={{ fontSize: "14px", color: "#888" }}>
          오늘도 좋은 인재를 만나보세요 👋
        </p>
      </div>

      {/* 기업/매장 토글 (BOTH 회원만) */}
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
