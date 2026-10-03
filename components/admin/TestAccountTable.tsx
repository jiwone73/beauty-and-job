// 알바가 테스트할 때 쓰는 계정. 이메일 번호로 어느 상품인지 알 수 있다.
//
// 번호 구간은 상품 네 단계로 균등분할한 것이고, 나머지는 스타트 쪽에 더했다.
// DB(companies.plan)에도 이 구간대로 들어가 있다. 구간을 바꾸면 DB 와 같이 바꿔야 한다.
type 구간 = { 상품: string; 처음: number; 끝: number };

const 기업매장: 구간[] = [
  { 상품: "스타트", 처음: 1, 끝: 25 },
  { 상품: "라이트", 처음: 26, 끝: 50 },
  { 상품: "스탠다드", 처음: 51, 끝: 75 },
  { 상품: "프리미엄", 처음: 76, 끝: 100 },
];
const 기업오피스: 구간[] = [
  { 상품: "스타트", 처음: 1, 끝: 14 },
  { 상품: "라이트", 처음: 15, 끝: 26 },
  { 상품: "스탠다드", 처음: 27, 끝: 38 },
  { 상품: "프리미엄", 처음: 39, 끝: 50 },
];

const 번호 = (n: number) => String(n).padStart(2, "0");
const 아이디 = (접두: string, n: number) => `btwk2026+${접두}${번호(n)}`;

const 칸: React.CSSProperties = { padding: "9px 14px", whiteSpace: "nowrap", textAlign: "left" };

export default function TestAccountTable() {
  const 줄: { 구분: string; 범위: string; 상품: string }[] = [
    ...기업매장.map((g) => ({ 구분: "기업회원 · 매장", 범위: `${아이디("st", g.처음)} ~ ${아이디("st", g.끝)}`, 상품: g.상품 })),
    ...기업오피스.map((g) => ({ 구분: "기업회원 · 오피스", 범위: `${아이디("of", g.처음)} ~ ${아이디("of", g.끝)}`, 상품: g.상품 })),
    { 구분: "개인회원 · 매장", 범위: `${아이디("us", 1)} ~ ${아이디("us", 100)}`, 상품: "—" },
    { 구분: "개인회원 · 오피스", 범위: `${아이디("uo", 1)} ~ ${아이디("uo", 50)}`, 상품: "—" },
  ];
  return (
    <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, overflowX: "auto", marginBottom: 24 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 520 }}>
        <thead>
          <tr style={{ background: "#fafafa", color: "#555" }}>
            <th style={칸}>구분</th>
            <th style={칸}>ID (이메일 앞부분, 뒤는 @gmail.com)</th>
            <th style={칸}>상품</th>
          </tr>
        </thead>
        <tbody>
          {줄.map((r, i) => (
            <tr key={i} style={{ borderTop: "1px solid #f2f2f2" }}>
              <td style={{ ...칸, color: "#555" }}>{r.구분}</td>
              <td style={칸}>{r.범위}</td>
              <td style={{ ...칸, color: r.상품 === "—" ? "#555" : "#582681" }}>{r.상품}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
