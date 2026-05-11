"use client";
import Link from "next/link";
import Image from "next/image";
export default function PrivacyPage() {
  return (
    <div className="info-page">
      <header className="info-header">
        <Link href="/"><Image src="/images/logo.png" alt="뷰티앤잡" width={120} height={30} priority /></Link>
      </header>
      <div className="info-nav">
        <Link href="/support" className="info-nav-item">고객센터</Link>
        <Link href="/support/faq" className="info-nav-item">자주 묻는 질문</Link>
        <Link href="/support/terms" className="info-nav-item">이용약관</Link>
        <Link href="/support/privacy" className="info-nav-item active">개인정보처리방침</Link>
      </div>
      <main className="info-main">
        <div className="info-hero">
          <h1 className="info-hero-title">개인정보처리방침</h1>
          <p className="info-hero-desc">시행일: 2025년 1월 1일</p>
        </div>
        <div className="info-section">
          <div className="terms-content">
            <h3>1. 수집하는 개인정보 항목</h3>
            <p>회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다: 필수항목 - 이름, 휴대폰번호, 이메일주소. 선택항목 - 생년월일, 성별, 직군, 경력, 이력서 정보.</p>
            <h3>2. 개인정보 수집 및 이용목적</h3>
            <p>회원 가입 및 관리, 채용 서비스 제공, 맞춤형 채용공고 추천, 뉴스레터 발송(동의자에 한함), 고객 문의 응대.</p>
            <h3>3. 개인정보 보유 및 이용기간</h3>
            <p>회원 탈퇴 시까지 보유합니다. 단, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관합니다.</p>
            <h3>4. 개인정보 제3자 제공</h3>
            <p>회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 단, 이용자가 채용공고에 지원하는 경우 해당 기업에 이력서 정보가 제공됩니다.</p>
            <h3>5. 개인정보 처리 위탁</h3>
            <p>회사는 서비스 제공을 위해 필요한 경우 개인정보 처리 업무를 위탁할 수 있으며, 위탁 시 관련 법령에 따라 관리·감독합니다.</p>
            <h3>6. 이용자의 권리</h3>
            <p>이용자는 언제든지 자신의 개인정보를 조회, 수정, 삭제할 수 있습니다. 개인정보 관련 문의는 고객센터로 연락해주세요.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
