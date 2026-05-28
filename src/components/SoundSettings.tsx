import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import {
  SOUND_KEYS, SOUND_META, SoundKey,
  saveSound, removeSound, getSoundName, hasSound, getSoundDataUrl,
  CELL_COUNT, hasCellSound, getCellSoundName, saveCellSound, removeCellSound,
  getSoundDataUrlByKey, cellKey,
  isCloudMode, setCloudMode,
  fetchCloudSounds, uploadCloudSound, deleteCloudSound,
} from "@/lib/soundStore";

interface Props { onBack: () => void; }
type Section = "main" | "cells";

export default function SoundSettings({ onBack }: Props) {
  const [section, setSection] = useState<Section>("main");
  return section === "cells"
    ? <CellSoundsScreen onBack={() => setSection("main")} />
    : <MainSoundsScreen onBack={onBack} onCells={() => setSection("cells")} />;
}

// ── Переключатель облако/локально ──────────────────────────────────────────

function CloudToggle({ cloud, onChange, syncing }: {
  cloud: boolean; onChange: (v: boolean) => void; syncing: boolean;
}) {
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

// ── Основные звуки ─────────────────────────────────────────────────────────

function MainSoundsScreen({ onBack, onCells }: { onBack: () => void; onCells: () => void }) {
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

// ── Ячейки 1–200 ──────────────────────────────────────────────────────────

function CellSoundsScreen({ onBack }: { onBack: () => void }) {
  const [cloud, setCloud] = useState(isCloudMode);
  const [syncing, setSyncing] = useState(false);
  const [localStatuses, setLocalStatuses] = useState<boolean[]>(
    () => Array.from({ length: CELL_COUNT }, (_, i) => hasCellSound(i + 1))
  );
  const [localNames, setLocalNames] = useState<(string | null)[]>(
    () => Array.from({ length: CELL_COUNT }, (_, i) => getCellSoundName(i + 1))
  );
  const [cloudMap, setCloudMap] = useState<Record<string, { name: string; url: string }>>({});
  const [loading, setLoading] = useState<number | "bulk" | null>(null);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [playing, setPlaying] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [search, setSearch] = useState("");
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const bulkFileRef = useRef<HTMLInputElement | null>(null);
  const multiFileRef = useRef<HTMLInputElement | null>(null);

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

  const refreshLocalAll = () => {
    setLocalStatuses(Array.from({ length: CELL_COUNT }, (_, i) => hasCellSound(i + 1)));
    setLocalNames(Array.from({ length: CELL_COUNT }, (_, i) => getCellSoundName(i + 1)));
  };

  const refreshLocal = (n: number) => {
    setLocalStatuses(p => { const next = [...p]; next[n - 1] = hasCellSound(n); return next; });
    setLocalNames(p => { const next = [...p]; next[n - 1] = getCellSoundName(n); return next; });
  };

  const handleFile = async (n: number, file: File | undefined) => {
    if (!file) return;
    setLoading(n);
    try {
      if (cloud) {
        await uploadCloudSound(cellKey(n), file);
        await loadCloud();
        showToast(`Ячейка ${n} — облако`);
      } else {
        await saveCellSound(n, file);
        refreshLocal(n);
        showToast(`Ячейка ${n} сохранена`);
      }
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Ошибка", false);
    } finally {
      setLoading(null);
    }
  };

  // Несколько файлов: номер ячейки берётся из имени файла
  const handleMultiFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setLoading("bulk");
    setBulkProgress(0);
    const fileArr = Array.from(files);
    let done = 0;
    try {
      for (const file of fileArr) {
        const numMatch = file.name.match(/\d+/);
        const n = numMatch ? parseInt(numMatch[0], 10) : done + 1;
        if (n >= 1 && n <= CELL_COUNT) {
          if (cloud) {
            await uploadCloudSound(cellKey(n), file);
          } else {
            await saveCellSound(n, file);
            refreshLocal(n);
          }
        }
        done++;
        setBulkProgress(Math.round((done / fileArr.length) * 100));
      }
      if (cloud) await loadCloud();
      else refreshLocalAll();
      showToast(`Загружено ${done} файлов`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Ошибка", false);
    } finally {
      setLoading(null);
      setBulkProgress(0);
      if (multiFileRef.current) multiFileRef.current.value = "";
    }
  };

  // Один файл на все ячейки
  const handleBulkFile = async (file: File | undefined) => {
    if (!file) return;
    setLoading("bulk");
    setBulkProgress(0);
    try {
      for (let n = 1; n <= CELL_COUNT; n++) {
        if (cloud) {
          await uploadCloudSound(cellKey(n), file);
        } else {
          await saveCellSound(n, file);
        }
        setBulkProgress(Math.round((n / CELL_COUNT) * 100));
      }
      if (cloud) await loadCloud();
      else refreshLocalAll();
      showToast(`«${file.name}» применён ко всем ${CELL_COUNT} ячейкам`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Ошибка", false);
    } finally {
      setLoading(null);
      setBulkProgress(0);
      if (bulkFileRef.current) bulkFileRef.current.value = "";
    }
  };

  const handleRemove = async (n: number) => {
    if (cloud) {
      await deleteCloudSound(cellKey(n));
      setCloudMap(p => { const nm = { ...p }; delete nm[cellKey(n)]; return nm; });
      showToast(`Ячейка ${n} удалена`, false);
    } else {
      removeCellSound(n);
      refreshLocal(n);
      if (fileRefs.current[n]) fileRefs.current[n]!.value = "";
      showToast(`Ячейка ${n} удалена`, false);
    }
  };

  const handlePreview = async (n: number) => {
    setPlaying(n);
    const src = cloud ? cloudMap[cellKey(n)]?.url : getSoundDataUrlByKey(cellKey(n));
    if (!src) { setPlaying(null); return; }
    const audio = new Audio(src);
    audio.onended = () => setPlaying(null);
    audio.onerror = () => setPlaying(null);
    await audio.play().catch(() => setPlaying(null));
  };

  const filteredNums = Array.from({ length: CELL_COUNT }, (_, i) => i + 1).filter(n =>
    !search || String(n).includes(search.trim())
  );

  const uploadedCount = cloud
    ? Object.keys(cloudMap).filter(k => k.startsWith("cell_")).length
    : localStatuses.filter(Boolean).length;

  const isBulkLoading = loading === "bulk";

  return (
    <div className="flex flex-col h-screen bg-[#F5F0FF] max-w-md mx-auto overflow-hidden select-none">
      <div className="h-10" />
      <div className="flex items-center px-4 pb-3 gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm active:scale-95 transition-transform">
          <Icon name="ChevronLeft" size={20} className="text-gray-700" />
        </button>
        <div className="flex-1">
          <div className="text-[17px] font-bold text-gray-900">Озвучка ячеек</div>
          <div className="text-[12px] text-gray-500">
            {uploadedCount} из {CELL_COUNT} загружено
            {cloud && <span className="ml-1 text-[#7B00FF]">· облако</span>}
          </div>
        </div>
        {syncing && <Icon name="Loader2" size={16} className="animate-spin text-[#7B00FF]" />}
      </div>

      <CloudToggle cloud={cloud} onChange={handleToggleCloud} syncing={syncing} />

      {/* Bulk actions */}
      <div className="mx-4 mb-3 bg-white rounded-2xl p-4 space-y-3" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <div className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Массовая загрузка</div>
        {isBulkLoading ? (
          <div>
            <div className="flex justify-between mb-1.5 text-[12px]">
              <span className="text-gray-500">Сохраняется...</span>
              <span className="font-bold text-[#7B00FF]">{bulkProgress}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#7B00FF] rounded-full transition-all duration-100" style={{ width: `${bulkProgress}%` }} />
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => multiFileRef.current?.click()}
              className="flex-1 h-11 rounded-xl bg-[#F0E6FF] text-[#7B00FF] font-semibold text-[13px] flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
              <Icon name="Files" size={15} />
              Несколько файлов
            </button>
            <button onClick={() => bulkFileRef.current?.click()}
              className="flex-1 h-11 rounded-xl bg-[#7B00FF] text-white font-semibold text-[13px] flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
              <Icon name="Layers" size={15} />
              Один на все
            </button>
          </div>
        )}
        <div className="text-[10px] text-gray-400 leading-relaxed">
          «Несколько файлов» — выберите сразу много файлов. Номер ячейки берётся из имени файла (напр. <span className="font-bold">15.mp3</span> → ячейка 15)
        </div>
        <input ref={multiFileRef} type="file" accept="audio/*" multiple className="hidden"
          onChange={e => handleMultiFiles(e.target.files)} />
        <input ref={bulkFileRef} type="file" accept="audio/*" className="hidden"
          onChange={e => handleBulkFile(e.target.files?.[0])} />
      </div>

      {/* Search */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 bg-white rounded-2xl px-4 h-11 border border-gray-100">
          <Icon name="Search" size={16} className="text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Найти ячейку..."
            className="flex-1 bg-transparent outline-none text-[14px] text-gray-800 placeholder:text-gray-400" />
          {search && <button onClick={() => setSearch("")}><Icon name="X" size={14} className="text-gray-400" /></button>}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mx-4 my-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-[#7B00FF] rounded-full transition-all duration-500"
          style={{ width: `${(uploadedCount / CELL_COUNT) * 100}%` }} />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="grid grid-cols-1 gap-2">
          {filteredNums.map(n => {
            const uploaded = cloud ? !!cloudMap[cellKey(n)] : localStatuses[n - 1];
            const name = cloud ? cloudMap[cellKey(n)]?.name : localNames[n - 1];
            return (
              <div key={n} className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3" style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-[15px] flex-shrink-0"
                  style={{ background: uploaded ? "#7B00FF" : "#F0E6FF", color: uploaded ? "#fff" : "#7B00FF" }}>
                  {n}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-gray-900">Ячейка {n}</div>
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