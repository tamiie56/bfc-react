/**
 * Rule-based brain of the BFC chatbot ("Chicky").
 *
 * Pure functions only (no React, no asset imports) so it is easy to test and easy to replace:
 * see engine.ts - when VITE_CHAT_API_URL is set, the bot asks that endpoint first and falls back to these rules.
 */

export interface BotLink {
  label: string;
  /** in-app route, e.g. "/menu" */
  to?: string;
  /** optional #hash for in-app routes */
  hash?: string;
  /** external url, tel: or mailto: */
  href?: string;
}

export interface BotReply {
  text: string;
  links?: BotLink[];
  /** quick-reply suggestions shown under the message */
  chips?: string[];
}

export interface BotDish {
  name: string;
  price: number;
  from?: boolean;
}

export interface BotCategory {
  id: string;
  title: string;
  items: BotDish[];
}

export interface BotData {
  menu: BotCategory[];
  phone: string;
  phoneHref: string;
  email: string;
  hours: string;
  feedbackUrl: string;
  addressLine: string;
  areas: string[];
  outletCount: number;
  founded: number;
  deliveryCharge: number;
  services: string[];
  isOpen: boolean;
}

/* ---------- text helpers ---------- */

export const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const stem = (t: string) => (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t);

/** true if the message contains one of the words (single words match whole tokens / prefixes, phrases match as text) */
function has(q: string, tokens: string[], words: string[]): boolean {
  return words.some((w) =>
    w.includes(" ") ? q.includes(w) : tokens.some((t) => t === w || (w.length >= 5 && t.startsWith(w)))
  );
}

const money = (d: BotDish) => `${d.from ? "from " : ""}৳${d.price}`;

/* ---------- keyword lists (English, Banglish and Bangla) ---------- */

const W = {
  greet: ["hi", "hello", "hey", "hola", "salam", "assalamualaikum", "assalamu", "namaste", "হ্যালো", "হাই", "সালাম", "আসসালামু"],
  thanks: ["thanks", "thank", "thx", "dhonnobad", "dhonyobad", "shukriya", "ধন্যবাদ"],
  bye: ["bye", "goodbye", "allah hafez", "khoda hafez", "see you", "বিদায়"],
  hours: ["open", "opening", "what time", "close", "closing", "closed", "hours", "timing", "timings", "schedule", "khola", "khule", "kokhon", "bondho", "সময়", "খোলা", "বন্ধ", "কখন"],
  phone: ["phone", "call", "hotline", "helpline", "number", "contact", "mobile", "email", "mail", "ফোন", "নম্বর", "নাম্বার", "যোগাযোগ", "ইমেইল"],
  address: ["address", "head office", "headquarter", "headquarters", "thikana", "ঠিকানা"],
  outlet: ["outlet", "outlets", "branch", "branches", "shop", "store", "location", "locations", "where", "kothay", "nearby", "near me", "nearest", "আউটলেট", "শাখা", "কোথায়"],
  delivery: ["delivery", "deliver", "charge", "shipping", "ডেলিভারি"],
  order: ["order", "buy", "purchase", "checkout", "cart", "kinbo", "অর্ডার"],
  how: ["how to", "how do", "how can", "how i", "kivabe", "kibhabe", "kemne", "কীভাবে", "কিভাবে"],
  menu: ["menu", "food", "foods", "item", "items", "dish", "dishes", "serve", "sell", "খাবার", "মেনু"],
  recommend: ["recommend", "suggest", "popular", "bestseller", "best seller", "favourite", "favorite", "signature", "must try", "famous"],
  cheap: ["cheap", "cheapest", "budget", "affordable", "lowest", "সস্তা"],
  services: ["dine", "dine in", "takeaway", "take away", "pickup", "pick up", "online"],
  pay: ["pay", "payment", "cash", "bkash", "card", "nagad"],
  about: ["about", "founded", "history", "owner", "founder", "chairman", "story", "since"],
  feedback: ["feedback", "complain", "complaint", "review", "suggestion", "খারাপ"],
  price: ["price", "prices", "cost", "how much", "koto", "kto", "dam", "daam", "taka", "tk", "bdt", "দাম", "কত", "টাকা"],
};

/** words that never identify a dish */
const STOP = new Set([
  "the", "a", "an", "of", "is", "are", "do", "you", "have", "has", "any", "me", "my", "i", "we", "to", "for", "in", "on", "at", "and", "or",
  "what", "whats", "how", "much", "many", "price", "prices", "cost", "tk", "taka", "bdt", "want", "need", "get", "give", "show", "tell", "can",
  "order", "buy", "menu", "item", "items", "food", "foods", "with", "please", "pls", "ache", "ase", "koto", "kto", "dam", "daam", "er", "ki", "dao",
  "bolo", "chai", "kinbo", "it", "this", "that", "your", "there", "available", "delivery", "deliver", "online", "now", "today",
]);

