// 소스별 「최신 공고 목록」을 받아 온다.
//
// 기존 hairinjob.ts·selectme.ts 는 「회사명으로 찾기」다 — 외부업체 리스트가 업체
// 하나를 두고 그 업체 공고를 훑을 때 쓴다. 여기는 반대로, 그 사이트에 새로 올라온
// 공고를 통째로 받아 오는 일이다.
//
// 목록에는 연락처가 없다. 상세를 읽어야 안다 — 그건 받아 온 뒤에 한 번만 한다
// (external_job_inbox).

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export type 소스 = "hairinjob" | "selectme" | "work24";
export const 소스이름: Record<소스, string> = {
  hairinjob: "헤어인잡", selectme: "셀렉미", work24: "고용24",
};

export interface 목록줄 {
  source: 소스;
  key: string;      // 그 사이트가 쓰는 공고 번호
  url: string;      // 원문 주소
  title: string;
  company?: string;
  region?: string;
}

async function 받기(url: string, euckr = false): Promise<string> {
  const r = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9" },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  if (!euckr) return await r.text();
  // 헤어인잡은 EUC-KR 이다. UTF-8 로 읽으면 제목이 깨진다.
  return new TextDecoder("euc-kr").decode(new Uint8Array(await r.arrayBuffer()));
}

const 태그없이 = (s: string) =>
  s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
   .replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();

/** 헤어인잡 — 공고 목록은 표 한 줄이 공고 하나다.
 *  한 줄에 매장명(span0101)·제목(span03 안의 링크)·지역과 급여(span0302)가 다 있다.
 *  화면 옆의 「실시간」 상자에도 같은 링크가 있는데 그건 열 건뿐이라 쓰지 않는다. */
async function 헤어인잡목록(쪽수 = 2): Promise<목록줄[]> {
  const out: 목록줄[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= 쪽수; page++) {
    let html = "";
    try {
      html = await 받기(`https://www.hairinjob.com/cms/s01.php?page=${page}`, true);
    } catch { break; }
    const rows = html.match(/(?:<tr[^>]*>)[\s\S]*?(?:<\/tr>)/g) || [];
    let 이번쪽 = 0;
    for (const r of rows) {
      const key = (r.match(/\/cms\/s01_v\.php\?idx=(\d+)/) || [])[1];
      if (!key || seen.has(key)) continue;
      const 제목 = 태그없이((r.match(/title="상세채용정보보기"[^>]*>\s*<span[^>]*>([\s\S]{0,400}?)<\/span>/) || [])[1] || "");
      if (!제목) continue;
      seen.add(key); 이번쪽++;
      const 매장 = 태그없이((r.match(/class="span0101"[^>]*>([\s\S]{0,300}?)<\/span>/) || [])[1] || "")
        .replace(/^찜하기\s*/, "").trim();
      const 꼬리 = 태그없이((r.match(/class="span0302"[^>]*>([\s\S]{0,300}?)<\/span>\s*<span/) || [])[1] || "");
      out.push({
        source: "hairinjob", key, title: 제목,
        company: 매장 || undefined,
        url: `https://www.hairinjob.com/cms/s01_v.php?idx=${key}`,
        region: (꼬리.match(/#([가-힣]+\s+[가-힣]+[시군구])/) || [])[1] || undefined,
      });
    }
    if (!이번쪽) break;   // 더 없는 쪽이면 그만
  }
  return out;
}

/** 셀렉미 — 낱말 없이 열면 목록이 안 실려 온다(브라우저가 나중에 불러온다).
 *  그래서 뷰티 낱말 몇 개로 나눠 찾아 합친다. 어차피 우리가 담을 것은 그 낱말들이다. */
const 셀렉미낱말 = ["헤어", "네일", "피부", "속눈썹", "왁싱", "메이크업", "두피", "스파"];
async function 셀렉미목록(): Promise<목록줄[]> {
  const { extractRecruits } = await import("./selectme");
  const out: 목록줄[] = [];
  const seen = new Set<number>();
  for (const w of 셀렉미낱말) {
    let html = "";
    try {
      html = await 받기(`https://www.selectme.co.kr/recruit?keyword=${encodeURIComponent(w)}&start=0&perPage=50&order=DESC&sort=accuracy`);
    } catch { continue; }
    for (const r of extractRecruits(html)) {
      // status 가 진행중인 것만 담는다. 마감은 목록에서 뺀다.
      if (r.status && r.status !== "ing") continue;
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push({
        source: "selectme", key: String(r.id), title: r.title || r.shopName,
        company: r.shopName || undefined,
        url: `https://www.selectme.co.kr/recruit/${r.id}`,
      });
    }
  }
  return out;
}

/** 고용24 — 공개 검색 목록. 주소에 조건을 붙여도 안 먹으니(필터가 로그인 세션에
 *  매여 있다) 최신순을 그대로 받아 우리 쪽에서 거른다. */
async function 고용24목록(쪽수 = 2): Promise<목록줄[]> {
  const out: 목록줄[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= 쪽수; page++) {
    let html = "";
    try {
      html = await 받기(`https://www.work24.go.kr/wk/a/b/1200/retriveDtlEmpSrchList.do?resultCnt=100&pageIndex=${page}`);
    } catch { break; }
    for (const m of html.matchAll(/wantedAuthNo=([A-Z0-9]{10,})[^>]*>([\s\S]{0,300}?)<\/a>/g)) {
      const key = m[1];
      if (seen.has(key)) continue;
      const 제목 = 태그없이(m[2]);
      if (!제목) continue;
      seen.add(key);
      out.push({
        source: "work24", key, title: 제목.slice(0, 200),
        url: `https://www.work24.go.kr/wk/a/b/1500/empDetailAuthView.do?wantedAuthNo=${key}&infoTypeCd=VALIDATION&infoTypeGroup=tb_workinfoworknet`,
      });
    }
  }
  return out;
}

export async function 목록받기(source: 소스): Promise<목록줄[]> {
  if (source === "hairinjob") return 헤어인잡목록();
  if (source === "selectme") return 셀렉미목록();
  return 고용24목록();
}

/** 상세 한 건 받기. 파서가 읽을 수 있게 원문 HTML 을 돌려준다. */
export async function 상세받기(source: 소스, url: string): Promise<string> {
  return 받기(url, source === "hairinjob");
}
