"use client";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";

const STATUS_LABELS: Record<string, string> = {
  new: "신규",
  contacted: "연락완료",
  done: "처리완료",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-pink-100 text-pink-700",
  contacted: "bg-yellow-100 text-yellow-700",
  done: "bg-green-100 text-green-700",
};

const PRODUCT_LABELS: Record<string, string> = {
  top_exposure: "공고 상단 노출",
  brand_page: "브랜드 페이지 제작",
  banner: "배너 광고",
  other: "기타 문의",
};

type Inquiry = {
  id: number;
  company_name: string;
  contact_name: string;
  phone: string;
  email: string | null;
  product: string | null;
  message: string;
  status: string;
  created_at: string;
};

export default function AdminAdsPage() {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchData = async (status?: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const qs = status ? `?status=${status}` : "";
      const res = await fetch(`/api/admin/ads/inquiries${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setItems(data.data?.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(filter || undefined);
  }, [filter]);

  const updateStatus = async (id: number, status: string) => {
    setUpdating(true);
    try {
      const token = localStorage.getItem("admin_token");
      await fetch("/api/admin/ads/inquiries", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, status }),
      });
      setSelected((p) => p ? { ...p, status } : p);
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item))
      );
    } finally {
      setUpdating(false);
    }
  };

  return (
    <AdminLayout activeMenu="ads">
      <div className="p-6 w-full max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">광고 문의 목록</h1>
          <div className="flex gap-2">
            {["", "new", "contacted", "done"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  filter === s
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s === "" ? "전체" : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-gray-400">문의가 없습니다.</div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">접수일</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">회사명</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">담당자</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">연락처</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">관심상품</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(item.created_at).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.company_name}</td>
                    <td className="px-4 py-3 text-gray-700">{item.contact_name}</td>
                    <td className="px-4 py-3 text-gray-700">{item.phone}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {item.product ? PRODUCT_LABELS[item.product] ?? item.product : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                        {STATUS_LABELS[item.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 상세 모달 */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">문의 상세</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-gray-500">회사명</span>
                <span className="font-medium">{selected.company_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">담당자</span>
                <span>{selected.contact_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">연락처</span>
                <span>{selected.phone}</span>
              </div>
              {selected.email && (
                <div className="flex justify-between">
                  <span className="text-gray-500">이메일</span>
                  <span>{selected.email}</span>
                </div>
              )}
              {selected.product && (
                <div className="flex justify-between">
                  <span className="text-gray-500">관심상품</span>
                  <span>{PRODUCT_LABELS[selected.product] ?? selected.product}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">접수일</span>
                <span>{new Date(selected.created_at).toLocaleDateString("ko-KR")}</span>
              </div>
              <div>
                <p className="text-gray-500 mb-1">문의 내용</p>
                <p className="bg-gray-50 rounded-lg p-3 text-gray-700 whitespace-pre-wrap">
                  {selected.message}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">상태 변경</p>
              <div className="flex gap-2">
                {["new", "contacted", "done"].map((s) => (
                  <button
                    key={s}
                    disabled={updating || selected.status === s}
                    onClick={() => updateStatus(selected.id, s)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                      selected.status === s
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}