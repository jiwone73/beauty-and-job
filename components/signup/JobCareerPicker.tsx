"use client";
import { useEffect } from "react";
import { getGroupNames, 경력단계 } from "@/lib/data/jobGroups";
import type { JobType } from "@/lib/data/jobGroups";

// 가입할 때 고르는 직군 대분류와 경력 단계.
//
// 두 가입 길(이메일 폼 / 간편가입 온보딩)이 같은 것을 물어야 한다. 각자
// 적으면 곧 어긋난다 — 실제로 희망 지역이 한쪽에만 붙어 있었다.
//
// <select> 를 쓰지 않는다. 목록을 여는 순간 그리는 주체가 브라우저마다 달라서,
// macOS 는 운영체제 메뉴를 띄우고 우리 색이 하나도 닿지 않는다. 게다가 여기는
// 고를 것이 많아야 열 개라 굳이 접어 둘 이유가 없다 — 펼쳐 두면 누르는 횟수가
// 줄고 무엇이 있는지 한눈에 보인다.
//
// 칩은 채용공고 필터가 쓰는 .filter-chip 을 그대로 쓴다. 위의 매장·본사 단추와
// 아래 지역 칸이 모두 같은 모서리(--chip-radius)라 세로로 결이 맞는다.
//
// 경력 사다리는 대분류마다 다르다(헤어·바버는 실장까지, 본사는 연차).
// 그래서 대분류를 먼저 고르게 하고 그다음에 단계를 연다. 대분류를 바꾸면
// 이전에 고른 단계가 새 사다리에 없을 수 있어 비운다.
export default function JobCareerPicker({
  jobType, group, stage, onGroup, onStage,
}: {
  jobType: JobType | "";
  group: string;
  stage: string;
  onGroup: (v: string) => void;
  onStage: (v: string) => void;
}) {
  const 대분류들 = jobType ? getGroupNames(jobType) : [];
  const 사다리 = jobType && group ? 경력단계(group, jobType) : [];

  useEffect(() => {
    if (stage && !사다리.includes(stage)) onStage("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, jobType]);

  const 이름표 = "text-[13px] text-[#6b6b6b] mb-2";
  const 아직 = "text-[13px] text-[#9a9a9a] py-1";

  return (
    <>
      <div className="mb-8">
        <p className={이름표}>직군 <span className="text-red-500">*</span></p>
        {대분류들.length === 0 ? (
          <p className={아직}>매장·본사를 먼저 골라 주세요</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {대분류들.map((g) => (
              <button key={g} type="button"
                className={`filter-chip${g === group ? " on" : ""}`}
                onClick={() => onGroup(g === group ? "" : g)}>
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-8">
        <p className={이름표}>경력 <span className="text-red-500">*</span></p>
        {사다리.length === 0 ? (
          <p className={아직}>직군을 먼저 골라 주세요</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {사다리.map((s) => (
              <button key={s} type="button"
                className={`filter-chip${s === stage ? " on" : ""}`}
                onClick={() => onStage(s === stage ? "" : s)}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
