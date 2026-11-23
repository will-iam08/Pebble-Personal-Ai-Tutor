import React, { useEffect, useRef } from 'react';
import habitatBgUrl from '../assets/images/pet_habitat_window_1795325407338.jpg';
import { AccessoryId, getPetStage, PetReaction, PetState } from '../types/study';

interface PetHabitatCanvasProps {
  pet: PetState;
  reaction: PetReaction;
  snackTrigger: number;
  compact?: boolean;
  mini?: boolean;
  onPatPet: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  kind: 'heart' | 'crumb' | 'sparkle' | 'zzz';
  size: number;
  color: string;
}

interface Biscuit {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  landed: boolean;
}

const HABITAT_BG_SRC = habitatBgUrl;

export const PetHabitatCanvas: React.FC<PetHabitatCanvasProps> = ({
  pet,
  reaction,
  snackTrigger,
  compact = false,
  mini = false,
  onPatPet,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const bgLoadedRef = useRef(false);

  // Keep latest props in refs so the 60fps rAF loop never resets on React re-renders
  const petRef = useRef(pet);
  petRef.current = pet;

  const onPatRef = useRef(onPatPet);
  onPatRef.current = onPatPet;

  const simRef = useRef({
    x: 0.5, // normalized 0..1
    targetX: 0.5,
    yOffset: 0,
    vy: 0,
    facing: 1,
    scaleX: 1,
    scaleY: 1,
    wanderTimer: 2.2,
    blinkTimer: 3.1,
    isBlinking: false,
    moodAnim: 'idle' as 'idle' | 'happy' | 'eat' | 'startled' | 'nap',
    moodAnimTimer: 0,
    idleTime: 0,
    zzzTimer: 0,
    pointerX: 0.5,
    pointerY: 0.5,
    pointerInside: false,
    biscuit: { active: false, x: 0.5, y: 0.2, vx: 0, vy: 0, landed: false } as Biscuit,
    particles: [] as Particle[],
    lastReactionNonce: -1,
    lastSnackTrigger: 0,
  });

  // Load habitat window artwork once
  useEffect(() => {
    const img = new Image();
    img.src = HABITAT_BG_SRC;
    img.onload = () => {
      bgImgRef.current = img;
      bgLoadedRef.current = true;
    };
  }, []);

  // React to pet reaction events from Snake, Minesweeper, or care buttons
  useEffect(() => {
    const sim = simRef.current;
    if (reaction.nonce === sim.lastReactionNonce) return;
    sim.lastReactionNonce = reaction.nonce;
    sim.idleTime = 0;

    if (reaction.type === 'pet') {
      sim.moodAnim = 'happy';
      sim.moodAnimTimer = 1.6;
      sim.vy = -170;
      sim.scaleX = 1.22;
      sim.scaleY = 0.8;
      spawnBurst(sim.particles, sim.x, 0.62, 'heart', 5);
    } else if (reaction.type === 'cheer' || reaction.type === 'levelup') {
      sim.moodAnim = 'happy';
      sim.moodAnimTimer = 2.4;
      sim.vy = -215;
      sim.scaleX = 0.86;
      sim.scaleY = 1.18;
      spawnBurst(sim.particles, sim.x, 0.58, 'sparkle', reaction.type === 'levelup' ? 12 : 7);
    } else if (reaction.type === 'eat') {
      sim.moodAnim = 'eat';
      sim.moodAnimTimer = 1.25;
      sim.scaleX = 1.16;
      sim.scaleY = 0.86;
      spawnBurst(sim.particles, sim.x, 0.68, 'crumb', 6);
    } else if (reaction.type === 'startled') {
      sim.moodAnim = 'startled';
      sim.moodAnimTimer = 1.1;
      sim.vy = -125;
      sim.scaleX = 0.88;
      sim.scaleY = 1.14;
    }
  }, [reaction]);

  // React to snack toss trigger
  useEffect(() => {
    const sim = simRef.current;
    if (snackTrigger === sim.lastSnackTrigger) return;
    sim.lastSnackTrigger = snackTrigger;
    sim.idleTime = 0;

    const dropX = Math.max(0.2, Math.min(0.8, sim.x > 0.5 ? 0.28 + Math.random() * 0.16 : 0.56 + Math.random() * 0.18));
    sim.biscuit = {
      active: true,
      x: dropX,
      y: 0.16,
      vx: (dropX - 0.5) * 0.25,
      vy: -0.2,
      landed: false,
    };
    sim.targetX = dropX;
  }, [snackTrigger]);

  // Isolated 60fps simulation & render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width > 0 && height > 0) {
        updateSim(simRef.current, petRef.current, dt);
        renderHabitat(
          ctx,
          width,
          height,
          simRef.current,
          petRef.current,
          bgImgRef.current,
          bgLoadedRef.current,
          now / 1000,
          compact || mini
        );
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [compact, mini]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    simRef.current.pointerX = (e.clientX - rect.left) / rect.width;
    simRef.current.pointerY = (e.clientY - rect.top) / rect.height;
    simRef.current.pointerInside = true;
  };

  const handlePointerLeave = () => {
    simRef.current.pointerInside = false;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mini) {
      onPatRef.current();
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const sim = simRef.current;

    // Generous click zone around Pebble so patting feels effortless
    if (Math.abs(nx - sim.x) < 0.22 && ny > 0.35 && ny < 0.96) {
      onPatRef.current();
    } else {
      // Gently call Pebble over to where you tapped on the sill
      sim.targetX = Math.max(0.18, Math.min(0.82, nx));
      sim.idleTime = 0;
      if (sim.yOffset === 0) {
        sim.vy = -110;
      }
    }
  };

  return (
    <div
      className={`relative overflow-hidden select-none rounded-xl border border-[#D4DCE3] dark:border-[#30404B] bg-[#E8EDF1] dark:bg-[#1E282F] ${
        mini ? 'w-[76px] h-[72px] shrink-0' : compact ? 'w-full h-[116px]' : 'w-full aspect-[4/3]'
      }`}
    >
      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
        className="block w-full h-full cursor-pointer"
        aria-label={`${pet.name} sitting on the study window sill. Click to pat or beckon.`}
      />
    </div>
  );
};

