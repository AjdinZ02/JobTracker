
import { useEffect, useRef } from 'react';

type Blob = {
  x: number; y: number; r: number;
  vx: number; vy: number;
  color: string;
};

export default function BackgroundCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const raf = useRef<number>();

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d', { alpha: true })!;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const { innerWidth: w, innerHeight: h } = window;
      canvas.width = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    
    const colors = [
      'rgba(124,58,237,0.50)', 
      'rgba(34,211,238,0.45)', 
      'rgba(244,114,182,0.38)' 
    ];
    const blobs: Blob[] = [];
    const N = 8;
    for (let i = 0; i < N; i++) {
      blobs.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: 120 + Math.random() * 160,
        vx: (Math.random() * 0.6 + 0.25) * (Math.random() < 0.5 ? -1 : 1),
        vy: (Math.random() * 0.6 + 0.25) * (Math.random() < 0.5 ? -1 : 1),
        color: colors[i % colors.length]
      });
    }

    function step() {
      const w = canvas.width / DPR;
      const h = canvas.height / DPR;
      ctx.clearRect(0, 0, w, h);

      
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(11,16,32,0.85)');
      g.addColorStop(1, 'rgba(11,16,32,0.98)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = 'lighter';
      for (const b of blobs) {
        const rad = ctx.createRadialGradient(b.x, b.y, b.r * 0.1, b.x, b.y, b.r);
        rad.addColorStop(0, b.color);
        rad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();

        b.x += b.vx; b.y += b.vy;
        if (b.x < -50 || b.x > w + 50) b.vx *= -1;
        if (b.y < -50 || b.y > h + 50) b.vy *= -1;
      }
      ctx.globalCompositeOperation = 'source-over';

      raf.current = requestAnimationFrame(step);
    }

    raf.current = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf.current!);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="bg-canvas" aria-hidden="true" />;
}
