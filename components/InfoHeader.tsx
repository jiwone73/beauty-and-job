"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AuthButtons } from "@/components/Header";

/**
 * 고객센터 머리줄.
 *
 * 고객센터는 기업 서비스 안이 아니라 그 옆에 선 별도 화면이다. 한때 기업
 * 서비스 머리줄(오픈이벤트·상품)을 그대로 썼는데, 구직자가 메인 푸터로
 * 들어와도 상품 메뉴가 떴다. 고객센터에 상품 이야기는 없다.
 *
 * 그래서 가운데 메뉴는 두지 않고 로고와 「고객센터」만 세운다. 다만 오른쪽
 * 끝은 사이트 머리줄과 같은 것을 쓴다 — 고객센터에서 답을 찾은 사람이
 * 가입하거나 로그인할 데가 없어 뒤로 나가야 했다.
 */
export default function InfoHeader() {
  const router = useRouter();
  return (
    <header className="info-header">
      <div className="info-header-inner">
        <Link href="/" className="info-brand" aria-label="뷰티워크 홈">
          <Image src="/images/logo.png" alt="뷰티워크" width={112} height={29} priority />
        </Link>
        <span className="info-brand-bar" aria-hidden />
        <span className="info-brand-t">고객센터</span>
        <div className="header-right info-header-right">
          <AuthButtons onLoginClick={() => router.push("/login")} />
        </div>
      </div>
    </header>
  );
}
