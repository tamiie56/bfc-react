import { AREAS, FOUNDED, HOURS, OUTLET_COUNT, SERVICES, SITE } from "../data/content";
import { getLiveMenu, getSettings } from "../admin/store";
import { dhakaHour } from "../hooks/useOpenStatus";
import { ruleReply } from "./rules";
import type { BotData, BotReply } from "./rules";

export type { BotLink, BotReply } from "./rules";

/**
 * Optional AI endpoint (e.g. a Cloudflare Worker running Workers AI).
 * Set VITE_CHAT_API_URL in .env / Netlify env vars. Contract:
 *   POST { message: string, history: { role: "user" | "bot", text: string }[] }
 *   ->   { reply: string }
 * If the call fails or times out, the bot silently falls back to the built-in rules.
 */
const API_URL = (import.meta.env.VITE_CHAT_API_URL as string | undefined)?.trim();

export interface ChatTurn {
  role: "user" | "bot";
  text: string;
}

function siteData(): BotData {
  const h = dhakaHour();
  return {
    menu: getLiveMenu(),
    phone: SITE.phone,
    phoneHref: SITE.phoneHref,
    email: SITE.email,
    hours: SITE.hours,
    feedbackUrl: "/feedback",
    addressLine: SITE.mapQuery,
    areas: AREAS,
    outletCount: OUTLET_COUNT,
    founded: FOUNDED,
    deliveryCharge: getSettings().deliveryCharge,
    services: SERVICES,
    isOpen: h >= HOURS.open && h < HOURS.close,
  };
}

async function askAI(message: string, history: ChatTurn[]): Promise<BotReply | null> {
  if (!API_URL) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history: history.slice(-8) }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { reply?: string };
    return data.reply?.trim() ? { text: data.reply.trim() } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getReply(message: string, history: ChatTurn[]): Promise<BotReply> {
  const ai = await askAI(message, history);
  return ai ?? ruleReply(message, siteData());
}
