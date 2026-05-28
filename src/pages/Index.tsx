import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

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
   
  const AudioCtx: typeof AudioContext = window.AudioContext || (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext;
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
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.3);
  } else if (type === "error") {
    o.type = "sawtooth";
    o.frequency.setValueAtTime(300, ctx.currentTime);
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.4);
  } else {
    o.frequency.setValueAtTime(660, ctx.currentTime);
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.15);
  }
}

const TAB_CONFIG = {
  accept:  { label: "Принять", icon: "PackageCheck",  color: "#7B00FF", bg: "#F0E6FF" },
  issue:   { label: "Выдать",  icon: "PackageOpen",   color: "#00C853", bg: "#E8F9EE" },
  return:  { label: "Вернуть", icon: "PackageMinus",  color: "#FF6D00", bg: "#FFF3E6" },
  more:    { label: "Ещё",     icon: "Grid3x3",       color: "#607D8B", bg: "#ECEFF1" },
};

export default function Index() {
  const [tab, setTab] = useState<Tab>("accept");
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [scanning, setScanning] = useState(false);
  const [scanValue, setScanValue] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [scannedId, setScannedId] = useState<string | null>(null);
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

    const found = orders[tab].find(
      (o) => o.barcode.toLowerCase() === val.toLowerCase()
    );

    if (found) {
      playBeep("success");
      setScannedId(found.id);
      setOrders((prev) => ({
        ...prev,
        [tab]: prev[tab].map((o) =>
          o.id === found.id ? { ...o, status: "done" } : o
        ),
      }));
      showToast(`Заказ ${found.barcode} обработан`, "success");
      setTimeout(() => setScannedId(null), 1500);
    } else {
      playBeep("error");
      showToast("Заказ не найден", "error");
    }

    setScanValue("");
    inputRef.current?.focus();
  }, [scanValue, orders, tab, showToast]);

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setScanValue("");
    setScannedId(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const currentOrders = orders[tab];
  const doneCount = currentOrders.filter((o) => o.status === "done").length;
  const pendingCount = currentOrders.filter((o) => o.status === "pending").length;
  const cfg = TAB_CONFIG[tab];

  return (
    <div className="flex flex-col h-screen bg-[#F4F0FA] max-w-md mx-auto relative overflow-hidden">

      {/* Header */}
      <div className="wb-gradient text-white px-4 pt-10 pb-5 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #fff 0%, transparent 55%)" }}
        />
        <div className="flex items-center justify-between relative z-10">
          <div>
            <div className="text-[11px] font-medium opacity-70 mb-0.5 tracking-wide uppercase">Wildberries ПВЗ</div>
            <div className="text-2xl font-black tracking-tight">Точка выдачи</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white/20 rounded-xl px-3 py-1.5 text-xs font-bold backdrop-blur-sm">№4821</div>
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Icon name="Bell" size={17} />
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 mt-4 relative z-10">
          {[
            { val: doneCount,           label: "Выполнено" },
            { val: pendingCount,        label: "Ожидает"   },
            { val: currentOrders.length, label: "Всего"    },
          ].map((s) => (
            <div key={s.label} className="flex-1 bg-white/15 backdrop-blur-sm rounded-2xl p-3 border border-white/20">
              <div className="text-2xl font-black">{s.val}</div>
              <div className="text-[11px] opacity-75 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scan bar */}
      <div className="px-4 bg-white shadow-sm">
        <div className="py-3">
          <div
            className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-all duration-200 ${
              scanning ? "border-[#7B00FF] bg-purple-50" : "border-[#E8E0F0] bg-[#FAFAFA]"
            }`}
            onClick={() => { setScanning(true); inputRef.current?.focus(); }}
          >
            <Icon name="ScanLine" size={20} className={scanning ? "text-[#7B00FF]" : "text-gray-400"} />
            <input
              ref={inputRef}
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScan()}
              onFocus={() => setScanning(true)}
              onBlur={() => setScanning(false)}
              placeholder="Сканируйте штрихкод..."
              className="flex-1 bg-transparent outline-none text-sm font-medium placeholder:text-gray-400 text-gray-800"
            />
            {scanValue && (
              <button
                onMouseDown={(e) => { e.preventDefault(); handleScan(); }}
                className="w-8 h-8 rounded-xl bg-[#7B00FF] flex items-center justify-center text-white transition-transform active:scale-95"
              >
                <Icon name="ArrowRight" size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Orders list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {tab === "more" ? (
          <MoreScreen />
        ) : (
          <>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                {cfg.label} — заказы
              </span>
              <span className="text-[11px] text-gray-400">{new Date().toLocaleDateString("ru-RU")}</span>
            </div>

            {currentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
                <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-3" style={{ background: cfg.bg }}>
                  <Icon name={cfg.icon} size={28} style={{ color: cfg.color }} />
                </div>
                <div className="text-sm font-semibold text-gray-500">Список пуст</div>
                <div className="text-xs text-gray-400 mt-1">Отсканируйте штрихкод заказа</div>
              </div>
            ) : (
              currentOrders.map((order, i) => (
                <OrderCard key={order.id} order={order} tab={tab} highlighted={scannedId === order.id} delay={i * 60} />
              ))
            )}
          </>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="bg-white border-t border-gray-100">
        <div className="flex pb-2">
          {(Object.keys(TAB_CONFIG) as Tab[]).map((t) => {
            const c = TAB_CONFIG[t];
            const isActive = tab === t;
            return (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                className="flex-1 flex flex-col items-center pt-2 gap-0.5 transition-all duration-150 active:scale-95"
              >
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 ${isActive ? "scale-105" : ""}`}
                  style={{ background: isActive ? c.bg : "transparent" }}
                >
                  <Icon name={c.icon} size={20} style={{ color: isActive ? c.color : "#BDBDBD" }} />
                </div>
                <span className="text-[10px] font-semibold" style={{ color: isActive ? c.color : "#BDBDBD" }}>
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-white text-sm font-semibold shadow-2xl z-50 animate-slide-up flex items-center gap-2 whitespace-nowrap ${
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

function OrderCard({ order, tab, highlighted, delay }: {
  order: Order; tab: Tab; highlighted: boolean; delay: number;
}) {
  const cfg = TAB_CONFIG[tab];
  const isDone = order.status === "done";

  return (
    <div
      className={`bg-white rounded-2xl p-4 card-shadow transition-all duration-300 animate-fade-in ${
        highlighted ? "ring-2 ring-[#7B00FF] scale-[1.02]" : ""
      } ${isDone ? "opacity-55" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: isDone ? "#F5F5F5" : cfg.bg }}
        >
          <Icon name={cfg.icon} size={20} style={{ color: isDone ? "#BDBDBD" : cfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-900">{order.barcode}</span>
            {isDone && (
              <span className="text-[10px] font-bold text-[#00C853] bg-green-50 px-2 py-0.5 rounded-full">✓ Готово</span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{order.customer} · {order.items} {order.items === 1 ? "товар" : "товара"}</div>
        </div>
        <div className="text-xs text-gray-400 flex-shrink-0">{order.time}</div>
      </div>
    </div>
  );
}

function MoreScreen() {
  const items = [
    { icon: "BarChart3",   label: "Статистика",   desc: "Отчёты за день/неделю", color: "#7B00FF", bg: "#F0E6FF" },
    { icon: "Package",     label: "Склад",         desc: "Остатки на складе",    color: "#2196F3", bg: "#E3F2FD" },
    { icon: "Users",       label: "Сотрудники",    desc: "Управление доступом",  color: "#FF6D00", bg: "#FFF3E6" },
    { icon: "Settings",    label: "Настройки",     desc: "Параметры точки",      color: "#607D8B", bg: "#ECEFF1" },
    { icon: "HelpCircle",  label: "Поддержка",     desc: "Чат с WB",             color: "#00C853", bg: "#E8F9EE" },
    { icon: "LogOut",      label: "Выйти",         desc: "Смена пользователя",   color: "#F44336", bg: "#FFEBEE" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 animate-fade-in">
      {items.map((item, i) => (
        <button
          key={i}
          className="bg-white rounded-2xl p-4 card-shadow text-left transition-all duration-150 active:scale-95"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3" style={{ background: item.bg }}>
            <Icon name={item.icon} size={22} style={{ color: item.color }} />
          </div>
          <div className="text-sm font-bold text-gray-900">{item.label}</div>
          <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>
        </button>
      ))}
    </div>
  );
}