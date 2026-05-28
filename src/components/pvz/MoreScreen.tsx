import Icon from "@/components/ui/icon";

interface Props {
  onSoundSettings: () => void;
}

export default function MoreScreen({ onSoundSettings }: Props) {
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
