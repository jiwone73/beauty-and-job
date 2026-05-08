# 뷰티앤잡 (Beauty&Job)

뷰티 산업 종사자를 위한 채용 플랫폼 — Next.js 14 기반 풀스택 프로젝트

## 🛠 기술 스택

| 항목 | 사용 기술 |
|---|---|
| **프레임워크** | Next.js 14 (App Router) |
| **언어** | TypeScript |
| **스타일링** | Tailwind CSS |
| **상태 관리** | Zustand (영속성 포함) |
| **검증** | Zod + React Hook Form |
| **아이콘** | Lucide React |

---

## 🚀 처음 시작하시는 분을 위한 가이드

### 1단계. Node.js 설치 (한 번만 하면 됨)

#### macOS
```bash
# Homebrew가 있다면
brew install node

# 없다면 https://nodejs.org/ko 에서 LTS 버전 다운로드
```

#### Windows
1. https://nodejs.org/ko 접속
2. **LTS** 버전(왼쪽 초록 버튼) 다운로드
3. 설치 파일 실행 → 모든 옵션 기본값으로 진행

#### 설치 확인
터미널(Mac) 또는 명령 프롬프트(Windows)에서:
```bash
node -v   # v20.x.x 이상이면 OK
npm -v    # 10.x.x 이상이면 OK
```

### 2단계. 프로젝트 받기

```bash
# GitHub에서 클론
git clone https://github.com/jiwone73/beauty-and-job.git
cd beauty-and-job

# 의존성 설치 (처음 한 번만, 1~3분 소요)
npm install
```

### 3단계. 개발 서버 실행

```bash
npm run dev
```

터미널에 다음 메시지가 뜨면 성공:
```
▲ Next.js 14.2.5
- Local:        http://localhost:3000
```

브라우저에서 **http://localhost:3000** 접속!

### 4단계. 코드 수정하면 자동 반영

VS Code 등에서 파일을 수정하고 저장하면, 브라우저가 자동으로 새로고침됩니다.

---

## 📂 프로젝트 구조

```
beauty-and-job/
├── app/                          # Next.js 페이지
│   ├── page.tsx                  # 메인 페이지 (/)
│   ├── signup/page.tsx           # 회원가입 (/signup)
│   ├── layout.tsx                # 전체 레이아웃
│   └── globals.css               # 전역 스타일
│
├── components/                   # 재사용 컴포넌트
│   └── signup/                   # 회원가입 단계별
│       ├── Step1Select.tsx       # 로그인/가입 선택
│       ├── Step2Phone.tsx        # 휴대전화
│       ├── Step3Code.tsx         # 인증번호
│       ├── Step4Terms.tsx        # 약관 동의
│       ├── Step5Basic.tsx        # 기본 정보
│       ├── Step6Career.tsx       # 경력
│       ├── Step7Job.tsx          # 직군
│       ├── Step8Category.tsx     # 카테고리
│       ├── Step9Country.tsx      # 담당 국가
│       └── Step10Done.tsx        # 가입 완료
│
├── lib/
│   ├── store/signupStore.ts      # Zustand 상태 (영속성)
│   ├── validations/signup.ts     # Zod 검증 스키마
│   ├── constants.ts              # 직군/카테고리 데이터
│   └── utils.ts                  # 유틸 (cn 함수)
│
├── public/images/logo.png        # 뷰티앤잡 로고
├── package.json                  # 의존성 정보
├── tailwind.config.ts            # Tailwind 설정
├── tsconfig.json                 # TypeScript 설정
└── next.config.js                # Next.js 설정
```

---

## 🎨 디자인 시스템

### 컬러 토큰 (`tailwind.config.ts`)

```typescript
colors: {
  primary: {
    DEFAULT: "#5f0080",   // 메인 퍼플
    hover: "#4a0066",     // 진한 퍼플 (hover)
    soft: "#f3e8f7",      // 연한 퍼플 (선택 배경)
    light: "#b48dc7",     // 중간 퍼플 (테두리)
    pale: "#faf5fc",      // 가장 연한 퍼플
  },
  kakao: { DEFAULT: "#fee500" },
  warn: "#e8a317",
  error: "#d4537e",
}
```

### 사용 예시
```tsx
<button className="bg-primary hover:bg-primary-hover text-white">
  메인으로 이동
</button>
```

---

## 🔧 자주 쓰는 명령어

| 명령어 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 (localhost:3000) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm install` | 의존성 재설치 |

---

## 🎯 회원가입 플로우 (10단계)

| STEP | 화면 | 주요 기능 |
|---|---|---|
| 1 | 로그인/가입 선택 | 카카오 / 휴대전화 / 기업회원 |
| 2 | 휴대전화 번호 | 자동 포맷팅, 유효성 검증 |
| 3 | 인증번호 | 6자리, 3분 타이머, 재전송 (DEMO: `123456`) |
| 4 | 약관 동의 | 전체동의, 필수 3개 + 선택 1개 |
| 5 | 기본 정보 | 이름, 생년월일, 성별 |
| 6 | 경력 | 슬라이더 (신입~10년+), 팀리더 체크 |
| 7 | 직군 | 12개 그리드, 직접입력 가능 |
| 8 | 카테고리 | 멀티선택, "카테고리 무관" 배타 옵션, 직접입력 |
| 9 | 담당 국가 | 멀티선택, "제한 없음" 배타 옵션, 직접입력 |
| 10 | 가입 완료 | 환영 메시지 + 정보 요약 |

---

## 🧪 테스트 시나리오

```
1. http://localhost:3000 접속
2. 헤더 "회원가입" 클릭
3. "휴대전화 번호로 계속하기" 선택
4. 010 으로 시작하는 11자리 번호 입력 (예: 01012345678)
5. "인증" 클릭
6. 인증번호 입력: 123456
7. 약관 전체 동의 → 다음
8. 이름 + 생년월일(8자리) + 성별 → 다음
9. 경력 슬라이더 조정 → 다음
10. 직군 선택 → 다음
11. 카테고리 멀티 선택 → 다음
12. 국가 멀티 선택 → 다음
13. 가입 완료 화면 확인
```

---

## 🚀 배포 (Vercel)

GitHub Pages는 정적 사이트만 지원하므로, **Vercel**을 추천합니다 (무료).

### Vercel 배포 방법

1. https://vercel.com 가입 (GitHub 계정으로)
2. **Import Project** → 본 저장소 선택
3. 기본 설정 그대로 → **Deploy**
4. `https://beauty-and-job.vercel.app` 같은 URL 자동 생성
5. **이후 GitHub에 push만 하면 자동 배포**

---

## 🔮 향후 추가 예정 (Add-on 가이드)

이 프로젝트는 다음 기능을 쉽게 추가할 수 있도록 설계되었습니다.

### ① 백엔드 API (Next.js API Routes)
```
app/api/auth/sms/route.ts       # SMS 인증
app/api/auth/verify/route.ts    # 인증번호 확인
app/api/users/route.ts          # 회원 가입/조회
```

### ② 데이터베이스 (Prisma + PostgreSQL)
```bash
npm install @prisma/client prisma
npx prisma init
```

### ③ 카카오 로그인 (NextAuth.js)
```bash
npm install next-auth
```

### ④ 실제 SMS 발송 (CoolSMS / 알리고)
```bash
npm install coolsms-node-sdk
```

### ⑤ 마이프로필 / 이력서 페이지
```
app/profile/page.tsx            # 프로필 홈
app/profile/resume/page.tsx     # 이력서 작성
app/profile/career/page.tsx     # 경력 인증
```

---

## 📝 라이선스

© 2025 Beauty&Job. All rights reserved.
