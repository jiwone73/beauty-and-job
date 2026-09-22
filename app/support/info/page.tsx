"use client";
import Link from "next/link";
import { Clock, Mail, MessageCircle } from "lucide-react";
import InfoShell from "@/components/InfoShell";

export default function SupportInfoPage() {
  return (
    <InfoShell active="/support/info" title="고객센터 안내">
      <div className="info-values cs-info-cards">
        <div className="info-value-card">
          <span className="cs-card-icon"><Clock size={26} /></span>
          <h3>운영시간</h3>
          <p>평일 10:00~18:00<br />(주말·공휴일 휴무)</p>
        </div>
        <div className="info-value-card">
          <span className="cs-card-icon"><Mail size={26} /></span>
          <h3>이메일</h3>
          <p>support@beautywork.co.kr</p>
        </div>
        <div className="info-value-card">
          <span className="cs-card-icon"><MessageCircle size={26} /></span>
          <h3>온라인 문의</h3>
          <p className="cs-card-links">
            <Link href="/about/business">사업문의</Link>
            <Link href="/support">1:1 문의</Link>
          </p>
        </div>
      </div>
    </InfoShell>
  );
}
