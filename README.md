# Dr. Aqua Backend API

Production Express.js & Supabase REST API Service for Dr. Aqua Water Purification Systems, configured for deployment on **Render**.

## Architecture & Integration

- **Hosting**: Render (Web Service via `render.yaml` blueprint or GitHub integration)
- **Database**: Supabase PostgreSQL (`ivfvxnwciuqicqqnlbtx.supabase.co`)
- **Frontend Portal**: Deployed on Vercel
- **Storefront**: Next.js Storefront (`dr-aqua-project.vercel.app`)

## Environment Variables

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `PORT` | Listening port on Render | `10000` |
| `NODE_ENV` | Environment mode | `production` |
| `SUPABASE_URL` | Supabase Cloud Instance URL | `https://ivfvxnwciuqicqqnlbtx.supabase.co` |
| `SUPABASE_ANON_KEY` | Public Supabase anon client key | *Legacy anon JWT* |

## API Endpoints

### Health & Diagnostics
- `GET /` - Service info, database status & live product counts
- `GET /health` - Render health check endpoint

### Products & Inventory
- `GET /api/products` - List all products
- `POST /api/products` - Upsert a product
- `PATCH /api/products/:id/stock` - Real-time stock adjustment

### Omnichannel Orders
- `GET /api/orders` - List web orders & counter invoices (filter by `status`)
- `POST /api/orders` - Place a new order
- `PATCH /api/orders/:id/status` - Advance order status (Pending -> Dispatched -> Completed)

### Customers & CRM
- `GET /api/customers` - List clients with purchase & service ledger
- `POST /api/customers` - Register client
- `DELETE /api/customers/:id` - Remove customer

### Service Engine & Bookings
- `GET /api/bookings` - List field installations & service visits
- `POST /api/bookings` - Schedule new service appointment
- `PATCH /api/bookings/:id` - Complete service, record TDS and deduct parts

### Sales & Financials
- `GET /api/sales` - Master sales ledger
- `POST /api/sales` - Log POS counter sale

### Two-Way Reconciliation
- `POST /api/sync` - Bulk offline queue & cloud reconciliation

## Deploying to Render

1. Connect this GitHub repository (`dr-aqua-backend`) on [Render Dashboard](https://dashboard.render.com).
2. Choose **Web Service**. Render automatically detects `render.yaml`.
3. Click **Deploy**.
