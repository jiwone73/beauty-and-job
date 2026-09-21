# -*- coding: utf-8 -*-
# 다운로드 페이지의 이력서 양식(매장/오피스)을 만드는 스크립트.
# 사람이 채워 넣어야 하는 양식이라 PDF 대신 워드(.docx)로 낸다 — PDF는 못 고친다.
# python-docx 가 프로젝트 의존성이 아니라서 따로 가상환경을 쓴다:
#   python3 -m venv /tmp/docxenv && /tmp/docxenv/bin/pip install python-docx
#   /tmp/docxenv/bin/python scripts/이력서양식_docx생성.py
# 결과물은 이 파일과 같은 폴더에 생기니 public/files/ 로 옮겨 덮어쓴다.
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

PURPLE = RGBColor(0x58, 0x26, 0x81)
DARK = RGBColor(0x1f, 0x1f, 0x22)
GREY = RGBColor(0x8a, 0x8a, 0x90)

FONT = "맑은 고딕"

def set_cell_border(cell, **kwargs):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for edge in ('top', 'left', 'bottom', 'right'):
        if edge in kwargs:
            el = OxmlElement(f'w:{edge}')
            el.set(qn('w:val'), 'single')
            el.set(qn('w:sz'), str(kwargs[edge]))
            el.set(qn('w:color'), 'D8D8DE')
            tcBorders.append(el)
    tcPr.append(tcBorders)

def set_cell_bg(cell, color_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:fill'), color_hex)
    tcPr.append(shd)

def set_row_height(row, cm_val):
    row.height = Cm(cm_val)
    trPr = row._tr.get_or_add_trPr()
    trHeight = OxmlElement('w:trHeight')
    trHeight.set(qn('w:val'), str(int(cm_val * 567)))
    trHeight.set(qn('w:hRule'), 'atLeast')
    trPr.append(trHeight)

def style_run(r, size=9.5, bold=False, color=DARK, font=FONT):
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.color.rgb = color
    r.font.name = font
    rPr = r._element.get_or_add_rPr()
    rFonts = rPr.find(qn('w:rFonts'))
    if rFonts is None:
        rFonts = OxmlElement('w:rFonts')
        rPr.append(rFonts)
    rFonts.set(qn('w:eastAsia'), font)

def set_doc_margins(doc):
    for s in doc.sections:
        s.top_margin = Cm(1.1)
        s.bottom_margin = Cm(1.0)
        s.left_margin = Cm(1.3)
        s.right_margin = Cm(1.3)

def add_title(doc, subtitle):
    # 다운로드 페이지 밖으로 나가면 이 문서는 본인 이력서다 — 브랜드·URL을
    # 박아 두지 않는다(매장직/오피스직 구분 표시만 남긴다).
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(1)
    p.paragraph_format.space_before = Pt(0)
    r1 = p.add_run("이 력 서")
    style_run(r1, size=20, bold=True, color=DARK)

    if subtitle:
        sp = doc.add_paragraph()
        sp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        sp.paragraph_format.space_after = Pt(3)
        sp.paragraph_format.space_before = Pt(0)
        r2 = sp.add_run(subtitle)
        style_run(r2, size=9, bold=True, color=GREY)

    tail = sp if subtitle else p
    pPr = tail._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), '18')
    bottom.set(qn('w:color'), '1f1f22')
    bottom.set(qn('w:space'), '4')
    pBdr.append(bottom)
    pPr.append(pBdr)

def add_section_title(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(7)
    p.paragraph_format.space_after = Pt(3)
    r = p.add_run(text)
    style_run(r, size=10.5, bold=True, color=PURPLE)
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), '8')
    bottom.set(qn('w:color'), '582681')
    bottom.set(qn('w:space'), '2')
    pBdr.append(bottom)
    pPr.append(pBdr)

def make_table(doc, rows, cols, widths=None):
    t = doc.add_table(rows=rows, cols=cols)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    for row in t.rows:
        for cell in row.cells:
            set_cell_border(cell, top=4, bottom=4, left=4, right=4)
    if widths:
        for row in t.rows:
            for i, w in enumerate(widths):
                row.cells[i].width = Cm(w)
    return t

