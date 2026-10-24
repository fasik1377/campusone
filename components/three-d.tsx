"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useAnimationFrame, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useRef, useState, type ReactNode } from "react";
import { collegeLogo } from "./site";
import { cx } from "./ui";

/* ------------------------------- Tilt card ------------------------------- */

/** Card that tilts toward the cursor in 3D, with a moving light glare. Children can use translateZ for depth. */
export function TiltCard({ children, className, max = 12, glare = true }: { children: ReactNode; className?: string; max?: number; glare?: boolean }) {
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 200, damping: 20 });
  const gx = useTransform(px, [0, 1], ["0%", "100%"]);
  const gy = useTransform(py, [0, 1], ["0%", "100%"]);
  const glareBg = useMotionTemplate`radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.35), transparent 55%)`;
  const [hover, setHover] = useState(false);

  return (
    <div style={{ perspective: 1000 }} className={cx("h-full", className)}>
      <motion.div
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width);
          py.set((e.clientY - r.top) / r.height);
        }}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => {
          setHover(false);
          px.set(0.5);
          py.set(0.5);
        }}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        animate={{ scale: hover ? 1.02 : 1 }}
        className="relative h-full"
      >
        {children}
        {glare && <motion.div aria-hidden style={{ background: glareBg, opacity: hover ? 1 : 0 }} className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300 mix-blend-overlay" />}
      </motion.div>
    </div>
  );
}

/* ---------------------------------- Cube --------------------------------- */

/** A slowly spinning glass cube built from six CSS faces. */
export function Cube({ size = 80, duration = 20, className, gold }: { size?: number; duration?: number; className?: string; gold?: boolean }) {
  const half = size / 2;
  const faces = [
    `rotateY(0deg) translateZ(${half}px)`,
    `rotateY(90deg) translateZ(${half}px)`,
    `rotateY(180deg) translateZ(${half}px)`,
    `rotateY(-90deg) translateZ(${half}px)`,
    `rotateX(90deg) translateZ(${half}px)`,
    `rotateX(-90deg) translateZ(${half}px)`,
  ];
  return (
    <div className={cx("pointer-events-none", className)} style={{ width: size, height: size, perspective: 600 }} aria-hidden>
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateX: [0, 360], rotateY: [0, 360] }}
        transition={{ duration, repeat: Infinity, ease: "linear" }}
      >
        {faces.map((t) => (
          <div
            key={t}
            className={cx(
              "absolute inset-0 rounded-md border backdrop-blur-[1px]",
              gold ? "border-gold-400/60 bg-gold-500/10" : "border-white/25 bg-white/[0.04]",
            )}
            style={{ transform: t }}
          />
        ))}
      </motion.div>
    </div>
  );
}

/* --------------------------- Perspective floor --------------------------- */

/** Grid floor receding into the distance, scrolling toward the viewer. */
export function PerspectiveFloor({ className }: { className?: string }) {
  return (
    <div className={cx("pointer-events-none absolute inset-x-0 bottom-0 h-[45%] overflow-hidden", className)} style={{ perspective: 400 }} aria-hidden>
      <div
        className="absolute inset-x-[-50%] top-0 h-[200%] animate-grid-move"
        style={{
          transform: "rotateX(70deg)",
          transformOrigin: "top center",
          backgroundImage: "linear-gradient(to right, rgb(214 168 79 / 0.28) 1px, transparent 1px), linear-gradient(to bottom, rgb(214 168 79 / 0.28) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "linear-gradient(to bottom, transparent, black 25%, black 60%, transparent)",
        }}
      />
    </div>
  );
}

/* ---------------------------- 3D college carousel ---------------------------- */

export type CarouselCollege = { _id: string; name: string; code: string; slug: string; tagline?: string; logoFileId?: string; brandColor?: string; programCount: number };

/** Colleges arranged on a rotating 3D ring. Drag to spin; hover pauses the rotation. */
export function CollegeCarousel3D({ colleges }: { colleges: CarouselCollege[] }) {
  const reduce = useReducedMotion();
  // Fill the ring with at least six cards so it reads as a cylinder.
  const items = Array.from({ length: Math.max(1, Math.ceil(6 / colleges.length)) }, () => colleges).flat();
  const count = items.length;
  const cardWidth = 260;
  const radius = Math.round(cardWidth / 2 / Math.tan(Math.PI / count)) + 70;

  const rotation = useMotionValue(0);
  const smooth = useSpring(rotation, { stiffness: 60, damping: 20 });
  const [paused, setPaused] = useState(false);
  const drag = useRef<{ x: number; start: number; moved: boolean } | null>(null);

  useAnimationFrame((_, delta) => {
    if (!paused && !drag.current && !reduce) rotation.set(rotation.get() - delta * 0.008);
  });

  const step = 360 / count;
  const spin = (dir: 1 | -1) => rotation.set(Math.round(rotation.get() / step) * step + dir * step);

  return (
    <div className="relative">
      <div
        className="relative mx-auto h-[380px] touch-pan-y select-none"
        style={{ perspective: 1400 }}
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => {
          setPaused(false);
          drag.current = null;
        }}
        onPointerDown={(e) => (drag.current = { x: e.clientX, start: rotation.get(), moved: false })}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const dx = e.clientX - drag.current.x;
          if (Math.abs(dx) > 5) drag.current.moved = true;
          rotation.set(drag.current.start + dx * 0.3);
        }}
        onPointerUp={() => setTimeout(() => (drag.current = null), 0)}
        onClickCapture={(e) => {
          // A drag should not also open the card under the pointer.
          if (drag.current?.moved) e.preventDefault();
        }}
      >
        <motion.div className="absolute top-1/2 left-1/2 h-0 w-0" style={{ rotateY: smooth, transformStyle: "preserve-3d", z: -radius }}>
          {items.map((c, i) => (
            <div
              key={`${c._id}-${i}`}
              className="absolute"
              style={{ width: cardWidth, height: 300, left: -cardWidth / 2, top: -150, transform: `rotateY(${i * step}deg) translateZ(${radius}px)`, backfaceVisibility: "hidden" }}
            >
              <Link
                href={`/colleges/${c.slug}`}
                draggable={false}
                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-white/15 bg-white shadow-2xl shadow-black/40 transition-transform hover:-translate-y-2"
              >
                <div className="relative flex h-36 items-center justify-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${c.brandColor ?? "#102a43"}, #102a43)` }}>
                  <div className="bg-grid absolute inset-0 opacity-50" />
                  <Image src={collegeLogo(c.logoFileId)} alt="" width={88} height={88} unoptimized draggable={false} className="relative h-20 w-20 rounded-2xl bg-white object-contain p-1.5 shadow-xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="font-mono text-xs text-gold-700">{c.code}</p>
                  <h3 className="font-semibold text-navy-900">{c.name}</h3>
                  {c.tagline && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{c.tagline}</p>}
                  <p className="mt-auto pt-3 text-xs font-semibold text-navy-600">{c.programCount} programs · View →</p>
                </div>
              </Link>
            </div>
          ))}
        </motion.div>
      </div>
      <div className="mt-4 flex items-center justify-center gap-3">
        <button onClick={() => spin(1)} aria-label="Previous college" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/10">
          ←
        </button>
        <span className="text-sm text-navy-200">Drag to spin</span>
        <button onClick={() => spin(-1)} aria-label="Next college" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/10">
          →
        </button>
      </div>
    </div>
  );
}
