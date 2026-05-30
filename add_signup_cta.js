const fs = require('fs');
let content = fs.readFileSync('app/company/page.tsx', 'utf8');

content = content.replace(
  `      {/* ── 5. 프리미엄 광고·노출 상품 ── */}`,
  `      {/* ── 가입 CTA ── */}
      <section className="co-section">
        <div className="co-section-inner" style={{ textAlign: "center" }}>
          <h2 className="co-section-title">지금 바로 시작하세요</h2>
          <p className="co-section-sub">매장, 기업, 기업+매장 — 가입 시 유형을 선택할 수 있어요</p>
          <Link href="/company/signup" className="co-btn-primary purple" style={{ marginTop: 24, display: "inline-flex" }}>
            기업회원 가입하기 <ArrowRight size={15} style={{ marginLeft: 6 }} />
          </Link>
        </div>
      </section>

      {/* ── 5. 프리미엄 광고·노출 상품 ── */}`
);

fs.writeFileSync('app/company/page.tsx', content, 'utf8');
console.log('완료');