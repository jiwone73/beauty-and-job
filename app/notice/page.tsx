import type { Metadata } from "next";
import NoticeListClient from "./NoticeListClient";

export const metadata: Metadata = {
  title: "공지사항 | 뷰티워크",
  description: "뷰티워크의 서비스 점검·약관·정책 변경 등 공지사항을 확인하세요.",
  alternates: { canonical: "/notice" },
};

export default function NoticePage() {
  return <NoticeListClient />;
}
