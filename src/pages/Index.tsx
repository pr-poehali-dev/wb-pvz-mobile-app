import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import SoundSettings from "@/components/SoundSettings";
import { playIssueSequence, playIssueComplete, playSelectAll } from "@/lib/soundStore";

type Tab = "accept" | "issue" | "return" | "more";

interface GoodItem {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  price: number;
  tags: string[];
  checked: boolean;
  image?: string;
}

interface Order {
  id: string;
  barcode: string;
  customer: string;
  phone: string;
  cell: string;
  items: number;
  status: "pending" | "done";
  time: string;
  goods: GoodItem[];
}

const MOCK_ORDERS: Record<Tab, Order[]> = {
  accept: [
    {
      id: "1", barcode: "WB-4821930", customer: "Анна К.", phone: "+7 (***) *** 14-03",
      cell: "A-14", items: 3, status: "pending", time: "10:14",
      goods: [
        { id: "g1", barcode: "12345678", name: "Платье летнее", brand: "Zara", price: 3200, tags: ["НЕ ОПЛАЧЕН"], checked: false },
        { id: "g2", barcode: "12345679", name: "Блузка шёлк", brand: "H&M", price: 1800, tags: [], checked: false },
        { id: "g3", barcode: "12345680", name: "Юбка миди", brand: "Mango", price: 2400, tags: [], checked: false },
      ],
    },
    {
      id: "2", barcode: "WB-3940182", customer: "Михаил Р.", phone: "+7 (***) *** 22-11",
      cell: "B-07", items: 1, status: "done", time: "09:52",
      goods: [
        { id: "g4", barcode: "99887766", name: "Кроссовки", brand: "Nike", price: 8900, tags: [], checked: true },
      ],
    },
  ],
  issue: [
    {
      id: "4", barcode: "WB-9102847", customer: "Дмитрий В.", phone: "+7 (***) *** 24-03",
      cell: "C-02", items: 2, status: "pending", time: "10:22",
      goods: [
        { id: "g5", barcode: "12345678", name: "Кеды", brand: "Pepe Jeans", price: 7000, tags: ["НЕ ОПЛАЧЕН", "НЕВОЗВРАТНЫЙ"], checked: false },
        { id: "g6", barcode: "12345678", name: "Носки (3 пары)", brand: "Calvin Klein", price: 1200, tags: [], checked: false },
      ],
    },
    {
      id: "5", barcode: "WB-5534901", customer: "Ольга Б.", phone: "+7 (***) *** 55-90",
      cell: "A-03", items: 1, status: "done", time: "10:05",
      goods: [
        { id: "g7", barcode: "55544433", name: "Сумка кожаная", brand: "Guess", price: 12000, tags: [], checked: true },
      ],
    },
  ],
  return: [
    {
      id: "6", barcode: "WB-2290481", customer: "Иван С.", phone: "+7 (***) *** 81-22",
      cell: "D-11", items: 1, status: "pending", time: "10:18",
      goods: [
        { id: "g8", barcode: "44433322", name: "Джинсы slim", brand: "Levi's", price: 5400, tags: ["ВОЗВРАТ"], checked: false },
      ],
    },
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
  accept: { label: "Принять",  icon: "Package"        },
  issue:  { label: "Выдать",   icon: "Users"          },
  return: { label: "Вернуть",  icon: "RotateCcw"      },
  more:   { label: "Ещё",      icon: "MoreHorizontal" },
};

const TAB_TITLES: Record<Tab, string> = {
  accept: "Принять", issue: "Выдать", return: "Вернуть", more: "Ещё",
};

const TAB_SUBTITLES: Record<Tab, string> = {
  accept: "На примерке 0", issue: "На примерке 0", return: "Возвратов 0", more: "",
};

const SCAN_HINTS: Record<Tab, string> = {
  accept: "Отсканируйте QR-код\nпосылки или накладную",
  issue:  "Отсканируйте QR-код\nклиента или курьера",
  return: "Отсканируйте QR-код\nвозвратной посылки",
  more:   "",
};

type Screen = "main" | "order" | "soundSettings";

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
    return <SoundSettings onBack={() => setScreen("main")} />;
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
            <button
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

function OrderScreen({ order, tab, onBack, onTabChange, onIssue, onGoodCheck, onSelectAll, orders, toast }: {
  order: Order;
  tab: Tab;
  onBack: () => void;
  onTabChange: (t: Tab) => void;
  onIssue: () => void;
  onGoodCheck: (id: string) => void;
  onSelectAll: () => void;
  orders: Record<Tab, Order[]>;
  toast: { msg: string; type: "success" | "error" } | null;
}) {
  const checkedCount = order.goods.filter(g => g.checked).length;
  const allChecked = checkedCount === order.goods.length;
  const totalPrice = order.goods.reduce((s, g) => s + g.price, 0);

  useEffect(() => {
    if (tab === "issue") {
      const cellNum = parseInt(order.cell.replace(/\D/g, ""), 10) || 1;
      playIssueSequence(cellNum, order.items);
    }
  }, [order.id, order.items, order.cell, tab]);

  return (
    <div className="flex flex-col h-screen bg-white max-w-md mx-auto overflow-hidden select-none">
      <div className="h-10 bg-white" />

      {/* Top info block */}
      <div className="px-5 pb-4 bg-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-[42px] font-black text-gray-900 leading-none">{totalPrice.toLocaleString("ru-RU")}</span>
              <span className="text-[22px] font-bold text-gray-400">{order.items} шт</span>
            </div>
            <div className="text-[14px] text-gray-500 mt-1">{order.phone}</div>
          </div>
          <button className="w-10 h-10 rounded-xl bg-[#F0E6FF] flex items-center justify-center mt-1">
            <Icon name="Volume2" size={20} className="text-[#7B00FF]" />
          </button>
        </div>
      </div>

      {/* Ячейка */}
      <div className="mx-5 mb-3 bg-[#F5F0FF] rounded-2xl px-4 py-2.5 flex items-center gap-2">
        <Icon name="MapPin" size={15} className="text-[#7B00FF]" />
        <span className="text-[13px] font-semibold text-[#7B00FF]">Ячейка {order.cell}</span>
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
            {/* Image placeholder */}
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
              <Icon name="ShoppingBag" size={24} className="text-gray-300" />
            </div>

            <div className="flex-1 min-w-0">
              {/* Barcode */}
              <div className="text-[11px] text-gray-400 mb-0.5">
                <span>{good.barcode.slice(0, 8)} </span>
                <span className="font-bold text-gray-700">{good.barcode.slice(8) || good.id.replace("g","") + "01"}</span>
              </div>
              {/* Tags */}
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

            {/* Checkbox */}
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
              onClick={onBack}
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
            <button key={t} onClick={() => onTabChange(t)}
              className="flex-1 flex flex-col items-center pt-3 pb-1 gap-1 transition-all duration-150 active:scale-95 relative"
            >
              <div className="relative">
                <Icon name={c.icon} size={22} style={{ color: isActive ? "#7B00FF" : "#BDBDBD" }} strokeWidth={isActive ? 2.5 : 1.8} />
                {cnt > 0 && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-[#7B00FF] text-white text-[9px] font-bold flex items-center justify-center">{cnt}</span>
                )}
              </div>
              <span className="text-[10px] font-semibold" style={{ color: isActive ? "#7B00FF" : "#BDBDBD" }}>{c.label}</span>
              {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-[#7B00FF]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MoreScreen({ onSoundSettings }: { onSoundSettings: () => void }) {
  const items = [
    { icon: "BarChart3",  label: "Статистика",  desc: "Отчёты за день/неделю",     color: "#7B00FF", bg: "#F0E6FF", action: undefined },
    { icon: "Package",    label: "Склад",        desc: "Остатки на складе",          color: "#2196F3", bg: "#E3F2FD", action: undefined },
    { icon: "Users",      label: "Сотрудники",   desc: "Управление доступом",        color: "#FF6D00", bg: "#FFF3E6", action: undefined },
    { icon: "Volume2",    label: "Озвучка",      desc: "Настройка голосовых звуков", color: "#7B00FF", bg: "#F0E6FF", action: onSoundSettings },
    { icon: "HelpCircle", label: "Поддержка",    desc: "Чат с WB",                   color: "#00C853", bg: "#E8F9EE", action: undefined },
    { icon: "LogOut",     label: "Выйти",        desc: "Смена пользователя",         color: "#F44336", bg: "#FFEBEE", action: undefined },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 animate-fade-in">
      {items.map((item, i) => (
        <button key={i} onClick={item.action}
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