def label_cell(cell, text):
    set_cell_bg(cell, 'F7F7F8')
    cell.paragraphs[0].paragraph_format.space_after = Pt(0)
    cell.paragraphs[0].paragraph_format.space_before = Pt(0)
    r = cell.paragraphs[0].add_run(text)
    style_run(r, size=9, bold=True, color=DARK)
    cell.vertical_alignment = 1

def empty_cell(cell):
    cell.paragraphs[0].paragraph_format.space_after = Pt(0)
    cell.paragraphs[0].paragraph_format.space_before = Pt(0)
    r = cell.paragraphs[0].add_run(" ")
    style_run(r, size=9.5)


def build(path, subtitle, skill_title, skill_lines, skill_row_cm, skill_note=None):
    doc = Document()
    set_doc_margins(doc)
    style = doc.styles['Normal']
    style.font.name = FONT
    style.font.size = Pt(9.5)
    style._element.rPr.rFonts.set(qn('w:eastAsia'), FONT)

    add_title(doc, subtitle)

    # 인적사항 (+사진) — 나눠 겹친 표(중첩 테이블) 대신 한 표에 사진 칸을
    # 세로로 합쳐 쓴다. 중첩 테이블은 LibreOffice 렌더링에서 글자가
    # 빠지는 경우가 있었다.
    add_section_title(doc, "인적사항")
    info = make_table(doc, 3, 5, [2.2, 4.7, 2.2, 4.7, 3.0])
    label_cell(info.rows[0].cells[0], "성명"); empty_cell(info.rows[0].cells[1])
    label_cell(info.rows[0].cells[2], "생년월일"); empty_cell(info.rows[0].cells[3])
    label_cell(info.rows[1].cells[0], "연락처"); empty_cell(info.rows[1].cells[1])
    label_cell(info.rows[1].cells[2], "이메일"); empty_cell(info.rows[1].cells[3])
    label_cell(info.rows[2].cells[0], "주소")
    info.rows[2].cells[1].merge(info.rows[2].cells[2]).merge(info.rows[2].cells[3])
    empty_cell(info.rows[2].cells[1])
    photo_cell = info.rows[0].cells[4].merge(info.rows[1].cells[4]).merge(info.rows[2].cells[4])
    photo_cell.vertical_alignment = 1
    photo_cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = photo_cell.paragraphs[0].add_run("사진 (3×4)")
    style_run(r, size=8.5, color=GREY)
    for row in info.rows:
        set_row_height(row, 0.85)

    # 희망 조건 — 매장이든 오피스든 여기 자유롭게 적는다(체크리스트를 안 두는 이유).
    add_section_title(doc, "희망 조건")
    cond = make_table(doc, 3, 4, [2.2, 6.45, 2.2, 6.45])
    label_cell(cond.rows[0].cells[0], "희망 직군"); empty_cell(cond.rows[0].cells[1])
    label_cell(cond.rows[0].cells[2], "희망 지역"); empty_cell(cond.rows[0].cells[3])
    label_cell(cond.rows[1].cells[0], "고용 형태"); empty_cell(cond.rows[1].cells[1])
    label_cell(cond.rows[1].cells[2], "희망 급여"); empty_cell(cond.rows[1].cells[3])
    label_cell(cond.rows[2].cells[0], "근무 가능일")
    cond.rows[2].cells[1].merge(cond.rows[2].cells[2]).merge(cond.rows[2].cells[3])
    empty_cell(cond.rows[2].cells[1])
    for row in cond.rows:
        set_row_height(row, 0.75)

    # 경력
    add_section_title(doc, "경력")
    career_rows = 3
    car = make_table(doc, career_rows + 1, 4, [3.6, 5.0, 3.0, 5.7])
    heads = ["근무 기간", "매장·회사명", "직급·직책", "담당 업무"]
    for i, h in enumerate(heads):
        label_cell(car.rows[0].cells[i], h)
    for ri in range(1, career_rows + 1):
        for ci in range(4):
            empty_cell(car.rows[ri].cells[ci])
    for row in car.rows:
        set_row_height(row, 0.72)

    # 교육 자격
    add_section_title(doc, "교육 · 자격")
    edu_rows = 3
    edu = make_table(doc, edu_rows + 1, 4, [3.6, 6.2, 5.5, 2.0])
    heads = ["기간", "학교·학원·교육기관", "과정·자격증명", "수료·취득"]
    for i, h in enumerate(heads):
        label_cell(edu.rows[0].cells[i], h)
    for ri in range(1, edu_rows + 1):
        for ci in range(4):
            empty_cell(edu.rows[ri].cells[ci])
    for row in edu.rows:
        set_row_height(row, 0.72)

    # 가능한 시술·업무 / 관심 직무 — 매장·오피스용을 따로 만드는 이유가 이 칸이다.
    add_section_title(doc, skill_title)
    skt = make_table(doc, 1, 1, [17.4])
    set_row_height(skt.rows[0], skill_row_cm)
    cell = skt.rows[0].cells[0]
    cell.vertical_alignment = 1
    cell.paragraphs[0].text = ""
    cell.paragraphs[0].paragraph_format.space_after = Pt(2)
    cell.paragraphs[0].paragraph_format.space_before = Pt(2)
    for li, line in enumerate(skill_lines):
        p = cell.paragraphs[0] if li == 0 else cell.add_paragraph()
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.space_before = Pt(2)
        r = p.add_run(line)
        style_run(r, size=8.3)
    if skill_note:
        p = cell.add_paragraph()
        p.paragraph_format.space_before = Pt(3)
        r = p.add_run(skill_note)
        style_run(r, size=8.5, color=GREY)

    # 자기소개
    add_section_title(doc, "자기소개")
    intro = make_table(doc, 1, 1, [17.4])
    set_row_height(intro.rows[0], 3.4)
    intro.rows[0].cells[0].vertical_alignment = 3
    empty_cell(intro.rows[0].cells[0])

    # note
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(2)
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    top = OxmlElement('w:top')
    top.set(qn('w:val'), 'single'); top.set(qn('w:sz'), '4'); top.set(qn('w:color'), 'E8E8EC'); top.set(qn('w:space'), '4')
    pBdr.append(top)
    pPr.append(pBdr)
    r = p.add_run("위 기재 사항은 사실과 다름이 없습니다.    작성일 : ______________    성명 : ______________ (서명)")
    style_run(r, size=8, color=GREY)

    doc.save(path)
    print("saved", path)


