# D-Care Frontend

Next.js 14 + RTK Query frontend for the D-Care Drug Management System.

## Setup

```bash
# Install dependencies
npm install

# Copy and configure env
cp .env.local.example .env.local
# Edit .env.local → set NEXT_PUBLIC_API_URL to your backend URL

# Start dev server
npm run dev
```

Open http://localhost:3000

## Project Structure

```
dcare/
├── app/
│   ├── layout.tsx                    # Root layout (Provider + Sidebar + Topbar)
│   ├── page.tsx                      # Redirect → /medicine/drug-master
│   ├── dashboard/page.tsx            # Dashboard with stats
│   └── medicine/
│       ├── drug-master/page.tsx      # Drug list with Add/Edit/Delete
│       ├── purchased-drugs/page.tsx  # 4-tab: Register / Stocks / Dispatch / Dispatched
│       ├── dispatch-confirmation/    # Confirm pending dispatches
│       ├── low-stock/               # Low stock alerts
│       └── expiry-alert/            # Expiry alerts
├── components/
│   └── layout/
│       ├── Sidebar.tsx              # Collapsible sidebar
│       └── Topbar.tsx               # Date chip + user
├── store/
│   ├── store.ts                     # Redux store
│   └── services/drugApi.ts          # RTK Query endpoints
└── styles/globals.css               # CSS variables + resets
```

## API Endpoints Expected (from your backend)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/drugs/ | List all drugs |
| POST | /api/drugs/ | Create drug |
| PUT | /api/drugs/:id/ | Update drug |
| DELETE | /api/drugs/:id/ | Delete drug |
| POST | /api/purchases/ | Save purchase |
| GET | /api/purchases/stocks/ | Drug stocks |
| GET | /api/purchases/low-stock/ | Low stock items |
| GET | /api/purchases/expiry-alerts/ | Expiry alerts |
| POST | /api/dispatch/ | Dispatch drug |
| GET | /api/dispatch/ | List dispatched |
| GET | /api/dispatch/pending-count/ | Pending count |
| POST | /api/dispatch/:id/confirm/ | Confirm dispatch |

## Auth

Set `NEXT_PUBLIC_API_URL` and store a JWT token under `localStorage['token']`  
after login — the API service reads it automatically for every request.
"# phmsui" 
