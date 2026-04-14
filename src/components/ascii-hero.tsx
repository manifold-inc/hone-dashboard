"use client";

import { useEffect, useRef, useCallback } from "react";

interface Node {
  x: number;
  y: number;
  label: string;
  radius: number;
  phase: number;
  tier: number;
}

interface Edge {
  from: number;
  to: number;
}

const CHARS = " .'`:,;|/\\~!-_+<>i?][}{)(1tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

function createNetwork(): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  nodes.push({ x: 0.5, y: 0.12, label: "VALIDATOR", radius: 0.07, phase: 0, tier: 0 });

  const minerCount = 9;
  for (let i = 0; i < minerCount; i++) {
    const t = i / (minerCount - 1);
    const angle = Math.PI * 0.12 + t * Math.PI * 0.76;
    const rx = 0.38;
    const ry = 0.22;
    nodes.push({
      x: 0.5 + Math.cos(angle) * rx,
      y: 0.46 + Math.sin(angle) * ry,
      label: `M${String(i).padStart(2, "0")}`,
      radius: 0.035,
      phase: (i * Math.PI * 2) / minerCount,
      tier: 1,
    });
    edges.push({ from: 0, to: i + 1 });
  }

  for (let i = 1; i <= minerCount; i++) {
    if (i < minerCount) edges.push({ from: i, to: i + 1 });
  }
  edges.push({ from: 1, to: minerCount });

  nodes.push({ x: 0.5, y: 0.85, label: "GRADIENT SYNC", radius: 0.065, phase: Math.PI, tier: 2 });
  const syncIdx = nodes.length - 1;

  edges.push({ from: 1, to: syncIdx });
  edges.push({ from: Math.ceil(minerCount / 2), to: syncIdx });
  edges.push({ from: minerCount, to: syncIdx });

  edges.push({ from: syncIdx, to: 0 });

  return { nodes, edges };
}

export function AsciiHero({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const networkRef = useRef(createNetwork());

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    const charW = 6.5 * dpr;
    const charH = 11 * dpr;
    const cols = Math.floor((rect.width * dpr) / charW);
    const rows = Math.floor((rect.height * dpr) / charH);

    const width = cols * charW;
    const height = rows * charH;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.font = `${9 * dpr}px "JetBrains Mono", monospace`;
    ctx.textBaseline = "top";

    const t = time * 0.001;
    const { nodes, edges } = networkRef.current;

    const grid: number[][] = [];
    const greenAmount: number[][] = [];
    for (let r = 0; r < rows; r++) {
      grid[r] = new Array(cols).fill(0);
      greenAmount[r] = new Array(cols).fill(0);
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const noise =
          Math.sin(c * 0.15 + t * 0.3) *
          Math.cos(r * 0.12 + t * 0.2) *
          0.04;
        if (noise > 0.01) {
          grid[r][c] = noise;
        }
      }
    }

    for (const edge of edges) {
      const a = nodes[edge.from];
      const b = nodes[edge.to];
      const ax = a.x * cols;
      const ay = a.y * rows;
      const bx = b.x * cols;
      const by = b.y * rows;

      const dist = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
      const steps = Math.ceil(dist * 2);

      for (let s = 0; s <= steps; s++) {
        const frac = s / steps;
        const px = Math.round(ax + (bx - ax) * frac);
        const py = Math.round(ay + (by - ay) * frac);
        if (px < 0 || px >= cols || py < 0 || py >= rows) continue;

        const pulse =
          Math.sin(frac * 12 - t * 4 + edge.from * 1.1) * 0.5 + 0.5;
        const base = 0.12 + pulse * 0.35;

        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = py + dr;
            const nc = px + dc;
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
            const falloff = dr === 0 && dc === 0 ? 1.0 : 0.25;
            const val = base * falloff;
            grid[nr][nc] = Math.max(grid[nr][nc], val);
            greenAmount[nr][nc] = Math.max(greenAmount[nr][nc], val * 0.5);
          }
        }
      }
    }

    for (const node of nodes) {
      const cx = node.x * cols;
      const cy = node.y * rows;
      const rCols = node.radius * cols * 1.2;
      const rRows = node.radius * rows * 1.2;
      const pulse = Math.sin(t * 2.5 + node.phase) * 0.12 + 0.88;

      const scanR = Math.ceil(Math.max(rCols, rRows) * 3);
      const minR = Math.max(0, Math.floor(cy) - scanR);
      const maxR = Math.min(rows - 1, Math.ceil(cy) + scanR);
      const minC = Math.max(0, Math.floor(cx) - scanR);
      const maxC = Math.min(cols - 1, Math.ceil(cx) + scanR);

      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const dx = (c - cx) / rCols;
          const dy = (r - cy) / rRows;
          const d = Math.sqrt(dx * dx + dy * dy);

          if (d < 1.0) {
            const brightness = (1 - d * d) * pulse;
            grid[r][c] = Math.max(grid[r][c], brightness);
            greenAmount[r][c] = Math.max(greenAmount[r][c], brightness);
          } else if (d < 3.0) {
            const glow = ((3.0 - d) / 2.0) * 0.18 * pulse;
            grid[r][c] = Math.max(grid[r][c], glow);
            greenAmount[r][c] = Math.max(greenAmount[r][c], glow * 0.3);
          }
        }
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const brightness = grid[r][c];
        if (brightness < 0.015) continue;

        const charIdx = Math.min(
          Math.floor(brightness * (CHARS.length - 1)),
          CHARS.length - 1
        );
        const char = CHARS[charIdx];
        if (char === " ") continue;

        const green = greenAmount[r][c];
        const alpha = Math.min(brightness * 1.5, 1);

        if (green > 0.3) {
          const gA = Math.min(green * 1.5, 1);
          ctx.fillStyle = `rgba(255, 166, 71, ${gA.toFixed(2)})`;

          if (green > 0.6) {
            ctx.shadowColor = "rgba(255, 166, 71, 0.6)";
            ctx.shadowBlur = 10 * dpr;
          } else {
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
          }
        } else if (green > 0.1) {
          ctx.fillStyle = `rgba(255, 166, 71, ${(alpha * 0.4).toFixed(2)})`;
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = `rgba(160, 160, 160, ${(alpha * 0.35).toFixed(2)})`;
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
        }

        ctx.fillText(char, c * charW, r * charH);
      }
    }

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    for (const node of nodes) {
      const cx = node.x * cols;
      const cy = node.y * rows;
      const labelX = Math.round(cx - node.label.length / 2);
      const labelY = Math.round(cy);

      ctx.fillStyle = "rgba(255, 166, 71, 1)";
      ctx.shadowColor = "rgba(255, 166, 71, 0.8)";
      ctx.shadowBlur = 14 * dpr;

      for (let li = 0; li < node.label.length; li++) {
        const lx = labelX + li;
        if (lx >= 0 && lx < cols && labelY >= 0 && labelY < rows) {
          ctx.fillText(node.label[li], lx * charW, labelY * charH);
        }
      }
    }

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) {
      draw(0);
      return;
    }

    rafRef.current = requestAnimationFrame(draw);

    const handleFocus = () => {
      if (rafRef.current === null)
        rafRef.current = requestAnimationFrame(draw);
    };
    const handleBlur = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, [draw]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full block"
        style={{ height: "clamp(300px, 42vw, 520px)" }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/0 via-background/0 to-background/60" />
    </div>
  );
}
