export type SoundKey =
  | "goods"
  | "success_sound"
  | "check_goods_before_fitting"
  | "thanks_for_order_rate_pickpoint"
  | "payment_on_delivery";

export type CellSoundKey = `cell_${number}`;

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

export const SOUND_KEYS = Object.keys(SOUND_META) as SoundKey[];
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

// ── Cloud cache (URL по key) ───────────────────────────────────────────────

const cloudCache: Record<string, string> = {};

export async function fetchCloudSounds(): Promise<{ key: string; name: string; url: string }[]> {
  const res = await fetch(`${API_URL}/`);
  const data = await res.json();
  const sounds: { key: string; name: string; url: string }[] = data.sounds ?? [];
  sounds.forEach(s => { cloudCache[s.key] = s.url; });
  return sounds;
}

export async function uploadCloudSound(key: string, file: File): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  const res = await fetch(`${API_URL}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, name: file.name, data: dataUrl }),
  });
  const data = await res.json();
  cloudCache[key] = data.url;
  return data.url;
}

export async function deleteCloudSound(key: string): Promise<void> {
  await fetch(`${API_URL}/`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  delete cloudCache[key];
}

// ── localStorage ───────────────────────────────────────────────────────────

const LS_PREFIX = "wb_pvz_sound_";
function lsKey(key: string) { return LS_PREFIX + key; }

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

async function playSoundByKey(key: string) {
  // Сначала пробуем localStorage (быстро, работает всегда)
  const localData = getSoundDataUrlByKey(key);
  if (localData) {
    await playDataUrl(localData);
    return;
  }
  // Затем облако (если режим облака и есть URL в кэше)
  if (isCloudMode()) {
    let url = cloudCache[key];
    // Если кэш пуст — грузим список с сервера
    if (!url) {
      await fetchCloudSounds();
      url = cloudCache[key];
    }
    if (url) await playUrl(url);
  }
}

export async function playSound(key: SoundKey) {
  await playSoundByKey(key);
}

export async function playCellSound(cellNumber: number) {
  await playSoundByKey(cellKey(cellNumber));
}

/**
 * Сценарий при открытии заказа (вкладка «Выдать»):
 * Ячейка [N] → goods → количество (ячейка с номером itemCount) → payment_on_delivery (если нужно)
 */
export async function playIssueSequence(
  cellNumber: number,
  itemCount: number,
  paymentOnDelivery = false
) {
  // 1. Номер ячейки
  await playCellSound(cellNumber);
  await wait(200);
  // 2. «goods»
  await playSound("goods");
  await wait(100);
  // 3. Количество товаров — берём озвучку ячейки с номером itemCount
  await playCellSound(itemCount);
  await wait(200);
  // 4. Оплата при получении (если есть)
  if (paymentOnDelivery) {
    await playSound("payment_on_delivery");
    await wait(200);
  }
}

/**
 * Сценарий при нажатии «Выбрать все»:
 * success_sound × N → check_goods_before_fitting
 */
export async function playSelectAll(itemCount: number) {
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