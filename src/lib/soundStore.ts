export type SoundKey =
  | "goods"
  | "success_sound"
  | "check_goods_before_fitting"
  | "thanks_for_order_rate_pickpoint"
  | "payment_on_delivery";

export type CellSoundKey = `cell_${number}`;
export type QtySoundKey = `qty_${number}`;

export const QTY_COUNT = 50; // озвучка количества от 1 до 50

export const SOUND_META: Record<SoundKey, { label: string; desc: string }> = {
  goods: {
    label: "goods",
    desc: "Слово перед количеством товаров: «goods — [N]»",
  },
  success_sound: {
    label: "success_sound",
    desc: "Играет N раз (по числу товаров) при нажатии «Выбрать все»",
  },
  check_goods_before_fitting: {
    label: "check_goods_before_fitting",
    desc: "Сразу после всех success_sound — «Проверьте товар перед примеркой»",
  },
  thanks_for_order_rate_pickpoint: {
    label: "thanks_for_order_rate_pickpoint",
    desc: "После нажатия «Выдать» / «Готово» — «Спасибо, оцените ПВЗ»",
  },
  payment_on_delivery: {
    label: "payment_on_delivery",
    desc: "Озвучивается если заказ с оплатой при получении",
  },
};

// Описания фраз для Варианта 2 (другой сценарий)
export const SOUND_META_P2: Record<SoundKey, { label: string; desc: string }> = {
  goods: {
    label: "goods",
    desc: "Слово перед количеством товаров: «goods — [N]»",
  },
  payment_on_delivery: {
    label: "товары со скидкой — проверьте ВБ кошелёк",
    desc: "После номера ячейки — «Товары со скидкой, проверьте ВБ кошелёк»",
  },
  success_sound: {
    label: "проверьте товар под камерой",
    desc: "После нажатия «Выбрать все» — «Проверьте товар под камерой»",
  },
  check_goods_before_fitting: {
    label: "(не используется во 2 варианте)",
    desc: "В этом варианте не воспроизводится",
  },
  thanks_for_order_rate_pickpoint: {
    label: "оцените наш пункт выдачи",
    desc: "После нажатия «Выдать» — «Пожалуйста, оцените наш пункт выдачи в приложении»",
  },
};

export function getSoundMeta(profile: 1 | 2 = 1) {
  return profile === 2 ? SOUND_META_P2 : SOUND_META;
}

export const SOUND_KEYS = Object.keys(SOUND_META) as SoundKey[];
// Ключи, показываемые для Варианта 2 (без check_goods_before_fitting)
export const SOUND_KEYS_P2 = ["payment_on_delivery", "success_sound", "thanks_for_order_rate_pickpoint", "goods"] as SoundKey[];
export const CELL_COUNT = 200;

// ── API URL ────────────────────────────────────────────────────────────────

const API_URL = "https://functions.poehali.dev/8e89a9c5-6a4b-4325-99ac-3725856c8f61";

// ── Cloud mode flag ────────────────────────────────────────────────────────

const CLOUD_MODE_KEY = "wb_pvz_cloud_mode";

export function isCloudMode(): boolean {
  return localStorage.getItem(CLOUD_MODE_KEY) === "1";
}

export function setCloudMode(val: boolean) {
  localStorage.setItem(CLOUD_MODE_KEY, val ? "1" : "0");
}

// ── Профили озвучки (Вариант 1 / Вариант 2) ────────────────────────────────
// Профиль 1 — без префикса (совместимость со старыми файлами).
// Профиль 2 — все ключи с префиксом "p2_".

export type SoundProfile = 1 | 2;
const PROFILE_KEY = "wb_pvz_sound_profile";

export const PROFILE_META: Record<SoundProfile, { label: string; short: string }> = {
  1: { label: "Вариант 1", short: "В1" },
  2: { label: "Вариант 2", short: "В2" },
};

export function getProfile(): SoundProfile {
  return localStorage.getItem(PROFILE_KEY) === "2" ? 2 : 1;
}

export function setProfile(p: SoundProfile) {
  localStorage.setItem(PROFILE_KEY, String(p));
}

// Добавляет префикс профиля к любому ключу звука
function pfx(key: string): string {
  return getProfile() === 2 ? `p2_${key}` : key;
}

