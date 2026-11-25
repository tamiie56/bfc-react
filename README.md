# BFC (Best Fried Chicken) - React

bfcbd.com-er modern, animated React + TypeScript + Vite version.

```bash
npm install
npm run dev
npm run build
```

## Dynamic features
- Live Open/Closed status (Dhaka time, 10am-11pm)
- Auto-rotating food showcase with live price counter
- Outlet area search + selectable area card
- Animated counters, scroll reveal, parallax hero/review, marquee, scroll progress bar
- Gallery lightbox (keyboard + swipe), copy email/phone, Google Map embed
- Mobile sticky Call / Order bar

## Edit content
`src/data/content.ts` - text, prices, areas, gallery, links.
Images: `src/assets/images/` (hero.jpg, review.jpg, footer.jpg, logo.png replace-able).

## Routes
- `/` home, `/menu` menu page (react-router-dom). Item-wise menu: add rows to `MENU[].items` in `src/data/content.ts`.
- Hosting: single-page app, so redirect all paths to index.html (`public/_redirects` is included for Netlify).

## Ordering system (cart + checkout)
- Items on `/menu` open a popup -> quantity -> **Add to Cart**. Cart (drawer) -> **Checkout** (Delivery / Take Away / Dine-in, name, phone, area, address, note) -> **Place Order**.
- Cart and customer details are saved in the browser (localStorage).
- **Netlify:** the order is sent to **Netlify Forms** (form name `order`, declared in `index.html`).
  After deploying: Netlify -> Forms -> `order` to see orders; Site configuration -> Notifications -> *Form submission* to e-mail them.
- **Local dev (`npm run dev`):** orders are simulated (logged to the console) because Netlify is not running.

## Team admin panel (`/admin`)
A separate panel for the BFC team (orders, table bookings, menu, customers). It is its own lazy-loaded bundle, so customers never download it.

- **Open:** `http://localhost:5173/admin` (live site: `https://your-domain/admin`). Default login `admin` / `bfc@admin123` - change it with `VITE_ADMIN_USER` / `VITE_ADMIN_PASS` in `.env` (and in Netlify -> Environment variables).
- **Dashboard:** revenue today vs yesterday, 7-day revenue chart, live order queue, best sellers, upcoming bookings.
- **Orders:** every website order arrives live (chime + toast). Search, filter by status / type / period, move an order New -> Preparing -> Ready / Out for delivery -> Completed, cancel, print a kitchen slip, export CSV.
- **Table bookings:** confirm / complete / cancel Dine-in bookings, see pre-ordered items.
- **Menu:** change prices inline, mark items **sold out** or **hidden**, edit descriptions / photos, add your own items and categories. Changes show on `/menu` and in the chatbot immediately.
- **Customers:** built automatically from orders and bookings (by phone number), with order history and CSV export.
- **Settings:** delivery charge, new-order sound, backup / restore (.json), sample data, reset.

### Where the data lives
The panel stores its data in the browser (localStorage), shared with the website in the same browser and synced between tabs. Orders are *also* still sent to Netlify Forms, so nothing is lost. To use the panel from several phones / computers at once, replace the `collection()` helper in `src/admin/store.ts` with a shared database (Firebase / Supabase) - every page goes through that one file.
