"use client";
import Link from "next/link";
import InfoShell from "@/components/InfoShell";

export default function SupportInfoPage() {
  return (
    <InfoShell active="/support/info" title="고객센터 안내">
      <div className="info-section">
        <dl className="pol-list">
          <div>
            <dt>운영시간</dt>
            <dd>평일 10:00~18:00 (주말·공휴일 휴무)</dd>
          </div>
          <div>
            <dt>이메일</dt>
            <dd>support@beautywork.co.kr</dd>
          </div>
        </dl>
        <div className="pol-cs">
          <b>1:1 문의</b>
          <span>궁금한 점을 1:1 게시판에 남겨 주세요.</span>
          <Link href="/support" className="pol-cs-btn">1:1 문의하기</Link>
        </div>
      </div>
    </InfoShell>
  );
}
