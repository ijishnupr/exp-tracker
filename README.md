# Expense Tracker

An installable PWA for logging expenses, with Firebase Auth + Firestore as the
backend. Works offline: reads come from a local IndexedDB cache and writes queue
until the connection returns.

- **Frontend** — React 18, Vite 5, Tailwind 3, Recharts
- **Backend** — Firebase Auth (Google sign-in) + Cloud Firestore
- **Offline** — Firestore persistent local cache + a Workbox service worker
- **Income & expense** — every entry carries a `type`; budgets apply to spending only
- **Categories** — user-editable in Settings; renaming never breaks history
- **Import** — Axio (Walnut) CSV, idempotent, with a confirm step
- **Export** — two-sheet `.xlsx` (transactions + per-type category summary)

## Requirements

| | Version | Why |
|---|---|---|
| `npm run dev` | Node **18+** | works on the system Node |
| `npm run build` | Node **20+** | the service-worker minifier runs in worker threads, where Node 18 does not expose `crypto` |

An `.nvmrc` pins Node 22 — run `nvm use` before building.

## 1. Create the Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and
   **Add project**.
2. **Build › Authentication › Get started › Google** — enable it and save.
3. **Build › Firestore Database › Create database** — pick a region close to you
   and start in **production mode** (the rules in this repo replace the defaults).
4. **Project settings (⚙) › General › Your apps › Web (`</>`)** — register a web
   app and copy the `firebaseConfig` values.

## 2. Configure this app

```bash
cp .env.example .env
```

Paste the config values into `.env`:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef
```

These are public identifiers, not secrets — Firestore security rules are what
actually protect the data. `.env` is gitignored anyway.

```bash
npm install
npm run dev          # http://localhost:5173
```

Until `.env` is filled in, the app shows a setup checklist instead of a login
screen.

## 3. Deploy the rules and the app

```bash
npm install -g firebase-tools
firebase login
firebase use --add                      # pick the project you just created
firebase deploy --only firestore:rules  # do this before real use
npm run deploy                          # build + deploy hosting and rules
```

After the first deploy, add your Hosting domain under **Authentication ›
Settings › Authorised domains** if it is not there already. `localhost` is
authorised by default.

## Data model

Everything is namespaced under the signed-in user, so `firestore.rules` reduces
to "you may only touch your own subtree" plus shape validation on writes:

```
users/{uid}                       → email, displayName, photoURL, currency
users/{uid}/expenses/{id}         → amount, type ('expense'|'income'), category,
                                    note, date (timestamp)
users/{uid}/budgets/{category}    → limit (number)    // doc id IS the category key
users/{uid}/categories/{key}      → label, icon, type, slot (1-8), order, archived
```

Budgets are keyed by category, so a limit applies to every month rather than
needing a row per month. Budgets only ever apply to `type: 'expense'`.

The `expenses` collection holds **both** income and expense, distinguished by
`type`. It keeps that name so existing entries and their ids stay valid; an
entry written before the income feature existed has no `type` and reads as an
expense.

Categories are seeded from `DEFAULT_CATEGORIES` on first run and then owned by
the user. `key` is the stable id an entry stores, so renaming a category changes
only its label. Removing a category that still has entries **archives** it
(hidden from the pickers, still readable in history) rather than orphaning them;
an unused one is deleted outright.

The range query (`date >=` … `date <=` … `orderBy date`) uses a single field, so
**no composite index is required** — `firestore.indexes.json` is intentionally
empty.

## How the offline story works

Two independent layers, and it matters not to confuse them:

- **The service worker** (Workbox, via `vite-plugin-pwa`) caches the app shell —
  HTML, JS, CSS, icons. It never caches Firestore or Auth traffic.
- **Firestore's persistent local cache** (`persistentLocalCache` in
  `src/lib/firebase.js`) holds the *data* in IndexedDB and queues writes.

So: adding an expense on a train works, and it syncs on reconnect. The banner at
the top of the screen says which state you are in. Signing in is the one thing
that needs a connection.

`registerType` is `prompt`, so a new deploy never swaps itself in mid-edit — the
user gets a "Reload" button.

## Launching straight into the add form

The add sheet is driven by a URL, not component state, so anything can open it:

| Route | Behaviour |
|---|---|
| `/add` | redirects to `/?add=1` — point a phone gesture or shortcut here |
| `/?add=1` | the sheet is open over the dashboard; back closes it |

Three ways in, all hitting the same path:

1. **Settings › On launch › "Open the add-entry form"** (default **on**) — a plain
   tap on the installed app icon goes straight to the form. Per device, stored in
   `localStorage`. Only applies to the installed app, never a browser tab, and
   only on a bare launch — a deep link keeps its place.
2. **Long-press the app icon** → "Add entry" (a manifest `shortcuts` entry).
3. **Any custom gesture** (a double-tap launcher, Android Activity shortcut,
   iOS Shortcuts action) pointed at `https://<your-host>/add`.

