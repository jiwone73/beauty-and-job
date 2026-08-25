"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CompanyLayout from "@/components/company/CompanyLayout";
import { companyMeApi } from "@/lib/api/company";

// 회원 탈퇴 — 개인회원(app/profile/settings/withdraw)과 같은 이유로 모달이
// 아니라 한 페이지로 둔다. 되돌릴 수 없는 일인데 모달은 바깥을 누르면 닫히고,
// 읽을 것이 많으면 안에서 또 스크롤해야 한다("탈퇴하기 페이지 이거 아니었던거
// 같은데, 개인회원거 찾아봐바" — 실제로 그쪽만 페이지였고 기업/매장은
// 안내 한 줄짜리 모달이었다).
export default function CompanyWithdrawPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [isOffice, setIsOffice] = useState(false);
  const [pw, setPw] = useState("");
  const [agree, setAgree] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    companyMeApi.get().then((res) => {
      if (res.success && res.data) {
        setEmail(res.data.email ?? null);
        setName(res.data.company_name ?? null);
        setIsOffice((res.data as any).company_type === "OFFICE");
      }
    }).catch(() => {});
  }, []);

  const handleWithdraw = async () => {
    if (!pw) { alert("비밀번호를 입력해주세요."); return; }
    setWorking(true);
    try {
      const res = await companyMeApi.withdraw(pw);
      if (!res.success) {
        alert((res as any).error?.message || "탈퇴에 실패했습니다.");
        setWorking(false);
        return;
      }
      alert("탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.");
      localStorage.removeItem("access_token");
      localStorage.removeItem("beautynjob-auth");
      window.location.href = "/";
    } catch {
      alert("탈퇴 중 오류가 발생했습니다.");
      setWorking(false);
    }
  };

  const 갈수있나 = agree && pw.length > 0 && !working;
  const 매장기업 = isOffice ? "기업" : "매장";

  return (
    <CompanyLayout activePage="settings">
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 0 32px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>회원 탈퇴</h1>

        <section style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "16px 16px", marginBottom: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", margin: "0 0 4px" }}>
            지금까지 뷰티워크를 이용해 주셔서 감사합니다.
          </p>
          <p style={{ fontSize: 13, color: "#666", margin: "0 0 14px" }}>
            탈퇴하기 전 아래 유의사항을 확인해 주세요.
          </p>
          <ul style={{ margin: 0, padding: "14px 14px", listStyle: "none", background: "#f7f8fa", borderRadius: 8, fontSize: 13, color: "#444", lineHeight: 1.7 }}>
            <li style={{ marginBottom: 8 }}>
              · 탈퇴한 계정은 <b>복구할 수 없으며</b>, 같은 이메일로 <b style={{ color: "#d13b2e" }}>다시 가입할 수 없습니다.</b>
            </li>
            <li style={{ marginBottom: 8 }}>
              · 등록한 채용공고가 <b>모두 비활성화</b>되어 더 이상 노출되지 않으며, 되돌릴 수 없습니다.
            </li>
            <li style={{ marginBottom: 8 }}>
              · 받은 지원 내역과 스크랩한 인재 정보를 더 이상 볼 수 없습니다.
            </li>
            <li>
              · {매장기업} 정보(로고·소개·주소 등)와 담당자 정보가 함께 삭제됩니다.
            </li>
          </ul>
        </section>

        <section style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "16px 16px", marginBottom: 10 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 6 }}>
              탈퇴하려는 계정 <span style={{ color: "#582681", fontWeight: 400 }}>(필수)</span>
            </label>
            <div style={{ background: "#f7f8fa", borderRadius: 8, padding: "12px 14px", fontSize: 14, color: "#333", minHeight: 20, overflowWrap: "anywhere" }}>
              {name && email ? `${name} · ${email}` : (email || name || " ")}
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 6 }}>
              비밀번호 확인 <span style={{ color: "#582681", fontWeight: 400 }}>(필수)</span>
            </label>
            <input type="password" placeholder="비밀번호 입력" value={pw}
              onChange={(e) => setPw(e.target.value)}
              style={{ width: "100%", height: 44, padding: "0 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box" }} />
          </div>
        </section>

        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", padding: "2px 4px 14px" }}>
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)}
            style={{ width: 17, height: 17, marginTop: 1, accentColor: "#582681", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>
            유의사항을 모두 확인했으며, 이에 동의합니다.
          </span>
        </label>

        <button onClick={handleWithdraw} disabled={!갈수있나}
          style={{ width: "100%", height: 48, borderRadius: 8, border: "none",
            background: 갈수있나 ? "#e74c3c" : "#eee", color: 갈수있나 ? "#fff" : "#aaa",
            fontSize: 15, fontWeight: 600, cursor: 갈수있나 ? "pointer" : "not-allowed" }}>
          {working ? "처리 중..." : "탈퇴하기"}
        </button>
        <button onClick={() => router.back()} disabled={working}
          style={{ width: "100%", marginTop: 8, padding: "10px 0", border: "none", background: "transparent", color: "#888", fontSize: 13.5, cursor: "pointer" }}>
          취소
        </button>

        <p style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6, margin: "18px 0 0", textAlign: "center" }}>
          개인정보의 보관과 파기는{" "}
          <Link href="/support/privacy" style={{ color: "#888", textDecoration: "underline" }}>개인정보 처리방침</Link>
          을 따릅니다.
        </p>
      </div>
    </CompanyLayout>
  );
}
