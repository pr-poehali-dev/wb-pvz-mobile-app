export type SoundKey =
  | "goods"
  | "success_sound"
  | "check_goods_before_fitting"
  | "thanks_for_order_rate_pickpoint";

export type CellSoundKey = `cell_${number}`;

export const SOUND_META: Record<SoundKey, { label: string; desc: string }> = {
  goods: {
    label: "Количество товаров",
    desc: "Озвучивает «N товаров» — играет после ячейки",
  },
  success_sound: {
    label: "Звук товара",
    desc: "Играет для каждого товара при нажатии «Выбрать все»",
  },
  check_goods_before_fitting: {
    label: "Проверьте товар",
    desc: "«Проверьте товар перед примеркой» — после всех товаров",
  },
  thanks_for_order_rate_pickpoint: {
    label: "Спасибо за заказ",
    desc: "«Спасибо, оцените пункт выдачи» — при нажатии Выдать",
  },
};

export const SOUND_KEYS = Object.keys(SOUND_META) as SoundKey[];
export const CELL_COUNT = 200;

const LS_PREFIX = "wb_pvz_sound_";

// ── Generic save/load ──────────────────────────────────────────────────────

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

// ── Typed wrappers (SoundKey) ──────────────────────────────────────────────

export function saveSound(key: SoundKey, file: File) { return saveSoundByKey(key, file); }
export function removeSound(key: SoundKey) { return removeSoundByKey(key); }
export function getSoundDataUrl(key: SoundKey) { return getSoundDataUrlByKey(key); }
export function getSoundName(key: SoundKey) { return getSoundNameByKey(key); }
export function hasSound(key: SoundKey) { return hasSoundByKey(key); }

// ── Cell helpers ───────────────────────────────────────────────────────────

export function cellKey(n: number): CellSoundKey { return `cell_${n}`; }
export function hasCellSound(n: number) { return hasSoundByKey(cellKey(n)); }
export function getCellSoundName(n: number) { return getSoundNameByKey(cellKey(n)); }
export function saveCellSound(n: number, file: File) { return saveSoundByKey(cellKey(n), file); }
export function removeCellSound(n: number) { return removeSoundByKey(cellKey(n)); }

// ── Playback ───────────────────────────────────────────────────────────────

function playDataUrl(dataUrl: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(dataUrl);
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.play().catch(() => resolve());
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function playSound(key: SoundKey) {
  const data = getSoundDataUrl(key);
  if (data) await playDataUrl(data);
}

export async function playCellSound(cellNumber: number) {
  const data = getSoundDataUrlByKey(cellKey(cellNumber));
  if (data) await playDataUrl(data);
}

/** Играет при открытии заказа: ячейка → кол-во товаров → (check_goods) */
export async function playIssueSequence(cellNumber: number, itemCount: number) {
  await playCellSound(cellNumber);
  await wait(200);
  await playSound("goods");
  await wait(200);
  await playSound("check_goods_before_fitting");
}

/** Играет success_sound N раз — вызывается при «Выбрать все» */
export async function playSelectAll(itemCount: number) {
  for (let i = 0; i < itemCount; i++) {
    await playSound("success_sound");
    await wait(150);
  }
}

/** Играет при нажатии «Выдать» */
export async function playIssueComplete() {
  await playSound("thanks_for_order_rate_pickpoint");
}
