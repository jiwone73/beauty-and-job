"use client";
import { useEffect } from "react";
import { getGroupNames, 경력단계 } from "@/lib/data/jobGroups";
import type { JobType } from "@/lib/data/jobGroups";

// 가입할 때 고르는 직군 대분류와 경력 단계.
//
// 두 가입 길(이메일 폼 / 간편가입 온보딩)이 같은 것을 물어야 한다. 각자
// 적으면 곧 어긋난다 — 실제로 희망 지역이 한쪽에만 붙어 있었다.
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

  const 칸 = "w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] " +
    "focus:outline-none focus:border-[#582681] disabled:bg-[#f5f5f5] disabled:text-[#9a9a9a] bg-white";

  return (
    <>
      <div className="mb-8">
        <p className="text-[13px] text-[#6b6b6b] mb-2">
          직군 <span className="text-red-500">*</span>
        </p>
        <select className={칸} value={group} disabled={!jobType}
          onChange={(e) => onGroup(e.target.value)}>
          <option value="">{jobType ? "직군을 선택해 주세요" : "매장·본사를 먼저 골라 주세요"}</option>
          {대분류들.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div className="mb-8">
        <p className="text-[13px] text-[#6b6b6b] mb-2">
          경력 <span className="text-red-500">*</span>
        </p>
        <select className={칸} value={stage} disabled={!group}
          onChange={(e) => onStage(e.target.value)}>
          <option value="">{group ? "경력을 선택해 주세요" : "직군을 먼저 골라 주세요"}</option>
          {사다리.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </>
  );
}
