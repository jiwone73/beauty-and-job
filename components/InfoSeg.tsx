"use client";

/**
 * 고객센터 안에서 갈래를 고르는 줄 — 개인회원 / 기업회원.
 *
 * 칩(알약 단추)이던 것을 판 너비를 나눠 쓰는 탭으로 바꾼다. 칩은 둘이 나란히
 * 왼쪽에 몰려 있어 「고르는 자리」보다 「딱지」로 읽혔다. 탭은 고른 쪽이 흰 판이
 * 되어 아래 내용과 이어 붙으므로, 지금 보고 있는 것이 어느 쪽인지가 눈에 걸린다.
 */
export default function InfoSeg<T extends string>({ 값, 목록, 고르기 }: {
  /** 지금 켜진 갈래 */
  값: T;
  /** [갈래, 보일 이름] 짝. 둘이든 셋이든 판을 고르게 나눈다. */
  목록: readonly (readonly [T, string])[];
  고르기: (v: T) => void;
}) {
  return (
    <div className="info-seg" role="tablist">
      {목록.map(([키, 이름]) => (
        <button key={키} type="button" role="tab" aria-selected={값 === 키}
                className={값 === 키 ? "on" : undefined}
                onClick={() => 고르기(키)}>
          {이름}
        </button>
      ))}
    </div>
  );
}
