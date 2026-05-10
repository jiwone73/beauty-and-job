"use client";

import { useState } from "react";
import { X, ChevronLeft } from "lucide-react";

type VerifyStep = "info" | "method" | "waiting" | "done";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  userName: string;
  userBirth: string;
  userGender: string;
  userPhone: string;
}

export default function CareerVerifyModal({
  isOpen,
  onClose,
  onComplete,
  userName,
  userBirth,
  userGender,
  userPhone,
}: Props) {
  const [step, setStep] = useState<VerifyStep>("info");
  const [method, setMethod] = useState<"kakao" | "pass">("kakao");
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step === "info") setStep("method");
    else if (step === "method" && agreed) setStep("waiting");
    else if (step === "waiting") setStep("done");
    else if (step === "done") {
      onComplete();
      onClose();
      setStep("info");
      setAgreed(false);
    }
  };

  const handleBack = () => {
    if (step === "method") setStep("info");
    else if (step === "waiting") setStep("method");
  };

  const birthDisplay = userBirth || "19900101";
  const genderDisplay = userGender === "남성" ? "남성" : userGender === "여성" ? "여성" : "";

  return (
    <div className="cv-overlay" onClick={onClose}>
      <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="cv-header">
          {step !== "info" && step !== "done" && (
            <button className="cv-back" onClick={handleBack}>
              <ChevronLeft size={20} />
            </button>
          )}
          <h2 className="cv-title">
            {step === "info" && "경력 불러오기"}
            {step === "method" && "경력 불러오기"}
            {step === "waiting" && ""}
            {step === "done" && "경력 불러오기"}
          </h2>
          <button className="cv-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* 본문 */}
        <div className="cv-body">
          {step === "info" && (
            <StepInfo
              name={userName}
              birth={birthDisplay}
              gender={genderDisplay}
              phone={userPhone}
              onNext={handleNext}
            />
          )}
          {step === "method" && (
            <StepMethod
              method={method}
              setMethod={setMethod}
              agreed={agreed}
              setAgreed={setAgreed}
              onNext={handleNext}
            />
          )}
          {step === "waiting" && (
            <StepWaiting method={method} onNext={handleNext} />
          )}
          {step === "done" && <StepDone onNext={handleNext} />}
        </div>
      </div>
    </div>
  );
}

/* ----- 1단계: 정보 확인 ----- */
function StepInfo({
  name, birth, gender, phone, onNext,
}: {
  name: string; birth: string; gender: string; phone: string; onNext: () => void;
}) {
  return (
    <>
      <h3 className="cv-heading">간편하게 내 경력 먼저 불러오세요</h3>
      <p className="cv-desc">
        건강보험공단 인증으로 간편하게 불러오고 세부 이력은
        자유롭게 완성할 수 있어요.
      </p>

      <label className="cv-field-label">이름</label>
      <div className="cv-field-value">{name || "이름 없음"}</div>
      <p className="cv-field-hint">ⓘ 반드시 실명을 입력해 주세요.</p>

      <label className="cv-field-label">생년월일</label>
      <div className="cv-field-row">
        <div className="cv-field-value cv-field-flex">{birth}</div>
        <span className={`cv-gender-btn ${gender === "남성" ? "active" : ""}`}>남성</span>
        <span className={`cv-gender-btn ${gender === "여성" ? "active" : ""}`}>여성</span>
      </div>

      <label className="cv-field-label">휴대전화 번호</label>
      <div className="cv-field-value">{phone || "010-0000-0000"}</div>

      <button className="cv-btn-primary" onClick={onNext}>다음</button>
    </>
  );
}

/* ----- 2단계: 인증 방법 선택 ----- */
function StepMethod({
  method, setMethod, agreed, setAgreed, onNext,
}: {
  method: "kakao" | "pass";
  setMethod: (m: "kakao" | "pass") => void;
  agreed: boolean;
  setAgreed: (v: boolean) => void;
  onNext: () => void;
}) {
  return (
    <>
      <h3 className="cv-heading">간편 인증하기</h3>
      <p className="cv-desc">건강보험공단에서 나의 경력을 확인합니다.</p>

      <div className="cv-method-grid">
        <button
          className={`cv-method-card ${method === "kakao" ? "active" : ""}`}
          onClick={() => setMethod("kakao")}
        >
          <div className="cv-method-icon cv-method-kakao">TALK</div>
          <span>카카오</span>
        </button>
        <button
          className={`cv-method-card ${method === "pass" ? "active" : ""}`}
          onClick={() => setMethod("pass")}
        >
          <div className="cv-method-icon cv-method-pass">PASS</div>
          <span>PASS</span>
        </button>
      </div>

      <label className="cv-agree-row">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />
        <span className="checkbox-visual" />
        <span>[필수] 제 3자 정보제공 동의 (건강보험공단)</span>
      </label>

      <button
        className={`cv-btn-primary ${agreed ? "" : "disabled"}`}
        onClick={onNext}
        disabled={!agreed}
      >
        다음
      </button>
    </>
  );
}

/* ----- 3단계: 인증 대기 ----- */
function StepWaiting({
  method, onNext,
}: {
  method: "kakao" | "pass"; onNext: () => void;
}) {
  const isKakao = method === "kakao";
  return (
    <>
      <h3 className="cv-heading">
        {isKakao ? "카카오톡" : "PASS"}에서 온 알림을 확인 후
        <br />
        인증을 진행해 주세요.
      </h3>
      <p className="cv-desc">5분 안에 인증하지 못하면 인증이 자동 종료됩니다.</p>

      <div className="cv-phone-mockup">
        <div className="cv-phone-notch" />
        <div className="cv-phone-notification">
          <div className={`cv-noti-icon ${isKakao ? "cv-noti-kakao" : "cv-noti-pass"}`}>
            {isKakao ? "TALK" : "PASS"}
          </div>
          <div className="cv-noti-text">
            <strong>{isKakao ? "카카오톡" : "PASS"}으로</strong>
            <span>인증요청이 도착했습니다.</span>
          </div>
        </div>
      </div>

      <div className="cv-trouble-box">
        <strong>문제 발생 시 조치방법</strong>
        <p>
          {isKakao ? "카카오" : "PASS"} 인증 이용에 문제가 있는 경우,
          <br />
          {isKakao ? "카카오에서 카카오 인증서 문의를 이용해주세요." : "PASS에서 카카오 인증서 문의를 이용해주세요."}
        </p>
      </div>

      <button className="cv-btn-primary" onClick={onNext}>
        {isKakao ? "카카오" : "PASS"} 인증 완료 후 눌러주세요
      </button>
    </>
  );
}

/* ----- 4단계: 조회 완료 ----- */
function StepDone({ onNext }: { onNext: () => void }) {
  return (
    <div className="cv-done-center">
      <div className="cv-done-icon">✓</div>
      <h3 className="cv-heading">조회를 완료했어요!</h3>
      <p className="cv-desc">
        내가 쌓아온 커리어들을 확인하고 어떤 업무를 해왔는지
        적어주세요. 프로젝트별로 자세하게 설명할수록 좋아요.
      </p>
      <button className="cv-btn-primary" onClick={onNext}>
        경력 확인하기
      </button>
    </div>
  );
}
