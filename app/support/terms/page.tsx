"use client";
import Link from "next/link";
import Image from "next/image";
export default function TermsPage() {
  return (
    <div className="info-page">
      <header className="info-header">
        <Link href="/"><Image src="/images/logo.png" alt="뷰티앤잡" width={120} height={30} priority /></Link>
      </header>
      <div className="info-nav">
        <Link href="/support" className="info-nav-item">고객센터</Link>
        <Link href="/support/faq" className="info-nav-item">자주 묻는 질문</Link>
        <Link href="/support/terms" className="info-nav-item active">이용약관</Link>
        <Link href="/support/privacy" className="info-nav-item">개인정보처리방침</Link>
      </div>
      <main className="info-main">
        <div className="info-hero">
          <h1 className="info-hero-title">이용약관</h1>
          <p className="info-hero-desc">시행일: 2025년 1월 1일</p>
        </div>
        <div className="info-section">
          <div className="terms-content">
            <h3>제1조 (목적)</h3>
            <p>이 약관은 (주)뷰티앤잡(이하 "회사")이 운영하는 뷰티앤잡 서비스(이하 "서비스")의 이용조건 및 절차, 회사와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>
            <h3>제2조 (정의)</h3>
            <p>"서비스"란 회사가 제공하는 뷰티 업계 채용 정보 및 커리어 관련 모든 서비스를 의미합니다. "이용자"란 이 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.</p>
            <h3>제3조 (약관의 효력 및 변경)</h3>
            <p>이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다. 회사는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 공지 후 7일 이후부터 효력이 발생합니다.</p>
            <h3>제4조 (서비스의 제공)</h3>
            <p>회사는 다음과 같은 서비스를 제공합니다: 채용공고 정보 제공, 이력서 작성 및 관리, 커리어 인사이트 콘텐츠, 기업 채용 솔루션 서비스.</p>
            <h3>제5조 (이용자의 의무)</h3>
            <p>이용자는 서비스 이용 시 타인의 정보를 도용하거나 허위 정보를 등록해서는 안 됩니다. 서비스를 통해 얻은 정보를 회사의 사전 동의 없이 복제·유통·활용해서는 안 됩니다.</p>
            <h3>제6조 (개인정보보호)</h3>
            <p>회사는 이용자의 개인정보를 보호하기 위해 개인정보처리방침을 수립하고 이를 준수합니다.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
