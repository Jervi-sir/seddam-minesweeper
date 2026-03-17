import React, { useEffect, useMemo, useRef, useState } from "react";
import Board from "./components/Board";
import {
  calculateAdjacency,
  checkWin,
  countFlags,
  createBoard,
  getMaskByName,
  maskFromImage,
  maskFromImageUrl,
  revealCell,
  toggleFlag,
} from "./utils/gameLogic";
import "./styles.css";

// Difficulty presets (bonus feature). Easy is the default.
const BASE_DIFFICULTIES = {
  // Image-masked boards (silhouettes from /public).
  seddamVertical: {
    label: "Seddam (vertical mask)",
    rows: 28,
    cols: 12,
    mines: 30,
    maskImageUrl: "/seddam-vertical.png",
  },
  seddamHorizontal: {
    label: "Seddam (horizontal mask)",
    rows: 12,
    cols: 28,
    mines: 30,
    maskImageUrl: "/seddam-horizontal.png",
  },
  // Rectangular boards work better on mobile (fills width more naturally).
  easy: { label: "Easy (10x8, 12 mines)", rows: 8, cols: 10, mines: 12 },
  medium: { label: "Medium (14x10, 30 mines)", rows: 10, cols: 14, mines: 30 },

};

export default function App() {
  const [customDifficulty, setCustomDifficulty] = useState(null);
  const difficulties = useMemo(() => {
    if (!customDifficulty) return BASE_DIFFICULTIES;
    return { ...BASE_DIFFICULTIES, custom: customDifficulty };
  }, [customDifficulty]);

  const [difficultyKey, setDifficultyKey] = useState("seddamVertical");
  const difficulty = useMemo(
    () => difficulties[difficultyKey],
    [difficulties, difficultyKey]
  );

  // The board is a 2D array of cell objects.
  const [board, setBoard] = useState([]);

  // "playing" | "lost" | "won"
  const [status, setStatus] = useState("playing");

  // Cache dynamic (image-based) masks so we only decode the image once.
  const maskCacheRef = useRef(new Map());
  const newGameRunIdRef = useRef(0);

  const customFileInputRef = useRef(null);

  // Create a brand-new board.
  const startNewGame = (overrideDifficulty = null) => {
    const runId = newGameRunIdRef.current + 1;
    newGameRunIdRef.current = runId;

    const diff = overrideDifficulty ?? difficulty;
    if (!diff) return;

    const start = async () => {
      let mask = null;

      // 0) Direct mask grid (custom uploads).
      if (diff.maskGrid) {
        mask = diff.maskGrid;
      }

      // 1) Predefined ASCII-art masks.
      if (!mask && diff.mask) {
        mask = getMaskByName(diff.mask);
      }

      // 2) Image-based masks.
      if (!mask && diff.maskImageUrl) {
        const key = `${diff.maskImageUrl}|${diff.rows}x${diff.cols}`;
        const cached = maskCacheRef.current.get(key);
        if (cached) {
          mask = cached;
        } else {
          // While loading, keep the UI responsive.
          setStatus("playing");
          const generated = await maskFromImageUrl(
            diff.maskImageUrl,
            diff.rows,
            diff.cols
          );
          maskCacheRef.current.set(key, generated);
          mask = generated;
        }
      }

      // If the user switched difficulty while we were loading, abort this run.
      if (newGameRunIdRef.current !== runId) return;

      // 3) Create empty board + randomly place mines.
      const fresh = createBoard(diff.rows, diff.cols, diff.mines, mask);
      // 4) Compute numbers for each cell.
      const withNumbers = calculateAdjacency(fresh);

      setBoard(withNumbers);
      setStatus("playing");
    };

    void start();
  };

  // Rebuild the board when the difficulty changes.
  useEffect(() => {
    startNewGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficultyKey]);

  const handlePickCustomImage = () => {
    customFileInputRef.current?.click();
  };

  const handleCustomFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Allow picking the same file twice.
    e.target.value = "";

    const objectUrl = URL.createObjectURL(file);

    try {
      const img = new Image();
      img.src = objectUrl;
      await img.decode();

      // Decide a grid size that matches the image orientation.
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const aspect = w / h;

      // Default custom resolution (good balance for mobile).
      let rows = 12;
      let cols = 28;

      if (aspect < 0.9) {
        // portrait
        rows = 28;
        cols = 12;
      } else if (aspect > 1.1) {
        // landscape (keep default)
      } else {
        // roughly square
        rows = 20;
        cols = 20;
      }

      const maskGrid = maskFromImage(img, rows, cols);
      const activeCount = maskGrid.flat().filter(Boolean).length;

      // Mine count scales with the shape size.
      const mines = Math.min(
        Math.max(1, Math.round(activeCount * 0.18)),
        Math.max(1, activeCount - 1)
      );

      const nextCustom = {
        label: `Custom (${file.name})`,
        rows,
        cols,
        mines,
        maskGrid,
      };

      setCustomDifficulty(nextCustom);
      setDifficultyKey("custom");

      // Start immediately (don't wait for the effect).
      startNewGame(nextCustom);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  // Left click: reveal.
  const handleReveal = (row, col) => {
    if (status !== "playing") return;

    const result = revealCell(board, row, col);
    setBoard(result.board);

    if (result.hitMine) {
      setStatus("lost");
      return;
    }

    if (checkWin(result.board)) {
      setStatus("won");
    }
  };

  // Right click: flag.
  const handleToggleFlag = (row, col) => {
    if (status !== "playing") return;

    const next = toggleFlag(board, row, col);
    setBoard(next);

    if (checkWin(next)) {
      setStatus("won");
    }
  };

  const flagsUsed = countFlags(board);

  // Simple visitor tracking (server-side IP capture in /api/visit).
  useEffect(() => {
    // StrictMode runs effects twice in dev. Also avoid spamming on refreshes.
    const key = "win95ms_visit_sent";
    if (sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");

    const payload = JSON.stringify({ path: window.location.pathname });

    // sendBeacon is best-effort and doesn't block navigation.
    const ok =
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function" &&
      navigator.sendBeacon(
        "/api/visit",
        new Blob([payload], { type: "application/json" })
      );

    if (!ok) {
      // Fallback (keepalive helps on unload).
      fetch("/api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // Ignore tracking failures.
      });
    }
  }, []);

  return (
    <div className="app">
      <div className="window">
        <div className="titlebar" aria-label="Window title bar">
          <div className="titlebar__text">SeddamSweeper</div>
          <div className="titlebar__buttons" aria-hidden="true">
            <span className="titlebar__btn" />
            <span className="titlebar__btn" />
            <span className="titlebar__btn titlebar__btn--close" />
          </div>
        </div>

        <div className="window__body">
          <header className="topbar">
            <div>
              <h1 className="title">S(a/e)ddamSweeper</h1>
              <p className="subtitle">
                Tap/click: reveal. Right click (or long-press on mobile): flag.
                Reveal all safe cells to win.
              </p>
            </div>

            <div className="controls">
              <div>
                <label className="control">
                  Difficulty
                  <select
                    value={difficultyKey}
                    onChange={(e) => setDifficultyKey(e.target.value)}
                  >
                    {Object.entries(difficulties).map(([key, d]) => (
                      <option key={key} value={key}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </label>

                <input
                  ref={customFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCustomFileChange}
                  style={{ display: "none" }}
                />
              </div>

              <div className="controls__buttons">
                <button className="btn" onClick={handlePickCustomImage} type="button">
                  Custom Image...
                </button>

                <button className="btn" onClick={startNewGame} type="button">
                  Restart
                </button>
              </div>
            </div>
          </header>

          <div className="hud">
            <div className="chip">
              Mines: <b>{difficulty.mines}</b>
            </div>
            <div className="chip">
              Flags: <b>{flagsUsed}</b>
            </div>
            <div className={`chip status status--${status}`}>
              {status === "playing" && "Status: Playing"}
              {status === "won" && "Status: You won!"}
              {status === "lost" && "Status: Game over"}
            </div>
          </div>

          <main className="stage">
            <Board
              board={board}
              onReveal={handleReveal}
              onToggleFlag={handleToggleFlag}
              disabled={status !== "playing"}
            />

            {status !== "playing" && (
              <div className="message">
                {status === "won" ? (
                  <p>
                    You cleared the board! Want another run? Hit <b>Restart</b>.
                  </p>
                ) : (
                  <p>
                    Boom. Try again with <b>Restart</b>.
                  </p>
                )}
              </div>
            )}
          </main>

          <footer className="footer">
            Tip: Flagging is optional; winning only requires revealing all safe
            cells.
          </footer>
        </div>
      </div>
    </div>
  );
}
