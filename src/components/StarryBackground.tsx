'use client';

import React, { useEffect, useRef } from 'react';

export default function StarryBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 星のデータを保持する配列
    const stars: { x: number; y: number; radius: number; opacity: number }[] = [];
    const numStars = 75; // 星の数をさらに50%減らす

    const resizeAndDraw = () => {
      // 親コンテナ（またはウィンドウ）に合わせる
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // 星の再初期化
      stars.length = 0;
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1.5 + 0.5, // 0.5px 〜 2px
          opacity: Math.random() * 0.5 + 0.2, // 透明度 0.2 〜 0.7
        });
      }

      // 描画: 完全な黒（グラデーションなし）
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 星を描画（動かさない）
      stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fill();
      });
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
