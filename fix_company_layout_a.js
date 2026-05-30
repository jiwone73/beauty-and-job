const fs = require('fs');
let content = fs.readFileSync('app/globals.css', 'utf8');

// 중복 정의가 있으니, 마지막에 오버라이드 블록을 추가해서 확실히 적용
content += `

/* ===== 기업 소개 회원유형 A안: 카드 3개 가로 + 이용절차 아래 ===== */
.co-combined-grid {
  display: flex !important;
  flex-direction: column !important;
  gap: 48px !important;
}
.co-combined-left { max-width: none !important; flex: none !important; width: 100% !important; }
.co-combined-right {
  width: 100% !important;
  flex-shrink: 1 !important;
}
.co-type-stack {
  display: grid !important;
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 16px !important;
}
.co-type-card {
  flex-direction: column !important;
  align-items: flex-start !important;
  text-align: left !important;
  padding: 24px 20px !important;
}
.co-type-card .co-type-btn { width: 100%; justify-content: center; margin-top: auto; }
.co-type-body { width: 100%; }
/* 이용 절차를 가로 4단으로 */
.co-steps-vertical {
  display: grid !important;
  grid-template-columns: repeat(4, 1fr) !important;
  gap: 20px !important;
}
@media (max-width: 768px) {
  .co-type-stack { grid-template-columns: 1fr !important; }
  .co-steps-vertical { grid-template-columns: 1fr !important; }
}
`;

fs.writeFileSync('app/globals.css', content, 'utf8');
console.log('완료');
