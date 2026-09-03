"use client";
import { useEffect, useState } from "react";
import { X, Sparkles } from "lucide-react";

// AI 초안을 만들기 전에 고르는 창.
//
// 키워드만으로 쓰면 남들과 같은 글이 나오고, 저장값만으로 쓰면 「무엇을 하고
// 싶은가」가 비어 두루뭉술해진다. 둘을 섞는다 — 내 경력·스킬은 이미 갖고 있으니
// 보여만 주고(빼고 싶은 것만 끄게), 우리가 모르는 장점·포부만 고르게 한다.

const 장점목록 = [
  "꼼꼼함", "성실함", "친화력", "책임감", "빠른 습득", "손이 빠름",
  "차분함", "끈기", "미적 감각", "위생 관리", "시간 약속", "상담 능력",
];
const 포부목록 = [
  "단골 늘리기", "재방문율 높이기", "고객 만족", "매출 기여", "후배 교육",
  "신기술 습득", "팀워크", "오래 함께", "내 시술 색 만들기", "매장 정리",
];

export type 고른것 = { strengths: string[]; goals: string[]; emphasis: string; drop: string[] };

export default function CoverLetterModal({
  내정보, onClose, onRun, 만드는중,
}: {
  /** 저장값에서 뽑은 조각들 — 끄면 초안에서 뺀다. */
  내정보: string[];
  onClose: () => void;
  onRun: (v: 고른것) => void;
  만드는중: boolean;
}) {
  const [장점, set장점] = useState<string[]>([]);
  const [포부, set포부] = useState<string[]>([]);
  const [뺀것, set뺀것] = useState<string[]>([]);
  const [강조, set강조] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const 누르기 = (목록: string[], set: (v: string[]) => void, v: string, 최대: number) => {
    if (목록.includes(v)) set(목록.filter((x) => x !== v));
    else if (목록.length < 최대) set([...목록, v]);
  };
  const 됐나 = 장점.length > 0 && 포부.length > 0;

  return (
    <div className="cv-overlay" onClick={onClose}>
      <div className="cv-modal cl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cv-header">
          <h2 className="cv-title">AI로 초안 작성하기</h2>
          <button className="cv-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="cv-body">
          {내정보.length > 0 && (
            <section className="cl-sec">
              <h3>내 이력서에서 가져온 것</h3>
              <div className="cl-chips">
                {내정보.map((v) => {
                  const 켬 = !뺀것.includes(v);
                  return (
                    <button key={v} type="button" className={`cl-chip${켬 ? " on" : ""}`}
                      onClick={() => set뺀것(켬 ? [...뺀것, v] : 뺀것.filter((x) => x !== v))}>
                      {v}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="cl-sec">
            <h3>나의 장점<span className="cl-need">1~3개</span></h3>
            <div className="cl-chips">
              {장점목록.map((v) => (
                <button key={v} type="button" className={`cl-chip${장점.includes(v) ? " on" : ""}`}
                  onClick={() => 누르기(장점, set장점, v, 3)}>{v}</button>
              ))}
            </div>
          </section>

          <section className="cl-sec">
            <h3>입사 후 하고 싶은 것<span className="cl-need">1~2개</span></h3>
            <div className="cl-chips">
              {포부목록.map((v) => (
                <button key={v} type="button" className={`cl-chip${포부.includes(v) ? " on" : ""}`}
                  onClick={() => 누르기(포부, set포부, v, 2)}>{v}</button>
              ))}
            </div>
          </section>

          <section className="cl-sec">
            <h3>더 넣고 싶은 말<span className="cl-need">선택</span></h3>
            <input className="cl-say" value={강조} maxLength={40}
              placeholder="예: 실장님 밑에서 3년 배웠습니다"
              onChange={(e) => set강조(e.target.value)} />
          </section>
        </div>
        <div className="cl-modal-foot">
          <button type="button" className="cv-btn-primary" disabled={!됐나 || 만드는중}
            style={{ marginTop: 0, opacity: 됐나 && !만드는중 ? 1 : 0.5 }}
            onClick={() => onRun({ strengths: 장점, goals: 포부, emphasis: 강조.trim(), drop: 뺀것 })}>
            <Sparkles size={15} style={{ verticalAlign: -3, marginRight: 5 }} />
            {만드는중 ? "쓰는 중…" : "초안 만들기"}
          </button>
        </div>
      </div>
    </div>
  );
}
