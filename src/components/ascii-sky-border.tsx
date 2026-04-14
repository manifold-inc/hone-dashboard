"use client";

import { useEffect, useRef, useCallback } from "react";

const CHARS = " .,:;*+~=#@";
const PASTELS = [
  [255, 182, 193],
  [255, 218, 185],
  [221, 160, 221],
  [176, 224, 230],
  [255, 228, 196],
  [173, 216, 230],
  [255, 192, 203],
  [230, 190, 255],
] as const;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpColor(
  c1: readonly [number, number, number],
  c2: readonly [number, number, number],
  t: number
): [number, number, number] {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

export function AsciiSkyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const charW = 8 * dpr;
    const charH = 14 * dpr;
    const cols = Math.ceil((vw * dpr) / charW);
    const rows = Math.ceil((vh * dpr) / charH);

    const width = cols * charW;
    const height = rows * charH;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.font = `${10 * dpr}px "JetBrains Mono", monospace`;
    ctx.textBaseline = "top";

    const t = time * 0.00025;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const nx = col / cols;
        const ny = row / rows;

        const wave1 = Math.sin(nx * 3 + t + ny * 1.5) * 0.5 + 0.5;
        const wave2 = Math.sin(nx * 2 - t * 0.6 + ny * 2.5) * 0.5 + 0.5;
        const wave3 = Math.cos(nx * 5 + t * 1.1 + ny * 0.8) * 0.5 + 0.5;
        const wave4 = Math.sin((nx + ny) * 4 - t * 0.4) * 0.5 + 0.5;

        const intensity =
          wave1 * 0.3 + wave2 * 0.25 + wave3 * 0.25 + wave4 * 0.2;

        const charIdx = Math.floor(intensity * (CHARS.length - 1));
        const char = CHARS[charIdx];
        if (char === " ") continue;

        const colorT = (t * 0.2 + nx * 1.5 + ny * 0.8) % PASTELS.length;
        const cIdx = Math.floor(colorT);
        const cFrac = colorT - cIdx;
        const c1 = PASTELS[cIdx % PASTELS.length];
        const c2 = PASTELS[(cIdx + 1) % PASTELS.length];
        const [r, g, b] = lerpColor(c1, c2, cFrac);

        const alpha = intensity * 0.18 + 0.02;

        ctx.fillStyle = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha.toFixed(3)})`;
        ctx.fillText(char, col * charW, row * charH);
      }
    }

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
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-screen w-screen"
      aria-hidden="true"
    />
  );
}
