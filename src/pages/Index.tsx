import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import Icon from "@/components/ui/icon";
import BottomNav from "@/components/pvz/BottomNav";
import OrderScreen from "@/components/pvz/OrderScreen";
import MoreScreen from "@/components/pvz/MoreScreen";
import { Tab, Screen, Order, MOCK_ORDERS, TAB_TITLES, TAB_SUBTITLES, SCAN_HINTS, playBeep } from "@/types/pvz";
import { playIssueComplete, playSelectAll } from "@/lib/soundStore";

const SoundSettings = lazy(() => import("@/components/SoundSettings"));

export default function Index() {
  const [tab, setTab] = useState<Tab>("issue");
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [screen, setScreen] = useState<Screen>("main");
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, type: "success" | "error") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const handleScanClick = () => {
    playBeep("scan");
    const pending = orders[tab].filter(o => o.status === "pending");
    if (pending.length > 0) {
      setActiveOrder(pending[0]);
      setScreen("order");
    } else {
      showToast("Нет ожидающих заказов", "error");
    }
  };

  const handleIssue = () => {
    if (!activeOrder) return;
    playBeep("success");
    playIssueComplete();
    setOrders(prev => ({
      ...prev,
      [tab]: prev[tab].map(o => o.id === activeOrder.id ? { ...o, status: "done" } : o),
    }));
    showToast("Заказ выдан клиенту", "success");
    setScreen("main");
    setActiveOrder(null);
  };

  const handleGoodCheck = (goodId: string) => {
    if (!activeOrder) return;
    playBeep("success");
    const updated = {
      ...activeOrder,
      goods: activeOrder.goods.map(g => g.id === goodId ? { ...g, checked: !g.checked } : g),
    };
    setActiveOrder(updated);
    setOrders(prev => ({
      ...prev,
      [tab]: prev[tab].map(o => o.id === activeOrder.id ? updated : o),
    }));
  };

  const handleSelectAll = () => {
    if (!activeOrder) return;
    const allChecked = activeOrder.goods.every(g => g.checked);
    const updated = { ...activeOrder, goods: activeOrder.goods.map(g => ({ ...g, checked: !allChecked })) };
    setActiveOrder(updated);
    setOrders(prev => ({
      ...prev,
      [tab]: prev[tab].map(o => o.id === activeOrder.id ? updated : o),
    }));
    if (!allChecked && tab === "issue") {
      playSelectAll(activeOrder.goods.length);
    }
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setScreen("main");
    setActiveOrder(null);
  };

  useEffect(() => {
    if (screen === "main") inputRef.current?.focus();
  }, [screen]);

  const currentOrders = orders[tab];
  const pendingCount = currentOrders.filter(o => o.status === "pending").length;

  if (screen === "soundSettings") {
    return (
      <Suspense fallback={null}>
        <SoundSettings onBack={() => setScreen("main")} />
      </Suspense>
    );
  }

  if (screen === "order" && activeOrder) {
    return (
      <OrderScreen
        order={activeOrder}
        tab={tab}
        onBack={() => { setScreen("main"); setActiveOrder(null); }}
        onTabChange={handleTabChange}
        onIssue={handleIssue}
        onGoodCheck={handleGoodCheck}
        onSelectAll={handleSelectAll}
        orders={orders}
        toast={toast}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F5F0FF] max-w-md mx-auto relative overflow-hidden select-none">
      <div className="h-10" />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-2">
        <div className="text-center flex-1">
          <div className="text-[17px] font-bold text-gray-900">{TAB_TITLES[tab]}</div>
          <div className="text-[13px] text-gray-500 mt-0.5">{TAB_SUBTITLES[tab]}</div>
        </div>
        <button className="absolute right-5 w-9 h-9 flex items-center justify-center">
          <Icon name="UserCircle2" size={28} className="text-[#7B00FF]" />
        </button>
      </div>

      {tab === "more" ? (
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <MoreScreen onSoundSettings={() => setScreen("soundSettings")} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="relative mb-8">
            <div className="absolute inset-[-20px] rounded-full bg-[#7B00FF]/5" />
            <div className="absolute inset-[-10px] rounded-full bg-[#7B00FF]/8" />
            <div className="w-44 h-44 relative flex items-center justify-center">
              <span className="absolute top-0 left-0 w-9 h-9 border-t-[3.5px] border-l-[3.5px] border-[#7B00FF] rounded-tl-[10px]" />
              <span className="absolute top-0 right-0 w-9 h-9 border-t-[3.5px] border-r-[3.5px] border-[#7B00FF] rounded-tr-[10px]" />
              <span className="absolute bottom-0 left-0 w-9 h-9 border-b-[3.5px] border-l-[3.5px] border-[#7B00FF] rounded-bl-[10px]" />
              <span className="absolute bottom-0 right-0 w-9 h-9 border-b-[3.5px] border-r-[3.5px] border-[#7B00FF] rounded-br-[10px]" />
              <div className="flex flex-col items-center justify-center gap-1.5">
                <div className="flex gap-1.5">
                  <div className="w-11 h-11 rounded-lg border-[3px] border-[#7B00FF] flex items-center justify-center">
                    <div className="w-4 h-4 bg-[#7B00FF] rounded-sm" />
                  </div>
                  <div className="w-11 h-11 rounded-lg border-[3px] border-[#7B00FF] flex items-center justify-center">
                    <div className="grid grid-cols-2 gap-0.5">
                      <div className="w-2 h-2 bg-[#7B00FF] rounded-[2px]" />
                      <div className="w-2 h-2 bg-[#7B00FF] rounded-[2px]" />
                      <div className="w-2 h-2 bg-[#7B00FF] rounded-[2px]" />
                      <div className="w-2 h-2 bg-transparent rounded-[2px]" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-11 h-11 rounded-lg border-[3px] border-[#7B00FF] flex items-center justify-center">
                    <div className="w-4 h-1.5 bg-[#7B00FF] rounded-sm" />
                  </div>
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center">
                    <Icon name="User" size={22} className="text-[#7B00FF]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="text-center mb-8">
            <p className="text-[19px] font-bold text-gray-900 leading-snug whitespace-pre-line">
              {SCAN_HINTS[tab]}
            </p>
          </div>
          <input ref={inputRef} className="opacity-0 absolute w-0 h-0" autoFocus readOnly />
        </div>
      )}

      {tab !== "more" && (
        <div className="px-4 pb-4 pt-2">
          <div className="flex gap-3">
            <button className="w-14 h-14 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm active:scale-95 transition-transform relative">
              <Icon name="MoreVertical" size={20} className="text-gray-500" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#7B00FF] text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={handleScanClick}
              className="flex-1 h-14 rounded-2xl bg-[#7B00FF] text-white font-bold text-[16px] flex items-center justify-center gap-2.5 shadow-lg shadow-purple-200 active:scale-95 transition-transform"
            >
              <Icon name="ScanLine" size={20} />
              Сканировать QR
            </button>
          </div>
        </div>
      )}

      <BottomNav tab={tab} orders={orders} onTabChange={handleTabChange} />

      {toast && (
        <div className={`fixed bottom-28 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-white text-sm font-semibold shadow-2xl z-50 animate-slide-up flex items-center gap-2 whitespace-nowrap ${toast.type === "success" ? "bg-[#00C853]" : "bg-[#F44336]"}`}>
          <Icon name={toast.type === "success" ? "CheckCircle" : "AlertCircle"} size={16} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}