/** extra spellings -> the area name used on the site */
const AREA_ALIAS: Record<string, string> = {
  jfp: "Jamuna Future Park",
  jamuna: "Jamuna Future Park",
  "future park": "Jamuna Future Park",
  bashundhara: "Bashundhara City",
  baily: "Baily Road",
  bailey: "Baily Road",
  "baily road": "Baily Road",
  dhanmondi: "Dhanmondi",
  gulshan: "Gulshan - 2",
  mohammadpur: "Mohammadpur",
  keari: "Keari Plaza",
  orchid: "Orchid Plaza",
  shyamoli: "Shyamoli",
  satmasjid: "Satmasjid Road",
  meher: "Meher Plaza",
  ecb: "ECB Chattar",
  savar: "Savar",
  "mirpur 1": "Mirpur 1",
  "mirpur 10": "Mirpur 10",
  "mirpur 12": "Mirpur 12",
  "sector 13": "Uttara Sector 13",
  jashimuddin: "Uttara Jashimuddin",
  banani: "Banani",
  badda: "Badda",
  uttara: "Uttara Jashimuddin",
  mirpur: "Mirpur 1",
  khilgaon: "Khilgaon",
  eskaton: "Eskaton",
  "green road": "Green Road",
  motijheel: "Motijheel",
};

function findArea(q: string, areas: string[]): string | undefined {
  for (const a of areas) if (q.includes(norm(a))) return a;
  for (const [alias, name] of Object.entries(AREA_ALIAS)) {
    if (new RegExp(`(^|\\s)${alias}(\\s|$)`).test(q)) return areas.find((a) => a === name) ?? name;
  }
  return undefined;
}

/* ---------- dish lookup ---------- */

interface DishHit {
  dish: BotDish;
  cat: BotCategory;
  score: number;
}

function findDishes(tokens: string[], menu: BotCategory[]): DishHit[] {
  const q = tokens.map(stem).filter((t) => t.length >= 3 && !STOP.has(t));
  if (!q.length) return [];
  const hits: DishHit[] = [];
  for (const cat of menu) {
    const catTokens = norm(cat.title).split(" ").map(stem);
    for (const dish of cat.items) {
      const dTokens = norm(dish.name).split(" ").map(stem);
      let score = 0;
      for (const t of q) {
        if (dTokens.includes(t)) score += 2;
        else if (catTokens.includes(t)) score += 1;
      }
      if (score) hits.push({ dish, cat, score });
    }
  }
  if (!hits.length) return [];
  // every meaningful word in the question must be explained by the best matches
  const best = Math.max(...hits.map((h) => h.score));
  return hits.filter((h) => h.score === best);
}

/* ---------- replies ---------- */

const CHIPS_HOME = ["Menu", "Opening hours", "Outlets", "How to order", "Delivery charge"];

