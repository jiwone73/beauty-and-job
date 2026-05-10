"use client";

import { useState } from "react";
import { X, Search } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const BRAND_LIST = [
  { id: "oliveyoung", name: "올리브영", category: "올리브영", logo: "OY" },
  { id: "samu", name: "쌔뮤", category: "쌔뮤", logo: "SM" },
  { id: "lifeholic", name: "라이프홀릭", category: "라이프홀릭", logo: "LH" },
  { id: "medi247", name: "메디247", category: "메디247", logo: "M2" },
  { id: "podl", name: "포들", category: "포들", logo: "PD" },
  { id: "gelato", name: "젤라또팩토리", category: "젤라또팩토리", logo: "GF" },
  { id: "nuarin", name: "누아린", category: "누아린", logo: "NR" },
  { id: "studio17", name: "스튜디오17", category: "스튜디오17", logo: "S7" },
  { id: "voidella", name: "보이델라", category: "보이델라", logo: "VD" },
  { id: "aroundme", name: "AROUND ME", category: "AROUND ME", logo: "AM" },
  { id: "eganiks", name: "이가닉스", category: "이가닉스", logo: "EG" },
  { id: "kwailnara", name: "과일나라", category: "과일나라", logo: "KN" },
  { id: "amorepacific", name: "아모레퍼시픽", category: "아모레퍼시픽", logo: "AP" },
  { id: "lgcare", name: "LG생활건강", category: "LG생활건강", logo: "LG" },
  { id: "cosmax", name: "코스맥스", category: "코스맥스", logo: "CM" },
  { id: "doctorjart", name: "닥터자르트", category: "닥터자르트", logo: "DJ" },
];

export default function BrandModal({ isOpen, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  if (!isOpen) return null;

  const filtered = BRAND_LIST.filter((b) =>
    b.name.toLowerCase().includes(query.toLowerCase())
  );

  const toggleBrand = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    onClose();
  };

  return (
    <div className="cv-overlay" onClick={onClose}>
      <div className="cv-modal brand-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cv-header">
          <div style={{ width: 36 }} />
          <h2 className="cv-title">관심 브랜드</h2>
          <button className="cv-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="cv-body">
          {/* 검색 */}
          <div className="brand-search-box">
            <Search size={16} className="brand-search-icon" />
            <input
              className="brand-search-input"
              placeholder="브랜드명을 검색해 주세요."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* 선택된 브랜드 태그 */}
          {selected.length > 0 && (
            <div className="brand-selected-tags">
              {selected.map((id) => {
                const brand = BRAND_LIST.find((b) => b.id === id);
                if (!brand) return null;
                return (
                  <span key={id} className="brand-selected-tag">
                    {brand.name}
                    <button onClick={() => toggleBrand(id)}><X size={12} /></button>
                  </span>
                );
              })}
            </div>
          )}

          {/* 브랜드 그리드 */}
          <div className="brand-grid">
            {filtered.map((brand) => (
              <button
                key={brand.id}
                className={`brand-card ${selected.includes(brand.id) ? "active" : ""}`}
                onClick={() => toggleBrand(brand.id)}
              >
                <div className="brand-logo">{brand.logo}</div>
                <span className="brand-category">{brand.category}</span>
                <span className="brand-name">{brand.name}</span>
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="brand-empty">검색 결과가 없어요</div>
          )}

          <button className="cv-btn-primary" onClick={handleSave}>
            {selected.length > 0 ? `${selected.length}개 브랜드 선택 완료` : "완료"}
          </button>
        </div>
      </div>
    </div>
  );
}
