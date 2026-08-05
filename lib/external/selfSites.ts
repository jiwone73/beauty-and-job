// lib/external/selfSites.ts
// 자사 홈페이지에서 직접 채용하는 브랜드 → 공식 채용 페이지 매핑.
// (브라우저로 실제 채용/지원 페이지 존재를 확인한 6곳. 확인되면 계속 추가.)
//
// 잡보드와 달리 브랜드마다 사이트 구조가 제각각이라, 공고 목록 크롤 대신
// '공식 채용 페이지' 링크 1건을 반환한다. 사용자가 그 페이지에서 공고를 보고 등록.

import type { FoundJob } from "./hairinjob";

interface SelfSite {
  name: string;   // 표시용 정식 명칭
  url: string;    // 공식 채용 페이지
  aliases: string[]; // 매칭용 별칭(공백 제거·소문자 기준)
}

const SELF_SITES: SelfSite[] = [
  { name: "준오헤어", url: "https://www.junohair.com/recruit", aliases: ["준오헤어", "준오", "junohair"] },
  { name: "박승철헤어스투디오", url: "https://www.pschair.co.kr/notice/employ.asp", aliases: ["박승철헤어스투디오", "박승철헤어", "박승철", "pschair"] },
  { name: "블루클럽", url: "https://blueclub.co.kr/renew/etc/recruitment.php", aliases: ["블루클럽", "blueclub"] },
  { name: "리챠드프로헤어", url: "https://www.leechstyle.com/bbs/resume2.php", aliases: ["리챠드프로헤어", "리챠드", "리차드", "leechard", "leechstyle"] },
  { name: "차홍아르더/차홍룸", url: "https://chahongsalon.com/차홍아르더-채용안내/", aliases: ["차홍", "차홍룸", "차홍아르더", "chahong"] },
  { name: "순수", url: "https://soonsoofamily.com/board/free/list.html?board_no=3001", aliases: ["순수", "순수헤어", "순수청담", "soonsoo"] },
];

const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();

// 회사명이 자사 채용 사이트를 가진 브랜드인지 확인해 공식 채용 페이지를 반환.
export function findSelfSites(company: string): FoundJob[] {
  const key = norm(company);
  if (key.length < 2) return [];
  const out: FoundJob[] = [];
  SELF_SITES.forEach((site, i) => {
    const hit = site.aliases.some((a) => {
      const an = norm(a);
      return key.includes(an) || (an.length >= 3 && an.includes(key));
    });
    if (hit) {
      out.push({
        idx: 9_000_000 + i, // 잡보드 idx와 겹치지 않는 합성 id(React key용)
        title: `${site.name} 공식 채용 페이지`,
        url: site.url,
        source: "자사홈페이지",
      });
    }
  });
  return out;
}
