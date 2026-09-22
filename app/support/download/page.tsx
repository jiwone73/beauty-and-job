import type { Metadata } from "next";
import DownloadPageClient from "./DownloadPageClient";

export const metadata: Metadata = {
  title: "자료 다운로드 | 뷰티워크",
  description: "뷰티 이력서 양식 등 뷰티워크에서 받을 수 있는 자료를 확인하세요.",
  alternates: { canonical: "/support/download" },
};

export default function DownloadPage() {
  return <DownloadPageClient />;
}
