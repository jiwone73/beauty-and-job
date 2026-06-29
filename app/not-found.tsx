"use client";
import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      background: "#fafafa",
    }}>
      <div style={{
        fontSize: "120px",
        fontWeight: 800,
        color: "#5f0080",
        lineHeight: 1,
        marginBottom: "16px",
      }}>
        404
      </div>
      <h1 style={{
        fontSize: "24px",
        fontWeight: 700,
        color: "#1a1a1a",
        marginBottom: "12px",
        textAlign: "center",
      }}>
        페이지를 찾을 수 없어요
      </h1>
      <p style={{
        fontSize: "15px",
        color: "#666",
        textAlign: "center",
        marginBottom: "32px",
        lineHeight: 1.6,
        maxWidth: "400px",
      }}>
        요청하신 페이지가 사라졌거나 주소가 잘못된 것 같아요.<br />
        뷰티워크에서 멋진 커리어를 찾아보세요!
      </p>
      <div style={{
        display: "flex",
        gap: "12px",
        flexWrap: "wrap",
        justifyContent: "center",
      }}>
        <Link href="/" style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "12px 24px",
          background: "#5f0080",
          color: "#fff",
          borderRadius: "10px",
          fontSize: "14px",
          fontWeight: 600,
          textDecoration: "none",
        }}>
          <Home size={16} />
          메인으로
        </Link>
        <Link href="/jobs" style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "12px 24px",
          background: "#fff",
          color: "#5f0080",
          border: "1.5px solid #5f0080",
          borderRadius: "10px",
          fontSize: "14px",
          fontWeight: 600,
          textDecoration: "none",
        }}>
          <Search size={16} />
          채용공고 보기
        </Link>
      </div>
    </div>
  );
}