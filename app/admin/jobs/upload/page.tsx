"use client";
import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Download, Upload, FileText, CheckCircle } from "lucide-react";

export default function AdminJobsUploadPage() {
  const [dragging, setDragging] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [fileName, setFileName] = useState("");

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) { setFileName(file.name); setUploaded(true); }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setFileName(file.name); setUploaded(true); }
  };

  return (
    <AdminLayout activeMenu="jobs-upload">
      <div style={{display:"flex", flexDirection:"column", gap:"16px", maxWidth:"760px"}}>
        {/* 안내 */}
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">엑셀 대량 등록 안내</h2>
          </div>
          <div className="admin-form-body">
            <div className="admin-upload-guide">
              {[
                { step: "1", text: "아래 양식 파일을 다운로드해주세요." },
                { step: "2", text: "양식에 맞게 채용공고 내용을 입력하세요." },
                { step: "3", text: "작성된 파일을 업로드하면 자동으로 등록됩니다." },
              ].map((g) => (
                <div key={g.step} className="admin-upload-step">
                  <span className="admin-upload-step-num">{g.step}</span>
                  <span>{g.text}</span>
                </div>
              ))}
            </div>
            <button className="admin-secondary-btn" style={{width:"fit-content"}}>
              <Download size={16} /> 양식 파일 다운로드 (.xlsx)
            </button>
          </div>
        </div>

        {/* 업로드 영역 */}
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">파일 업로드</h2>
          </div>
          <div className="admin-form-body">
            {uploaded ? (
              <div className="admin-upload-done">
                <CheckCircle size={40} color="#10b981" />
                <div>
                  <p className="admin-upload-done-title">업로드 완료!</p>
                  <p className="admin-upload-done-file">{fileName}</p>
                </div>
                <button className="admin-secondary-btn" onClick={() => { setUploaded(false); setFileName(""); }}>
                  다시 업로드
                </button>
              </div>
            ) : (
              <label
                className={`admin-upload-drop ${dragging ? "dragging" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                <input type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={handleFile} />
                <FileText size={40} color="#ccc" />
                <p className="admin-upload-drop-text">파일을 드래그하거나 클릭해서 업로드</p>
                <p className="admin-upload-drop-sub">.xlsx, .xls, .csv 파일 지원</p>
                <button type="button" className="admin-primary-btn" style={{pointerEvents:"none"}}>
                  <Upload size={16} /> 파일 선택
                </button>
              </label>
            )}
            {uploaded && (
              <button className="admin-primary-btn" style={{width:"fit-content"}}>
                <Upload size={16} /> 등록 처리
              </button>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
