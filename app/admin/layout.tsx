import WorkHeartbeat from "@/components/admin/WorkHeartbeat";

// /admin 아래 모든 화면을 덮는다.
// 측정기를 AdminLayout 안에 두면 그걸 쓰지 않는 화면(외부 지원 인박스 등)이 빠진다.
// 관리자 페이지에서 하는 일은 전부 근무로 세야 하므로 여기로 올린다.
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <WorkHeartbeat />
    </>
  );
}
