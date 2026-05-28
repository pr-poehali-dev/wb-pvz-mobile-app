import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import SoundSettings from "@/components/SoundSettings";
import { playIssueSequence, playIssueComplete } from "@/lib/soundStore";

type Tab = "accept" | "issue" | "return" | "more";

interface Order {
  id: string;
  barcode: string;
  customer: string;
  items: number;
  status: "pending" | "done";
  time: string;
}

const MOCK_ORDERS: Record<Tab, Order[]> = {
  accept: [
    { id: "1", barcode: "WB-4821930", customer: "Анна К.", items: 3, status: "pending", time: "10:14" },
    { id: "2", barcode: "WB-3940182", customer: "Михаил Р.", items: 1, status: "done", time: "09:52" },
    { id: "3", barcode: "WB-7621044", customer: "Светлана О.", items: 2, status: "pending", time: "09:30" },
  ],
  issue: [
    { id: "4", barcode: "WB-9102847", customer: "Дмитрий В.", items: 2, status: "pending", time: "10:22" },
    { id: "5", barcode: "WB-5534901", customer: "Ольга Б.", items: 1, status: "done", time: "10:05" },
  ],
  return: [
    { id: "6", barcode: "WB-2290481", customer: "Иван С.", items: 1, status: "pending", time: "10:18" },
  ],
  more: [],
};

function playBeep(type: "success" | "error" | "scan") {
  const AudioCtx: typeof AudioContext =
    window.AudioContext ||
    (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g);
  g.connect(ctx.destination);
  if (type === "success") {
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.3);
  } else if (type === "error") {
    o.type = "sawtooth";
    o.frequency.setValueAtTime(300, ctx.currentTime);
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.4);
  } else {
    o.frequency.setValueAtTime(660, ctx.currentTime);
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.15);
  }
}

const TAB_CONFIG = {
  accept: { label: "Принять",  icon: "Package"         },
  issue:  { label: "Выдать",   icon: "Users"           },
  return: { label: "Вернуть",  icon: "RotateCcw"       },
  more:   { label: "Ещё",      icon: "MoreHorizontal"  },
};

const TAB_TITLES: Record<Tab, string> = {
  accept: "Принять",
  issue:  "Выдать",
  return: "Вернуть",
  more:   "Ещё",
};

const TAB_SUBTITLES: Record<Tab, string> = {
  accept: "На примерке 0",
  issue:  "На примерке 0",
  return: "Возвратов 0",
  more:   "",
};

const SCAN_HINTS: Record<Tab, string> = {
  accept: "Отсканируйте QR-код\nпосылки или накладную",
  issue:  "Отсканируйте QR-код\nклиента или курьера",
  return: "Отсканируйте QR-код\nвозвратной посылки",
  more:   "",
};

type Screen = "main" | "list" | "soundSettings";

