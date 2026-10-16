import { useEffect, useRef } from 'react';
import type { AreaStatDto, GoalCategory } from '../api/types';
import { categoryLabel } from '../domain/rules';
import { ANCHORS, MODEL, project } from '../domain/characterModel';
import { categoryColors, categoryIcons } from '../ui/categories';

const RGB: Record<GoalCategory, string> = {
  CAREER: '90,162,255', CREATIVITY: '167,139,250', HEALTH: '255,162,77', KNOWLEDGE: '110,231,160', MINDFULNESS: '255,122,200'
};
const BASE = '198,250,85';
const CHIP_W = 96, CHIP_H = 46;
const SLOTS: Record<GoalCategory, { side: 'left' | 'right'; top: number }> = {
  KNOWLEDGE: { side: 'left', top: 0.07 }, CAREER: { side: 'left', top: 0.3 }, HEALTH: { side: 'left', top: 0.76 },
  MINDFULNESS: { side: 'right', top: 0.3 }, CREATIVITY: { side: 'right', top: 0.55 }
};
const SPIN_PER_MS = 0.00042;
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface Props { areas: AreaStatDto[]; active: GoalCategory | null; onActive: (category: GoalCategory | null) => void; }

/** Rotating wireframe figure. Hover or focus a stat chip to light its body part and draw a leader line into it. */
export function CharacterModel({ areas, active, onActive }: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  useEffect(() => {
    const el = canvas.current, box = stage.current;
    const ctx = el?.getContext?.('2d');
    if (!el || !box || !ctx) return; // no canvas support (tests, very old browsers): the chips and list still work
    const still = reducedMotion();
    let width = 0, height = 0, angle = 0.6, speed = still ? 0 : 1, last = 0, frame = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = box.clientWidth; height = box.clientHeight;
      el.width = Math.round(width * dpr); el.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { resize(); if (still) draw(0); });
    observer?.observe(box);

    const toScreen = (p: { x: number; y: number }) => ({ x: width / 2 + p.x * height * 0.43, y: height * 0.5 + p.y * height * 0.43 });

    function draw(time: number) {
      ctx!.clearRect(0, 0, width, height);
      const current = activeRef.current;
      const scan = ((time / 2600) % 1) * 1.9;
      // Ground rings
      ctx!.save(); ctx!.lineWidth = 1; ctx!.setLineDash([4, 7]); ctx!.lineDashOffset = -time / 60;
      for (const r of [0.42, 0.62]) {
        ctx!.beginPath();
        for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2; const p = toScreen(project([Math.cos(a) * r, 0, Math.sin(a) * r], angle)); i ? ctx!.lineTo(p.x, p.y) : ctx!.moveTo(p.x, p.y); }
        ctx!.strokeStyle = `rgba(${BASE},${r < 0.5 ? 0.35 : 0.18})`; ctx!.stroke();
      }
      ctx!.restore();
      // Wireframe, far lines first so near lines draw over them
      const drawn = MODEL.map(line => {
        const pts = line.points.map(p => ({ s: project(p, angle), y: p[1] }));
        return { line, pts, depth: pts.reduce((a, p) => a + p.s.depth, 0) / pts.length };
      }).sort((a, b) => a.depth - b.depth);
      // Thousands of short segments: batch them by colour and brightness so each frame costs a few dozen strokes.
      const batches = new Map<string, { rgb: string; alpha: number; lit: boolean; paths: { x: number; y: number }[][] }>();
      for (const { line, pts, depth } of drawn) {
        const lit = current === line.part;
        const nearness = Math.max(0, Math.min(1, (depth + 0.25) / 0.5));
        const sweep = Math.exp(-Math.pow((pts[0].y - scan) / 0.09, 2));
        let alpha = 0.14 + 0.28 * nearness + 0.32 * sweep;
        if (current) alpha = lit ? 0.55 + 0.4 * nearness : alpha * 0.4;
        const bucket = Math.round(Math.min(1, alpha) * 10) / 10;
        const rgb = lit ? RGB[line.part] : BASE;
        const key = `${rgb}|${bucket}|${lit}`;
        const batch = batches.get(key) ?? { rgb, alpha: bucket, lit, paths: [] };
        batch.paths.push(pts.map(p => toScreen(p.s)));
        batches.set(key, batch);
      }
      for (const batch of batches.values()) {
        ctx!.beginPath();
        for (const path of batch.paths) path.forEach((q, i) => i ? ctx!.lineTo(q.x, q.y) : ctx!.moveTo(q.x, q.y));
        ctx!.strokeStyle = `rgba(${batch.rgb},${batch.alpha})`;
        ctx!.lineWidth = batch.lit ? 1.5 : 0.9;
        ctx!.shadowColor = batch.lit ? `rgba(${batch.rgb},0.9)` : 'transparent'; ctx!.shadowBlur = batch.lit ? 8 : 0;
        ctx!.stroke();
      }
      ctx!.shadowBlur = 0;
      // Leader line from the chip into the body part
      if (current) {
        const slot = SLOTS[current];
        const from = { x: slot.side === 'left' ? CHIP_W : width - CHIP_W, y: slot.top * height + CHIP_H / 2 };
        const to = toScreen(project(ANCHORS[current], angle));
        const rgb = RGB[current];
        ctx!.save(); ctx!.strokeStyle = `rgba(${rgb},0.95)`; ctx!.lineWidth = 1.4; ctx!.setLineDash([6, 4]); ctx!.lineDashOffset = -time / 40;
        ctx!.beginPath(); ctx!.moveTo(from.x, from.y); ctx!.lineTo(to.x, to.y); ctx!.stroke(); ctx!.restore();
        const pulse = (time / 700) % 1;
        ctx!.fillStyle = `rgba(${rgb},1)`; ctx!.beginPath(); ctx!.arc(to.x, to.y, 3.2, 0, Math.PI * 2); ctx!.fill();
        ctx!.strokeStyle = `rgba(${rgb},${1 - pulse})`; ctx!.lineWidth = 1.2; ctx!.beginPath(); ctx!.arc(to.x, to.y, 4 + pulse * 12, 0, Math.PI * 2); ctx!.stroke();
      }
    }

    const tick = (time: number) => {
      const dt = last ? Math.min(time - last, 64) : 0; last = time;
      // Ease to a stop while a stat is selected so the leader line lands on a steady target.
      const target = activeRef.current || still ? 0 : 1;
      speed += (target - speed) * Math.min(1, dt / 220);
      angle += dt * SPIN_PER_MS * speed;
      draw(time);
      frame = requestAnimationFrame(tick);
    };
    if (still) draw(0); else frame = requestAnimationFrame(tick);
    // With reduced motion there is no loop, so a hover change has to redraw explicitly.
    const redraw = still ? () => draw(performance.now()) : null;
    if (redraw) { el.addEventListener('redraw', redraw); }
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); if (redraw) el.removeEventListener('redraw', redraw); };
  }, []);

  useEffect(() => { canvas.current?.dispatchEvent(new Event('redraw')); }, [active]);

  return <div ref={stage} className="character-stage" onMouseLeave={() => onActive(null)}>
    <canvas ref={canvas} aria-hidden="true"/>
    {areas.map(area => {
      const Icon = categoryIcons[area.category]; const slot = SLOTS[area.category];
      return <button key={area.category} type="button" className={`stat-chip tone-${categoryColors[area.category]} ${active === area.category ? 'is-active' : ''}`}
        style={{ [slot.side]: 0, top: `${slot.top * 100}%`, width: CHIP_W, height: CHIP_H }}
        aria-label={`${categoryLabel(area.category)}, level ${area.level}`} aria-pressed={active === area.category}
        onMouseEnter={() => onActive(area.category)} onFocus={() => onActive(area.category)} onBlur={() => onActive(null)} onClick={() => onActive(area.category)}>
        <Icon size={18} aria-hidden="true"/><span><small>{categoryLabel(area.category)}</small><strong>Lv {area.level}</strong></span>
      </button>;
    })}
  </div>;
}
