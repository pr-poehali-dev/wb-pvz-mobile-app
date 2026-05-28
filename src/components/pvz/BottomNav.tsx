import Icon from "@/components/ui/icon";
import { Tab, Order, TAB_CONFIG } from "@/types/pvz";

interface Props {
  tab: Tab;
  orders: Record<Tab, Order[]>;
  onTabChange: (t: Tab) => void;
}

export default function BottomNav({ tab, orders, onTabChange }: Props) {
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
