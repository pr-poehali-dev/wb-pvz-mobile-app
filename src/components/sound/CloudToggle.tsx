import Icon from "@/components/ui/icon";

interface Props {
  cloud: boolean;
  onChange: (v: boolean) => void;
  syncing: boolean;
}

export default function CloudToggle({ cloud, onChange, syncing }: Props) {
  return (
    <div className="mx-4 mb-4 bg-white rounded-2xl p-4" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cloud ? "bg-[#F0E6FF]" : "bg-gray-100"}`}>
          <Icon name={cloud ? "Cloud" : "HardDrive"} size={20} style={{ color: cloud ? "#7B00FF" : "#9E9E9E" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-bold text-gray-900">
            {cloud ? "Облачное хранилище" : "Локальное устройство"}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {cloud ? "Звуки доступны на всех устройствах" : "Звуки только на этом устройстве"}
          </div>
        </div>
        {syncing ? (
          <Icon name="Loader2" size={18} className="animate-spin text-[#7B00FF]" />
        ) : (
          <button
            onClick={() => onChange(!cloud)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${cloud ? "bg-[#7B00FF]" : "bg-gray-300"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${cloud ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        )}
      </div>
    </div>
  );
}
