import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { FaEdit, FaEye, FaEyeSlash, FaImage, FaPlus, FaSearch, FaTrashAlt, FaUndo, FaUtensils } from "react-icons/fa";
import { MENU, PLACEHOLDER, dishImage } from "../../data/menu";
import { money } from "../format";
import {
  addCustomCategory,
  buildMenu,
  deleteCustomCategory,
  deleteCustomItem,
  patchCustomItem,
  patchOverride,
  resetOverride,
  saveCustomItem,
  useMenuState,
} from "../store";
import type { LiveCategory, LiveDish } from "../store";
import { Empty, Modal, PageHead, Pill, Switch, useConfirm, useToast } from "../ui";

type Filter = "all" | "soldout" | "hidden" | "edited" | "custom";

/* ---------- helpers ---------- */

/** Resize an uploaded photo so it fits comfortably in localStorage. */
function fileToDataUrl(file: File, max = 560): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function Thumb({ dish }: { dish: LiveDish }) {
  const [broken, setBroken] = useState(false);
  const src = dishImage(dish);
  const ok = Boolean(src) && !broken;
  return (
    <span className="adm-thumb">
      <img src={ok ? src : PLACEHOLDER} alt="" className={ok ? "" : "is-ph"} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
    </span>
  );
}

function PriceInput({ value, onCommit }: { value: number; onCommit: (n: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    const n = Math.round(Number(text));
    if (Number.isFinite(n) && n > 0 && n !== value) onCommit(n);
    else setText(String(value));
  };

  return (
    <label className="adm-price">
      <span>৳</span>
      <input
        inputMode="numeric"
        value={text}
        onChange={(e) => setText(e.target.value.replace(/[^\d]/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setText(String(value));
        }}
        aria-label="Price in taka"
      />
    </label>
  );
}

/* ---------- item editor ---------- */

interface Form {
  categoryId: string;
  name: string;
  price: string;
  from: boolean;
  desc: string;
  image: string;
  soldOut: boolean;
  hidden: boolean;
}

interface Target {
  cat: LiveCategory;
  dish: LiveDish | null; // null = new item
}

function ItemEditor({ target, cats, onClose }: { target: Target; cats: LiveCategory[]; onClose: () => void }) {
  const toast = useToast();
  const { dish } = target;
  const builtIn = dish !== null && !dish.custom;
  const originalImage = builtIn ? MENU.find((c) => c.id === target.cat.id)?.items.find((d) => d.name === dish.name)?.image : undefined;
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Form>({
    categoryId: target.cat.id,
    name: dish?.name ?? "",
    price: dish ? String(dish.price) : "",
    from: Boolean(dish?.from),
    desc: dish?.desc ?? "",
    image: !dish ? "" : dish.custom || dish.image !== originalImage ? dish.image ?? "" : "",
    soldOut: Boolean(dish?.soldOut),
    hidden: Boolean(dish?.hidden),
  });

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setError("");
  };

  const pickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      set("image", await fileToDataUrl(file));
    } catch {
      setError("Could not read that image. Try a JPG or PNG.");
    }
  };

  const save = () => {
    const name = form.name.trim();
    const price = Math.round(Number(form.price));
    if (!name) return setError("Item name is required");
    if (!Number.isFinite(price) || price <= 0) return setError("Enter a price greater than 0");

    if (dish === null) {
      const cat = cats.find((c) => c.id === form.categoryId);
      if (cat?.items.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
        return setError("This category already has an item with that name");
      }
      saveCustomItem({
        categoryId: form.categoryId,
        name,
        price,
        from: form.from || undefined,
        desc: form.desc.trim() || undefined,
        image: form.image || undefined,
        soldOut: form.soldOut || undefined,
        hidden: form.hidden || undefined,
      });
      toast(`${name} added to the menu`);
    } else if (dish.custom && dish.customId) {
      patchCustomItem(dish.customId, {
        name,
        price,
        from: form.from || undefined,
        desc: form.desc.trim() || undefined,
        image: form.image || undefined,
        soldOut: form.soldOut || undefined,
        hidden: form.hidden || undefined,
      });
      toast(`${name} updated`);
    } else {
      patchOverride(target.cat.id, dish.name, {
        price,
        from: form.from,
        desc: form.desc.trim(),
        image: form.image || undefined,
        soldOut: form.soldOut,
        hidden: form.hidden,
      });
      toast(`${dish.name} updated`);
    }
    onClose();
  };

  const preview = form.image || (dish ? dishImage(dish) : undefined);

  return (
    <Modal
      title={dish ? `Edit ${dish.name}` : "Add menu item"}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="adm-btn adm-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="adm-btn adm-btn--red" onClick={save}>
            {dish ? "Save changes" : "Add item"}
          </button>
        </>
      }
    >
      <div className="adm-form">
        <label className="adm-field">
          <span>Category</span>
          {dish === null ? (
            <select className="adm-select" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          ) : (
            <input className="adm-input" value={target.cat.title} disabled />
          )}
        </label>

        <label className="adm-field">
          <span>Item name</span>
          <input className="adm-input" value={form.name} disabled={builtIn} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Spicy Wrap" />
          {builtIn && <small className="adm-muted">Original menu items keep their name. Hide this one and add a new item if you need a different name.</small>}
        </label>

        <div className="adm-form__row">
          <label className="adm-field">
            <span>Price (BDT)</span>
            <input className="adm-input" inputMode="numeric" value={form.price} onChange={(e) => set("price", e.target.value.replace(/[^\d]/g, ""))} placeholder="250" />
          </label>
          <label className="adm-check">
            <input type="checkbox" checked={form.from} onChange={(e) => set("from", e.target.checked)} />
            <span>
              Starting price <small>(shows &ldquo;From ৳..&rdquo; for sizes / variants)</small>
            </span>
          </label>
        </div>

        <label className="adm-field">
          <span>Description</span>
          <textarea className="adm-input" rows={3} value={form.desc} onChange={(e) => set("desc", e.target.value)} placeholder="What comes with it?" />
        </label>

        <div className="adm-field">
          <span>Photo</span>
          <div className="adm-photo">
            <span className="adm-photo__box">{preview ? <img src={preview} alt="" /> : <FaImage aria-hidden />}</span>
            <div className="adm-photo__side">
              <input className="adm-input" placeholder="Paste an image link (https://...)" value={form.image.startsWith("data:") ? "" : form.image} onChange={(e) => set("image", e.target.value.trim())} />
              <div className="adm-photo__btns">
                <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => fileRef.current?.click()}>
                  Upload photo
                </button>
                {form.image && (
                  <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => set("image", "")}>
                    Remove
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickFile} />
            </div>
          </div>
        </div>

        <div className="adm-form__row">
          <label className="adm-check">
            <input type="checkbox" checked={form.soldOut} onChange={(e) => set("soldOut", e.target.checked)} />
            <span>
              Sold out <small>(visible, but can&rsquo;t be ordered)</small>
            </span>
          </label>
          <label className="adm-check">
            <input type="checkbox" checked={form.hidden} onChange={(e) => set("hidden", e.target.checked)} />
            <span>
              Hide from website <small>(customers won&rsquo;t see it)</small>
            </span>
          </label>
        </div>

        {error && (
          <p className="adm-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

/* ---------- page ---------- */

export default function MenuManager() {
  const state = useMenuState();
  const toast = useToast();
  const { ask, dialog } = useConfirm();
  const menu = useMemo(() => buildMenu(state, true), [state]);

  const [cat, setCat] = useState("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<Target | null>(null);
  const [newCat, setNewCat] = useState<string | null>(null);

  const total = menu.reduce((n, c) => n + c.items.length, 0);
  const soldOutCount = menu.reduce((n, c) => n + c.items.filter((d) => d.soldOut).length, 0);
  const hiddenCount = menu.reduce((n, c) => n + c.items.filter((d) => d.hidden).length, 0);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menu
      .filter((c) => cat === "all" || c.id === cat)
      .map((c) => ({
        ...c,
        shown: c.items.filter((d) => {
          if (filter === "soldout" && !d.soldOut) return false;
          if (filter === "hidden" && !d.hidden) return false;
          if (filter === "edited" && !d.edited) return false;
          if (filter === "custom" && !d.custom) return false;
          return !q || d.name.toLowerCase().includes(q) || (d.desc ?? "").toLowerCase().includes(q);
        }),
      }))
      .filter((c) => c.shown.length > 0 || (c.custom && cat === c.id && !query && filter === "all"));
  }, [menu, cat, filter, query]);

  const toggle = (c: LiveCategory, d: LiveDish, patch: { soldOut?: boolean; hidden?: boolean }) => {
    if (d.custom && d.customId) patchCustomItem(d.customId, patch);
    else patchOverride(c.id, d.name, patch);
  };

  const setPrice = (c: LiveCategory, d: LiveDish, price: number) => {
    if (d.custom && d.customId) patchCustomItem(d.customId, { price });
    else patchOverride(c.id, d.name, { price });
    toast(`${d.name} is now ${money(price)}`);
  };

  const removeItem = (d: LiveDish) => {
    if (!d.customId) return;
    ask({
      title: `Delete ${d.name}?`,
      text: "This item will be removed from the menu.",
      confirmLabel: "Delete item",
      danger: true,
      onYes: () => {
        deleteCustomItem(d.customId!);
        toast(`${d.name} deleted`, "warn");
      },
    });
  };

  const removeCategory = (c: LiveCategory) =>
    ask({
      title: `Delete "${c.title}"?`,
      text: "The category and every item you added to it will be removed.",
      confirmLabel: "Delete category",
      danger: true,
      onYes: () => {
        deleteCustomCategory(c.id);
        setCat("all");
        toast(`${c.title} deleted`, "warn");
      },
    });

  const addCat = () => {
    const title = (newCat ?? "").trim();
    if (!title) return;
    const id = addCustomCategory(title);
    setCat(id);
    setNewCat(null);
    toast(`${title} category added`);
  };

  return (
    <>
      <PageHead
        title="Menu"
        sub={`${total} items - ${soldOutCount} sold out - ${hiddenCount} hidden. Changes go live on the website instantly.`}
        actions={
          <>
            <button className="adm-btn adm-btn--ghost" onClick={() => setNewCat("")}>
              <FaPlus aria-hidden /> Category
            </button>
            <button className="adm-btn adm-btn--red" onClick={() => setEditor({ cat: menu.find((c) => c.id === cat) ?? menu[0], dish: null })}>
              <FaPlus aria-hidden /> Add item
            </button>
          </>
        }
      />

      <div className="adm-toolbar">
        <label className="adm-search">
          <FaSearch aria-hidden />
          <input placeholder={`Search ${total} items`} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search menu" />
        </label>
        <select className="adm-select" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Filter items">
          <option value="all">All items</option>
          <option value="soldout">Sold out</option>
          <option value="hidden">Hidden</option>
          <option value="edited">Price / details changed</option>
          <option value="custom">Added by us</option>
        </select>
      </div>

      <div className="adm-chipbar" role="tablist" aria-label="Categories">
        <button role="tab" aria-selected={cat === "all"} className={`adm-chip ${cat === "all" ? "is-active" : ""}`} onClick={() => setCat("all")}>
          All <b>{total}</b>
        </button>
        {menu.map((c) => (
          <button key={c.id} role="tab" aria-selected={cat === c.id} className={`adm-chip ${cat === c.id ? "is-active" : ""}`} onClick={() => setCat(c.id)}>
            {c.title} <b>{c.items.length}</b>
          </button>
        ))}
      </div>

      {sections.length === 0 ? (
        <div className="adm-card">
          <Empty icon={FaUtensils} title="No items found" text="Try a different search, filter or category." />
        </div>
      ) : (
        sections.map((c) => (
          <section className="adm-card adm-card--flush adm-menu-sec" key={c.id}>
            <header className="adm-menu-sec__head">
              <h3>
                {c.title} <small>{c.items.length} items</small>
                {c.custom && <Pill tone="yellow">Custom</Pill>}
              </h3>
              <div className="adm-menu-sec__tools">
                {c.custom && (
                  <button className="adm-btn adm-btn--ghost adm-btn--sm adm-btn--text-danger" onClick={() => removeCategory(c)}>
                    <FaTrashAlt aria-hidden /> Delete category
                  </button>
                )}
                <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setEditor({ cat: c, dish: null })}>
                  <FaPlus aria-hidden /> Add item here
                </button>
              </div>
            </header>

            {c.shown.length === 0 ? (
              <p className="adm-muted adm-menu-sec__empty">No items yet. Use &ldquo;Add item here&rdquo; to create the first one.</p>
            ) : (
              <ul className="adm-items">
                {c.shown.map((d) => (
                  <li key={d.customId ?? d.name} className={`adm-item ${d.hidden ? "is-hidden" : ""} ${d.soldOut ? "is-soldout" : ""}`}>
                    <Thumb dish={d} />
                    <div className="adm-item__info">
                      <h4>
                        {d.name}
                        {d.custom && <Pill tone="yellow">Custom</Pill>}
                        {d.edited && <Pill tone="preparing">Edited</Pill>}
                        {d.hidden && <Pill tone="muted">Hidden</Pill>}
                        {d.soldOut && <Pill tone="cancelled">Sold out</Pill>}
                      </h4>
                      {d.desc && <p>{d.desc}</p>}
                    </div>
                    <div className="adm-item__price">
                      {d.from && <small>From</small>}
                      <PriceInput value={d.price} onCommit={(n) => setPrice(c, d, n)} />
                    </div>
                    <div className="adm-item__avail">
                      <Switch checked={!d.soldOut} onChange={(v) => toggle(c, d, { soldOut: !v })} label={`${d.name} available`} />
                      <small>{d.soldOut ? "Sold out" : "Available"}</small>
                    </div>
                    <div className="adm-item__btns">
                      <button className="adm-icon-btn" onClick={() => setEditor({ cat: c, dish: d })} aria-label={`Edit ${d.name}`} title="Edit">
                        <FaEdit />
                      </button>
                      <button
                        className="adm-icon-btn"
                        onClick={() => toggle(c, d, { hidden: !d.hidden })}
                        aria-label={d.hidden ? `Show ${d.name} on website` : `Hide ${d.name} from website`}
                        title={d.hidden ? "Show on website" : "Hide from website"}
                      >
                        {d.hidden ? <FaEye /> : <FaEyeSlash />}
                      </button>
                      {d.custom ? (
                        <button className="adm-icon-btn adm-icon-btn--danger" onClick={() => removeItem(d)} aria-label={`Delete ${d.name}`} title="Delete">
                          <FaTrashAlt />
                        </button>
                      ) : (
                        d.edited && (
                          <button
                            className="adm-icon-btn"
                            onClick={() => {
                              resetOverride(c.id, d.name);
                              toast(`${d.name} restored to the original`);
                            }}
                            aria-label={`Reset ${d.name} to original`}
                            title="Reset to original"
                          >
                            <FaUndo />
                          </button>
                        )
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))
      )}

      {editor && <ItemEditor key={`${editor.cat.id}-${editor.dish?.name ?? "new"}`} target={editor} cats={menu} onClose={() => setEditor(null)} />}

      {newCat !== null && (
        <Modal
          title="Add category"
          onClose={() => setNewCat(null)}
          footer={
            <>
              <button className="adm-btn adm-btn--ghost" onClick={() => setNewCat(null)}>
                Cancel
              </button>
              <button className="adm-btn adm-btn--red" onClick={addCat} disabled={!newCat.trim()}>
                Add category
              </button>
            </>
          }
        >
          <label className="adm-field">
            <span>Category name</span>
            <input
              className="adm-input"
              autoFocus
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCat()}
              placeholder="e.g. Desserts"
              maxLength={40}
            />
          </label>
        </Modal>
      )}

      {dialog}
    </>
  );
}
