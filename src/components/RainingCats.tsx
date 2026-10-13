import { useEffect, useState } from "react";

const CATS = ["🐱", "🐈", "😺", "😸", "😻", "🙀", "😽", "🐾", "🐈‍⬛"];

export function RainingCats({ duration = 5000, onDone }: { duration?: number; onDone?: () => void }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setShow(false);
      onDone?.();
    }, duration);
    return () => clearTimeout(t);
  }, [duration, onDone]);

  if (!show) return null;

  const cats = Array.from({ length: 40 }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 2;
    const dur = 2.5 + Math.random() * 2.5;
    const size = 1.5 + Math.random() * 2;
    const rot = Math.random() * 720 - 360;
    const emoji = CATS[Math.floor(Math.random() * CATS.length)];
    return (
      <span
        key={i}
        className="raining-cat"
        style={{
          left: `${left}%`,
          animationDelay: `${delay}s`,
          animationDuration: `${dur}s`,
          fontSize: `${size}rem`,
          ["--rot" as any]: `${rot}deg`,
        }}
      >
        {emoji}
      </span>
    );
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {cats}
      <style>{`
        .raining-cat {
          position: absolute;
          top: -10%;
          animation-name: cat-fall;
          animation-timing-function: linear;
          animation-iteration-count: 1;
          will-change: transform;
        }
        @keyframes cat-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(110vh) rotate(var(--rot)); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
