const fs = require('fs');
let content = fs.readFileSync('app/company/signup/page.tsx', 'utf8');

// 1. COMPANY_TYPES에 BOTH 추가
content = content.replace(
  `const COMPANY_TYPES = [
  { value: "OFFICE", label: "기업·브랜드" },
  { value: "STORE", label: "매장·살롱" },
];`,
  `const COMPANY_TYPES = [
  { value: "OFFICE", label: "기업·브랜드", icon: "🏢", desc: "사무직 채용" },
  { value: "STORE", label: "매장·살롱", icon: "💄", desc: "현장직 채용" },
  { value: "BOTH", label: "기업+매장", icon: "🏢+💄", desc: "둘 다 채용" },
];`
);

// 2. UI를 3개 버튼으로 변경
content = content.replace(
  `            <div className="grid grid-cols-2 gap-2">
              {COMPANY_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => update("company_type", t.value)}
                  className={\`h-[44px] border rounded-lg text-[13px] transition \${
                    form.company_type === t.value
                      ? "border-[#5f0080] bg-[#f5ebfa] text-[#5f0080] font-semibold"
                      : "border-[#e0e0e0] text-[#6b6b6b]"
                  }\`}
                >
                  {t.label}
                </button>
              ))}
            </div>`,
  `            <div className="grid grid-cols-3 gap-2">
              {COMPANY_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => update("company_type", t.value)}
                  className={\`relative flex flex-col items-center justify-center p-3 border-2 rounded-xl transition \${
                    form.company_type === t.value
                      ? "border-[#5f0080] bg-[#f5ebfa] text-[#5f0080]"
                      : "border-[#e0e0e0] text-[#6b6b6b] hover:border-[#c0c0c0]"
                  }\`}
                >
                  <span className="text-xl mb-1">{t.icon}</span>
                  <span className="text-[12px] font-semibold">{t.label}</span>
                  <span className="text-[10px] mt-0.5 text-center leading-tight">{t.desc}</span>
                  {form.company_type === t.value && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#5f0080] rounded-full flex items-center justify-center">
                      <svg width="8" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>`
);

fs.writeFileSync('app/company/signup/page.tsx', content, 'utf8');
console.log('완료');
