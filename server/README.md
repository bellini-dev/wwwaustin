# Events API (Express + Postgres)

Node.js Express backend with JWT auth, event CRUD, and RSVP (yes/maybe).

## Setup

1. **Postgres**  
   Create a database (e.g. `www_austin`).

2. **Env**  
   Copy `.env.example` to `.env` and set:
   - `DATABASE_URL` – Postgres connection string (e.g. `postgresql://user:pass@localhost:5432/www_austin`)
   - `JWT_SECRET` – secret for signing tokens
   - `PORT` (optional, default 3001)

3. **Install & init DB**
   ```bash
   npm install
   npm run db:init
   ```

4. **Run**
   ```bash
   npm run dev   # with --watch
   npm start     # production
   ```

## API

Base URL: `http://localhost:3001` (or your `PORT`).

### Auth

| Method | Path           | Body                    | Description        |
|--------|----------------|-------------------------|--------------------|
| POST   | `/auth/register` | `email`, `password`, `name?` | Register, returns `user` + `token` |
| POST   | `/auth/login`    | `email`, `password`     | Login, returns `user` + `token`    |
| GET    | `/auth/me`       | (header `Authorization: Bearer <token>`) | Current user       |

### Events (CRUD)

| Method | Path        | Auth | Description        |
|--------|-------------|------|--------------------|
| GET    | `/events`   | no   | List events (optional `?from=ISO&to=ISO`) |
| GET    | `/events/:id` | no | One event + rsvps  |
| POST   | `/events`   | yes  | Create (`what`, `where`, `datetime` ISO) |
| PUT    | `/events/:id` | yes | Update event       |
| DELETE | `/events/:id` | yes | Delete event       |

### RSVP

| Method | Path              | Auth | Body / Description      |
|--------|-------------------|------|--------------------------|
| POST   | `/events/:id/rsvp` | yes  | `{ "status": "yes" \| "maybe" }` |
| DELETE | `/events/:id/rsvp` | yes  | Remove your RSVP         |

Protected routes: send header `Authorization: Bearer <token>`.

## Admin

Admins use a separate table (`admin_users`). **No API can create admins** — use the CLI only:

```bash
npm run admin:create <email> <password>
```

Example: `npm run admin:create admin@example.com mySecretPassword`

- **POST /admin/login** — Body: `email`, `password`. Returns `{ admin, token }`.
- **GET /admin/me** — Header: `Authorization: Bearer <admin-token>`. Returns `{ admin }`.
- **POST /admin/events** — Header: `Authorization: Bearer <admin-token>`. Body: `what`, `where`, `datetime` (ISO), `free_food?`, `free_drinks?`. Creates an event.

The React admin UI lives in the repo’s `admin/` directory (Vite). Run it with `cd admin && npm run dev`.

## Event shape

- `id`, `what`, `where`, `datetime`, `created_at`, `updated_at`
- `rsvps`: array of `{ user_id, name, status: "yes" | "maybe" }` (on GET list/detail)
