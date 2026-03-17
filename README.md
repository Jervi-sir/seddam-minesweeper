# Win95 Minesweeper (React)

Beginner-friendly Minesweeper built with React + Vite.

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