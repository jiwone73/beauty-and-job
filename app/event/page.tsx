import type { Metadata } from "next";
import EventListClient from "./EventListClient";

export const metadata: Metadata = {
  title: "이벤트·혜택 | 뷰티워크",
  description: "뷰티워크에서 지금 받을 수 있는 이벤트와 혜택을 확인하세요.",
  alternates: { canonical: "/event" },
};

export default function EventPage() {
  return <EventListClient />;
}
