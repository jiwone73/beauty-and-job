"use client";
import { useState } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { setLoginPersistence } from "@/lib/auth/session";
import { useBookmarkStore } from "@/lib/store/bookmarkStore";
import { useApplicationStore } from "@/lib/store/applicationStore";
import { useProfileStore } from "@/lib/store/profileStore";
import { useSignupStore } from "@/lib/store/signupStore";

// 알바가 테스트할 때 쓰는 계정. 이메일 번호로 어느 상품인지 알 수 있다.
//
// 번호 구간은 상품 네 단계로 균등분할한 것이고, 나머지는 스타트 쪽에 더했다.
// DB(companies.plan)에도 이 구간대로 들어가 있다. 구간을 바꾸면 DB 와 같이 바꿔야 한다.
//
// 맨 위 「비회원으로 접속하기」는 메인 사이트의 로그인만 지우고(알바 로그인은 그대로) 채용공고 목록을
// 새 탭에 연다. 비회원은 상품과 상관없는 방문객이라 줄은 하나다.
//
// 「접속하기」는 알바 로그인을 유지한 채 새 탭에서 그 테스트 계정으로 메인 사이트에 로그인한다
// (서버: /api/admin/alba/test-login — 테스트 계정에만 열린다). 근무 시간은 알바 로그인 기준이라
// 메인 사이트에서 테스트하는 동안에도 계속 쌓인다.
type 구간 = { 상품: string; 처음: number; 끝: number };
type 줄타입 = { 구분: string; 접두: string; 처음: number; 끝: number; 상품: string };

const 기업매장: 구간[] = [
  { 상품: "스타트", 처음: 1, 끝: 25 },
  { 상품: "라이트", 처음: 26, 끝: 50 },
  { 상품: "스탠다드", 처음: 51, 끝: 75 },
  { 상품: "프리미엄", 처음: 76, 끝: 100 },
];
const 기업오피스: 구간[] = [
  { 상품: "스타트", 처음: 1, 끝: 14 },
  { 상품: "라이트", 처음: 15, 끝: 26 },
  { 상품: "스탠다드", 처음: 27, 끝: 38 },
  { 상품: "프리미엄", 처음: 39, 끝: 50 },
];

const 번호 = (n: number) => String(n).padStart(2, "0");
const 아이디 = (접두: string, n: number) => `btwk2026+${접두}${번호(n)}`;
// 표에는 번호만 적는다 — 앞(btwk2026+)과 뒤(@gmail.com)는 모두 같아서 적으면 칸만 길어진다.
const 짧게 = (접두: string, n: number) => `${접두}${번호(n)}`;

const 줄들: 줄타입[] = [
  ...기업매장.map((g) => ({ 구분: "기업회원 · 매장", 접두: "st", ...g })),
  ...기업오피스.map((g) => ({ 구분: "기업회원 · 오피스", 접두: "of", ...g })),
  { 구분: "개인회원 · 매장", 접두: "us", 처음: 1, 끝: 100, 상품: "—" },
  { 구분: "개인회원 · 오피스", 접두: "uo", 처음: 1, 끝: 50, 상품: "—" },
];

