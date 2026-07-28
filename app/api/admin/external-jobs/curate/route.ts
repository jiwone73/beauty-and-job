export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ok, err, requireAuth } from "@/lib/api";

// LLM JSON 파싱(잘린 응답도 최대한 복구). 실패 시 null.
function safeJsonParse(raw: string): any | null {
  let s = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const a = s.indexOf("{");
  if (a > 0) s = s.slice(a);
  try { return JSON.parse(s); } catch { /* 잘렸을 수 있음 → 복구 */ }
  const stack: string[] = [];
  let inStr = false, esc = false, safeLen = -1;
  let safeStack: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{" || c === "[") stack.push(c === "{" ? "}" : "]");
    else if (c === "}" || c === "]") { stack.pop(); safeLen = i + 1; safeStack = [...stack]; }
    else if (c === ",") { safeLen = i; safeStack = [...stack]; }
  }
  if (safeLen < 0) return null;
  let t = s.slice(0, safeLen).replace(/,\s*$/, "");
  for (let k = safeStack.length - 1; k >= 0; k--) t += safeStack[k];
  try { return JSON.parse(t); } catch { return null; }
}

// 큐레이션: 이미 채워진 공고 텍스트를 뷰티워크 톤·형식으로 다듬는다(관리자 전용).
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  const b = await req.json().catch(() => ({}));
  const src = {
    title: String(b.title || "").slice(0, 300),
    company_description: String(b.company_description || "").slice(0, 3000),
    description: String(b.description || "").slice(0, 4000),
    responsibilities: String(b.responsibilities || "").slice(0, 4000),
    requirements: String(b.requirements || "").slice(0, 4000),
    preferred: String(b.preferred || "").slice(0, 4000),
    benefits: String(b.benefits || "").slice(0, 4000),
    notes: String(b.notes || "").slice(0, 3000),
    job_type: b.job_type === "OFFICE" ? "OFFICE" : "STORE",
  };

  const hasAny = [src.title, src.company_description, src.description, src.responsibilities, src.requirements, src.preferred, src.benefits, src.notes].some((v) => v.trim());
  if (!hasAny) return err("VALIDATION_001", "다듬을 내용이 없어요. 먼저 공고 내용을 채워주세요.", 400);

  if (!process.env.ANTHROPIC_API_KEY) return err("CONFIG_001", "AI 설정이 없어 큐레이션을 사용할 수 없어요.", 500);

  const out: any = { ...src, curated: false };
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const sys = `너는 뷰티 채용 플랫폼 "뷰티워크"의 공고 에디터야. 이미 채워진 공고 텍스트를 뷰티워크 톤·형식으로 "다듬기"만 해. 없는 사실을 지어내지 말고, 있는 내용을 더 깔끔하고 일관되게 정리해.
반드시 아래 키를 가진 JSON "하나만" 출력해(설명·코드펜스 금지):
{"title","company_description","description","responsibilities","requirements","preferred","benefits","notes"}
규칙:
- title: 군더더기(출처 사이트명·"채용공고"·대괄호 태그 등) 제거하고 직무 중심으로 간결하게. 예: "[코공고] OO브랜드 채용" → "콘텐츠 마케터".
- company_description: 회사 소개를 2~4문장으로 자연스럽게 정리(과장·이모지 제거).
- description: 포지션 소개를 3~5문장으로. 어떤 일을 하고 어떤 사람을 찾는지 명확하게.
- responsibilities / requirements / preferred / benefits: 각 항목을 "한 줄에 하나씩" 간결한 문장으로 줄바꿈(\n) 정리. 중복·군더더기 제거, 존댓말체 통일. 항목이 없으면 "".
- notes: 근무시간·휴무·기타 안내 등 비고를 항목별로 줄바꿈 정리. 없으면 "".
- 출처 사이트 흔적(코공고/사람인/잡코리아 등 플랫폼명, "지금 지원하기" 같은 버튼 문구)은 제거.
- 이모지·과장 광고문구("최고의", "업계 최강" 등) 제거하고 담백하게.
- 내용을 새로 창작하거나 부풀리지 말 것. 비어 있던 항목은 그대로 "".
- 입력에 없는 정보는 절대 추가하지 말 것.`;
    const user = `job_type: ${src.job_type}\n\n[제목]\n${src.title || "(없음)"}\n\n[회사 소개]\n${src.company_description || "(없음)"}\n\n[포지션 소개]\n${src.description || "(없음)"}\n\n[주요업무]\n${src.responsibilities || "(없음)"}\n\n[자격요건]\n${src.requirements || "(없음)"}\n\n[우대사항]\n${src.preferred || "(없음)"}\n\n[혜택·복지]\n${src.benefits || "(없음)"}\n\n[비고]\n${src.notes || "(없음)"}`;
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 3000,
      system: sys,
      messages: [{ role: "user", content: user }],
    });
    const raw = msg.content.map((c: any) => (c.type === "text" ? c.text : "")).join("").trim();
    const parsed = safeJsonParse(raw);
    if (parsed && typeof parsed === "object") {
      // 배열로 오면 줄바꿈 문자열로 정규화, 빈 값이면 원본 유지
      for (const k of ["title", "company_description", "description", "responsibilities", "requirements", "preferred", "benefits", "notes"]) {
        let v = parsed[k];
        if (Array.isArray(v)) v = v.filter(Boolean).join("\n");
        if (typeof v === "string" && v.trim()) out[k] = v.trim();
      }
      out.curated = true;
    } else {
      console.error("[external curate LLM] JSON 파싱 실패. 원문 앞부분:", raw.slice(0, 300));
    }
  } catch (e) {
    console.error("[external curate LLM]", e);
  }

  return ok(out);
}
