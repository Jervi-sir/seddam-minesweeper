import React, { useRef } from "react";
import bombIcon from "../assets/bomb.svg";

/**
 * Cell is a single square.
 * - Left click: reveal
 * - Right click: flag (we prevent the browser context menu)
 */
export default function Cell({ cell, onReveal, onToggleFlag, disabled }) {
  if (!cell.isActive) {
    return <div className="cell cell--void" aria-hidden="true" />;
  }

  // Mobile-friendly flagging:
  // - Desktop: right click toggles flag
  // - Mobile: long-press toggles flag
  const longPressTimerId = useRef(null);
  const longPressTriggered = useRef(false);

  const handleClick = () => {
    if (disabled) return;

    // If a long-press already fired, don't also reveal on click.
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }

    onReveal();
  };

  const handleRightClick = (e) => {
    e.preventDefault();
    if (disabled) return;
    onToggleFlag();
  };

  const startLongPress = (e) => {
    if (disabled) return;

    // Only long-press on touch. On mouse, right click already exists.
    if (e.pointerType !== "touch") return;

    // Don't start a long-press on revealed cells.
    if (cell.isRevealed) return;

    longPressTriggered.current = false;

    // 450ms feels "intentional" but still quick.
    longPressTimerId.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      onToggleFlag();
    }, 450);
  };

  const cancelLongPress = () => {
    if (longPressTimerId.current !== null) {
      window.clearTimeout(longPressTimerId.current);
      longPressTimerId.current = null;
    }
  };

  // Decide what to show.
  // We keep it simple: mines show an icon, flags show "F", numbers show digits.
  let content = "";
  if (cell.isRevealed) {
    if (cell.isMine) {
      content = (
        <img className="cell__icon" src={bombIcon} alt="Mine" draggable="false" />
      );
    } else if (cell.adjacentMines > 0) {
      content = String(cell.adjacentMines);
    }
  } else if (cell.isFlagged) {
    content = "F";
  }

  // Build CSS classes from state.
  const className = [
    "cell",
    cell.isRevealed ? "cell--revealed" : "cell--hidden",
    cell.isFlagged && !cell.isRevealed ? "cell--flagged" : "",
    cell.isRevealed && cell.isMine ? "cell--mine" : "",
    cell.isRevealed && !cell.isMine && cell.adjacentMines > 0
      ? `cell--n${cell.adjacentMines}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      onContextMenu={handleRightClick}
      onPointerDown={startLongPress}
      onPointerUp={cancelLongPress}
      onPointerCancel={cancelLongPress}
      onPointerLeave={cancelLongPress}
      aria-label={`Cell ${cell.row}, ${cell.col}`}
    >
      <span className="cell__content">{content}</span>
    </button>
  );
}