export default function TestAccountTable() {
  const login = useAuthStore((s) => s.login);
  const [고른번호, set고른번호] = useState<Record<string, number>>({});
  const [하는중, set하는중] = useState<string | null>(null);
  const [오류, set오류] = useState("");

  const 접속하기 = async (r: 줄타입, key: string, n: number) => {
    set오류("");
    set하는중(key);
    // 클릭 직후에 탭을 먼저 연다 — 응답을 기다린 뒤에 열면 팝업 차단에 걸린다.
    const 새탭 = window.open("", "_blank");
    try {
      const res = await fetch("/api/admin/alba/test-login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("admin_token") || ""}` },
        body: JSON.stringify({ email: `${아이디(r.접두, n)}@gmail.com` }),
      });
      const d = await res.json();
      if (!d.success) { 새탭?.close(); set오류(d.error?.message || "들어가지 못했어요."); return; }
      localStorage.setItem("access_token", d.data.access_token);
      setLoginPersistence(true);
      if (d.data.kind === "company") {
        login({ ownerType: "company", userName: d.data.company.company_name, userPhone: d.data.company.phone || "" });
      } else {
        const u = d.data.user;
        login({ ownerType: "user", userName: u.name, userPhone: u.phone, userJobType: u.job_type || "", userJobAreas: u.office_job_areas || [] });
      }
      const 주소 = d.data.kind === "company" ? "/company/dashboard" : "/profile";
      if (새탭) 새탭.location.href = 주소; else window.location.href = 주소;
    } catch {
      새탭?.close();
      set오류("네트워크 오류가 났어요.");
    } finally {
      set하는중(null);
    }
  };

  // 비회원은 방문객이라 상품과 상관없다 — 줄 하나. 메인 사이트 로그인만 지우고 알바 로그인(admin_token)은
  // 건드리지 않아 근무 시간이 계속 쌓인다. 열리는 곳은 비회원에게 게이트가 걸린 채용공고 목록이다
  // (스타트는 목록에서 빠지고 라이트부터 뜬다) — 위 상품 계정의 회사 이름으로 검색해 확인한다.
  const 비회원으로 = () => {
    const 새탭 = window.open("", "_blank");
    try {
      localStorage.removeItem("access_token");
      useSignupStore.getState().reset();
      useProfileStore.getState().reset();
      useBookmarkStore.getState().reset();
      useApplicationStore.getState().reset();
      useAuthStore.getState().logout();
    } catch { /* 저장소가 막혀도 탭은 연다 */ }
    if (새탭) 새탭.location.href = "/jobs"; else window.location.href = "/jobs";
  };

  return (
    // 표가 아니라 줄 목록이다 — 관리자 화면은 왼쪽 메뉴가 폭을 많이 먹는 좁은 창에서도 보는데,
    // 표로 두면 오른쪽 「접속하기」 버튼이 가로 스크롤 밖으로 밀려 안 보였다. 칸이 모자라면 줄이 접힌다.
    <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, marginBottom: 24 }}>
      <p style={{ margin: 0, padding: "10px 14px", fontSize: 12, color: "#555", borderBottom: "1px solid #f2f2f2" }}>
        ID는 btwk2026+●●@gmail.com 의 ●● 자리입니다. 번호를 고르고 「접속하기」를 누르면 새 탭에서 그 계정으로 로그인됩니다. 맨 위 「비회원으로 접속하기」는 로그인을 풀고 채용공고 목록을 새 탭에서 엽니다.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 14px", padding: "10px 14px", fontSize: 13 }}>
        <div style={{ flex: "1 1 170px", minWidth: 0 }}>
          <span style={{ color: "#555" }}>비회원</span>
          <span style={{ color: "#555", marginLeft: 8 }}>로그인 없는 방문객</span>
        </div>
        <button
          type="button" onClick={비회원으로}
          style={{ fontSize: 12, padding: "5px 12px", borderRadius: 6, border: "1px solid #582681", background: "#fff", color: "#582681", cursor: "pointer" }}
        >
          비회원으로 접속하기
        </button>
      </div>
      {줄들.map((r, i) => {
        const key = `${r.접두}-${r.처음}`;
        const n = 고른번호[key] ?? r.처음;
        return (
          <div key={i} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 14px", padding: "10px 14px", borderTop: "1px solid #f2f2f2", fontSize: 13 }}>
            <div style={{ flex: "1 1 170px", minWidth: 0 }}>
              <span style={{ color: "#555" }}>{r.구분}</span>
              {r.상품 !== "—" && <span style={{ color: "#582681", marginLeft: 8 }}>{r.상품}</span>}
            </div>
            <div style={{ flex: "0 0 auto", color: "#555", whiteSpace: "nowrap" }}>{짧게(r.접두, r.처음)} ~ {짧게(r.접두, r.끝)}</div>
            <div style={{ flex: "0 0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
              <input
                type="number" min={r.처음} max={r.끝} value={n}
                onChange={(e) => set고른번호((p) => ({ ...p, [key]: Math.min(r.끝, Math.max(r.처음, Number(e.target.value) || r.처음)) }))}
                aria-label={`${r.구분} ${r.상품} 번호`}
                style={{ width: 52, padding: "4px 6px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 }}
              />
              <button
                type="button" disabled={하는중 === key} onClick={() => 접속하기(r, key, n)}
                style={{ fontSize: 12, padding: "5px 12px", borderRadius: 6, border: "1px solid #582681", background: "#fff", color: "#582681", cursor: "pointer" }}
              >
                {하는중 === key ? "여는 중…" : "접속하기"}
              </button>
            </div>
          </div>
        );
      })}
      {오류 && <p style={{ margin: 0, padding: "8px 14px", fontSize: 12, color: "#e74c3c" }}>{오류}</p>}
    </div>
  );
}
