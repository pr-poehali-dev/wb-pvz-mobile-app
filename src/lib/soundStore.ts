export type SoundKey =
  | "cell_number"
  | "goods"
  | "success_sound"
  | "check_goods_before_fitting"
  | "thanks_for_order_rate_pickpoint";

export const SOUND_META: Record<SoundKey, { label: string; desc: string }> = {
  cell_number: {
    label: "Номер ячейки",
    desc: "Озвучивает номер ячейки после скана QR клиента",
  },
  goods: {
    label: "Количество товаров",
    desc: "«Ваш заказ содержит N товаров» — после ячейки",
  },
  success_sound: {
    label: "Звук товара",
    desc: "Играет N раз — по одному за каждый товар",
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

const LS_PREFIX = "wb_pvz_sound_";

export function saveSound(key: SoundKey, file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        localStorage.setItem(LS_PREFIX + key, reader.result as string);
        localStorage.setItem(LS_PREFIX + key + "_name", file.name);
        resolve();
      } catch {
        reject(new Error("Недостаточно места в памяти браузера"));
      }
    };
    reader.onerror = () => reject(new Error("Ошибка чтения файла"));
    reader.readAsDataURL(file);
  });
}

export function removeSound(key: SoundKey) {
  localStorage.removeItem(LS_PREFIX + key);
  localStorage.removeItem(LS_PREFIX + key + "_name");
}

export function getSoundDataUrl(key: SoundKey): string | null {
  return localStorage.getItem(LS_PREFIX + key);
}

export function getSoundName(key: SoundKey): string | null {
  return localStorage.getItem(LS_PREFIX + key + "_name");
}

export function hasSound(key: SoundKey): boolean {
  return !!localStorage.getItem(LS_PREFIX + key);
}

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

export async function playIssueSequence(itemCount: number) {
  await playSound("cell_number");
  await wait(200);
  await playSound("goods");
  await wait(200);
  for (let i = 0; i < itemCount; i++) {
    await playSound("success_sound");
    await wait(150);
  }
  await wait(200);
  await playSound("check_goods_before_fitting");
}

export async function playIssueComplete() {
  await playSound("thanks_for_order_rate_pickpoint");
}
