"use client";

import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* ===== 헤더 ===== */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#ececec]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/logo.png"
              alt="뷰티앤잡"
              width={120}
              height={32}
              priority
              className="h-8 w-auto"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-[#6b6b6b]">
            <Link href="/jobs" className="hover:text-primary transition-colors">
              채용공고
            </Link>
            <Link href="/companies" className="hover:text-primary transition-colors">
              기업정보
            </Link>
            <Link href="/insights" className="hover:text-primary transition-colors">
              인사이트
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/signup"
              className="text-sm text-[#6b6b6b] hover:text-primary px-3 py-2 transition-colors"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors"
            >
              회원가입
            </Link>
          </div>
        </div>
      </header>

      {/* ===== 히어로 ===== */}
      <section className="bg-gradient-to-b from-primary-pale to-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-semibold text-primary mb-4 tracking-wide">
            BEAUTY INDUSTRY CAREER PLATFORM
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1a1a1a] leading-tight mb-6 tracking-tight">
            뷰티 커리어의 시작과 성장,
            <br />
            <span className="text-primary">뷰티앤잡</span>에서
          </h1>
          <p className="text-lg text-[#6b6b6b] mb-10 leading-relaxed">
            전문가 채용부터 업계 트렌드까지,
            <br className="md:hidden" />
            뷰티 산업 종사자를 위한 단 하나의 플랫폼
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="bg-primary text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary-hover transition-all"
            >
              회원가입하고 시작하기
            </Link>
            <Link
              href="/jobs"
              className="bg-white text-[#1a1a1a] px-8 py-4 rounded-lg font-semibold border border-[#d4d4d4] hover:border-primary hover:text-primary transition-all"
            >
              채용공고 둘러보기
            </Link>
          </div>
        </div>
      </section>

      {/* ===== 핵심 가치 ===== */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#1a1a1a] mb-3 tracking-tight">
              왜 뷰티앤잡인가요?
            </h2>
            <p className="text-[#6b6b6b]">
              뷰티 산업에 특화된 커리어 플랫폼으로 시작하세요
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                emoji: "💼",
                title: "뷰티 전문 채용",
                desc: "메이크업, 스킨케어, MD까지 뷰티 산업 전 직군의 채용공고",
              },
              {
                emoji: "🤝",
                title: "맞춤형 매칭",
                desc: "경력과 직무 카테고리 기반의 정밀한 채용 매칭 시스템",
              },
              {
                emoji: "📈",
                title: "업계 인사이트",
                desc: "최신 뷰티 트렌드와 채용 동향, 연봉 정보까지 한눈에",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-[#f7f7f8] rounded-2xl p-8 hover:shadow-modal transition-all"
              >
                <div className="text-4xl mb-4">{item.emoji}</div>
                <h3 className="text-xl font-bold text-[#1a1a1a] mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-[#6b6b6b] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="bg-primary py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
            지금 바로 뷰티 커리어를 시작하세요
          </h2>
          <p className="text-primary-soft mb-8">
            1분만에 가입하고 맞춤 채용공고를 받아보세요
          </p>
          <Link
            href="/signup"
            className="inline-block bg-white text-primary px-8 py-4 rounded-lg font-semibold hover:bg-primary-pale transition-colors"
          >
            무료로 가입하기
          </Link>
        </div>
      </section>

      {/* ===== 푸터 ===== */}
      <footer className="bg-[#1a1a1a] text-[#9a9a9a] py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Image
                src="/images/logo.png"
                alt="뷰티앤잡"
                width={120}
                height={32}
                className="h-7 w-auto brightness-0 invert mb-3 opacity-80"
              />
              <p className="text-xs leading-relaxed">
                뷰티 산업 종사자를 위한
                <br />
                커리어 플랫폼
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">서비스</h4>
              <ul className="space-y-2 text-xs">
                <li>채용공고</li>
                <li>기업정보</li>
                <li>인사이트</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">회사</h4>
              <ul className="space-y-2 text-xs">
                <li>회사 소개</li>
                <li>채용</li>
                <li>제휴 문의</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">정책</h4>
              <ul className="space-y-2 text-xs">
                <li>이용약관</li>
                <li>개인정보처리방침</li>
                <li>고객센터</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#333] pt-6 text-xs">
            © 2025 Beauty&Job. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
