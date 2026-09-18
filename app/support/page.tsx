"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import InfoShell from "@/components/InfoShell";
import InquiryModal from "@/components/support/InquiryModal";

/**
 * 1:1 문의.
 *
 * 묻는 길만 둔다. 공지·FAQ·다운로드는 옆줄이 맡으므로 여기서 또 세우지 않는다.
 *
 * 옆줄의 「1:1 문의」는 ?문의=1 로 들어온다. 카드를 한 번 더 누르게 하지 않고
 * 바로 문의 창을 연다.
 */
function 판() {
  const [열림, set열림] = useState(false);
  const 바로문의 = useSearchParams().get("문의") === "1";
  useEffect(() => { if (바로문의) set열림(true); }, [바로문의]);

  return (
    <>
      <div className="support-cards">
        {[
          { icon: "💬", title: "1:1 문의", desc: "접수 후 1~2일 내 답변", action: "문의하기",
            onClick: () => set열림(true) },
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
      <InquiryModal isOpen={열림} onClose={() => set열림(false)} />
    </>
  );
}

export default function SupportPage() {
  return (
    <InfoShell active="/support" title="1:1 문의">
      <Suspense fallback={null}><판 /></Suspense>
    </InfoShell>
  );
}
