# WWW Austin Admin

Simple React (Vite) admin panel to create events. Login only (no signup); admins are created via CLI.

## Setup

1. **Backend**  
   Ensure the server is running and the database has the `admin_users` table (`npm run db:init` in `server/`).

2. **Create an admin** (from repo root):
   ```bash
   cd server && node scripts/create-admin.js <email> <password>
   ```
   Example: `node scripts/create-admin.js admin@example.com mySecretPassword`

3. **Admin app**  
   From this directory:
   ```bash
   npm install
   npm run dev
   ```
   Open http://localhost:5174 (or the port Vite prints).

4. **API URL**  
   By default the dev server proxies `/admin` to `http://localhost:3001`. To use another backend, set `VITE_API_URL` in `.env` (e.g. `VITE_API_URL=http://localhost:3001`).

## Usage

- **Login** — Use the admin email and password you created with the script.
- **Create event** — Fill in What, Where (address), Date/time, and optionally check Free food / Free drinks. Use **Preview on map** to geocode the address and show it on the map; confirm the pin is correct, then submit **Create event**.

## Build

```bash
npm run build
```
Output is in `dist/`. Set `VITE_API_URL` to your production API URL before building if needed.
