"use client";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";

// 카페·인스타 글에서 본문과 사진을 뽑아 우리 등록 화면으로 넘기는 즐겨찾기 버튼.
//
// 서버가 카페를 긁는 게 아니라, 알바가 로그인해서 보고 있는 화면의 내용을 옮긴다.
//
// 아래 코드는 즐겨찾기 주소로 만들려고 한 줄로 합친다(개행 제거). 그래서 이 안에는
// // 주석을 쓰면 안 된다 — 뒤따르는 코드가 전부 주석에 먹힌다.
// junk 는 본문을 못 찾아 페이지째 퍼왔을 때 네이버가 붙인 메뉴 줄을 걷어내는 규칙이다.
// (본문이 로그인 뒤에 있어 서버로는 가져올 방법이 없다.)
function buildCode(origin: string) {
  const src = `(function(){
  try{
    var pick=function(sels){for(var i=0;i<sels.length;i++){var e=document.querySelector(sels[i]);if(e&&e.innerText&&e.innerText.trim().length>40)return e;}return null;};
    var box=pick(['.se-main-container','.ArticleContentBox','.article_container','.article_viewer','.se-viewer','#tbody','.NHN_Comment_Widget + div','article','main']);
    var raw=box?box.innerText:(document.body.innerText||'');
    var navIn=/카페홈|이웃가입|내소식|사용자 링크|내정보 보기|네이버톡|서비스 더보기|전체글보기|카페 메인/;
    var navEq=/^(검색|로그인|로그아웃|글쓰기|목록|답글|댓글|신고|공유하기|스크랩|채팅|이전|다음|더보기)$/;
    raw=raw.split('\\n').filter(function(l){var t=l.trim();return t&&!navIn.test(t)&&!navEq.test(t);}).join('\\n');
    var text=raw.replace(/\\n{3,}/g,'\\n\\n').trim().slice(0,16000);
    var imgs=[];var scope=box||document.body;
    Array.prototype.forEach.call(scope.querySelectorAll('img'),function(im){
      var u=im.currentSrc||im.src||'';
      if(!u||u.indexOf('data:')===0)return;
      if(im.naturalWidth&&im.naturalWidth<200)return;
      if(/profile|icon|emoticon|logo|badge|blank|sprite/i.test(u))return;
      if(imgs.indexOf(u)<0)imgs.push(u);
    });
    var payload={text:text,url:location.href,images:imgs.slice(0,10)};
    var b64=btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    window.open('${origin}/admin/jobs/new#import='+encodeURIComponent(b64),'_blank');
  }catch(e){alert('가져오지 못했어요: '+e.message);}
})();`;
  return "javascript:" + encodeURIComponent(src.replace(/\s*\n\s*/g, ""));
}

