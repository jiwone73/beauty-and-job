"use client";
import Link from "next/link";
import { Download } from "lucide-react";
import ServiceHeader from "@/components/company/ServiceHeader";
import InfoSide from "@/components/InfoSide";

/** 내려받을 것 — 지금은 이력서 빈 양식 하나뿐이다. 늘면 여기 줄을 더한다. */
export default function DownloadPage() {
  return (
    <div className="info-page">
      <ServiceHeader />
      <main className="info-main">
        <div className="info-layout">
          <InfoSide active="/support/download" />
          <div className="info-body">
            <h1 className="info-page-title">다운로드</h1>
            <a className="sup-file" href="/files/뷰티워크-이력서-양식.pdf" download>
              <Download size={20} />
              <span className="sup-file-t">
                <b>미용 이력서 양식 내려받기</b>
                손으로 쓰거나 인쇄해 가실 분을 위한 빈 양식입니다 (PDF · A4 한 장)
              </span>
              <em>받기</em>
            </a>
            <p className="sup-file-n">
              뷰티워크에서 온라인으로 쓰시면 지원까지 한 번에 되고, 매장이 보내는 제안도 받으실 수 있습니다.{" "}
              <Link href="/profile/resume">이력서 쓰러 가기 ›</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
