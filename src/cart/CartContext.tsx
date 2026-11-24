import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { OrderType } from "./order";

export interface CartLine {
  key: string;
  name: string;
  category: string;
  price: number;
  from?: boolean;
  image?: string;
  qty: number;
}

type NewLine = Omit<CartLine, "qty">;

type Action =
  | { type: "add"; line: NewLine; qty: number }
  | { type: "set"; key: string; qty: number }
  | { type: "remove"; key: string }
  | { type: "clear" };

const STORAGE_KEY = "bfc-cart-v1";
const MAX_QTY = 99;

function reducer(state: CartLine[], action: Action): CartLine[] {
  switch (action.type) {
    case "add": {
      const i = state.findIndex((l) => l.key === action.line.key);
      if (i >= 0) {
        return state.map((l, idx) =>
          idx === i ? { ...l, qty: Math.min(l.qty + action.qty, MAX_QTY) } : l
        );
      }
      return [...state, { ...action.line, qty: Math.min(action.qty, MAX_QTY) }];
    }
    case "set":
      return action.qty <= 0
        ? state.filter((l) => l.key !== action.key)
        : state.map((l) => (l.key === action.key ? { ...l, qty: Math.min(action.qty, MAX_QTY) } : l));
    case "remove":
      return state.filter((l) => l.key !== action.key);
    case "clear":
      return [];
  }
}

function load(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is CartLine =>
        typeof l === "object" &&
        l !== null &&
        typeof (l as CartLine).key === "string" &&
        typeof (l as CartLine).price === "number" &&
        typeof (l as CartLine).qty === "number"
    );
  } catch {
    return [];
  }
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  hasFrom: boolean;
  add: (line: NewLine, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toast: string | null;
  /** chosen in the dish popup, pre-selected at checkout */
  orderType: OrderType;
  setOrderType: (t: OrderType) => void;
  /** "Order Now": a single item checked out on its own, the cart stays untouched */
  direct: CartLine | null;
  orderNow: (line: NewLine, qty?: number) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, dispatch] = useReducer(reducer, [], load);
  const [isOpen, setOpen] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>("Online Delivery");
  const [direct, setDirect] = useState<CartLine | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* storage unavailable */
    }
  }, [lines]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2000);
  }, []);

  const add = useCallback(
    (line: NewLine, qty = 1) => {
      dispatch({ type: "add", line, qty });
      showToast(`${qty} × ${line.name} added to cart`);
    },
    [showToast]
  );

  const orderNow = useCallback((line: NewLine, qty = 1) => {
    setDirect({ ...line, qty: Math.min(Math.max(qty, 1), MAX_QTY) });
    setOpen(true);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = lines.reduce((n, l) => n + l.qty * l.price, 0);
    return {
      lines,
      count,
      subtotal,
      hasFrom: lines.some((l) => l.from),
      add,
      setQty: (key, qty) => dispatch({ type: "set", key, qty }),
      remove: (key) => dispatch({ type: "remove", key }),
      clear: () => dispatch({ type: "clear" }),
      isOpen,
      openCart: () => {
        setDirect(null);
        setOpen(true);
      },
      closeCart: () => {
        setOpen(false);
        setDirect(null);
      },
      toast,
      orderType,
      setOrderType,
      direct,
      orderNow,
    };
  }, [lines, add, isOpen, toast, orderType, direct, orderNow]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
