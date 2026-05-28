import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import {
  SOUND_KEYS,
  SOUND_META,
  SoundKey,
  saveSound,
  removeSound,
  getSoundName,
  hasSound,
  getSoundDataUrl,
} from "@/lib/soundStore";

interface Props {
  onBack: () => void;
}

export default function SoundSettings({ onBack }: Props) {
  const [statuses, setStatuses] = useState<Record<SoundKey, boolean>>(
    () => Object.fromEntries(SOUND_KEYS.map((k) => [k, hasSound(k)])) as Record<SoundKey, boolean>
  );
  const [names, setNames] = useState<Record<SoundKey, string | null>>(
    () => Object.fromEntries(SOUND_KEYS.map((k) => [k, getSoundName(k)])) as Record<SoundKey, string | null>
  );
  const [loading, setLoading] = useState<SoundKey | null>(null);
  const [playing, setPlaying] = useState<SoundKey | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2200);
  };

  const refresh = (key: SoundKey) => {
    setStatuses((p) => ({ ...p, [key]: hasSound(key) }));
    setNames((p) => ({ ...p, [key]: getSoundName(key) }));
  };

  const handleFile = async (key: SoundKey, file: File | undefined) => {
    if (!file) return;
    setLoading(key);
    try {
      await saveSound(key, file);
      refresh(key);
      showToast("Звук сохранён");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Ошибка", false);
    } finally {
      setLoading(null);
    }
  };

  const handleRemove = (key: SoundKey) => {
    removeSound(key);
    refresh(key);
    const ref = fileRefs.current[key];
    if (ref) ref.value = "";
    showToast("Звук удалён", false);
  };

  const handlePreview = async (key: SoundKey) => {
    const data = getSoundDataUrl(key);
    if (!data) return;
    setPlaying(key);
    const audio = new Audio(data);
    audio.onended = () => setPlaying(null);
    audio.onerror = () => setPlaying(null);
    await audio.play().catch(() => setPlaying(null));
  };

  useEffect(() => {
    return () => { setPlaying(null); };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#F5F0FF] max-w-md mx-auto overflow-hidden select-none">
      <div className="h-10" />

      {/* Header */}
      <div className="flex items-center px-4 pb-4 gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm active:scale-95 transition-transform"
        >
          <Icon name="ChevronLeft" size={20} className="text-gray-700" />
        </button>
        <div>
          <div className="text-[17px] font-bold text-gray-900">Система озвучки</div>
          <div className="text-[12px] text-gray-500">Загрузите аудиофайлы с телефона</div>
        </div>
      </div>

      {/* Flow diagram */}
      <div className="mx-4 mb-4 bg-white rounded-2xl p-4" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Цепочка воспроизведения</div>
        <div className="flex items-center gap-1 flex-wrap text-[11px] font-semibold text-gray-600">
          <span className="bg-[#F0E6FF] text-[#7B00FF] px-2 py-1 rounded-lg">Ячейка</span>
          <Icon name="ArrowRight" size={12} className="text-gray-300" />
          <span className="bg-[#F0E6FF] text-[#7B00FF] px-2 py-1 rounded-lg">Кол-во товаров</span>
          <Icon name="ArrowRight" size={12} className="text-gray-300" />
          <span className="bg-[#F0E6FF] text-[#7B00FF] px-2 py-1 rounded-lg">Звук × N</span>
          <Icon name="ArrowRight" size={12} className="text-gray-300" />
          <span className="bg-[#F0E6FF] text-[#7B00FF] px-2 py-1 rounded-lg">Проверьте товар</span>
          <Icon name="ArrowRight" size={12} className="text-gray-300" />
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg">При выдаче</span>
        </div>
      </div>

      {/* Sound slots */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-6">
        {SOUND_KEYS.map((key, i) => {
          const meta = SOUND_META[key];
          const uploaded = statuses[key];
          const name = names[key];
          const isLast = key === "thanks_for_order_rate_pickpoint";

          return (
            <div key={key}>
              {isLast && (
                <div className="flex items-center gap-2 py-2">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">При выдаче</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              )}

              <div
                className="bg-white rounded-2xl p-4 transition-all"
                style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
              >
                {/* Step number + title */}
                <div className="flex items-start gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-black flex-shrink-0 mt-0.5"
                    style={{
                      background: uploaded ? "#7B00FF" : "#F0E6FF",
                      color: uploaded ? "#fff" : "#7B00FF",
                    }}
                  >
                    {uploaded ? <Icon name="Check" size={13} /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold text-gray-900">{meta.label}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{meta.desc}</div>

                    {/* File name */}
                    {uploaded && name && (
                      <div className="flex items-center gap-1.5 mt-2 bg-[#F5F0FF] rounded-xl px-3 py-2">
                        <Icon name="Music" size={13} className="text-[#7B00FF] flex-shrink-0" />
                        <span className="text-[11px] text-[#7B00FF] font-semibold truncate">{name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  {/* Upload */}
                  <button
                    onClick={() => fileRefs.current[key]?.click()}
                    disabled={loading === key}
                    className="flex-1 h-10 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    style={{
                      background: uploaded ? "#F5F0FF" : "#7B00FF",
                      color: uploaded ? "#7B00FF" : "#fff",
                    }}
                  >
                    {loading === key ? (
                      <Icon name="Loader2" size={15} className="animate-spin" />
                    ) : (
                      <Icon name={uploaded ? "RefreshCw" : "Upload"} size={15} />
                    )}
                    {uploaded ? "Заменить" : "Загрузить"}
                  </button>

                  {/* Preview */}
                  {uploaded && (
                    <button
                      onClick={() => handlePreview(key)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                        playing === key ? "bg-[#7B00FF]" : "bg-[#F0E6FF]"
                      }`}
                    >
                      <Icon
                        name={playing === key ? "Square" : "Play"}
                        size={15}
                        style={{ color: playing === key ? "#fff" : "#7B00FF" }}
                      />
                    </button>
                  )}

                  {/* Remove */}
                  {uploaded && (
                    <button
                      onClick={() => handleRemove(key)}
                      className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center transition-all active:scale-95"
                    >
                      <Icon name="Trash2" size={15} className="text-red-400" />
                    </button>
                  )}
                </div>

                {/* Hidden file input */}
                <input
                  ref={(el) => { fileRefs.current[key] = el; }}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => handleFile(key, e.target.files?.[0])}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-white text-sm font-semibold shadow-xl z-50 animate-slide-up flex items-center gap-2 whitespace-nowrap ${
            toast.ok ? "bg-[#00C853]" : "bg-[#F44336]"
          }`}
        >
          <Icon name={toast.ok ? "CheckCircle" : "AlertCircle"} size={16} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}
