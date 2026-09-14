/** 원본 옆에 놓이는 목록용 사진의 꼬리. sharp 를 쓰는 쪽과 화면 쪽이 같이 보는
 *  값이라 여기 둔다 — imageShrink 에서 가져오면 sharp 가 화면 꾸러미로 딸려 온다. */
export const 썸네일꼬리 = "-t400.webp";

/**
 * 목록 카드가 쓸 작은 사진 주소.
 *
 * 원본과 같은 자리에 `-t400.webp` 로 놓여 있다. 칸을 따로 두지 않고 이름으로
 * 찾는 까닭은, 카드에 뜨는 사진의 출처가 넷(매장 간판·공고 배너·로고·상세
 * 사진)이라 칸을 두면 네 군데를 다 고쳐야 해서다.
 *
 * 없을 수도 있다 — 그때는 화면이 onError 로 원본으로 되돌아간다.
 */
export function thumbUrl(url?: string | null): string | null {
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  if (url.includes(썸네일꼬리)) return url;
  // 우리 저장소에 있는 것만 바꾼다. 외부 주소는 썸네일이 있을 리 없다.
  if (!url.includes("/storage/v1/object/public/")) return null;
  if (!/\.(jpe?g|png|webp|gif)(\?|$)/i.test(url)) return null;
  return url.replace(/\.(jpe?g|png|webp|gif)(\?|$)/i, 썸네일꼬리 + "$2");
}
