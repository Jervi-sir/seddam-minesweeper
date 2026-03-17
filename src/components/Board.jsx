import React from "react";
import Cell from "./Cell";

/**
 * Board renders the grid.
 * It receives a 2D array and maps each cell to a <Cell />.
 */
export default function Board({ board, onReveal, onToggleFlag, disabled }) {
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;

  if (rows === 0 || cols === 0) return null;

  return (
    <div
      className="board"
      style={{
        // Expose counts to CSS so it can auto-size cells on mobile.
        "--cols": String(cols),
        "--rows": String(rows),
        gridTemplateColumns: `repeat(${cols}, var(--cell-size))`,
        gridTemplateRows: `repeat(${rows}, var(--cell-size))`,
      }}
      aria-label="SeddamSweeper board"
      role="grid"
    >
      {board.flat().map((cell) => (
        <Cell
          key={`${cell.row}-${cell.col}`}
          cell={cell}
          disabled={disabled}
          onReveal={() => onReveal(cell.row, cell.col)}
          onToggleFlag={() => onToggleFlag(cell.row, cell.col)}
        />
      ))}
    </div>
  );
}
