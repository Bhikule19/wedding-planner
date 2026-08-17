# Vaibhav — Wedding Planning MVP

A private, budget-first wedding planning tool for the decision-making stage. It deliberately distinguishes forecasts from commitments and payments, so candidates do not silently become booked expenses.

## What works in this MVP

- Budget-first dashboard with allocated, forecast, committed, and paid totals
- Category-level budget health and uncertain cost exposure
- Decision inbox with candidates and deliberate decision state
- Event plan for Haldi, Sangeet, Wedding, and Reception
- Planning-library view for vendors, shopping, and add-ons
- Add a planning item; it appears in the budget, library, and decision inbox
- Browser `localStorage` persistence; no account, database, or server required

## Run locally

This is a dependency-free static site. Open `index.html` directly, or serve it locally:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Hosting

The project can be hosted privately on a static host (GitHub Pages, Cloudflare Pages, Netlify, or Vercel). Be aware that browser-local data stays in each browser; it is not shared or backed up. A later internal-use version should add authentication and a database before relying on it for real wedding data.

## GitHub setup

The local repository is initialized separately. To publish it:

```bash
git add .
git commit -m "Initial wedding planning MVP"
git branch -M main
git remote add origin git@github.com:YOUR-ACCOUNT/wedding-planner.git
git push -u origin main
```

Do not make the repository public if it will contain names, vendor contacts, quotations, addresses, or payment information.