## Importing an Axio CSV

**Settings › Import from CSV.** Built against an Axio (formerly Walnut) "EXPENSE
REPORT" export: five metadata lines, then a header row of `DATE, TIME, PLACE,
AMOUNT, DR/CR, ACCOUNT, EXPENSE, INCOME, CATEGORY, TAGS, NOTE`.

How rows are treated:

- `DR` → expense, `CR` → income.
- **Self-transfers are skipped.** Rows categorised `TRANSFER`, `ACCOUNT TRANSFER`
  or `SPLIT` are money moving between your own accounts; counting them would
  inflate income *and* expense. They are dropped and reported in the summary.
- **`ACCOUNT` and `TIME` are folded into the note** (`PLACE · ACCOUNT · TIME`)
  rather than adding fields.
- Known category names are mapped to app categories; unmapped ones become **new
  categories**, created before the entries that reference them.
  `UNKNOWN`/`CREDIT`/`OTHER` are Axio's "not categorised" placeholders and land
  in Other.
- **Re-importing is safe.** Each entry's document id is a deterministic hash of
  date + time + amount + DR/CR + place + account, so a second run updates in
  place. Rows that are genuinely identical get an occurrence suffix, so two real
  payments a minute apart both survive.
- Writes go in batches of 500 with a progress bar. An interrupted import can
  simply be re-run.

Everything is parsed and summarised **before** anything is written, and the
summary is shown for confirmation.

## Charts

Chart colour and form follow a validated system rather than taste:

- Spend-by-category is a **horizontal bar chart**, not a pie — lengths are
  comparable where angles are not, and long category names fit. It is
  **single-hue**: one measure, so repainting each bar would encode nothing.
- The trend chart is **income vs expense grouped bars** once any income exists,
  with a legend always present and only the selected month direct-labelled. The
  two hues validate all-pairs in both modes (normal-vision ΔE 24.0 light / 20.9
  dark); tritan separation is the weak axis, which is exactly why the legend and
  labels are not optional.
- Category identity lives in the chip beside each name, never in a chart series.
  Colour slots repeat past eight categories, which is safe precisely because
  charts are single-hue and every chip sits next to its label.
- Budget status uses the reserved **status palette**, always paired with an icon
  and a word, so meaning never rests on colour alone.
- The eight category colours are a fixed, validated order (worst adjacent
  colour-vision ΔE 9.1 light / 8.4 dark). Eight is the ceiling — a ninth would
  need a generated hue that is indistinguishable under CVD, which is why
  `CATEGORIES` is a closed list and the chart folds its tail into "Other".

Dark mode is a selected palette stepped for the dark surface, not an automatic
inversion. It follows the OS by default and can be overridden in Settings.

## Excel export

**Settings › Export to Excel** writes two sheets:

- **Expenses** — date, category, amount, note, plus a total row
- **Summary** — per-category amount, share and entry count

Amounts are written as real numbers with an Excel currency format, so they can
be summed in the spreadsheet. The current month exports offline from the local
cache; "all time" reads the full history and needs a connection the first time.

The writer is a dynamic import, so its ~135 KB stays out of the initial load.

## Visual preview without Firebase

`preview.html` renders the real pages against seeded data, so layout and charts
can be checked without a live project:

```bash
npm run dev
# http://localhost:5173/preview.html
#   ?page=/transactions|/budgets|/settings|/login
#   &add=1               (open the add-entry sheet)
#   &theme=light|dark
#   &month=-1            (step back a month for a full month of data)
```

It is a dev-only entry — `npm run build` only bundles `index.html`.

## Project layout

```
src/
  lib/
    firebase.js       app/auth/firestore init (skipped when .env is blank)
    categories.js     default seed list, colour slots, key generation
    prefs.js          per-device settings (theme, open-add-on-launch)
    money.js          parse, round, format, percent change
    analytics.js      month/category bucketing, income/expense split, budgets
    csvImport.js      Axio CSV parser + mapper (pure, no Firestore)
    excelSheets.js    pure sheet builders (testable, no DOM)
    excel.js          hands the sheets to the browser xlsx writer
  context/
    AuthContext.jsx   Google sign-in, popup with redirect fallback
    DataContext.jsx   live subscriptions + CRUD; one query feeds month + trend
  components/         charts, meters, list, form, sheet, PWA prompts
  pages/              Dashboard, Transactions, Budgets, Settings, Login,
                      SetupNeeded
```

`analytics.js`, `money.js`, `categories.js`, `csvImport.js` and `excelSheets.js`
are pure and have no Firebase or DOM dependency — that is where to add tests
first.
# exp-tracker
# exp-tracker
# exp-tracker
# exp-tracker
