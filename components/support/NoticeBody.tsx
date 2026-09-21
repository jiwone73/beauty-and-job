import { Gift, Calendar, ListChecks, AlertTriangle } from "lucide-react";

/**
 * 공지 본문을 읽기 쉽게 짠다.
 *
 * 본문은 여전히 관리자가 텍스트로 쓴다 — 새 에디터를 만들지 않는다.
 * 대신 이미 다들 쓰고 있는 몇 가지 표시(EVENT 01., ①②③, 라벨　값,
 * * 로 시작하는 줄, 이벤트 기간 : , 참여 방법 같은 짧은 소제목)를
 * 알아보고 그 모양대로 그린다. 소제목과 그 내용이 같은 문단(줄바꿈만,
 * 빈 줄 없음)에 붙어 있는 경우가 많아, 문단의 첫 줄만 떼어 제목으로
 * 쓰고 나머지 줄로 내용을 다시 분류한다. 어느 것에도 안 걸리면
 * 지금처럼 평문단으로 그린다 — 다른 공지가 갑자기 이상해지지 않는다.
 */

const 원문자 = /^[①-⑳]\s*/; // ①~⑳

function 문단쪼개기(body: string): string[] {
  return body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

function 줄쪼개기(block: string): string[] {
  return block.split("\n").map((l) => l.trim()).filter(Boolean);
}

/** 짧고 문장부호로 안 끝나는 한 줄 — 참여 방법·꼭 확인해 주세요 같은 소제목. */
function 짧은소제목인가(l: string): boolean {
  return l.length > 0 && l.length <= 12 && !/[.!?]$/.test(l);
}

/** 나머지 줄들을 종류에 맞게 그린다(계단·표·유의사항·평문단). */
function 내용그리기(줄들: string[], key: string) {
  if (줄들.length === 0) return null;

  if (줄들.every((l) => 원문자.test(l))) {
    return (
      <ol key={key} className="nb-b-steps">
        {줄들.map((l, j) => (
          <li key={j}>
            <span className="no">{(원문자.exec(l) ?? [String(j + 1)])[0].trim()}</span>
            <span>{l.replace(원문자, "")}</span>
          </li>
        ))}
      </ol>
    );
  }

  if (줄들.every((l) => l.includes("　"))) {
    return (
      <dl key={key} className="nb-b-dl">
        {줄들.map((l, j) => {
          const [라벨, ...나머지] = l.split("　");
          return <div key={j}><dt>{라벨}</dt><dd>{나머지.join("　")}</dd></div>;
        })}
      </dl>
    );
  }

  if (줄들.every((l) => l.startsWith("*"))) {
    return (
      <ul key={key} className="nb-b-warn">
        {줄들.map((l, j) => <li key={j}>{l.replace(/^\*\s*/, "")}</li>)}
      </ul>
    );
  }

  return <p key={key} className="nb-b-p">{줄들.join("\n")}</p>;
}

export default function NoticeBody({ body }: { body: string }) {
  const 문단들 = 문단쪼개기(body);
  const 노드들: React.ReactNode[] = [];

  문단들.forEach((block, i) => {
    const 줄들 = 줄쪼개기(block);
    const 이벤트제목 = /^EVENT\s*\d+\.\s*(.+)$/.exec(줄들[0]);

    // EVENT 01. 개인회원 — 갈래 제목. 바로 다음 줄이 있으면 부제(굵게)로.
    if (이벤트제목) {
      노드들.push(
        <div key={`${i}-h`} className={`nb-b-evth${노드들.length > 0 ? " sep" : ""}`}>
          <Gift size={18} /><span>{이벤트제목[1]}</span>
        </div>
      );
      if (줄들.length > 1) {
        노드들.push(<p key={`${i}-sh`} className="nb-b-subhead">{줄들.slice(1).join(" ")}</p>);
      }
      return;
    }

    // 이벤트 기간 : 2026년 ... — 달력 아이콘 강조줄. 혼자 있는 줄에만 건다.
    if (줄들.length === 1 && /^이벤트\s*기간\s*[:：]/.test(줄들[0])) {
      const 값 = 줄들[0].replace(/^이벤트\s*기간\s*[:：]\s*/, "");
      노드들.push(
        <div key={i} className="nb-b-period"><Calendar size={15} /><b>이벤트 기간</b><span>{값}</span></div>
      );
      return;
    }

    // 참여 방법 / 꼭 확인해 주세요 — 짧은 소제목. 뒤따르는 줄이 있으면 같이 분류한다.
    if (짧은소제목인가(줄들[0])) {
      const 주의 = 줄들[0].includes("확인");
      노드들.push(
        <div key={`${i}-h`} className="nb-b-sub">
          {주의 ? <AlertTriangle size={15} /> : <ListChecks size={15} />}
          <b>{줄들[0]}</b>
        </div>
      );
      const 내용 = 내용그리기(줄들.slice(1), `${i}-c`);
      if (내용) 노드들.push(내용);
      return;
    }

    const 내용 = 내용그리기(줄들, String(i));
    if (내용) 노드들.push(내용);
  });

  return <div className="nb-view-body">{노드들}</div>;
}
