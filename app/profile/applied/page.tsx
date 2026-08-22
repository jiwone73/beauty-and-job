"use client";

import { useAuthStore } from "@/lib/store/authStore";
import ProfileShell from "@/components/profile/ProfileShell";
import AppliedList from "@/components/profile/AppliedList";

/** 지원현황. 프로필 화면의 탭이었는데 주소를 갖게 되면서 떼어 냈다 —
 *  새로고침해도 자리를 지키고, 알림에서 바로 걸 수 있다. */
export default function AppliedPage() {
  const { userName } = useAuthStore();
  return (
    <ProfileShell>
      <AppliedList userName={userName || ""} />
    </ProfileShell>
  );
}