function spawnBurst(
  particles: Particle[],
  nx: number,
  ny: number,
  kind: Particle['kind'],
  count: number
) {
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
    const speed = kind === 'zzz' ? 0.08 : 0.16 + Math.random() * 0.22;
    particles.push({
      x: nx + (Math.random() - 0.5) * 0.06,
      y: ny + (Math.random() - 0.5) * 0.04,
      vx: kind === 'zzz' ? 0.03 : Math.cos(angle) * speed * 0.55,
      vy: kind === 'zzz' ? -0.11 : Math.sin(angle) * speed,
      life: 0,
      maxLife: kind === 'zzz' ? 1.8 : 0.75 + Math.random() * 0.45,
      kind,
      size: kind === 'crumb' ? 3.5 + Math.random() * 2.5 : 6 + Math.random() * 3,
      color:
        kind === 'heart'
          ? '#E86A33'
          : kind === 'sparkle'
          ? '#F3C64F'
          : kind === 'crumb'
          ? '#D99B52'
          : '#EAE4D7',
    });
  }
}

function updateSim(
  sim: {
    x: number;
    targetX: number;
    yOffset: number;
    vy: number;
    facing: number;
    scaleX: number;
    scaleY: number;
    wanderTimer: number;
    blinkTimer: number;
    isBlinking: boolean;
    moodAnim: 'idle' | 'happy' | 'eat' | 'startled' | 'nap';
    moodAnimTimer: number;
    idleTime: number;
    zzzTimer: number;
    biscuit: Biscuit;
    particles: Particle[];
  },
  pet: PetState,
  dt: number
) {
  sim.idleTime += dt;

  // Determine sleepy/nap state gently if low mood/fullness or idle for 28s
  const wantsNap = (pet.mood < 35 || pet.fullness < 35 || sim.idleTime > 28) && !sim.biscuit.active;

  if (sim.moodAnimTimer > 0) {
    sim.moodAnimTimer -= dt;
    if (sim.moodAnimTimer <= 0) {
      sim.moodAnim = wantsNap ? 'nap' : 'idle';
    }
  } else {
    sim.moodAnim = wantsNap ? 'nap' : 'idle';
  }

  // Biscuit arc physics
  if (sim.biscuit.active) {
    if (!sim.biscuit.landed) {
      sim.biscuit.vy += 2.2 * dt;
      sim.biscuit.x = Math.max(0.16, Math.min(0.84, sim.biscuit.x + sim.biscuit.vx * dt));
      sim.biscuit.y += sim.biscuit.vy * dt;
      if (sim.biscuit.y >= 0.8) {
        sim.biscuit.y = 0.8;
        sim.biscuit.landed = true;
      }
    }
    sim.targetX = sim.biscuit.x;
    if (Math.abs(sim.x - sim.biscuit.x) < 0.065 && sim.biscuit.landed) {
      sim.biscuit.active = false;
      sim.moodAnim = 'eat';
      sim.moodAnimTimer = 1.4;
      sim.vy = -125;
      sim.scaleX = 1.22;
      sim.scaleY = 0.82;
      spawnBurst(sim.particles, sim.x, 0.72, 'crumb', 8);
      spawnBurst(sim.particles, sim.x, 0.56, 'heart', 3);
    }
  } else if (sim.moodAnim !== 'nap') {
    sim.wanderTimer -= dt;
    if (sim.wanderTimer <= 0) {
      sim.wanderTimer = 3.2 + Math.random() * 4.0;
      sim.targetX = 0.22 + Math.random() * 0.56;
    }
  }

  // Smooth horizontal locomotion with playful mini-hops
  const dx = sim.targetX - sim.x;
  if (Math.abs(dx) > 0.01 && sim.moodAnim !== 'nap') {
    const speed = sim.biscuit.active ? 0.42 : 0.16;
    sim.facing = dx >= 0 ? 1 : -1;
    sim.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
    if (sim.yOffset === 0 && Math.abs(dx) > 0.04) {
      sim.vy = sim.biscuit.active ? -135 : -78;
    }
  }

  // Vertical hop physics
  if (sim.yOffset < 0 || sim.vy !== 0) {
    sim.vy += 680 * dt;
    sim.yOffset += sim.vy * dt;
    if (sim.yOffset >= 0) {
      sim.yOffset = 0;
      if (sim.vy > 90) {
        sim.scaleX = 1.15;
        sim.scaleY = 0.86;
      }
      sim.vy = 0;
    }
  }

  // Spring squash-and-stretch back to 1
  const spring = 1 - Math.exp(-10 * dt);
  sim.scaleX += (1 - sim.scaleX) * spring;
  sim.scaleY += (1 - sim.scaleY) * spring;

  // Blinking rhythm
  sim.blinkTimer -= dt;
  if (sim.blinkTimer <= 0) {
    if (!sim.isBlinking) {
      sim.isBlinking = true;
      sim.blinkTimer = 0.13;
    } else {
      sim.isBlinking = false;
      sim.blinkTimer = 2.4 + Math.random() * 3.2;
    }
  }

  // Nap zzz particles
  if (sim.moodAnim === 'nap') {
    sim.zzzTimer -= dt;
    if (sim.zzzTimer <= 0) {
      sim.zzzTimer = 1.3;
      spawnBurst(sim.particles, sim.x + 0.06, 0.56, 'zzz', 1);
    }
  }

  // Update particles
  for (let i = sim.particles.length - 1; i >= 0; i--) {
    const p = sim.particles[i];
    p.life += dt;
    if (p.life >= p.maxLife) {
      sim.particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind === 'crumb') {
      p.vy += 0.9 * dt;
    }
  }
}

