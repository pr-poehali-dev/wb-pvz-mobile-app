import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import CloudToggle from "@/components/sound/CloudToggle";
import {
  SOUND_KEYS, SOUND_META, SoundKey,
  saveSound, removeSound, getSoundName, hasSound, getSoundDataUrl,
  CELL_COUNT, hasCellSound,
  QTY_COUNT, hasQtySound,
  isCloudMode, setCloudMode,
  fetchCloudSounds, uploadCloudSound, deleteCloudSound,
} from "@/lib/soundStore";

interface Props {
  onBack: () => void;
  onCells: () => void;
  onQty: () => void;
}

export default function MainSoundsScreen({ onBack, onCells, onQty }: Props) {
  const [cloud, setCloud] = useState(isCloudMode);
  const [syncing, setSyncing] = useState(false);
  const [localStatuses, setLocalStatuses] = useState<Record<SoundKey, boolean>>(
    () => Object.fromEntries(SOUND_KEYS.map(k => [k, hasSound(k)])) as Record<SoundKey, boolean>
  );
  const [localNames, setLocalNames] = useState<Record<SoundKey, string | null>>(
    () => Object.fromEntries(SOUND_KEYS.map(k => [k, getSoundName(k)])) as Record<SoundKey, string | null>
  );
  const [cloudMap, setCloudMap] = useState<Record<string, { name: string; url: string }>>({});
  const [loading, setLoading] = useState<SoundKey | null>(null);
  const [playing, setPlaying] = useState<SoundKey | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  const loadCloud = useCallback(async () => {
    setSyncing(true);
    try {
      const sounds = await fetchCloudSounds();
      const map: Record<string, { name: string; url: string }> = {};
      sounds.forEach(s => { map[s.key] = { name: s.name, url: s.url }; });
      setCloudMap(map);
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => { if (cloud) loadCloud(); }, [cloud, loadCloud]);

  const handleToggleCloud = async (val: boolean) => {
    setCloudMode(val);
    setCloud(val);
    if (val) await loadCloud();
  };

  const refreshLocal = (key: SoundKey) => {
    setLocalStatuses(p => ({ ...p, [key]: hasSound(key) }));
    setLocalNames(p => ({ ...p, [key]: getSoundName(key) }));
  };

  const handleFile = async (key: SoundKey, file: File | undefined) => {
    if (!file) return;
    setLoading(key);
    try {
      if (cloud) {
        await uploadCloudSound(key, file);
        await loadCloud();
        showToast("Звук загружен в облако");
      } else {
        await saveSound(key, file);
        refreshLocal(key);
        showToast("Звук сохранён");
      }
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Ошибка", false);
    } finally {
      setLoading(null);
    }
  };

  const handleRemove = async (key: SoundKey) => {
    if (cloud) {
      await deleteCloudSound(key);
      setCloudMap(p => { const n = { ...p }; delete n[key]; return n; });
      showToast("Звук удалён из облака", false);
    } else {
      removeSound(key);
      refreshLocal(key);
      if (fileRefs.current[key]) fileRefs.current[key]!.value = "";
      showToast("Звук удалён", false);
    }
  };

  const handlePreview = async (key: SoundKey) => {
    setPlaying(key);
    const src = cloud ? cloudMap[key]?.url : getSoundDataUrl(key);
    if (!src) { setPlaying(null); return; }
    const audio = new Audio(src);
    audio.onended = () => setPlaying(null);
    audio.onerror = () => setPlaying(null);
    await audio.play().catch(() => setPlaying(null));
  };

  useEffect(() => { return () => setPlaying(null); }, []);

  const uploadedCells = cloud
    ? Object.keys(cloudMap).filter(k => k.startsWith("cell_")).length
    : Array.from({ length: CELL_COUNT }, (_, i) => i + 1).filter(n => hasCellSound(n)).length;

  const uploadedQty = cloud
    ? Object.keys(cloudMap).filter(k => k.startsWith("qty_")).length
    : Array.from({ length: QTY_COUNT }, (_, i) => i + 1).filter(n => hasQtySound(n)).length;

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
      <div className="mx-4 mb-3 bg-white rounded-2xl p-4" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Цепочка воспроизведения</div>
        <div className="flex items-center gap-1 flex-wrap text-[11px] font-semibold">
          <span className="text-[9px] text-gray-400 font-bold uppercase">Открытие:</span>
          <span className="bg-[#F0E6FF] text-[#7B00FF] px-2 py-1 rounded-lg">Ячейка №</span>
          <Icon name="ArrowRight" size={11} className="text-gray-300" />
          <span className="bg-[#F0E6FF] text-[#7B00FF] px-2 py-1 rounded-lg">goods</span>
          <Icon name="ArrowRight" size={11} className="text-gray-300" />
          <span className="bg-[#F0E6FF] text-[#7B00FF] px-2 py-1 rounded-lg">кол-во</span>
          <Icon name="ArrowRight" size={11} className="text-gray-300" />
          <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-lg">payment?</span>
        </div>
        <div className="flex items-center gap-1 flex-wrap text-[11px] font-semibold mt-1.5">
          <span className="text-[9px] text-gray-400 font-bold uppercase">Выбрать все:</span>
          <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-lg">success × N</span>
          <Icon name="ArrowRight" size={11} className="text-gray-300" />
          <span className="bg-[#F0E6FF] text-[#7B00FF] px-2 py-1 rounded-lg">check_goods</span>
          <span className="text-[9px] text-gray-400 font-bold uppercase ml-1">Выдать:</span>
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg">thanks</span>
        </div>
        <div className="text-[10px] text-gray-400 mt-1.5">Кол-во товаров = озвучка ячейки с тем же номером (напр. 2 товара → файл ячейки 2)</div>
      </div>

      <CloudToggle cloud={cloud} onChange={handleToggleCloud} syncing={syncing} />

      <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-6">
        {/* Ячейки */}
        <button onClick={onCells} className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 active:scale-95 transition-transform" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
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

        {/* Количество товаров */}
        <button onClick={onQty} className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 active:scale-95 transition-transform" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
          <div className="w-11 h-11 rounded-2xl bg-[#F0E6FF] flex items-center justify-center flex-shrink-0">
            <Icon name="Hash" size={22} className="text-[#7B00FF]" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-[14px] font-bold text-gray-900">Количество 1–50</div>
            <div className="text-[12px] text-gray-400">
              {uploadedQty > 0 ? `Загружено ${uploadedQty} из ${QTY_COUNT}` : "Нет загруженных озвучек"}
            </div>
          </div>
          <Icon name="ChevronRight" size={18} className="text-gray-400" />
        </button>

        {SOUND_KEYS.map((key, i) => {
          const meta = SOUND_META[key];
          const uploaded = cloud ? !!cloudMap[key] : localStatuses[key];
          const name = cloud ? cloudMap[key]?.name : localNames[key];
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
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-black flex-shrink-0 mt-0.5"
                    style={{ background: uploaded ? "#7B00FF" : "#F0E6FF", color: uploaded ? "#fff" : "#7B00FF" }}>
                    {uploaded ? <Icon name="Check" size={13} /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold text-gray-900">{meta.label}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{meta.desc}</div>
                    {uploaded && name && (
                      <div className="flex items-center gap-1.5 mt-2 bg-[#F5F0FF] rounded-xl px-3 py-2">
                        <Icon name={cloud ? "Cloud" : "Music"} size={13} className="text-[#7B00FF] flex-shrink-0" />
                        <span className="text-[11px] text-[#7B00FF] font-semibold truncate">{name}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => fileRefs.current[key]?.click()} disabled={loading === key}
                    className="flex-1 h-10 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    style={{ background: uploaded ? "#F5F0FF" : "#7B00FF", color: uploaded ? "#7B00FF" : "#fff" }}>
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
                <input ref={el => { fileRefs.current[key] = el; }} type="file" accept="audio/*" className="hidden"
                  onChange={e => handleFile(key, e.target.files?.[0])} />
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