// /admin 아래 화면은 루트 레이아웃의 WorkHeartbeat(근무 시간 측정기)가 덮는다.
// 알바가 사이트 전체를 테스트하는 시간도 세야 해서, 측정기를 /admin 밖(루트)으로 올렸다.
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
