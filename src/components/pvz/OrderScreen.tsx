import { useEffect } from "react";
import Icon from "@/components/ui/icon";
import BottomNav from "@/components/pvz/BottomNav";
import { Tab, Order } from "@/types/pvz";
import { playIssueSequence } from "@/lib/soundStore";

interface Props {
  order: Order;
  tab: Tab;
  onBack: () => void;
  onTabChange: (t: Tab) => void;
  onIssue: () => void;
  onGoodCheck: (id: string) => void;
  onSelectAll: () => void;
  orders: Record<Tab, Order[]>;
  toast: { msg: string; type: "success" | "error" } | null;
}

export default function OrderScreen({
  order, tab, onBack, onTabChange, onIssue, onGoodCheck, onSelectAll, orders, toast,
}: Props) {
  const checkedCount = order.goods.filter(g => g.checked).length;
  const allChecked = checkedCount === order.goods.length;
  const totalPrice = order.goods.reduce((s, g) => s + g.price, 0);

  useEffect(() => {
    if (tab === "issue") {
      // cell теперь число — передаём напрямую
      playIssueSequence(order.cell, order.items, order.paymentOnDelivery ?? false);
    }
  }, [order.id, order.cell, order.items, order.paymentOnDelivery, tab]);

  return (
    <div className="flex flex-col h-screen bg-white max-w-md mx-auto overflow-hidden select-none">
      <div className="h-10 bg-white" />

      {/* Top info block */}
      <div className="px-5 pb-4 bg-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-[42px] font-black text-gray-900 leading-none">{order.cell}</span>
              <span className="text-[20px] font-bold text-gray-300">/</span>
              <span className="text-[28px] font-black text-gray-500 leading-none">{order.items} шт</span>
            </div>
            <div className="text-[14px] text-gray-500 mt-1">{order.phone}</div>
          </div>
          <button className="w-10 h-10 rounded-xl bg-[#F0E6FF] flex items-center justify-center mt-1">
            <Icon name="Volume2" size={20} className="text-[#7B00FF]" />
          </button>
        </div>
      </div>

      {/* Check row */}
      <div className="flex items-center justify-between px-5 py-2">
        <button className="flex items-center gap-2 text-[14px] font-bold text-[#7B00FF]">
          <Icon name="ClipboardCheck" size={16} className="text-[#7B00FF]" />
          Проверить товары
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-gray-500">Выбрать все</span>
          <button
            onClick={onSelectAll}
            className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${allChecked ? "bg-[#7B00FF]" : "border-2 border-gray-300"}`}
          >
            {allChecked && <Icon name="Check" size={13} className="text-white" />}
          </button>
        </div>
      </div>

      {/* Goods list */}
      <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-2">
        {order.goods.map((good, i) => (
          <div
            key={good.id}
            className={`flex items-center gap-3 bg-[#FAFAFA] rounded-2xl p-3 transition-all duration-200 animate-fade-in ${good.checked ? "opacity-50" : ""}`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
              <Icon name="ShoppingBag" size={24} className="text-gray-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-gray-400 mb-0.5">
                <span>{good.barcode.slice(0, 8)} </span>
                <span className="font-bold text-gray-700">{good.barcode.slice(8) || good.id.replace("g", "") + "01"}</span>
              </div>
              {good.tags.length > 0 && (
                <div className="flex gap-1 mb-1 flex-wrap">
                  {good.tags.map(tag => (
                    <span key={tag} className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{
                      background: tag.includes("ОПЛАЧЕН") ? "#FFE5E5" : "#FFE5CC",
                      color: tag.includes("ОПЛАЧЕН") ? "#D32F2F" : "#E65100",
                    }}>{tag}</span>
                  ))}
                </div>
              )}
              <div className="text-[14px] font-bold text-gray-900 truncate">{good.name}</div>
              <div className="text-[12px] text-gray-400">{good.brand}</div>
              <div className="text-[14px] font-bold text-gray-900 mt-0.5">{good.price.toLocaleString("ru-RU")} ₽</div>
            </div>
            <button
              onClick={() => onGoodCheck(good.id)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${good.checked ? "bg-[#7B00FF]" : "border-2 border-gray-300 bg-white"}`}
            >
              {good.checked && <Icon name="Check" size={14} className="text-white" />}
            </button>
          </div>
        ))}
      </div>

      {/* Bottom actions */}
      <div className="px-4 pb-4 pt-2 bg-white border-t border-gray-100">
        <div className="flex gap-3 mb-3">
          <button
            onClick={onBack}
            className="w-14 h-14 rounded-2xl bg-[#F5F0FF] flex items-center justify-center active:scale-95 transition-transform"
          >
            <Icon name="ChevronLeft" size={22} className="text-[#7B00FF]" />
          </button>
          {tab === "issue" ? (
            <button
              onClick={onIssue}
              className="flex-1 h-14 rounded-2xl bg-[#7B00FF] text-white font-bold text-[16px] flex items-center justify-center gap-2 shadow-lg shadow-purple-200 active:scale-95 transition-transform"
            >
              <Icon name="CheckCircle" size={20} />
              Выдать {checkedCount > 0 ? `(${checkedCount}/${order.goods.length})` : ""}
            </button>
          ) : (
            <button
              onClick={onIssue}
              className="flex-1 h-14 rounded-2xl bg-[#7B00FF] text-white font-bold text-[16px] flex items-center justify-center gap-2 shadow-lg shadow-purple-200 active:scale-95 transition-transform"
            >
              <Icon name="Check" size={20} />
              Готово
            </button>
          )}
        </div>
      </div>

      <BottomNav tab={tab} orders={orders} onTabChange={onTabChange} />

      {toast && (
        <div className={`fixed bottom-28 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-white text-sm font-semibold shadow-2xl z-50 animate-slide-up flex items-center gap-2 whitespace-nowrap ${toast.type === "success" ? "bg-[#00C853]" : "bg-[#F44336]"}`}>
          <Icon name={toast.type === "success" ? "CheckCircle" : "AlertCircle"} size={16} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}