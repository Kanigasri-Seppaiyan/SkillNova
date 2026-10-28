import React, { useEffect, useRef } from 'react';

interface ConfettiProps {
  trigger: boolean;
  onComplete?: () => void;
}

export const Confetti: React.FC<ConfettiProps> = ({ trigger, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!trigger) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#38bdf8', '#a855f7'];
    const particles: Array<{
      x: number;
      y: number;
      r: number;
      d: number;
      color: string;
      tilt: number;
      tiltAngle: number;
      tiltAngleIncremental: number;
    }> = [];

    const particleCount = 100;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height * 0.5,
        r: Math.random() * 6 + 3,
        d: Math.random() * particleCount + 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngle: 0,
        tiltAngleIncremental: Math.random() * 0.07 + 0.05,
      });
    }

    let animationFrameId: number;
    let startTime = Date.now();
    const durationMs = 2800;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) * 1.5;
        p.x += Math.sin(p.d) * 2;
        p.tilt = Math.sin(p.tiltAngle) * 12;

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();
      });

      if (Date.now() - startTime < durationMs) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onComplete?.();
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [trigger]);

  if (!trigger) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 w-full h-full"
    />
  );
};
