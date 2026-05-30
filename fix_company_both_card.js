const fs = require('fs');
let content = fs.readFileSync('app/company/page.tsx', 'utf8');

// 기업회원 카드 뒤에 기업+매장 카드 추가
content = content.replace(
  `                  <Link href="/company/signup?type=corp" className="co-type-btn">
                    시작하기 <ArrowRight size={14} />
                  </Link>
                </div>
              </div>`,
  `                  <Link href="/company/signup?type=corp" className="co-type-btn">
                    시작하기 <ArrowRight size={14} />
                  </Link>
                </div>
                {/* 기업+매장 회원 */}
                <div className="co-type-card">
                  <div className="co-type-icon"><Layers size={28} /></div>
                  <div className="co-type-body">
                    <h3 className="co-type-name">기업 + 매장 회원</h3>
                    <p className="co-type-desc">본사와 직영·가맹 매장을 함께 운영하는 브랜드</p>
                    <ul className="co-type-list">
                      <li><CheckCircle2 size={13} /> 사무직·현장직 동시 채용</li>
                      <li><CheckCircle2 size={13} /> 통합 대시보드 관리</li>
                    </ul>
                  </div>
                  <Link href="/company/signup?type=both" className="co-type-btn">
                    시작하기 <ArrowRight size={14} />
                  </Link>
                </div>
              </div>`
);

// Layers 아이콘 import 추가 (lucide-react)
if (!content.includes('Layers')) {
  content = content.replace(
    /from "lucide-react";/,
    (m) => m // 아래에서 별도 처리
  );
  // import 줄에 Layers 추가
  content = content.replace(
    /import \{([^}]*)\} from "lucide-react";/,
    (m, p1) => `import {${p1.trimEnd()}, Layers } from "lucide-react";`
  );
}

fs.writeFileSync('app/company/page.tsx', content, 'utf8');
console.log('완료');
