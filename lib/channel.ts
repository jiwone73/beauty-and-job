// 유입 채널 — 어디서 왔는지 자동으로 가른다.
//
// 일반 검색·SNS는 referrer 도메인만 보고 채널을 정한다. 광고·이벤트·제휴·
// 문자처럼 성과를 캠페인 단위로 따로 재야 하는 링크는 UTM(utm_source)이
// 있으면 그 값이 referrer보다 앞선다 — 인스타그램에서 왔어도 광고 링크로
// 왔는지 그냥 게시물 보고 왔는지는 referrer만으로 못 가른다.
import pool from "@/lib/db";

const UTM_라벨: Record<string, string> = {
  instagram: "인스타그램 광고",
  naver: "네이버 광고",
  google: "구글 광고",
  kakao: "카카오톡",
  sms: "문자(SMS)",
  partner: "제휴",
  event: "이벤트",
};

/** referrer가 없거나(직접 방문) 우리 사이트 자체거나 파싱이 안 되면 채널을 못 가른다. */
function referrer로채널구하기(referrer: string | null | undefined, selfHost: string | null | undefined): string {
  if (!referrer) return "직접 방문";
  let host = "";
  try {
    host = new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return "기타";
  }
  if (selfHost && host === selfHost) return "직접 방문";
  if (host.includes("search.naver.com")) return "네이버 검색";
  if (host.includes("blog.naver.com")) return "블로그";
  if (host.endsWith("naver.com")) return "네이버";
  if (host.includes("google.")) return "구글 검색";
  if (host.includes("instagram.com")) return "인스타그램";
  if (host.includes("kakao")) return "카카오톡";
  if (host.includes("facebook.com") || host.includes("fb.com")) return "페이스북";
  if (host.includes("daum.net")) return "다음 검색";
  return "기타";
}

export type 유입정보 = {
  channel: string;
  /** 캠페인 성과를 나눠 볼 때만 쓴다 — UTM이 없으면 항상 null. */
  campaign: string | null;
};

/**
 * 방문 하나의 유입 채널을 정한다.
 *
 * utm_source가 있으면 그 값을 최우선으로 본다 — 라벨이 없는 값(새 캠페인
 * 등)도 「UTM · 원래값」으로 살려서 그냥 「기타」에 묻히지 않게 한다.
 */
export function 채널구하기(params: {
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  selfHost?: string | null;
}): 유입정보 {
  const utmSource = (params.utmSource || "").trim();
  if (utmSource) {
    const key = utmSource.toLowerCase();
    const channel = UTM_라벨[key] || `UTM · ${utmSource}`;
    return { channel, campaign: (params.utmCampaign || "").trim() || null };
  }
  return { channel: referrer로채널구하기(params.referrer, params.selfHost), campaign: null };
}

export type 가입유입정보 = { channel: string | null; campaign: string | null };

/**
 * 이 방문자(bw_vid)의 가장 이른 방문 줄에서 유입 채널을 가져온다.
 *
 * site_visits 는 방문자·날짜별로 쌓이므로, 가입 시점이 아무리 나중이어도
 * 가장 오래된 줄이 진짜 첫 유입이다. 쿠키가 없거나 기록이 없으면 둘 다 null.
 */
export async function 가입채널조회(vid: string | null | undefined): Promise<가입유입정보> {
  if (!vid) return { channel: null, campaign: null };
  try {
    const { rows } = await pool.query(
      `SELECT channel, utm_campaign FROM site_visits
        WHERE visitor_key = $1
        ORDER BY visit_date ASC LIMIT 1`,
      [vid]
    );
    if (!rows[0]) return { channel: null, campaign: null };
    return { channel: rows[0].channel ?? null, campaign: rows[0].utm_campaign ?? null };
  } catch {
    return { channel: null, campaign: null };
  }
}
