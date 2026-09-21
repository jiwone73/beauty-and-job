"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, FileText, Search, Users, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import ResumeCta from "@/components/ResumeCta";

/**
 * 시작하기 — 처음 온 사람에게 「이용 전 알아둬야 할 것」을 지도로 보여준다.
 *
 * 한때 이런 STEP 요약이 「사용가이드」라는 이름으로 FAQ 옆에 있었는데,
 * 결국 FAQ 질문·답으로 다 흡수되어 없앤 이력이 있다(app/support/faq/page.tsx
 * 주석 참고). 같은 것을 또 만들지 않으려고, 여기는 설명을 새로 쓰지 않는다 —
 * 각 단계를 한두 줄로만 짚고, 더 자세한 것은 그 내용을 담당하는 FAQ로
 * 보낸다. 대신 「지금 할 일」이 뚜렷한 단계(이력서 작성·공고 등록)에는
 * 그 자리에서 바로 시작할 수 있는 단추를 심어 둔다 — 버튼만 따로 떼어
 * 놓으면 무엇 때문에 누르는 버튼인지 앞뒤 맥락이 없어 어색하다.
 */

function 기업공고버튼() {
  const router = useRouter();
  const { isLoggedIn, ownerType } = useAuthStore();
  return (
    <button type="button" className="ev-step-go"
      onClick={() => router.push(
        isLoggedIn && ownerType === "company" ? "/company/dashboard/jobs/new" : "/company"
      )}>
      채용공고 등록하기 ›
    </button>
  );
}

const 개인단계 = [
  {
    Icon: UserPlus, 머리: "회원가입을 해요",
    글: "이메일 또는 카카오·네이버로 간편하게 가입할 수 있어요.",
    버튼: <Link href="/login" className="ev-step-go">회원가입하기 ›</Link>,
  },
  {
    Icon: FileText, 머리: "이력서를 빠짐없이 채워요",
    글: "사진·경력·자기소개까지 채워야 지원도 되고, 인재검색에도 노출돼요. 사진이 부담되면 비공개로 둘 수 있어요.",
    버튼: <ResumeCta className="ev-step-go">이력서 등록하기 ›</ResumeCta>,
  },
  {
    Icon: Search, 머리: "지원하거나, 제안을 기다려요",
    글: "매장·오피스 공고에 직접 지원하거나, 이력서를 등록해두면 기업에서 먼저 제안을 보내기도 해요.",
    버튼: <Link href="/jobs" className="ev-step-go">채용공고 보러가기 ›</Link>,
    더보기: "/support/faq?누구=개인",
  },
  {
    Icon: CheckCircle2, 머리: "지금은 모두 무료예요",
    글: "이용료가 필요해지면 최소 30일 전에 미리 공지로 알려드려요.",
    더보기: "/notice",
  },
];

const 기업단계 = [
  {
    Icon: UserPlus, 머리: "기업회원으로 가입해요",
    글: "사업자 정보만 있으면 매장이든 오피스든 가입할 수 있어요.",
    버튼: <Link href="/company" className="ev-step-go">서비스 소개 보기 ›</Link>,
  },
  {
    Icon: FileText, 머리: "채용공고를 등록해요",
    글: "직군과 근무지를 고르고 등록하면 바로 노출돼요. 건수 제한은 없어요.",
    버튼: <기업공고버튼 />,
  },
  {
    Icon: Users, 머리: "지원자를 확인하거나, 먼저 제안해요",
    글: "등록한 공고에 지원한 분의 이력서를 보거나, 인재검색에서 마음에 드는 분께 먼저 제안을 보낼 수 있어요.",
    더보기: "/support/faq?누구=기업",
  },
  {
    Icon: CheckCircle2, 머리: "지금은 오픈 이벤트로 모두 무료예요",
    글: "채용공고 등록·상단노출이 무제한 무료이고, 유료로 바뀌면 최소 30일 전에 알려드려요.",
    더보기: "/notice",
  },
];

export default function StartGuide({ 누구 }: { 누구: "개인" | "기업" }) {
  const 단계 = 누구 === "기업" ? 기업단계 : 개인단계;
  return (
    <div className="ev">
      <p className="ev-sub" style={{ marginBottom: 32 }}>
        {누구 === "기업"
          ? "뷰티워크에서 채용공고를 올리고 인재를 만나는 순서예요."
          : "뷰티워크에서 이력서를 등록하고 일자리를 찾는 순서예요."}
      </p>
      <section className="ev-sec" style={{ marginTop: 0 }}>
        <div className="ev-steps">
          {단계.map(({ Icon, 머리, 글, 버튼, 더보기 }, i) => (
            <div key={머리} className="ev-step">
              <span className="ev-step-ic"><Icon size={26} strokeWidth={1.7} /></span>
              <div>
                <span className="ev-step-no">STEP {String(i + 1).padStart(2, "0")}</span>
                <b>{머리}</b>
                <p>{글}</p>
                {버튼}
                {더보기 && <Link href={더보기} className="ev-step-more">자세히 보기 ›</Link>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
