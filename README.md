# Win95 SeddamSweeper (React)

Beginner-friendly SeddamSweeper built with React + Vite.

- Windows 95 / metallic UI
- Classic reveal + flood fill + flags
- Shaped boards (inactive cells form a silhouette)
- Custom image mode: upload an image and generate a board from the red silhouette

## Controls

- Tap/click: reveal
- Right click: toggle flag (desktop)
- Long-press: toggle flag (mobile)

## Run Locally

```bash
npm install
npm run dev
```

## Visitor Tracking (Neon + Vercel)

This project includes a simple visit logger at `api/visit.js`.

- The client POSTs to `/api/visit` once per session.
- The serverless function stores `ip` (plain text) and `user_agent` in Neon.

Setup:

1) Create the table in Neon:

```sql
-- see: sql/visits.sql
```

2) Add `DATABASE_URL` to Vercel project environment variables (Neon connection string).

3) Deploy.

Example queries:

```sql
-- total visits
select count(*) from visits;

-- unique IPs today (rough unique visitors)
select count(distinct ip)
from visits
where created_at >= date_trunc('day', now());
```

Build:

```bash
npm run build
npm run preview
```

## Custom Image Boards

Use the `Custom Image...` button.

Tips for best results:

- Use a high-contrast silhouette (red shape on dark background works best)
- Avoid gradients and transparent edges (crisp shapes generate cleaner masks)

## Project Structure

```text
src/
  App.jsx
  components/
    Board.jsx
    Cell.jsx
  utils/
    gameLogic.js
  styles.css
```

## How Shaped Boards Work

The grid is still rectangular, but each cell has an `isActive` flag.

- Active cells participate in the game
- Inactive cells render as empty space and are ignored by all rules


### AI used

- Opencode CLI, with gpt 5.2 free account
