"use client";

import ProfileShell from "@/components/profile/ProfileShell";
import BookmarkList from "@/components/profile/BookmarkList";

/** 관심공고. 지원현황과 같은 이유로 주소를 갖는다. */
export default function BookmarksPage() {
  return (
    <ProfileShell>
      <BookmarkList />
    </ProfileShell>
  );
}
