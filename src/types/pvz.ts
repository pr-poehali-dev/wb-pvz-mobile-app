export type Tab = "accept" | "issue" | "return" | "more";
export type Screen = "main" | "order" | "soundSettings";

export interface GoodItem {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  price: number;
  tags: string[];
  checked: boolean;
  image?: string;
}

export interface Order {
  id: string;
  barcode: string;
  customer: string;
  phone: string;
  cell: number;          // номер ячейки — всегда число
  items: number;
  status: "pending" | "done";
  time: string;
  goods: GoodItem[];
  paymentOnDelivery?: boolean;
}

export const TAB_CONFIG: Record<Tab, { label: string; icon: string }> = {
  accept: { label: "Принять",  icon: "Package"        },
  issue:  { label: "Выдать",   icon: "Users"          },
  return: { label: "Вернуть",  icon: "RotateCcw"      },
  more:   { label: "Ещё",      icon: "MoreHorizontal" },
};

export const TAB_TITLES: Record<Tab, string> = {
  accept: "Принять", issue: "Выдать", return: "Вернуть", more: "Ещё",
};

export const TAB_SUBTITLES: Record<Tab, string> = {
  accept: "На примерке 0", issue: "На примерке 0", return: "Возвратов 0", more: "",
};

export const SCAN_HINTS: Record<Tab, string> = {
  accept: "Отсканируйте QR-код\nпосылки или накладную",
  issue:  "Отсканируйте QR-код\nклиента или курьера",
  return: "Отсканируйте QR-код\nвозвратной посылки",
  more:   "",
};

export const MOCK_ORDERS: Record<Tab, Order[]> = {
  accept: [
    {
      id: "1", barcode: "WB-4821930", customer: "Анна К.", phone: "+7 (***) *** 14-03",
      cell: 14, items: 3, status: "pending", time: "10:14",
      goods: [
        { id: "g1", barcode: "12345678", name: "Платье летнее", brand: "Zara", price: 3200, tags: ["НЕ ОПЛАЧЕН"], checked: false },
        { id: "g2", barcode: "12345679", name: "Блузка шёлк", brand: "H&M", price: 1800, tags: [], checked: false },
        { id: "g3", barcode: "12345680", name: "Юбка миди", brand: "Mango", price: 2400, tags: [], checked: false },
      ],
    },
    {
      id: "2", barcode: "WB-3940182", customer: "Михаил Р.", phone: "+7 (***) *** 22-11",
      cell: 7, items: 1, status: "done", time: "09:52",
      goods: [
        { id: "g4", barcode: "99887766", name: "Кроссовки", brand: "Nike", price: 8900, tags: [], checked: true },
      ],
    },
  ],
  issue: [
    {
      id: "4", barcode: "WB-9102847", customer: "Дмитрий В.", phone: "+7 (***) *** 24-03",
      cell: 2, items: 2, status: "pending", time: "10:22", paymentOnDelivery: true,
      goods: [
        { id: "g5", barcode: "12345678", name: "Кеды", brand: "Pepe Jeans", price: 7000, tags: ["НЕ ОПЛАЧЕН", "НЕВОЗВРАТНЫЙ"], checked: false },
        { id: "g6", barcode: "12345678", name: "Носки (3 пары)", brand: "Calvin Klein", price: 1200, tags: [], checked: false },
      ],
    },
    {
      id: "5", barcode: "WB-5534901", customer: "Ольга Б.", phone: "+7 (***) *** 55-90",
      cell: 3, items: 1, status: "done", time: "10:05",
      goods: [
        { id: "g7", barcode: "55544433", name: "Сумка кожаная", brand: "Guess", price: 12000, tags: [], checked: true },
      ],
    },
  ],
  return: [
    {
      id: "6", barcode: "WB-2290481", customer: "Иван С.", phone: "+7 (***) *** 81-22",
      cell: 11, items: 1, status: "pending", time: "10:18",
      goods: [
        { id: "g8", barcode: "44433322", name: "Джинсы slim", brand: "Levi's", price: 5400, tags: ["ВОЗВРАТ"], checked: false },
      ],
    },
  ],
  more: [],
};

export function playBeep(type: "success" | "error" | "scan") {
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