export default function Index() {
  const [tab, setTab] = useState<Tab>("issue");
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [scanValue, setScanValue] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("main");
  const inputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, type: "success" | "error") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const handleScan = useCallback(() => {
    const val = scanValue.trim();
    if (!val) return;
    const found = orders[tab].find(o => o.barcode.toLowerCase() === val.toLowerCase());
    if (found) {
      playBeep("success");
      setScannedId(found.id);
      setOrders(prev => ({
        ...prev,
        [tab]: prev[tab].map(o => o.id === found.id ? { ...o, status: "done" } : o),
      }));
      showToast(`Заказ ${found.barcode} обработан`, "success");
      if (tab === "issue") {
        playIssueSequence(found.items);
      }
      setTimeout(() => setScannedId(null), 1500);
    } else {
      playBeep("error");
      showToast("Заказ не найден", "error");
    }
    setScanValue("");
    inputRef.current?.focus();
  }, [scanValue, orders, tab, showToast]);

  const handleIssue = () => {
    playBeep("success");
    playIssueComplete();
    showToast("Заказ выдан клиенту", "success");
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setScanValue("");
    setScannedId(null);
    setScreen("main");
  };

  useEffect(() => {
    if (screen === "main") inputRef.current?.focus();
  }, [screen]);

  const currentOrders = orders[tab];
  const pendingCount = currentOrders.filter(o => o.status === "pending").length;

  if (screen === "soundSettings") {
    return <SoundSettings onBack={() => setScreen("main")} />;
  }

  if (screen === "list" && tab !== "more") {
    return (
      <ListScreen
        tab={tab}
        orders={currentOrders}
        scannedId={scannedId}
        onBack={() => setScreen("main")}
        onTabChange={handleTabChange}
        onIssue={tab === "issue" ? handleIssue : undefined}
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

      {/* Main area */}
      {tab === "more" ? (
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <MoreScreen onSoundSettings={() => setScreen("soundSettings")} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* QR frame */}
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

          <input
            ref={inputRef}
            value={scanValue}
            onChange={e => setScanValue(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleScan()}
            className="opacity-0 absolute w-0 h-0"
            autoFocus
          />
        </div>
      )}

      {/* Bottom buttons */}
      {tab !== "more" && (
        <div className="px-4 pb-4 pt-2">
          <div className="flex gap-3">
            <button
              onClick={() => setScreen("list")}
              className="w-14 h-14 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm active:scale-95 transition-transform relative"
            >
              <Icon name="MoreVertical" size={20} className="text-gray-500" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#7B00FF] text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { playBeep("scan"); inputRef.current?.focus(); }}
              className="flex-1 h-14 rounded-2xl bg-[#7B00FF] text-white font-bold text-[16px] flex items-center justify-center gap-2.5 shadow-lg shadow-purple-200 active:scale-95 transition-transform"
            >
              <Icon name="ScanLine" size={20} />
              Сканировать QR
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <BottomNav tab={tab} orders={orders} onTabChange={handleTabChange} />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-28 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-white text-sm font-semibold shadow-2xl z-50 animate-slide-up flex items-center gap-2 whitespace-nowrap ${
            toast.type === "success" ? "bg-[#00C853]" : "bg-[#F44336]"
          }`}
        >
          <Icon name={toast.type === "success" ? "CheckCircle" : "AlertCircle"} size={16} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function BottomNav({ tab, orders, onTabChange }: {
  tab: Tab;
  orders: Record<Tab, Order[]>;
  onTabChange: (t: Tab) => void;
}) {
  return (
    <div className="bg-white border-t border-gray-100 pb-5">
      <div className="flex">
        {(Object.keys(TAB_CONFIG) as Tab[]).map((t) => {
          const c = TAB_CONFIG[t];
          const isActive = tab === t;
          const cnt = t !== "more" ? orders[t].filter(o => o.status === "pending").length : 0;
          return (
            <button
              key={t}
              onClick={() => onTabChange(t)}
              className="flex-1 flex flex-col items-center pt-3 pb-1 gap-1 transition-all duration-150 active:scale-95 relative"
            >
              <div className="relative">
                <Icon
                  name={c.icon}
                  size={22}
                  style={{ color: isActive ? "#7B00FF" : "#BDBDBD" }}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {cnt > 0 && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-[#7B00FF] text-white text-[9px] font-bold flex items-center justify-center">
                    {cnt}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold" style={{ color: isActive ? "#7B00FF" : "#BDBDBD" }}>
                {c.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-[#7B00FF]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ListScreen({ tab, orders, scannedId, onBack, onTabChange, onIssue }: {
  tab: Tab;
  orders: Order[];
  scannedId: string | null;
  onBack: () => void;
  onTabChange: (t: Tab) => void;
  onIssue?: () => void;
}) {
  const cfg = TAB_CONFIG[tab];
  const done = orders.filter(o => o.status === "done").length;
  const total = orders.length;
  const allDone = done === total && total > 0;

  return (
    <div className="flex flex-col h-screen bg-[#F5F0FF] max-w-md mx-auto overflow-hidden select-none">
      <div className="h-10" />
      <div className="flex items-center px-4 pb-3 gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm active:scale-95 transition-transform"
        >
          <Icon name="ChevronLeft" size={20} className="text-gray-700" />
        </button>
        <div className="flex-1">
          <div className="text-[17px] font-bold text-gray-900">{TAB_TITLES[tab]}</div>
          <div className="text-[12px] text-gray-500">Выполнено {done} из {total}</div>
        </div>
      </div>

      <div className="mx-4 mb-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#7B00FF] rounded-full transition-all duration-500"
          style={{ width: total > 0 ? `${(done / total) * 100}%` : "0%" }}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2.5">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center shadow-sm">
              <Icon name={cfg.icon} size={28} className="text-[#7B00FF]" />
            </div>
            <p className="text-sm font-semibold text-gray-400">Список пуст</p>
          </div>
        ) : (
          orders.map((order, i) => {
            const isDone = order.status === "done";
            const isHighlighted = scannedId === order.id;
            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl px-4 py-3.5 transition-all duration-300 animate-fade-in ${
                  isHighlighted ? "ring-2 ring-[#7B00FF] scale-[1.02]" : ""
                } ${isDone ? "opacity-50" : ""}`}
                style={{ animationDelay: `${i * 50}ms`, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDone ? "bg-gray-100" : "bg-[#F0E6FF]"}`}>
                    <Icon name={cfg.icon} size={18} style={{ color: isDone ? "#BDBDBD" : "#7B00FF" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-gray-900">{order.barcode}</span>
                      {isDone && (
                        <span className="text-[10px] font-bold text-[#00C853] bg-green-50 px-2 py-0.5 rounded-full">✓ Готово</span>
                      )}
                    </div>
                    <div className="text-[12px] text-gray-500 mt-0.5">
                      {order.customer} · {order.items} {order.items === 1 ? "товар" : "товара"}
                    </div>
                  </div>
                  <span className="text-[12px] text-gray-400">{order.time}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Issue button — only for "Выдать" tab when all done */}
      {onIssue && allDone && (
        <div className="px-4 pb-4 pt-2">
          <button
            onClick={onIssue}
            className="w-full h-14 rounded-2xl bg-[#00C853] text-white font-bold text-[16px] flex items-center justify-center gap-2.5 shadow-lg shadow-green-200 active:scale-95 transition-transform"
          >
            <Icon name="CheckCircle" size={20} />
            Выдать заказ
          </button>
        </div>
      )}

      <div className="bg-white border-t border-gray-100 pb-5">
        <div className="flex">
          {(Object.keys(TAB_CONFIG) as Tab[]).map((t) => {
            const c = TAB_CONFIG[t];
            const isActive = tab === t;
            return (
              <button
                key={t}
                onClick={() => onTabChange(t)}
                className="flex-1 flex flex-col items-center pt-3 pb-1 gap-1 active:scale-95 transition-all duration-150 relative"
              >
                <Icon name={c.icon} size={22} style={{ color: isActive ? "#7B00FF" : "#BDBDBD" }} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[10px] font-semibold" style={{ color: isActive ? "#7B00FF" : "#BDBDBD" }}>{c.label}</span>
                {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-[#7B00FF]" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MoreScreen({ onSoundSettings }: { onSoundSettings: () => void }) {
  const items = [
    { icon: "BarChart3",  label: "Статистика",  desc: "Отчёты за день/неделю",   color: "#7B00FF", bg: "#F0E6FF", action: undefined },
    { icon: "Package",    label: "Склад",        desc: "Остатки на складе",        color: "#2196F3", bg: "#E3F2FD", action: undefined },
    { icon: "Users",      label: "Сотрудники",   desc: "Управление доступом",      color: "#FF6D00", bg: "#FFF3E6", action: undefined },
    { icon: "Volume2",    label: "Озвучка",      desc: "Настройка голосовых звуков", color: "#7B00FF", bg: "#F0E6FF", action: onSoundSettings },
    { icon: "HelpCircle", label: "Поддержка",    desc: "Чат с WB",                 color: "#00C853", bg: "#E8F9EE", action: undefined },
    { icon: "LogOut",     label: "Выйти",        desc: "Смена пользователя",       color: "#F44336", bg: "#FFEBEE", action: undefined },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 animate-fade-in">
      {items.map((item, i) => (
        <button
          key={i}
          onClick={item.action}
          className="bg-white rounded-2xl p-4 text-left active:scale-95 transition-transform relative"
          style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
        >
          {item.label === "Озвучка" && (
            <span className="absolute top-3 right-3 text-[9px] font-bold bg-[#7B00FF] text-white px-1.5 py-0.5 rounded-full">NEW</span>
          )}
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3" style={{ background: item.bg }}>
            <Icon name={item.icon} size={22} style={{ color: item.color }} />
          </div>
          <div className="text-[14px] font-bold text-gray-900">{item.label}</div>
          <div className="text-[12px] text-gray-400 mt-0.5">{item.desc}</div>
        </button>
      ))}
    </div>
  );
}