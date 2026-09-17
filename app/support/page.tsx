"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import InfoHeader from "@/components/InfoHeader";
import InfoSide from "@/components/InfoSide";
import InquiryModal from "@/components/support/InquiryModal";

/**
 * 1:1 문의.
 *
 * 묻는 길만 둔다. 공지·FAQ·다운로드는 옆줄이 맡으므로 여기서 또 세우지 않는다 —
 * 예전에는 이 화면 아래에 공지 네 줄과 FAQ 바로가기가 같이 있었는데, 옆줄이
 * 생기면서 같은 곳으로 가는 문이 둘이 됐다.
 *
 * 옆줄의 「1:1 문의」는 ?문의=1 로 들어온다. 카드를 한 번 더 누르게 하지 않고
 * 바로 문의 창을 연다.
 */
function 속() {
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const 바로문의 = useSearchParams().get("문의") === "1";
  useEffect(() => { if (바로문의) setInquiryOpen(true); }, [바로문의]);

  return (
    <div className="info-page">
      <InfoHeader />
      <main className="info-main">
        <div className="info-layout">
          <InfoSide active="/support?문의=1" />
          <div className="info-body">
            <h1 className="info-page-title">1:1 문의</h1>

            <div className="support-cards">
              {[
                { icon: "💬", title: "1:1 문의", desc: "접수 후 1~2일 내 답변", action: "문의하기",
                  onClick: () => setInquiryOpen(true) },
                { icon: "📧", title: "이메일 문의", desc: "support@beautywork.co.kr", action: "메일 보내기",
                  onClick: () => { window.location.href = "mailto:support@beautywork.co.kr"; } },
              ].map((c) => (
                <div key={c.title} className="support-card">
                  <span className="support-card-icon">{c.icon}</span>
                  <h3>{c.title}</h3>
                  <p>{c.desc}</p>
                  <button className="support-card-btn" onClick={c.onClick}>{c.action}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <InquiryModal isOpen={inquiryOpen} onClose={() => setInquiryOpen(false)} />
    </div>
  );
}

export default function SupportPage() {
  return <Suspense fallback={null}><속 /></Suspense>;
}