// ── Cloud cache (URL по key) ───────────────────────────────────────────────

const cloudCache: Record<string, string> = {};

export async function fetchCloudSounds(): Promise<{ key: string; name: string; url: string }[]> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/`);
  } catch {
    throw new Error("Сервер недоступен. Возможно исчерпан лимит облака");
  }
  if (res.status === 402) throw new Error("Облако недоступно: исчерпан лимит вызовов");
  if (!res.ok) throw new Error(`Ошибка загрузки списка (${res.status})`);
  const data = await res.json();
  const all: { key: string; name: string; url: string }[] = data.sounds ?? [];
  // Кэшируем все ключи как есть (с префиксами) — для воспроизведения через pfx()
  all.forEach(s => { cloudCache[s.key] = s.url; });

  // Возвращаем только звуки активного профиля, срезая префикс
  const profile = getProfile();
  const result: { key: string; name: string; url: string }[] = [];
  for (const s of all) {
    const isP2 = s.key.startsWith("p2_");
    if (profile === 2 && isP2) {
      result.push({ ...s, key: s.key.slice(3) });
    } else if (profile === 1 && !isP2) {
      result.push(s);
    }
  }
  return result;
}

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 МБ — с запасом под base64 (+33%)

export async function uploadCloudSound(key: string, file: File): Promise<string> {
  // Проверяем размер ДО отправки — большой файл рвёт соединение (Failed to fetch)
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new Error(`Файл ${mb} МБ — слишком большой. Максимум 4 МБ`);
  }

  const dataUrl = await fileToDataUrl(file);
  const storeKey = pfx(key);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: storeKey, name: file.name, data: dataUrl }),
    });
  } catch {
    throw new Error("Сервер недоступен. Возможно исчерпан лимит облака — попробуйте локальный режим");
  }

  if (res.status === 402) {
    throw new Error("Облако недоступно: исчерпан лимит. Переключитесь на локальное хранение");
  }
  if (!res.ok) {
    throw new Error(`Ошибка загрузки (${res.status}). Попробуйте файл меньшего размера`);
  }

  const data = await res.json();
  cloudCache[storeKey] = data.url;
  return data.url;
}

export async function deleteCloudSound(key: string): Promise<void> {
  const storeKey = pfx(key);
  await fetch(`${API_URL}/`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: storeKey }),
  });
  delete cloudCache[storeKey];
}

// ── localStorage ───────────────────────────────────────────────────────────

const LS_PREFIX = "wb_pvz_sound_";
function lsKey(key: string) { return LS_PREFIX + pfx(key); }

export function saveSoundByKey(key: string, file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        localStorage.setItem(lsKey(key), reader.result as string);
        localStorage.setItem(lsKey(key) + "_name", file.name);
        resolve();
      } catch {
        reject(new Error("Недостаточно места в памяти браузера"));
      }
    };
    reader.onerror = () => reject(new Error("Ошибка чтения файла"));
    reader.readAsDataURL(file);
  });
}

export function removeSoundByKey(key: string) {
  localStorage.removeItem(lsKey(key));
  localStorage.removeItem(lsKey(key) + "_name");
}

export function getSoundDataUrlByKey(key: string): string | null {
  return localStorage.getItem(lsKey(key));
}

export function getSoundNameByKey(key: string): string | null {
  return localStorage.getItem(lsKey(key) + "_name");
}

export function hasSoundByKey(key: string): boolean {
  return !!localStorage.getItem(lsKey(key));
}

export function saveSound(key: SoundKey, file: File) { return saveSoundByKey(key, file); }
export function removeSound(key: SoundKey) { return removeSoundByKey(key); }
export function getSoundDataUrl(key: SoundKey) { return getSoundDataUrlByKey(key); }
export function getSoundName(key: SoundKey) { return getSoundNameByKey(key); }
export function hasSound(key: SoundKey) { return hasSoundByKey(key); }

export function cellKey(n: number): CellSoundKey { return `cell_${n}`; }
export function hasCellSound(n: number) { return hasSoundByKey(cellKey(n)); }
export function getCellSoundName(n: number) { return getSoundNameByKey(cellKey(n)); }
export function saveCellSound(n: number, file: File) { return saveSoundByKey(cellKey(n), file); }
export function removeCellSound(n: number) { return removeSoundByKey(cellKey(n)); }

// ── Количество товаров (qty_1 … qty_50) ───────────────────────────────────

export function qtyKey(n: number): QtySoundKey { return `qty_${n}`; }
export function hasQtySound(n: number) { return hasSoundByKey(qtyKey(n)); }
export function getQtySoundName(n: number) { return getSoundNameByKey(qtyKey(n)); }
export function saveQtySound(n: number, file: File) { return saveSoundByKey(qtyKey(n), file); }
export function removeQtySound(n: number) { return removeSoundByKey(qtyKey(n)); }

export async function saveCellSoundBulk(
  fromN: number,
  toN: number,
  file: File,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const total = toN - fromN + 1;
  for (let i = 0; i < total; i++) {
    await saveSoundByKey(cellKey(fromN + i), file);
    onProgress?.(i + 1, total);
  }
}

// ── Unified playback ───────────────────────────────────────────────────────

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject();
    r.readAsDataURL(file);
  });
}

function playDataUrl(dataUrl: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(dataUrl);
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.play().catch(() => resolve());
  });
}

function playUrl(url: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.play().catch(() => resolve());
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Флаг — идёт ли уже загрузка облачного кэша
let cloudFetchPromise: Promise<void> | null = null;

async function ensureCloudCache(): Promise<void> {
  if (Object.keys(cloudCache).length > 0) return;
  if (!cloudFetchPromise) {
    cloudFetchPromise = fetchCloudSounds().then(() => { cloudFetchPromise = null; });
  }
  await cloudFetchPromise;
}

async function playSoundByKey(key: string) {
  // Сначала пробуем localStorage (быстро, всегда доступно)
  const localData = getSoundDataUrlByKey(key);
  if (localData) {
    await playDataUrl(localData);
    return;
  }
  // Затем облако — один общий fetch, без гонки
  if (isCloudMode()) {
    await ensureCloudCache();
    const url = cloudCache[pfx(key)];
    if (url) await playUrl(url);
  }
}

export async function playSound(key: SoundKey) {
  await playSoundByKey(key);
}

export async function playCellSound(cellNumber: number) {
  await playSoundByKey(cellKey(cellNumber));
}

export async function playQtySound(itemCount: number) {
  await playSoundByKey(qtyKey(itemCount));
}

/**
 * Сценарий при открытии заказа (вкладка «Выдать»):
 * Ячейка [N] → goods → qty_[itemCount] → payment_on_delivery (если нужно)
 * isCancelled — колбэк, возвращающий true если нужно прервать цепочку
 */
export async function playIssueSequence(
  cellNumber: number,
  itemCount: number,
  paymentOnDelivery = false,
  isCancelled?: () => boolean
) {
  const ok = () => !isCancelled?.();
  const profile = getProfile();

  // Предзагружаем облачный кэш заранее — до начала цепочки
  if (isCloudMode()) await ensureCloudCache();

  if (!ok()) return;
  await playCellSound(cellNumber);
  await wait(200);

  if (!ok()) return;
  await playSound("goods");
  await wait(100);

  if (!ok()) return;
  await playQtySound(itemCount);
  await wait(200);

  if (!ok()) return;
  // Вариант 2: всегда «Товары со скидкой, проверьте ВБ кошелёк».
  // Вариант 1: только для заказов с оплатой при получении.
  if (profile === 2 || paymentOnDelivery) {
    await playSound("payment_on_delivery");
    await wait(200);
  }
}

/**
 * Сценарий при нажатии «Выбрать все»:
 * success_sound × N → check_goods_before_fitting
 */
export async function playSelectAll(itemCount: number) {
  // Вариант 2: один раз «Проверьте товар под камерой»
  if (getProfile() === 2) {
    await playSound("success_sound");
    return;
  }
  for (let i = 0; i < itemCount; i++) {
    await playSound("success_sound");
    await wait(150);
  }
  await wait(200);
  await playSound("check_goods_before_fitting");
}

/**
 * Сценарий при нажатии «Выдать» / «Готово»:
 * thanks_for_order_rate_pickpoint
 */
export async function playIssueComplete() {
  await playSound("thanks_for_order_rate_pickpoint");
}