export function ruleReply(input: string, data: BotData): BotReply {
  const q = norm(input);
  const tokens = q.split(" ").filter(Boolean);
  const call: BotLink = { label: `Call ${data.phone}`, href: data.phoneHref };

  if (!q) return { text: "Type a question and I'll do my best!", chips: CHIPS_HOME };

  if (tokens.length <= 3 && has(q, tokens, W.greet)) {
    return {
      text: "Hi there! I'm Chicky, BFC's chicken buddy. Ask me about our menu and prices, outlets, opening hours, delivery or how to order.",
      chips: CHIPS_HOME,
    };
  }
  if (has(q, tokens, W.thanks)) {
    return { text: "You're welcome! Anything else I can help with? Crispy chicken is just a tap away.", chips: ["Menu", "How to order"] };
  }
  if (has(q, tokens, W.bye)) return { text: "Bye for now! Come back hungry." };

  // an area name -> outlet answer
  const area = findArea(q, data.areas);
  if (area && !has(q, tokens, W.price)) {
    return {
      text: `Yes, BFC has an outlet in ${area}. We have ${data.outletCount} outlets across Dhaka. Search your area in the Outlets section, or call us to get the exact address.`,
      links: [{ label: "Find outlets", to: "/", hash: "#outlets" }, call],
      chips: ["Opening hours", "Menu"],
    };
  }

  if (has(q, tokens, W.address) || (has(q, tokens, ["office"]) && !has(q, tokens, W.outlet))) {
    return {
      text: `You can find us at ${data.addressLine}.`,
      links: [{ label: "Contact section", to: "/", hash: "#contact" }, call],
    };
  }

  // delivery time / charge before the generic "time" -> hours rule
  if (has(q, tokens, W.delivery) && !has(q, tokens, W.how)) {
    return {
      text: `Home delivery costs ৳${data.deliveryCharge}; it's added at checkout. Pickup and dine-in have no delivery charge. Payment is cash on delivery or at the outlet.`,
      links: [{ label: "Order now", to: "/menu" }],
      chips: ["How to order", "Menu"],
    };
  }

  if (has(q, tokens, W.hours) && !has(q, tokens, W.menu)) {
    return {
      text: `${data.isOpen ? "We're open right now." : "We're closed right now."} Outlet hours: ${data.hours}.`,
      chips: ["Outlets", "How to order"],
    };
  }

  if (has(q, tokens, W.outlet)) {
    return {
      text: `BFC has ${data.outletCount} outlets across Dhaka, including ${data.areas.join(", ")}. Type your area in the Outlets section to see your nearest one.`,
      links: [{ label: "Find outlets", to: "/", hash: "#outlets" }],
      chips: data.areas.slice(0, 4),
    };
  }

  if (has(q, tokens, W.phone)) {
    return {
      text: `You can call us on ${data.phone} or email ${data.email}.`,
      links: [call, { label: "Email us", href: `mailto:${data.email}` }],
    };
  }

  const explicitHow = has(q, tokens, W.how) && has(q, tokens, W.order);
  if (explicitHow) return orderHow(data, call);

  if (has(q, tokens, W.cheap)) {
    const all = data.menu.flatMap((c) => c.items.map((d) => ({ d, c })));
    const cheapest = all.sort((a, b) => a.d.price - b.d.price).slice(0, 4);
    return {
      text: `Our most affordable picks:\n${cheapest.map((x) => `• ${x.d.name} (${x.c.title}) - ${money(x.d)}`).join("\n")}`,
      links: [{ label: "Open menu", to: "/menu" }],
    };
  }

  // dish / category prices
  const hits = has(q, tokens, W.recommend) ? [] : findDishes(tokens, data.menu);
  if (hits.length) {
    const shown = hits.sort((a, b) => a.dish.price - b.dish.price).slice(0, 6);
    const more = hits.length - shown.length;
    return {
      text:
        `Here's what I found:\n${shown.map((h) => `• ${h.dish.name} - ${money(h.dish)}`).join("\n")}` +
        (more > 0 ? `\n…and ${more} more on the menu.` : "") +
        (shown.some((h) => h.dish.from) ? "\n(“from” prices are for the smallest size.)" : ""),
      links: [{ label: "See on menu", to: "/menu", hash: `#menu-${shown[0].cat.id}` }],
      chips: ["How to order", "Delivery charge"],
    };
  }

  if (has(q, tokens, W.recommend)) {
    const want = ["Fried Chicken", "Best Burger", "Chicken Lollipop", "Hot Wing"];
    const picks = data.menu.flatMap((c) => c.items).filter((d) => want.includes(d.name));
    const lines = picks.map((d) => `• ${d.name} - ${money(d)}`).join("\n");
    return {
      text: `Can't go wrong with our crispy fried chicken! Popular picks:\n${lines}\nLooking for a bigger meal? Check the Combos and Special Meal sections.`,
      links: [{ label: "Open menu", to: "/menu" }],
    };
  }

  if (has(q, tokens, W.order)) return orderHow(data, call);

  if (has(q, tokens, W.pay)) {
    return { text: "Payment is cash on delivery, or cash at the outlet for pickup and dine-in.", chips: ["Delivery charge", "How to order"] };
  }

  if (has(q, tokens, W.services)) {
    return {
      text: `We offer ${data.services.join(", ")}. Order online for delivery or pickup, or just walk in to any outlet.`,
      links: [{ label: "Order now", to: "/menu" }],
    };
  }

  if (has(q, tokens, W.menu) || has(q, tokens, W.price)) {
    return {
      text: `Our menu has ${data.menu.map((c) => c.title).join(", ")}. Tell me a dish, like “Fried Chicken”, and I'll share the price.`,
      links: [{ label: "Open full menu", to: "/menu" }],
      chips: ["Fried Chicken", "Chicken Burger", "Cheapest items"],
    };
  }

  if (has(q, tokens, W.feedback)) {
    return {
      text: "We'd love to hear from you, good or bad! Send us your feedback with the form below.",
      links: [{ label: "Send feedback", href: data.feedbackUrl }, call],
    };
  }

  if (has(q, tokens, W.about)) {
    return {
      text: `BFC (Best Fried Chicken) started in ${data.founded} and is Bangladesh's largest local fast-food chain, with ${data.outletCount} outlets across Dhaka. Fresh, hygienic, tasty food at an affordable price is our motto.`,
      links: [{ label: "Our story", to: "/", hash: "#about" }],
    };
  }

  return {
    text: `Hmm, I'm not sure about that one yet. I can help with menu and prices, outlets, opening hours, delivery and how to order. For anything else, please call ${data.phone}.`,
    links: [call],
    chips: CHIPS_HOME,
  };
}

function orderHow(data: BotData, call: BotLink): BotReply {
  return {
    text:
      "Ordering is easy:\n1. Open the Menu and tap a dish.\n2. Pick the quantity and tap Add to Cart.\n3. Open your cart, choose Delivery or Pickup, fill in your details and place the order.\n" +
      `Home delivery costs ৳${data.deliveryCharge}, and you pay cash on delivery or at the outlet.`,
    links: [{ label: "Start ordering", to: "/menu" }, call],
    chips: ["Delivery charge", "Opening hours"],
  };
}
