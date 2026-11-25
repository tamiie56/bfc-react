import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { FaDownload, FaMagic, FaTrashAlt, FaUndo, FaUpload } from "react-icons/fa";
import { DELIVERY_CHARGE } from "../../data/menu";
import { makeDemoData } from "../demo";
import { downloadFile, todayDhaka } from "../format";
import {
  clearOrdersAndBookings,
  exportBackup,
  importBackup,
  replaceOrdersAndBookings,
  resetMenuEdits,
  updateSettings,
  useBookings,
  useMenuState,
  useOrders,
  useSettings,
} from "../store";
import { PageHead, Switch, useConfirm, useToast } from "../ui";

export default function Settings() {
  const settings = useSettings();
  const orders = useOrders();
  const bookings = useBookings();
  const menu = useMenuState();
  const toast = useToast();
  const { ask, dialog } = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [charge, setCharge] = useState(String(settings.deliveryCharge));

  const edits = Object.keys(menu.overrides).length + menu.customItems.length + menu.customCategories.length;
  const chargeNum = Math.round(Number(charge));
  const chargeValid = charge !== "" && Number.isFinite(chargeNum) && chargeNum >= 0 && chargeNum <= 1000;

  const saveCharge = () => {
    if (!chargeValid) return;
    updateSettings({ deliveryCharge: chargeNum });
    toast(`Delivery charge set to ৳${chargeNum}`);
  };

  const backup = () => {
    downloadFile(`bfc-backup-${todayDhaka()}.json`, JSON.stringify(exportBackup(), null, 2), "application/json");
    toast("Backup downloaded");
  };

  const restore = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data: unknown = JSON.parse((await file.text()).replace(/^\ufeff/, ""));
      ask({
        title: "Restore this backup?",
        text: "Orders, bookings, menu edits and settings in the backup will replace what is in the panel now.",
        confirmLabel: "Restore",
        onYes: () => (importBackup(data) ? toast("Backup restored") : toast("That file is not a BFC backup", "warn")),
      });
    } catch {
      toast("Could not read that file", "warn");
    }
  };

  return (
    <>
      <PageHead title="Settings" sub="Delivery, notifications and data tools" />

      <div className="adm-grid adm-grid--2">
        <section className="adm-card">
          <header className="adm-card__head">
            <h3>Delivery charge</h3>
          </header>
          <p className="adm-muted">Added to Online Delivery orders at checkout and shown on the menu page. Currently the website default is ৳{DELIVERY_CHARGE}.</p>
          <div className="adm-inline">
            <label className="adm-price adm-price--lg">
              <span>৳</span>
              <input inputMode="numeric" value={charge} onChange={(e) => setCharge(e.target.value.replace(/[^\d]/g, ""))} aria-label="Delivery charge" />
            </label>
            <button className="adm-btn adm-btn--red" onClick={saveCharge} disabled={!chargeValid || chargeNum === settings.deliveryCharge}>
              Save
            </button>
          </div>
        </section>

        <section className="adm-card">
          <header className="adm-card__head">
            <h3>Notifications</h3>
          </header>
          <div className="adm-setting">
            <div>
              <b>New order sound</b>
              <p className="adm-muted">Plays a short chime when an order or booking arrives while this panel is open.</p>
            </div>
            <Switch checked={settings.sound} onChange={(v) => updateSettings({ sound: v })} label="New order sound" />
          </div>
        </section>
      </div>

      <section className="adm-card">
        <header className="adm-card__head">
          <div>
            <h3>Data</h3>
            <p className="adm-muted">
              {orders.length} orders - {bookings.length} bookings - {edits} menu {edits === 1 ? "edit" : "edits"}
            </p>
          </div>
        </header>

        <div className="adm-note-box">
          <b>Where is the data stored?</b>
          <p>
            Right now the panel keeps its data in this browser, shared with the website in the same browser. Customers&rsquo; orders are still
            sent to Netlify Forms too, so nothing is lost. For a team using the panel from different phones and computers, connect a shared
            database (Firebase / Supabase) - the whole data layer is in <code>src/admin/store.ts</code>.
          </p>
        </div>

        <div className="adm-actions-grid">
          <button className="adm-action" onClick={backup}>
            <FaDownload aria-hidden />
            <b>Download backup</b>
            <span>Orders, bookings, menu and settings as one .json file</span>
          </button>

          <button className="adm-action" onClick={() => fileRef.current?.click()}>
            <FaUpload aria-hidden />
            <b>Restore backup</b>
            <span>Load a backup file you downloaded earlier</span>
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={restore} />

          <button
            className="adm-action"
            onClick={() =>
              ask({
                title: "Load sample data?",
                text: "This replaces the current orders and bookings with sample ones so you can explore the panel. Your menu edits are kept.",
                confirmLabel: "Load sample data",
                onYes: () => {
                  const d = makeDemoData();
                  replaceOrdersAndBookings(d.orders, d.bookings);
                  toast("Sample data loaded");
                },
              })
            }
          >
            <FaMagic aria-hidden />
            <b>Load sample data</b>
            <span>Fill the dashboard with demo orders to try things out</span>
          </button>

          <button
            className="adm-action"
            disabled={edits === 0}
            onClick={() =>
              ask({
                title: "Reset all menu edits?",
                text: "Prices, sold-out flags, hidden items and everything you added go back to the original BFC menu.",
                confirmLabel: "Reset menu",
                danger: true,
                onYes: () => {
                  resetMenuEdits();
                  toast("Menu restored to the original", "warn");
                },
              })
            }
          >
            <FaUndo aria-hidden />
            <b>Reset menu edits</b>
            <span>Go back to the original BFC menu and prices</span>
          </button>

          <button
            className="adm-action adm-action--danger"
            disabled={orders.length + bookings.length === 0}
            onClick={() =>
              ask({
                title: "Clear all orders and bookings?",
                text: "Every order and table booking is removed from the panel. Download a backup first if you may need them.",
                confirmLabel: "Clear everything",
                danger: true,
                onYes: () => {
                  clearOrdersAndBookings();
                  toast("Orders and bookings cleared", "warn");
                },
              })
            }
          >
            <FaTrashAlt aria-hidden />
            <b>Clear orders &amp; bookings</b>
            <span>Remove all test or old data</span>
          </button>
        </div>
      </section>

      <section className="adm-card">
        <header className="adm-card__head">
          <h3>Admin login</h3>
        </header>
        <p className="adm-muted">
          Set <code>VITE_ADMIN_USER</code> and <code>VITE_ADMIN_PASS</code> in your <code>.env</code> file (and in Netlify &rarr; Environment
          variables), then rebuild. This login only keeps casual visitors out - before real use, switch to a proper backend login.
        </p>
      </section>

      {dialog}
    </>
  );
}
