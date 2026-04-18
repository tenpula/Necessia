'use client';

import React, { useEffect, useRef } from 'react';

export default function StarryBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeAndDraw = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      ctx.fillStyle = '#E8FFE8';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const spacing = 44;
      const crossSize = 8;
      const strokeColor = 'rgba(77, 70, 52, 0.18)';

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;

      for (let x = spacing / 2; x < canvas.width; x += spacing) {
        for (let y = spacing / 2; y < canvas.height; y += spacing) {
          ctx.beginPath();
          ctx.moveTo(x - crossSize / 2, y);
          ctx.lineTo(x + crossSize / 2, y);
          ctx.moveTo(x, y - crossSize / 2);
          ctx.lineTo(x, y + crossSize / 2);
          ctx.stroke();
        }
      }
    };

    window.addEventListener('resize', resizeAndDraw);
    resizeAndDraw();

    return () => {
      window.removeEventListener('resize', resizeAndDraw);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[-1]"
    />
  );
}