# 매장(STORE) — 실제 시술·업무 단위. 대분류(헤어·바버 등)만 체크하면 뭘
# 할 수 있는지 안 보여서, 원래 있던 소분류 수준 실무 목록을 그대로 쓴다.
STORE_SKILLS = [
    "☐ 커트  ☐ 펌  ☐ 염색  ☐ 클리닉·두피  ☐ 드라이·스타일링  ☐ 매직·볼륨  ☐ 남성 커트·바버  ☐ 웨딩·행사",
    "☐ 젤네일  ☐ 패디큐어  ☐ 네일 케어  ☐ 속눈썹 연장  ☐ 왁싱  ☐ 피부 관리  ☐ 반영구  ☐ 메이크업",
    "☐ 고객 상담  ☐ 예약·매장 관리  ☐ 제품 판매  ☐ SNS·마케팅  ☐ 교육·멘토링   기타 : ________________________",
]

# 오피스(OFFICE) — lib/data/jobGroups.ts 의 OFFICE_JOB_GROUPS 대분류 8개 그대로.
# 여기 없는 다른 갈래를 새로 만들지 않는다(직군 단일 출처 원칙).
OFFICE_SKILLS = [
    "☐ 기획·MD  ☐ 마케팅·콘텐츠  ☐ 영업·유통  ☐ 연구·생산  ☐ 디자인  ☐ 서비스기획·개발  ☐ 교육  ☐ 경영지원·HR",
]
OFFICE_NOTE = "보유 툴·역량 : ________________________________________________ (예: 엑셀·SQL·포토샵·영어회화 등)"

if __name__ == "__main__":
    import os
    OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "files")
    build(
        os.path.join(OUT, "뷰티워크-이력서-양식-매장.docx"),
        "매장직",
        "가능한 시술 · 업무",
        STORE_SKILLS,
        skill_row_cm=2.0,
    )
    build(
        os.path.join(OUT, "뷰티워크-이력서-양식-오피스.docx"),
        "오피스직",
        "관심 직무 분야",
        OFFICE_SKILLS,
        skill_row_cm=1.6,
        skill_note=OFFICE_NOTE,
    )
