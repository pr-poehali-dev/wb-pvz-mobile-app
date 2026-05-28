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
  CELL_COUNT,
  hasCellSound,
  getCellSoundName,
  saveCellSound,
  removeCellSound,
  getSoundDataUrlByKey,
  cellKey,
} from "@/lib/soundStore";

interface Props {
  onBack: () => void;
}

type CellSection = "cells" | "main";

export default function SoundSettings({ onBack }: Props) {
  const [section, setSection] = useState<CellSection>("main");

  return section === "cells"
    ? <CellSoundsScreen onBack={() => setSection("main")} />
    : <MainSoundsScreen onBack={onBack} onCells={() => setSection("cells")} />;
}

// ── Основные звуки ─────────────────────────────────────────────────────────

function MainSoundsScreen({ onBack, onCells }: { onBack: () => void; onCells: () => void }) {
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

  useEffect(() => { return () => { setPlaying(null); }; }, []);

  const uploadedCells = Array.from({ length: CELL_COUNT }, (_, i) => i + 1).filter(n => hasCellSound(n)).length;

  return (
    <div className="flex flex-col h-screen bg-[#F5F0FF] max-w-md mx-auto overflow-hidden select-none">
      <div className="h-10" />

      <div className="flex items-center px-4 pb-4 gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm active:scale-95 transition-transform">
          <Icon name="ChevronLeft" size={20} className="text-gray-700" />
        </button>
        <div>
          <div className="text-[17px] font-bold text-gray-900">Система озвучки</div>
          <div className="text-[12px] text-gray-500">Загрузите аудиофайлы с телефона</div>
        </div>
      </div>

      {/* Flow */}
      <div className="mx-4 mb-4 bg-white rounded-2xl p-4" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Цепочка воспроизведения</div>
        <div className="flex items-center gap-1 flex-wrap text-[11px] font-semibold">
          <span className="bg-[#F0E6FF] text-[#7B00FF] px-2 py-1 rounded-lg">Ячейка №</span>
          <Icon name="ArrowRight" size={12} className="text-gray-300" />
          <span className="bg-[#F0E6FF] text-[#7B00FF] px-2 py-1 rounded-lg">Кол-во</span>
          <Icon name="ArrowRight" size={12} className="text-gray-300" />
          <span className="bg-[#F0E6FF] text-[#7B00FF] px-2 py-1 rounded-lg">Проверьте</span>
          <Icon name="ArrowRight" size={12} className="text-gray-300" />
          <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-lg">Звук × товары</span>
          <Icon name="ArrowRight" size={12} className="text-gray-300" />
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg">Спасибо</span>
        </div>
        <div className="text-[10px] text-gray-400 mt-2">Звук товара играет при нажатии «Выбрать все»</div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-6">

        {/* Cells button */}
        <button
          onClick={onCells}
          className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 active:scale-95 transition-transform"
          style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
        >
          <div className="w-11 h-11 rounded-2xl bg-[#F0E6FF] flex items-center justify-center flex-shrink-0">
            <Icon name="MapPin" size={22} className="text-[#7B00FF]" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-[14px] font-bold text-gray-900">Ячейки 1–200</div>
            <div className="text-[12px] text-gray-400">
              {uploadedCells > 0 ? `Загружено ${uploadedCells} из ${CELL_COUNT}` : "Нет загруженных озвучек"}
            </div>
          </div>
          <Icon name="ChevronRight" size={18} className="text-gray-400" />
        </button>

        {/* Main sounds */}
        {SOUND_KEYS.map((key, i) => {
          const meta = SOUND_META[key];
          const uploaded = statuses[key];
          const name = names[key];
          const isLast = key === "thanks_for_order_rate_pickpoint";

          return (
            <div key={key}>
              {isLast && (
                <div className="flex items-center gap-2 py-1">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">При выдаче</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              )}
              <div className="bg-white rounded-2xl p-4" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
                <div className="flex items-start gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-black flex-shrink-0 mt-0.5"
                    style={{ background: uploaded ? "#7B00FF" : "#F0E6FF", color: uploaded ? "#fff" : "#7B00FF" }}
                  >
                    {uploaded ? <Icon name="Check" size={13} /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold text-gray-900">{meta.label}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{meta.desc}</div>
                    {uploaded && name && (
                      <div className="flex items-center gap-1.5 mt-2 bg-[#F5F0FF] rounded-xl px-3 py-2">
                        <Icon name="Music" size={13} className="text-[#7B00FF] flex-shrink-0" />
                        <span className="text-[11px] text-[#7B00FF] font-semibold truncate">{name}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => fileRefs.current[key]?.click()}
                    disabled={loading === key}
                    className="flex-1 h-10 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    style={{ background: uploaded ? "#F5F0FF" : "#7B00FF", color: uploaded ? "#7B00FF" : "#fff" }}
                  >
                    {loading === key ? <Icon name="Loader2" size={15} className="animate-spin" /> : <Icon name={uploaded ? "RefreshCw" : "Upload"} size={15} />}
                    {uploaded ? "Заменить" : "Загрузить"}
                  </button>
                  {uploaded && (
                    <button onClick={() => handlePreview(key)} className={`w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 ${playing === key ? "bg-[#7B00FF]" : "bg-[#F0E6FF]"}`}>
                      <Icon name={playing === key ? "Square" : "Play"} size={15} style={{ color: playing === key ? "#fff" : "#7B00FF" }} />
                    </button>
                  )}
                  {uploaded && (
                    <button onClick={() => handleRemove(key)} className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center active:scale-95">
                      <Icon name="Trash2" size={15} className="text-red-400" />
                    </button>
                  )}
                </div>
                <input ref={(el) => { fileRefs.current[key] = el; }} type="file" accept="audio/*" className="hidden" onChange={(e) => handleFile(key, e.target.files?.[0])} />
              </div>
            </div>
          );
        })}
      </div>

      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-white text-sm font-semibold shadow-xl z-50 animate-slide-up flex items-center gap-2 whitespace-nowrap ${toast.ok ? "bg-[#00C853]" : "bg-[#F44336]"}`}>
          <Icon name={toast.ok ? "CheckCircle" : "AlertCircle"} size={16} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Ячейки 1–200 ──────────────────────────────────────────────────────────

function CellSoundsScreen({ onBack }: { onBack: () => void }) {
  const [statuses, setStatuses] = useState<boolean[]>(
    () => Array.from({ length: CELL_COUNT }, (_, i) => hasCellSound(i + 1))
  );
  const [names, setNames] = useState<(string | null)[]>(
    () => Array.from({ length: CELL_COUNT }, (_, i) => getCellSoundName(i + 1))
  );
  const [loading, setLoading] = useState<number | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [search, setSearch] = useState("");
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2200);
  };

  const refresh = (n: number) => {
    setStatuses(p => { const next = [...p]; next[n - 1] = hasCellSound(n); return next; });
    setNames(p => { const next = [...p]; next[n - 1] = getCellSoundName(n); return next; });
  };

  const handleFile = async (n: number, file: File | undefined) => {
    if (!file) return;
    setLoading(n);
    try {
      await saveCellSound(n, file);
      refresh(n);
      showToast(`Ячейка ${n} сохранена`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Ошибка", false);
    } finally {
      setLoading(null);
    }
  };

  const handleRemove = (n: number) => {
    removeCellSound(n);
    refresh(n);
    const ref = fileRefs.current[n];
    if (ref) ref.value = "";
    showToast(`Ячейка ${n} удалена`, false);
  };

  const handlePreview = async (n: number) => {
    const data = getSoundDataUrlByKey(cellKey(n));
    if (!data) return;
    setPlaying(n);
    const audio = new Audio(data);
    audio.onended = () => setPlaying(null);
    audio.onerror = () => setPlaying(null);
    await audio.play().catch(() => setPlaying(null));
  };

  const filteredNums = Array.from({ length: CELL_COUNT }, (_, i) => i + 1).filter(n => {
    if (!search) return true;
    return String(n).includes(search.trim());
  });

  const uploadedCount = statuses.filter(Boolean).length;

  return (
    <div className="flex flex-col h-screen bg-[#F5F0FF] max-w-md mx-auto overflow-hidden select-none">
      <div className="h-10" />

      <div className="flex items-center px-4 pb-3 gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm active:scale-95 transition-transform">
          <Icon name="ChevronLeft" size={20} className="text-gray-700" />
        </button>
        <div className="flex-1">
          <div className="text-[17px] font-bold text-gray-900">Озвучка ячеек</div>
          <div className="text-[12px] text-gray-500">{uploadedCount} из {CELL_COUNT} загружено</div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 bg-white rounded-2xl px-4 h-11 border border-gray-100">
          <Icon name="Search" size={16} className="text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Найти ячейку..."
            className="flex-1 bg-transparent outline-none text-[14px] text-gray-800 placeholder:text-gray-400"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <Icon name="X" size={14} className="text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mx-4 mb-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#7B00FF] rounded-full transition-all duration-500"
          style={{ width: `${(uploadedCount / CELL_COUNT) * 100}%` }}
        />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="grid grid-cols-1 gap-2">
          {filteredNums.map(n => {
            const uploaded = statuses[n - 1];
            const name = names[n - 1];
            return (
              <div key={n} className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3" style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                {/* Number badge */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-[15px] flex-shrink-0"
                  style={{ background: uploaded ? "#7B00FF" : "#F0E6FF", color: uploaded ? "#fff" : "#7B00FF" }}
                >
                  {n}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-gray-900">Ячейка {n}</div>
                  {uploaded && name ? (
                    <div className="text-[11px] text-[#7B00FF] truncate">{name}</div>
                  ) : (
                    <div className="text-[11px] text-gray-400">Нет озвучки</div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1.5">
                  <button
                    onClick={() => fileRefs.current[n]?.click()}
                    disabled={loading === n}
                    className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-all"
                    style={{ background: uploaded ? "#F5F0FF" : "#7B00FF" }}
                  >
                    {loading === n
                      ? <Icon name="Loader2" size={14} className="animate-spin" style={{ color: uploaded ? "#7B00FF" : "#fff" }} />
                      : <Icon name={uploaded ? "RefreshCw" : "Upload"} size={14} style={{ color: uploaded ? "#7B00FF" : "#fff" }} />
                    }
                  </button>
                  {uploaded && (
                    <button onClick={() => handlePreview(n)} className={`w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 ${playing === n ? "bg-[#7B00FF]" : "bg-[#F0E6FF]"}`}>
                      <Icon name={playing === n ? "Square" : "Play"} size={14} style={{ color: playing === n ? "#fff" : "#7B00FF" }} />
                    </button>
                  )}
                  {uploaded && (
                    <button onClick={() => handleRemove(n)} className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center active:scale-95">
                      <Icon name="Trash2" size={14} className="text-red-400" />
                    </button>
                  )}
                </div>

                <input ref={el => { fileRefs.current[n] = el; }} type="file" accept="audio/*" className="hidden" onChange={e => handleFile(n, e.target.files?.[0])} />
              </div>
            );
          })}
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-white text-sm font-semibold shadow-xl z-50 animate-slide-up flex items-center gap-2 whitespace-nowrap ${toast.ok ? "bg-[#00C853]" : "bg-[#F44336]"}`}>
          <Icon name={toast.ok ? "CheckCircle" : "AlertCircle"} size={16} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}