function renderHabitat(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  sim: {
    x: number;
    yOffset: number;
    facing: number;
    scaleX: number;
    scaleY: number;
    isBlinking: boolean;
    moodAnim: 'idle' | 'happy' | 'eat' | 'startled' | 'nap';
    pointerX: number;
    pointerY: number;
    pointerInside: boolean;
    biscuit: Biscuit;
    particles: Particle[];
  },
  pet: PetState,
  bgImg: HTMLImageElement | null,
  bgLoaded: boolean,
  timeSec: number,
  compact: boolean
) {
  ctx.clearRect(0, 0, w, h);

  // 1. Background illustrated window sill (or warm CSS-matched painterly fallback)
  if (bgLoaded && bgImg) {
    const imgRatio = bgImg.width / bgImg.height;
    const canvasRatio = w / h;
    let dw = w;
    let dh = h;
    let dx = 0;
    let dy = 0;
    if (canvasRatio > imgRatio) {
      dh = w / imgRatio;
      dy = (h - dh) * 0.72; // Keep wooden sill visible in compact strip too
    } else {
      dw = h * imgRatio;
      dx = (w - dw) * 0.5;
    }
    ctx.drawImage(bgImg, dx, dy, dw, dh);
    // Subtle warm dusk vignette to ground Pebble clearly
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(20, 27, 32, 0.14)');
    grad.addColorStop(0.65, 'rgba(20, 27, 32, 0.04)');
    grad.addColorStop(1, 'rgba(20, 27, 32, 0.28)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#D9A773');
    sky.addColorStop(0.7, '#E8CCA0');
    sky.addColorStop(0.72, '#6A4E3B');
    sky.addColorStop(1, '#4C3628');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
  }

  const sillY = compact ? h * 0.84 : h * 0.83;
  const petRadius = compact ? Math.min(w, h) * 0.24 : Math.min(w, h) * 0.155;

  // 2. Tossed snack biscuit if active
  if (sim.biscuit.active) {
    const bx = sim.biscuit.x * w;
    const by = Math.min(sillY - 4, sim.biscuit.y * h);
    ctx.save();
    ctx.translate(bx, by);
    ctx.fillStyle = 'rgba(20, 27, 32, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 5, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E0A358';
    ctx.strokeStyle = '#3B281B';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Little biscuit dots
    ctx.fillStyle = '#8C582B';
    ctx.beginPath();
    ctx.arc(-2.5, -1.5, 1.2, 0, Math.PI * 2);
    ctx.arc(2.5, -1, 1.2, 0, Math.PI * 2);
    ctx.arc(0, 2.2, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 3. Draw Pebble!
  const px = sim.x * w;
  const breathe = Math.sin(timeSec * (sim.moodAnim === 'nap' ? 1.8 : 3.2)) * 0.032;
  const sx = sim.scaleX * (1 + breathe);
  const sy = sim.scaleY * (1 - breathe);
  const py = sillY + sim.yOffset * (compact ? 0.55 : 0.85);

  // Ground contact shadow
  const shadowScale = Math.max(0.55, 1 + sim.yOffset / 120);
  ctx.fillStyle = 'rgba(20, 24, 28, 0.34)';
  ctx.beginPath();
  ctx.ellipse(px, sillY + 2, petRadius * 0.92 * shadowScale, petRadius * 0.22 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(px, py);
  ctx.scale(sx, sy);

  const stage = getPetStage(pet.level);
  const equipped = pet.equippedAccessories;

  // Sprout crown on top of head (grows across stages!)
  drawSproutCrown(ctx, petRadius, stage, timeSec, sim.facing);

  // Soft pebble body (warm river-stone cream with subtle under-shading)
  const bodyGrad = ctx.createRadialGradient(
    -petRadius * 0.28,
    -petRadius * 0.95,
    petRadius * 0.15,
    0,
    -petRadius * 0.65,
    petRadius * 1.15
  );
  bodyGrad.addColorStop(0, '#F7F4EC');
  bodyGrad.addColorStop(0.68, '#EAE3D4');
  bodyGrad.addColorStop(1, '#CFC6B4');

  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = '#242E34';
  ctx.lineWidth = Math.max(2, petRadius * 0.075);
  ctx.beginPath();
  ctx.moveTo(-petRadius * 0.95, -petRadius * 0.14);
  ctx.bezierCurveTo(
    -petRadius * 1.05,
    -petRadius * 0.98,
    -petRadius * 0.55,
    -petRadius * 1.44,
    0,
    -petRadius * 1.44
  );
  ctx.bezierCurveTo(
    petRadius * 0.55,
    -petRadius * 1.44,
    petRadius * 1.05,
    -petRadius * 0.98,
    petRadius * 0.95,
    -petRadius * 0.14
  );
  ctx.quadraticCurveTo(0, petRadius * 0.12, -petRadius * 0.95, -petRadius * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Tiny stubby feet
  ctx.fillStyle = '#CFC6B4';
  ctx.beginPath();
  ctx.ellipse(-petRadius * 0.42, -petRadius * 0.03, petRadius * 0.19, petRadius * 0.1, 0, 0, Math.PI * 2);
  ctx.ellipse(petRadius * 0.42, -petRadius * 0.03, petRadius * 0.19, petRadius * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Eye gaze offset toward cursor or biscuit
  let gazeX = sim.facing * petRadius * 0.06;
  let gazeY = 0;
  if (sim.biscuit.active) {
    gazeX = Math.max(-1, Math.min(1, (sim.biscuit.x - sim.x) * 4)) * petRadius * 0.1;
    gazeY = petRadius * 0.04;
  } else if (sim.pointerInside && sim.moodAnim !== 'nap') {
    gazeX = Math.max(-1, Math.min(1, (sim.pointerX - sim.x) * 3)) * petRadius * 0.1;
    gazeY = Math.max(-1, Math.min(1, (sim.pointerY - 0.65) * 3)) * petRadius * 0.07;
  }

  const eyeY = -petRadius * 0.74;
  const eyeSpread = petRadius * 0.34;

  // Rosy cheeks
  ctx.fillStyle = 'rgba(232, 106, 51, 0.36)';
  ctx.beginPath();
  ctx.ellipse(-eyeSpread * 1.42 + gazeX * 0.5, eyeY + petRadius * 0.17, petRadius * 0.15, petRadius * 0.085, 0, 0, Math.PI * 2);
  ctx.ellipse(eyeSpread * 1.42 + gazeX * 0.5, eyeY + petRadius * 0.17, petRadius * 0.15, petRadius * 0.085, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes & Mouth by state
  ctx.strokeStyle = '#1D262C';
  ctx.fillStyle = '#1D262C';
  ctx.lineWidth = Math.max(2, petRadius * 0.075);
  ctx.lineCap = 'round';

  if (sim.moodAnim === 'happy' || sim.moodAnim === 'eat') {
    // Happy curved squint eyes (^ ^)
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(dir * eyeSpread + gazeX * 0.4, eyeY + petRadius * 0.04, petRadius * 0.12, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
    }
    // Cheerful open smile or munch
    if (sim.moodAnim === 'eat') {
      const munch = Math.abs(Math.sin(timeSec * 16));
      ctx.fillStyle = '#C95432';
      ctx.beginPath();
      ctx.ellipse(gazeX * 0.4, eyeY + petRadius * 0.22, petRadius * 0.13, petRadius * (0.06 + munch * 0.08), 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(gazeX * 0.4, eyeY + petRadius * 0.14, petRadius * 0.13, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
  } else if (sim.moodAnim === 'nap') {
    // Sleeping closed eyes (u u)
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(dir * eyeSpread, eyeY + petRadius * 0.02, petRadius * 0.11, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, eyeY + petRadius * 0.23, petRadius * 0.055, 0, Math.PI * 2);
    ctx.stroke();
  } else if (sim.moodAnim === 'startled') {
    // Wide startled eyes (o o)
    for (const dir of [-1, 1]) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(dir * eyeSpread, eyeY, petRadius * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1D262C';
      ctx.beginPath();
      ctx.arc(dir * eyeSpread, eyeY, petRadius * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(0, eyeY + petRadius * 0.23, petRadius * 0.08, petRadius * 0.11, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Awake expressive eyes
    if (sim.isBlinking) {
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(dir * eyeSpread - petRadius * 0.1 + gazeX, eyeY + gazeY);
        ctx.lineTo(dir * eyeSpread + petRadius * 0.1 + gazeX, eyeY + gazeY);
        ctx.stroke();
      }
    } else {
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(dir * eyeSpread + gazeX, eyeY + gazeY, petRadius * 0.105, 0, Math.PI * 2);
        ctx.fill();
        // Crisp catchlight
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(dir * eyeSpread + gazeX - petRadius * 0.032, eyeY + gazeY - petRadius * 0.035, petRadius * 0.035, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1D262C';
      }
    }
    // Gentle smile
    ctx.beginPath();
    ctx.moveTo(-petRadius * 0.1 + gazeX * 0.5, eyeY + petRadius * 0.18);
    ctx.quadraticCurveTo(gazeX * 0.5, eyeY + petRadius * 0.28, petRadius * 0.1 + gazeX * 0.5, eyeY + petRadius * 0.18);
    ctx.stroke();
  }

  // Render equipped accessories on top of Pebble!
  drawAccessories(ctx, petRadius, equipped, eyeY, eyeSpread, gazeX * 0.45);

  ctx.restore();

  // 4. Particles (hearts, crumbs, sparkles, zzz)
  for (const p of sim.particles) {
    const progress = p.life / p.maxLife;
    const alpha = 1 - progress;
    const x = p.x * w;
    const y = p.y * h;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(x, y);

    if (p.kind === 'heart') {
      const s = p.size * (0.7 + progress * 0.45);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.35);
      ctx.bezierCurveTo(-s, -s * 0.35, -s * 0.55, -s * 1.1, 0, -s * 0.45);
      ctx.bezierCurveTo(s * 0.55, -s * 1.1, s, -s * 0.35, 0, s * 0.35);
      ctx.fill();
    } else if (p.kind === 'sparkle') {
      const s = p.size * (1 - progress * 0.3);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.3, -s * 0.3);
      ctx.lineTo(s, 0);
      ctx.lineTo(s * 0.3, s * 0.3);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.3, s * 0.3);
      ctx.lineTo(-s, 0);
      ctx.lineTo(-s * 0.3, -s * 0.3);
      ctx.closePath();
      ctx.fill();
    } else if (p.kind === 'crumb') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size * 0.55, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'zzz') {
      ctx.fillStyle = '#F4F1EA';
      ctx.font = `600 ${Math.round(11 + progress * 5)}px "JetBrains Mono", monospace`;
      ctx.fillText('z', 0, 0);
    }
    ctx.restore();
  }
}

function drawSproutCrown(
  ctx: CanvasRenderingContext2D,
  r: number,
  stage: string,
  timeSec: number,
  facing: number
) {
  const sway = Math.sin(timeSec * 2.6) * 0.08;
  ctx.save();
  ctx.translate(0, -r * 1.4);
  ctx.rotate(sway);
  ctx.strokeStyle = '#1F3B2C';
  ctx.lineWidth = Math.max(1.8, r * 0.065);
  ctx.lineJoin = 'round';

  // Stem
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.quadraticCurveTo(facing * r * 0.05, -r * 0.25, 0, -r * 0.42);
  ctx.stroke();

  // Primary leaf (all stages)
  ctx.fillStyle = '#52B788';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.36);
  ctx.bezierCurveTo(-r * 0.46, -r * 0.65, -r * 0.52, -r * 0.22, 0, -r * 0.24);
  ctx.fill();
  ctx.stroke();

  // Second leaf for Sproutling+
  if (stage !== 'Seedling') {
    ctx.fillStyle = '#74C69D';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.36);
    ctx.bezierCurveTo(r * 0.48, -r * 0.72, r * 0.56, -r * 0.25, 0, -r * 0.24);
    ctx.fill();
    ctx.stroke();
  }

  // Tiny bud/flower for Leafkin & golden blossom for Scholar
  if (stage === 'Leafkin' || stage === 'Scholar') {
    ctx.fillStyle = stage === 'Scholar' ? '#F3C64F' : '#E86A33';
    ctx.beginPath();
    ctx.arc(0, -r * 0.52, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawAccessories(
  ctx: CanvasRenderingContext2D,
  r: number,
  equipped: AccessoryId[],
  eyeY: number,
  eyeSpread: number,
  gazeX: number
) {
  if (equipped.includes('scarf')) {
    ctx.fillStyle = '#D65A31';
    ctx.strokeStyle = '#242E34';
    ctx.lineWidth = Math.max(1.6, r * 0.055);
    ctx.beginPath();
    ctx.roundRect(-r * 0.88, -r * 0.33, r * 1.76, r * 0.24, r * 0.11);
    ctx.fill();
    ctx.stroke();
    // Scarf tail
    ctx.beginPath();
    ctx.roundRect(r * 0.26, -r * 0.24, r * 0.26, r * 0.36, r * 0.08);
    ctx.fill();
    ctx.stroke();
  }

  if (equipped.includes('bowtie')) {
    const by = -r * 0.28;
    ctx.fillStyle = '#46A778';
    ctx.strokeStyle = '#242E34';
    ctx.lineWidth = Math.max(1.5, r * 0.055);
    ctx.beginPath();
    ctx.moveTo(0, by);
    ctx.lineTo(-r * 0.26, by - r * 0.12);
    ctx.lineTo(-r * 0.26, by + r * 0.12);
    ctx.closePath();
    ctx.moveTo(0, by);
    ctx.lineTo(r * 0.26, by - r * 0.12);
    ctx.lineTo(r * 0.26, by + r * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, by, r * 0.075, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  if (equipped.includes('glasses')) {
    ctx.strokeStyle = '#C9973B';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = Math.max(1.8, r * 0.06);
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(dir * eyeSpread + gazeX, eyeY, r * 0.21, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-eyeSpread + r * 0.21 + gazeX, eyeY);
    ctx.lineTo(eyeSpread - r * 0.21 + gazeX, eyeY);
    ctx.stroke();
  }

  if (equipped.includes('headphones')) {
    ctx.strokeStyle = '#2A363F';
    ctx.lineWidth = Math.max(3, r * 0.11);
    ctx.beginPath();
    ctx.arc(0, -r * 0.85, r * 0.94, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
    ctx.fillStyle = '#E86A33';
    ctx.strokeStyle = '#1D262C';
    ctx.lineWidth = Math.max(1.6, r * 0.055);
    ctx.beginPath();
    ctx.roundRect(-r * 1.07, -r * 0.96, r * 0.22, r * 0.42, r * 0.09);
    ctx.roundRect(r * 0.85, -r * 0.96, r * 0.22, r * 0.42, r * 0.09);
    ctx.fill();
    ctx.stroke();
  }

  if (equipped.includes('beret')) {
    ctx.fillStyle = '#3B4D5B';
    ctx.strokeStyle = '#1D262C';
    ctx.lineWidth = Math.max(1.8, r * 0.06);
    ctx.beginPath();
    ctx.ellipse(-r * 0.08, -r * 1.38, r * 0.64, r * 0.22, -0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.12, -r * 1.59);
    ctx.lineTo(-r * 0.06, -r * 1.69);
    ctx.stroke();
  }
}
