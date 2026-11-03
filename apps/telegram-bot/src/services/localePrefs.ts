import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { LocaleCode } from "../i18n/index.js";
import { LOCALE_CODES } from "../i18n/index.js";

type PrefsFile = {
  byTelegramId: Record<string, LocaleCode>;
};

function isLocale(v: unknown): v is LocaleCode {
  return typeof v === "string" && (LOCALE_CODES as readonly string[]).includes(v);
}

export function createLocalePrefsStore(eventsDir: string) {
  const memory = new Map<number, LocaleCode>();
  const filePath = eventsDir ? path.join(eventsDir, "locale-prefs.json") : "";

  async function loadDisk(): Promise<void> {
    if (!filePath) return;
    try {
      const raw = await readFile(filePath, "utf8");
      const data = JSON.parse(raw) as PrefsFile;
      for (const [k, v] of Object.entries(data.byTelegramId ?? {})) {
        if (isLocale(v)) memory.set(Number(k), v);
      }
    } catch {
      /* first run */
    }
  }

  let loaded = loadDisk();

  async function persist(): Promise<void> {
    if (!filePath) return;
    await mkdir(path.dirname(filePath), { recursive: true });
    const byTelegramId: Record<string, LocaleCode> = {};
    for (const [k, v] of memory.entries()) {
      byTelegramId[String(k)] = v;
    }
    await writeFile(filePath, JSON.stringify({ byTelegramId }, null, 2), "utf8");
  }

  async function get(telegramId: number): Promise<LocaleCode | undefined> {
    await loaded;
    return memory.get(telegramId);
  }

  async function set(telegramId: number, locale: LocaleCode): Promise<void> {
    await loaded;
    memory.set(telegramId, locale);
    await persist().catch((err) => console.warn("[localePrefs] persist failed", err));
  }

  return { get, set };
}

export type LocalePrefsStore = ReturnType<typeof createLocalePrefsStore>;
