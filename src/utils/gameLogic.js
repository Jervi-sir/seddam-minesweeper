/**
 * Minesweeper game logic (no React in this file).
 *
 * The board is a 2D array of cell objects.
 * Each cell stores:
 * - isMine: boolean
 * - isRevealed: boolean
 * - isFlagged: boolean
 * - adjacentMines: number
 *
 * IMPORTANT for React state:
 * We do NOT mutate the existing board in-place.
 * Every function returns a NEW board (deep cloned).
 */

// -------------------------
// Helpers
// -------------------------

function makeCell(row, col) {
  return {
    row,
    col,
    // For "shaped" boards we keep a rectangular grid, but some cells are inactive.
    // Inactive cells are ignored by all game rules and rendered as blank space.
    isActive: true,
    isMine: false,
    isRevealed: false,
    isFlagged: false,
    adjacentMines: 0,
  };
}

function cloneBoard(board) {
  // Deep clone: new arrays + new cell objects.
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

function inBounds(board, row, col) {
  return row >= 0 && row < board.length && col >= 0 && col < board[0].length;
}

function getNeighbors(board, row, col) {
  // 8 directions.
  const dirs = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];

  const out = [];
  for (const [dr, dc] of dirs) {
    const r = row + dr;
    const c = col + dc;
    if (inBounds(board, r, c)) out.push([r, c]);
  }
  return out;
}

// -------------------------
// 1) createBoard(rows, cols, mines)
// -------------------------

/**
 * Create a 2D array of cells and randomly place mines.
 *
 * Steps:
 * 1) Create rows x cols cells
 * 2) Pick unique random positions
 * 3) Mark those cells as mines
 */
export function createBoard(rows, cols, mines, mask = null) {
  const totalCells = rows * cols;
  const mineCountRequested = Math.min(mines, totalCells - 1); // keep at least 1 safe cell

  // 1) Create the empty board.
  const board = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => makeCell(r, c))
  );

  // If a mask is provided, mark inactive cells.
  // mask is a 2D array of booleans where true = playable.
  if (mask) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const active = Boolean(mask?.[r]?.[c]);
        board[r][c].isActive = active;

        if (!active) {
          // Make sure inactive cells stay empty and untouched.
          board[r][c].isMine = false;
          board[r][c].isRevealed = false;
          board[r][c].isFlagged = false;
          board[r][c].adjacentMines = 0;
        }
      }
    }
  }

  // Place mines only on active cells.
  const activeIndices = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].isActive) activeIndices.push(r * cols + c);
    }
  }

  const activeCount = activeIndices.length;
  const mineCount = Math.min(mineCountRequested, Math.max(0, activeCount - 1));

  // 2) Choose random unique positions (Set prevents duplicates).
  const positions = new Set();
  while (positions.size < mineCount) {
    const pick = Math.floor(Math.random() * activeIndices.length);
    positions.add(activeIndices[pick]);
  }

  // 3) Apply mines.
  for (const idx of positions) {
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    board[r][c].isMine = true;
  }

  return board;
}

// -------------------------
// 2) calculateAdjacency(board)
// -------------------------

/**
 * For each non-mine cell, count how many neighboring mines exist.
 */
export function calculateAdjacency(board) {
  const next = cloneBoard(board);

  for (let r = 0; r < next.length; r++) {
    for (let c = 0; c < next[0].length; c++) {
      const cell = next[r][c];

      if (!cell.isActive) {
        cell.adjacentMines = 0;
        continue;
      }

      if (cell.isMine) {
        cell.adjacentMines = 0;
        continue;
      }

      let count = 0;
      for (const [nr, nc] of getNeighbors(next, r, c)) {
        const n = next[nr][nc];
        if (n.isActive && n.isMine) count++;
      }

      cell.adjacentMines = count;
    }
  }

  return next;
}

// -------------------------
// 3) revealCell(board, row, col)
// -------------------------

/**
 * Reveal a cell.
 *
 * Rules:
 * - If flagged or already revealed: do nothing
 * - If mine: reveal mines and return hitMine=true
 * - If adjacentMines === 0: flood fill (reveal neighbors)
 */
export function revealCell(board, row, col) {
  const next = cloneBoard(board);

  if (!inBounds(next, row, col)) return { board: next, hitMine: false };

  const start = next[row][col];
  if (!start.isActive) return { board: next, hitMine: false };
  if (start.isRevealed || start.isFlagged) {
    return { board: next, hitMine: false };
  }

  // Mine clicked -> game over.
  if (start.isMine) {
    start.isRevealed = true;

    // Reveal all mines so the player can see them.
    for (let r = 0; r < next.length; r++) {
      for (let c = 0; c < next[0].length; c++) {
        if (next[r][c].isActive && next[r][c].isMine) next[r][c].isRevealed = true;
      }
    }

    return { board: next, hitMine: true };
  }

  // Flood fill using a queue (BFS).
  const queue = [[row, col]];

  while (queue.length > 0) {
    const [r, c] = queue.shift();
    const cell = next[r][c];

    if (cell.isRevealed || cell.isFlagged) continue;

    cell.isRevealed = true;

    // If this cell is empty, keep expanding.
    if (cell.adjacentMines === 0) {
      for (const [nr, nc] of getNeighbors(next, r, c)) {
        const neighbor = next[nr][nc];
        // Never auto-reveal mines from flood fill.
        if (
          neighbor.isActive &&
          !neighbor.isMine &&
          !neighbor.isRevealed &&
          !neighbor.isFlagged
        ) {
          queue.push([nr, nc]);
        }
      }
    }
  }

  return { board: next, hitMine: false };
}

