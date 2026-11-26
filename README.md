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

- **Open:** `http://localhost:5173/admin` (live site: `https://your-domain/admin`).
- **Dashboard:** revenue today vs yesterday, 7-day revenue chart, live order queue, best sellers, upcoming bookings.
- **Orders:** every website order arrives live (chime + toast). Search, filter by status / type / period, move an order New -> Preparing -> Ready / Out for delivery -> Completed, cancel, print a kitchen slip, export CSV.
- **Table bookings:** confirm / complete / cancel Dine-in bookings, see pre-ordered items.
- **Menu:** change prices inline, mark items **sold out** or **hidden**, edit descriptions / photos, add your own items and categories. Changes show on `/menu` and in the chatbot (within ~30 s).
- **Customers:** built automatically from orders and bookings (by phone number), with order history and CSV export.
- **Settings:** delivery charge, new-order sound, backup, reset.

### Supabase setup (shared data + secure login)
Without Supabase the panel runs in browser-only demo mode (data stays in one browser, login is a front-end gate). With Supabase, orders go to a shared database, every team member sees the same live data, and login is real.

1. Create a free project at supabase.com.
2. **SQL Editor -> New query**: paste everything from `supabase/schema.sql` and **Run**.
3. **Authentication -> Users -> Add user**: create the team login (email + password, tick *Auto Confirm User*). Add one per team member.
4. **Authentication -> Sign In / Providers** (or *Settings*): switch **off** "Allow new users to sign up". This is important - otherwise anyone could create an account and read the orders.
5. **Project Settings -> API**: copy the *Project URL* and the *anon / publishable key*.
6. Put them in `.env` (local) and in Netlify -> Environment variables, then redeploy:
   `VITE_SUPABASE_URL=https://xxxx.supabase.co` and `VITE_SUPABASE_ANON_KEY=...`

Security model: customers (not signed in) can only *insert* new orders/bookings; only signed-in team members can read, update or delete them (Row Level Security in `schema.sql`). When Supabase is on, orders no longer go through Netlify Forms.
