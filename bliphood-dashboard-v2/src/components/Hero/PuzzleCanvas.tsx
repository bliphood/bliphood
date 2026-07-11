"use client";

import { useEffect, useRef } from "react";

export function PuzzleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || 600;
    };
    resize();
    window.addEventListener("resize", resize);

    // Hex-like grid with particles
    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number; hex: string }[] = [];
    const cols = 20;
    const rows = 20;

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = (canvas.width / cols) * i + Math.random() * 30;
        const y = (canvas.height / rows) * j + Math.random() * 15;
        particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.3 + 0.1,
          hex: Math.floor(Math.random() * 16).toString(16),
        });
      }
    }

    const draw = () => {
      time += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 0.5;
      const gridSize = 60;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Hex particles with subtle glow
      particles.forEach((p) => {
        p.x += p.vx + Math.sin(time + p.y * 0.01) * 0.2;
        p.y += p.vy + Math.cos(time + p.x * 0.01) * 0.2;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const glow = Math.sin(time * 2 + p.x * 0.02) * 0.15 + 0.2;
        ctx.fillStyle = `rgba(0, 255, 136, ${p.opacity * glow})`;
        ctx.font = `${p.size * 12}px "JetBrains Mono"`;
        ctx.fillText(p.hex, p.x, p.y);
      });

      // Floating puzzle-like labels
      ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
      ctx.font = '9px "JetBrains Mono"';
      const labels = [
        "keccak256", "nonce", "uint64", "0x00", "BLIPHOOD",
        "0xFF", "solve", "mint", "streak", "mining",
      ];
      labels.forEach((label, i) => {
        const x = ((i * 137) % canvas.width);
        const y = ((i * 89 + Math.sin(time * 0.5 + i) * 40) % canvas.height);
        ctx.fillText(label, x, y);
      });

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full opacity-70"
      style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(0,255,136,0.03) 0%, transparent 70%)" }}
    />
  );
}
