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
    const numStars = 150; // 視認性を保ったまま約50%減らす

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

      // 描画: 黒に少し白さを足した深みのあるグラデーション
      // 画面中央から外側へ向かうグラデーション
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 1.5
      );
      gradient.addColorStop(0, '#1a1a1a'); // 中心部分は少し白っぽさを足した黒（ダークグレー）
      gradient.addColorStop(0.5, '#0a0a0a'); 
      gradient.addColorStop(1, '#000000'); // 外周は純粋な黒

      ctx.fillStyle = gradient;
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
