import { useState, useRef, useCallback, useEffect } from "react";
import Icon from "@/components/ui/icon";
import CloudToggle from "@/components/sound/CloudToggle";
import {
  QTY_COUNT, hasQtySound, getQtySoundName, saveQtySound, removeQtySound,
  getSoundDataUrlByKey, qtyKey,
  isCloudMode, setCloudMode,
  fetchCloudSounds, uploadCloudSound, deleteCloudSound,
} from "@/lib/soundStore";

interface Props { onBack: () => void; }

export default function QtySoundsScreen({ onBack }: Props) {
  const [cloud, setCloud] = useState(isCloudMode);
  const [syncing, setSyncing] = useState(false);
  const [localStatuses, setLocalStatuses] = useState<boolean[]>(
    () => Array.from({ length: QTY_COUNT }, (_, i) => hasQtySound(i + 1))
  );
  const [localNames, setLocalNames] = useState<(string | null)[]>(
    () => Array.from({ length: QTY_COUNT }, (_, i) => getQtySoundName(i + 1))
  );
  const [cloudMap, setCloudMap] = useState<Record<string, { name: string; url: string }>>({});
  const [loading, setLoading] = useState<number | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [search, setSearch] = useState("");
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

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

  const refreshLocal = (n: number) => {
    setLocalStatuses(p => { const next = [...p]; next[n - 1] = hasQtySound(n); return next; });
    setLocalNames(p => { const next = [...p]; next[n - 1] = getQtySoundName(n); return next; });
  };

  const handleFile = async (n: number, file: File | undefined) => {
    if (!file) return;
    setLoading(n);
    try {
      if (cloud) {
        await uploadCloudSound(qtyKey(n), file);
        await loadCloud();
        showToast(`Количество ${n} — облако`);
      } else {
        await saveQtySound(n, file);
        refreshLocal(n);
        showToast(`Количество ${n} сохранено`);
      }
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Ошибка", false);
    } finally {
      setLoading(null);
    }
  };

  const handleRemove = async (n: number) => {
    if (cloud) {
      await deleteCloudSound(qtyKey(n));
      setCloudMap(p => { const nm = { ...p }; delete nm[qtyKey(n)]; return nm; });
      showToast(`Количество ${n} удалено`, false);
    } else {
      removeQtySound(n);
      refreshLocal(n);
      if (fileRefs.current[n]) fileRefs.current[n]!.value = "";
      showToast(`Количество ${n} удалено`, false);
    }
  };

  const handlePreview = async (n: number) => {
    setPlaying(n);
    const src = cloud ? cloudMap[qtyKey(n)]?.url : getSoundDataUrlByKey(qtyKey(n));
    if (!src) { setPlaying(null); return; }
    const audio = new Audio(src);
    audio.onended = () => setPlaying(null);
    audio.onerror = () => setPlaying(null);
    await audio.play().catch(() => setPlaying(null));
  };

  const filteredNums = Array.from({ length: QTY_COUNT }, (_, i) => i + 1).filter(n =>
    !search || String(n).includes(search.trim())
  );

  const uploadedCount = cloud
    ? Object.keys(cloudMap).filter(k => k.startsWith("qty_")).length
    : localStatuses.filter(Boolean).length;

  return (
    <div className="flex flex-col h-screen bg-[#F5F0FF] max-w-md mx-auto overflow-hidden select-none">
      <div className="h-10" />
      <div className="flex items-center px-4 pb-3 gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm active:scale-95 transition-transform">
          <Icon name="ChevronLeft" size={20} className="text-gray-700" />
        </button>
        <div className="flex-1">
          <div className="text-[17px] font-bold text-gray-900">Количество товаров</div>
          <div className="text-[12px] text-gray-500">
            {uploadedCount} из {QTY_COUNT} загружено
            {cloud && <span className="ml-1 text-[#7B00FF]">· облако</span>}
          </div>
        </div>
        {syncing && <Icon name="Loader2" size={16} className="animate-spin text-[#7B00FF]" />}
      </div>

      {/* Подсказка */}
      <div className="mx-4 mb-3 bg-white rounded-2xl px-4 py-3 flex items-start gap-2.5" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <Icon name="Info" size={15} className="text-[#7B00FF] flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-gray-500 leading-relaxed">
          Озвучка числа товаров в заказе. Файл <span className="font-bold text-gray-700">«2»</span> — произносит «два», «3» — «три» и т.д. Отдельно от озвучки ячеек.
        </p>
      </div>

      <CloudToggle cloud={cloud} onChange={handleToggleCloud} syncing={syncing} />

      {/* Search */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 bg-white rounded-2xl px-4 h-11 border border-gray-100">
          <Icon name="Search" size={16} className="text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Найти количество..."
            className="flex-1 bg-transparent outline-none text-[14px] text-gray-800 placeholder:text-gray-400" />
          {search && <button onClick={() => setSearch("")}><Icon name="X" size={14} className="text-gray-400" /></button>}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mx-4 my-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-[#7B00FF] rounded-full transition-all duration-500"
          style={{ width: `${(uploadedCount / QTY_COUNT) * 100}%` }} />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="grid grid-cols-1 gap-2">
          {filteredNums.map(n => {
            const uploaded = cloud ? !!cloudMap[qtyKey(n)] : localStatuses[n - 1];
            const name = cloud ? cloudMap[qtyKey(n)]?.name : localNames[n - 1];
            return (
              <div key={n} className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3" style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-[15px] flex-shrink-0"
                  style={{ background: uploaded ? "#7B00FF" : "#F0E6FF", color: uploaded ? "#fff" : "#7B00FF" }}>
                  {n}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-gray-900">{n} {n === 1 ? "товар" : n < 5 ? "товара" : "товаров"}</div>
                  {uploaded && name
                    ? <div className="text-[11px] text-[#7B00FF] truncate">{name}</div>
                    : <div className="text-[11px] text-gray-400">Нет озвучки</div>
                  }
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => fileRefs.current[n]?.click()} disabled={loading === n}
                    className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-all"
                    style={{ background: uploaded ? "#F5F0FF" : "#7B00FF" }}>
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
                <input ref={el => { fileRefs.current[n] = el; }} type="file" accept="audio/*" className="hidden"
                  onChange={e => handleFile(n, e.target.files?.[0])} />
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
