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
