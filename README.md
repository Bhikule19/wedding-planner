# Vaibhav — Wedding Planning MVP

A private, budget-first wedding planning tool for the decision-making stage. It deliberately distinguishes forecasts from commitments and payments, so candidates do not silently become booked expenses.

## What works in this MVP

- Budget-first dashboard with allocated, forecast, committed, and paid totals
- Category-level budget health and uncertain cost exposure
- Decision inbox with candidates and deliberate decision state
- Event plan for Haldi, Sangeet, Wedding, and Reception
- Planning-library view for vendors, shopping, and add-ons
- Add a planning item; it appears in the budget, library, and decision inbox
- Browser-local persistence, with optional Firestore sync across browsers

## Run locally

This is a dependency-free static site. Open `index.html` directly, or serve it locally:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Firebase sync setup

For automatic cross-browser consistency, configure the included Firestore integration:

1. Create a Firebase project and register a Web app.
2. Enable **Authentication → Google** and create **Cloud Firestore** in production mode.
3. Paste the Web app configuration object into `firebase-config.js` and replace `allowedEmail` with your Google email.
4. Replace the same placeholder email in `firestore.rules`, then publish those rules in the Firebase console.
5. In Firebase Authentication settings, add your deployed domain to Authorized domains.

The Google sign-in is deliberate. A client-only Firestore app with no authentication would require public rules, meaning anyone who discovers the app could read or overwrite your wedding data. This setup permits only your Google account. The current data is text-only and stored in a single Firestore document; photos and attachments require Firebase Storage in a later phase.

## Hosting

The project can be hosted as a static site (GitHub Pages, Cloudflare Pages, Netlify, or Vercel). Until Firebase is configured, it continues to work locally in the browser. Once configured, edits sync after Google sign-in.

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