// -------------------------
// 4) checkWin(board)
// -------------------------

/**
 * Win if all NON-mine cells are revealed.
 */
export function checkWin(board) {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      const cell = board[r][c];
      if (!cell.isActive) continue;
      if (!cell.isMine && !cell.isRevealed) return false;
    }
  }
  return true;
}

// -------------------------
// UI helpers (flagging, HUD)
// -------------------------

/**
 * Right click toggles a flag.
 * - Can't flag revealed cells
 */
export function toggleFlag(board, row, col) {
  const next = cloneBoard(board);
  if (!inBounds(next, row, col)) return next;

  const cell = next[row][col];
  if (!cell.isActive) return next;
  if (cell.isRevealed) return next;

  cell.isFlagged = !cell.isFlagged;
  return next;
}

export function countFlags(board) {
  let n = 0;
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      const cell = board[r][c];
      if (cell.isActive && cell.isFlagged) n++;
    }
  }
  return n;
}

// -------------------------
// Shape masks (non-rectangular boards)
// -------------------------

/**
 * Create a playable mask from an <img>.
 *
 * This runs in the browser (it uses canvas).
 * The output is a 2D array of booleans where true = playable cell.
 */
export function maskFromImage(img, rows, cols) {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");

  ctx.drawImage(img, 0, 0);

  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const isRedPixel = (i) => {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Images in /public (and user uploads) are typically a silhouette on a dark background.
    // Keep thresholds simple for teaching and robustness.
    return a > 30 && r > 80 && r > g + 40 && r > b + 40;
  };

  // 1) Find bounding box of red pixels.
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (!isRedPixel(i)) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  // If the image has no red pixels, fall back to a full rectangle.
  if (maxX === -1) {
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => true));
  }

  // Add a little padding so the shape doesn't feel "cropped".
  const pad = Math.round(Math.max(width, height) * 0.01);
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  // 2) Downsample cropped pixels into a rows x cols mask.
  const mask = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Map this grid cell to a rectangle in the cropped image.
      const x0 = minX + Math.floor((c / cols) * cropW);
      const x1 = minX + Math.floor(((c + 1) / cols) * cropW);
      const y0 = minY + Math.floor((r / rows) * cropH);
      const y1 = minY + Math.floor(((r + 1) / rows) * cropH);

      // Sample a handful of points (cheap) instead of scanning every pixel.
      const samplesX = 4;
      const samplesY = 4;
      let active = false;
      for (let sy = 0; sy < samplesY && !active; sy++) {
        for (let sx = 0; sx < samplesX && !active; sx++) {
          const px = Math.min(
            x1 - 1,
            x0 + Math.floor(((sx + 0.5) / samplesX) * (x1 - x0))
          );
          const py = Math.min(
            y1 - 1,
            y0 + Math.floor(((sy + 0.5) / samplesY) * (y1 - y0))
          );
          if (px < 0 || py < 0) continue;
          const i = (py * width + px) * 4;
          if (isRedPixel(i)) active = true;
        }
      }

      mask[r][c] = active;
    }
  }

  return mask;
}

/**
 * Create a playable mask from an image URL.
 */
export async function maskFromImageUrl(url, rows, cols) {
  const img = new Image();
  img.src = url;
  await img.decode();
  return maskFromImage(img, rows, cols);
}

function maskFromStrings(lines) {
  // '.' = playable cell, anything else = inactive
  return lines.map((line) => Array.from(line).map((ch) => ch === "."));
}

/**
 * Get a predefined mask by name.
 *
 * Beginner-friendly approach:
 * - We "draw" a shape with simple ASCII art.
 * - The game still uses a rectangle internally, but inactive cells are ignored.
 */
export function getMaskByName(name) {
  if (name === "sleeper") {
    // A simple "sleeping human" silhouette: head on the left, body to the right.
    // Dimensions: 12 rows x 24 cols.
    const lines = [
      "        .......         ",
      "      ...........       ",
      "     ... ..... ...      ",
      "    ...   ...   ....... ",
      "   ...    ...   ....... ",
      "   ...          ........",
      "   ...          ........",
      "    ...   ...   ....... ",
      "     ... ..... ... .... ",
      "      ...........  .... ",
      "        .......      .. ",
      "                 .....  ",
    ];

    return maskFromStrings(lines);
  }

  if (name === "sleeper_profile") {
    // Profile of a person sleeping on the floor:
    // head on the left, body across the middle, feet on the right.
    // Dimensions: 12 rows x 28 cols.
    const lines = [
      "        ......              ",
      "      ..........            ",
      "     ......... ..           ",
      "    .......     ...         ",
      "   ......        .........  ",
      "  ......          ..........",
      "  ......          ..........",
      "   ......        .........  ",
      "    .......     ...   ..... ",
      "     ......... ..     ..... ",
      "      ..........       ...  ",
      "        ......        ..... ",
    ];

    return maskFromStrings(lines);
  }

  return null;
}