export default function BookmarkletPage() {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const code = origin ? buildCode(origin) : "";
  const [copied, setCopied] = useState(false);
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("아래를 전부 복사하세요 (⌘A → ⌘C)", code);
    }
  };

  const box: React.CSSProperties = { background: "#fff", border: "1px solid #ece7f1", borderRadius: 12, padding: "16px 18px", marginBottom: 14 };
  const step: React.CSSProperties = { fontSize: 14, color: "#2b2533", margin: "0 0 6px" };

  return (
    <AdminLayout activeMenu="jobs-bookmarklet">
      <div style={{ padding: "4px 4px 40px", maxWidth: 720 }}>
        <h1 style={{ fontSize: 20, fontWeight: 400, color: "#2b2533", margin: "0 0 4px" }}>공고 옮기기 버튼</h1>
        <p style={{ fontSize: 13.5, color: "#9a92a6", margin: "0 0 18px" }}>
          카페·인스타 공고를 보다가 버튼 하나로 등록 화면에 옮깁니다. 본문·사진·원문 주소가 함께 넘어갑니다.
        </p>

        <div style={{ ...box, background: "#f7f1fd", border: "1px solid #e0d5ee" }}>
          <p style={{ ...step, fontWeight: 500 }}>1. 처음 한 번만 — 버튼을 즐겨찾기 바에 끌어다 놓으세요</p>
          <ol style={{ margin: "0 0 14px", paddingLeft: 18, fontSize: 13.5, color: "#4a4453", lineHeight: 1.95 }}>
            <li><b>Ctrl+Shift+B</b>(맥은 <b>⌘+Shift+B</b>)를 눌러 브라우저 위쪽에 즐겨찾기 바를 띄웁니다</li>
            <li>아래 보라색 버튼을 <b>마우스로 누른 채</b> 즐겨찾기 바까지 끌고 가서 놓습니다</li>
            <li>즐겨찾기 바에 <b>뷰티워크로 옮기기</b>가 생기면 끝입니다</li>
          </ol>
          {code && (
            <a href={code}
              onClick={(e) => { e.preventDefault(); alert("누르는 게 아니라, 마우스로 잡고 즐겨찾기 바까지 끌어다 놓으세요."); }}
              draggable
              style={{ display: "inline-block", padding: "10px 18px", borderRadius: 8, background: "#5f0080", color: "#fff", fontSize: 14, textDecoration: "none", cursor: "grab" }}>
              뷰티워크로 옮기기
            </a>
          )}
          <p style={{ fontSize: 12.5, color: "#8d84a0", margin: "10px 0 0" }}>
            ↑ 누르지 말고 <b>끌어다 놓으세요</b>. 눌러도 아무 일도 일어나지 않습니다.
          </p>
        </div>

        <div style={box}>
          <p style={{ ...step, fontWeight: 500 }}>끌어다 놓기가 안 되면 (맥 Safari)</p>
          <p style={{ fontSize: 13.5, color: "#4a4453", margin: "0 0 10px", lineHeight: 1.8 }}>
            Safari는 끌어다 놓기를 자주 놓칩니다. 그럴 때는 코드를 복사해 손으로 만드세요.
          </p>
          <button type="button" onClick={copyCode}
            style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #5f0080", background: copied ? "#5f0080" : "#fff", color: copied ? "#fff" : "#5f0080", fontSize: 13.5, fontWeight: 500, cursor: "pointer", marginBottom: 12 }}>
            {copied ? "복사했어요" : "코드 복사하기"}
          </button>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: "#4a4453", lineHeight: 2 }}>
            <li>위 <b>코드 복사하기</b>를 누릅니다</li>
            <li>아무 웹페이지에서나 <b>⌘D</b> → 위치를 <b>즐겨찾기</b>로 두고 <b>추가</b></li>
            <li>화면 맨 위 메뉴에서 <b>북마크</b> → <b>북마크 편집</b> (<b>⌥⌘B</b>)</li>
            <li>방금 만든 북마크의 <b>이름</b>을 더블클릭해 <b>옮기기</b>로 바꿉니다</li>
            <li>그 옆 <b>주소</b> 칸을 더블클릭해 전부 지우고 <b>⌘V</b>로 복사한 코드를 붙여넣습니다</li>
            <li><b>Enter</b>를 누르고 창을 닫으면 끝입니다</li>
          </ol>
          <p style={{ fontSize: 12.5, color: "#8d84a0", margin: "12px 0 0", lineHeight: 1.8 }}>
            이것도 번거로우면 <b>글 붙여넣기</b>를 쓰세요. 카페 글에서 <b>⌘A</b> → <b>⌘C</b> 하고
            등록 화면에 <b>⌘V</b> 하면 결과는 같습니다(사진만 따로 챙기시면 됩니다).
          </p>
        </div>

        <div style={box}>
          <p style={{ ...step, fontWeight: 500 }}>Safari를 쓰신다면</p>
          <p style={{ fontSize: 13.5, color: "#4a4453", margin: "0 0 8px", lineHeight: 1.8 }}>
            Safari는 즐겨찾기 스크립트를 기본으로 막아 둡니다. 눌렀을 때
            <b> “스마트 검색 필드에서 JavaScript를 허용하지 않습니다”</b>가 뜨면 아래대로 한 번 풀어 주세요.
          </p>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: "#4a4453", lineHeight: 1.95 }}>
            <li>Safari → 설정(<b>⌘,</b>) → <b>고급</b> 탭</li>
            <li>맨 아래 <b>웹 개발자용 기능 보기</b> 체크</li>
            <li>새로 생긴 <b>개발자</b> 탭에서 <b>스마트 검색 필드에서 JavaScript 허용</b> 체크</li>
          </ol>
          <p style={{ fontSize: 12.5, color: "#8d84a0", margin: "10px 0 0" }}>
            Chrome은 이 설정 없이 바로 됩니다. 여럿이 쓸 거라면 Chrome이 편합니다.
          </p>
        </div>

        <div style={box}>
          <p style={{ ...step, fontWeight: 500 }}>2. 쓰는 법</p>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: "#4a4453", lineHeight: 2 }}>
            <li>카페 구인글 목록에서 <b>원문</b>을 눌러 글을 엽니다</li>
            <li>즐겨찾기 바의 <b>뷰티워크로 옮기기</b>를 누릅니다</li>
            <li>등록 화면이 새 탭으로 열리며 본문·주소가 채워집니다</li>
            <li><b>불러오기</b>를 눌러 항목별로 정리하고, <b>배너에 넣기</b>로 사진을 붙입니다</li>
            <li>값을 확인하고 <b>공고 등록</b></li>
          </ol>
        </div>

        <div style={{ ...box, background: "#fff8f6", border: "1px solid #f0e0dd" }}>
          <p style={{ ...step, fontWeight: 500, color: "#c0392b" }}>저장 전에 꼭 확인하세요</p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: "#6b6473", lineHeight: 1.9 }}>
            <li><b>연락처</b> — 없으면 지원이 매장에 닿지 않습니다. 없는 공고는 등록하지 마세요</li>
            <li><b>모집분야</b> — 자동으로 잡히지만 글에 여러 직군이 섞이면 빠질 수 있습니다. 비어 있으면 직접 고르세요</li>
            <li><b>급여·근무시간</b> — 원문과 다르게 읽는 경우가 있습니다</li>
          </ul>
        </div>

        <p style={{ fontSize: 12.5, color: "#b3adbd", margin: 0 }}>
          글이 잘 안 잡히면 지금처럼 본문을 복사해 <b>글 붙여넣기</b>에 넣으면 됩니다.
        </p>
      </div>
    </AdminLayout>
  );
}
