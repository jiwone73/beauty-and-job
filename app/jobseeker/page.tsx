"use client";
import Link from "next/link";
import Image from "next/image";
import { TrendingUp, Sparkles, MessageCircle } from "lucide-react";

const BENEFITS = [
  { icon: TrendingUp, bg: "#f1e6f9", color: "#5f0080", title: "기업 검색 상단 노출", desc: "기업이 인재를 찾을 때 내 이력서가 맨 위에 보여요" },
  { icon: Sparkles, bg: "#f1e6f9", color: "#5f0080", title: "맞춤형 채용 추천", desc: "사무직·매장직, 내 조건에 맞는 공고를 골라드려요" },
  { icon: MessageCircle, bg: "#fbe6f0", color: "#d0408a", title: "기업이 먼저 연락", desc: "등록해두면 매장·기업이 직접 제안해와요" },
];

export default function JobSeekerPage() {
  return (
    <main style={{ background: "#fff" }}>
      <header style={{ borderBottom: "1px solid #eee", padding: "16px 20px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Link href="/">
            <Image src="/images/logo.png" alt="뷰티워크" width={140} height={40} priority />
          </Link>
        </div>
      </header>
      <section style={{ background: "#f3e9fa", padding: "56px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <span style={{ display: "inline-block", background: "#5f0080", color: "#fff", fontSize: 13, fontWeight: 600, padding: "6px 16px", borderRadius: 100, marginBottom: 20 }}>
            오픈 기념 이벤트 · ~12/31
          </span>
          <h1 className="js-hero-title">
            사무직·매장직 맞춤 채용,<br /><span className="co-hero-point">뷰티워크</span>에서 시작하세요
          </h1>
          <p className="js-hero-sub">
            이벤트 기간 동안 내 이력서를 기업 검색 상단에<br />맞춤 추천까지 더해 채용 확률을 높여보세요
          </p>
        </div>
      </section>

      <section style={{ padding: "52px 20px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: 24, fontWeight: 800, color: "#1a1a1a", margin: "0 0 36px" }}>이벤트 기간, 이런 혜택을 드려요</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {BENEFITS.map((b, i) => {
              const Icon = b.icon;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: 20, border: "1px solid #efe5f7", borderRadius: 14 }}>
                  <div style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 12, background: b.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={24} color={b.color} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px" }}>{b.title}</h3>
                    <p style={{ fontSize: 13.5, color: "#888", lineHeight: 1.6, margin: 0 }}>{b.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: "center", marginTop: 40 }}>
            <Link href="/login" style={{ display: "inline-block", background: "#5f0080", color: "#fff", fontSize: 17, fontWeight: 700, padding: "15px 44px", borderRadius: 12, textDecoration: "none" }}>
              무료 이력서 등록하기 ›
            </Link>
            <p style={{ fontSize: 12.5, color: "#999", margin: "14px 0 0" }}>1분이면 끝 · 가입비 0원 · 이벤트 종료 후 일반 노출로 전환</p>
          </div>
        </div>
      </section>
    </main>
  );
}
