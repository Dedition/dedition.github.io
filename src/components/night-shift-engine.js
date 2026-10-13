const TAU = Math.PI * 2;
const PHASES = new Set([
  "idle",
  "isolation",
  "signal",
  "board",
  "sacrifice",
  "dissent",
  "breach",
  "contained",
  "blackout",
  "compromised",
  "conspiracy",
  "unravel",
  "unscored",
]);
const BONE = "215,227,218";
const RED = "246,53,40";
const BLUE = "96,179,193";
const GOLD = "244,196,133";
const ICE = "157,221,220";
const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const mix = (a, b, n) => a + (b - a) * n;
const blendRgb = (a, b, n) =>
  a.map((channel, i) => Math.round(mix(channel, b[i], n))).join(",");
const ink = (rgb, alpha) => `rgba(${rgb},${clamp(alpha)})`;
const smooth = (n) => n * n * (3 - 2 * n);
const passage = (n, start, end) => smooth(clamp((n - start) / (end - start)));

function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/** A local, fictional containment complex. All geometry is generated on-device. */
export function createNightShift(
  canvas,
  { paused = false, phase = "idle", onEvent } = {},
) {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas drawing is unavailable.");
  phase = PHASES.has(phase) ? phase : "idle";
  const random = seeded(20172026);
  const dust = Array.from({ length: 110 }, () => ({
    x: (random() - 0.5) * 24,
    y: (random() - 0.5) * 15,
    z: random() * 65,
    size: 0.012 + random() * 0.018,
  }));
  const cells = Array.from({ length: 77 }, (_, index) => ({
    x: ((index % 11) - 5) * 5.3,
    y: (Math.floor(index / 11) - 3) * 5.3,
    z: 43 + random() * 2,
    active: random() > 0.22,
    seed: random() * TAU,
    side: index % 3 === 0,
  }));
  let width = 1,
    height = 1,
    dpr = 1;
  let elapsed = 0,
    phaseAge = 0,
    progress = 0,
    visibleProgress = paused ? 0.6 : 0;
  let pressure = 0,
    frame = 0,
    previousTime = 0;
  let disposed = false,
    failed = false,
    observer;
  let camera = pose();

  function emit(event) {
    if (!disposed && typeof onEvent === "function") onEvent(event);
  }

  function pose() {
    const p = smooth(visibleProgress);
    const drift = Math.sin(elapsed * 0.19) * 0.12;
    switch (phase) {
      case "isolation":
        return { x: drift, y: -0.3, z: mix(-12, 14, p), yaw: 0, roll: 0 };
      case "signal":
        return {
          x: mix(-1, -4.8, p),
          y: -0.2,
          z: mix(11, 19, p),
          yaw: -0.08,
          roll: -0.012,
        };
      case "board":
        return {
          x: mix(1, -3, p),
          y: mix(0, -2.5, p),
          z: mix(14, -43, p),
          yaw: 0.035,
          roll: 0.016,
        };
      case "conspiracy":
        return { x: drift * 0.1, y: -0.12, z: mix(16, 21, p), yaw: 0, roll: 0 };
      case "unravel":
        return { x: 0, y: -0.12, z: 21, yaw: 0, roll: 0 };
      case "sacrifice":
        return { x: 0, y: -0.2, z: mix(0, 17, p), yaw: 0, roll: 0 };
      case "dissent":
        return {
          x: Math.sin(p * Math.PI) * 2,
          y: -1,
          z: mix(-25, -12, p),
          yaw: -0.025,
          roll: Math.sin(elapsed * 0.4) * 0.008,
        };
      case "breach":
        return {
          x: Math.sin(elapsed * 0.5) * 0.5,
          y: Math.sin(elapsed * 0.3) * 0.25,
          z: p * 74 + phaseAge * 2.5,
          yaw: 0,
          roll: Math.sin(elapsed * 0.6) * 0.023,
        };
      case "contained":
        return { x: 0, y: 0, z: mix(3, -10, p), yaw: 0, roll: 0 };
      case "blackout":
        return { x: 0, y: 0, z: 3, yaw: 0, roll: 0 };
      case "compromised":
        return { x: drift, y: 0, z: mix(-9, 11, p), yaw: 0, roll: 0 };
      default:
        return {
          x: Math.sin(elapsed * 0.1) * 0.6,
          y: -0.5,
          z: -24 + Math.sin(elapsed * 0.13) * 2,
          yaw: 0,
          roll: 0,
        };
    }
  }

  function point(x, y, z) {
    const dx = x - camera.x,
      dz = z - camera.z;
    const rx = dx * Math.cos(camera.yaw) - dz * Math.sin(camera.yaw);
    const depth = dx * Math.sin(camera.yaw) + dz * Math.cos(camera.yaw);
    const scale = Math.min(width * 1.55, height * 1.08) / Math.max(0.15, depth);
    const sx = rx * scale,
      sy = (y - camera.y) * scale;
    return {
      x: width * 0.5 + sx * Math.cos(camera.roll) - sy * Math.sin(camera.roll),
      y:
        height * 0.47 + sy * Math.cos(camera.roll) + sx * Math.sin(camera.roll),
      scale,
      depth,
    };
  }

  function path(vertices, color, weight = 1, fill = false) {
    const points = vertices.map((v) => point(...v));
    if (points.some((p) => p.depth < 0.4)) return;
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    if (fill) {
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = weight;
      ctx.stroke();
    }
  }

  function glow(x, y, radius, rgb, strength) {
    if (radius < 0.2) return;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, ink(rgb, strength));
    gradient.addColorStop(0.22, ink(rgb, strength * 0.35));
    gradient.addColorStop(1, ink(rgb, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function lamp(x, y, z, size, rgb = BONE, alpha = 1) {
    const p = point(x, y, z);
    if (p.depth < 0.4) return;
    const r = clamp(size * p.scale, 0.4, 70);
    glow(p.x, p.y, r * 7, rgb, alpha * 0.14);
    ctx.fillStyle = ink(rgb, alpha);
    ctx.fillRect(p.x - r, p.y - r * 0.3, r * 2, Math.max(1, r * 0.6));
  }

  function label(text, x, y, z, rgb = BONE, size = 0.2, alpha = 0.6) {
    const p = point(x, y, z);
    const pixels = size * p.scale;
    if (p.depth < 0.5 || pixels < 6 || pixels > 60) return;
    ctx.font = `${pixels}px ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.fillStyle = ink(rgb, alpha);
    ctx.fillText(text, p.x, p.y);
  }

  function aperture(z, radius, rgb = BONE, strength = 0.35, broken = false) {
    const vertices = [
      [-radius, -radius * 0.65, z],
      [-radius * 0.7, -radius, z],
      [radius * 0.7, -radius, z],
      [radius, -radius * 0.65, z],
      [radius, radius * 0.65, z],
      [radius * 0.7, radius, z],
      [-radius * 0.7, radius, z],
      [-radius, radius * 0.65, z],
    ];
    for (let i = 0; i < vertices.length; i += 1) {
      if (broken && (i === 2 || i === 5)) continue;
      const a = vertices[i],
        b = vertices[(i + 1) % vertices.length];
      path([a, b], ink(rgb, strength), 1.25);
      path(
        [
          a,
          [a[0] * 1.13, a[1] * 1.13, z + 0.5],
          [b[0] * 1.13, b[1] * 1.13, z + 0.5],
          b,
        ],
        ink(rgb, strength * 0.13),
        1,
        true,
      );
    }
    [-1, 1].forEach((side) => {
      path(
        [
          [side * radius * 0.77, -radius * 0.91, z],
          [side * radius * 0.46, -radius * 0.91, z],
        ],
        ink(rgb, strength * 1.6),
        2.5,
      );
      lamp(side * radius * 0.94, radius * 0.48, z, 0.038, rgb, strength * 1.9);
    });
  }

  function corridor(hostile = false) {
    const rgb = hostile ? RED : BONE;
    const base = phase === "breach" ? Math.floor(camera.z / 7) * 7 : -21;
    const end = base + 105;
    // Solid vanishing walls and illuminated structural ribs give movement real depth.
    for (const side of [-1, 1]) {
      path(
        [
          [side * 6, -4.3, base],
          [side * 6, -4.3, end],
          [side * 6, 4.3, end],
          [side * 6, 4.3, base],
        ],
        "#0b1012",
        1,
        true,
      );
      for (const y of [-3.7, 3.7]) {
        path(
          [
            [side * 4.6, y, Math.max(base, camera.z + 0.5)],
            [side * 4.6, y, end],
          ],
          ink(rgb, 0.18),
        );
        path(
          [
            [side * 4.7, y, Math.max(base, camera.z + 0.5)],
            [side * 4.7, y, end],
          ],
          ink(rgb, 0.06),
          4,
        );
      }
    }
    for (let z = end; z >= base; z -= 7) {
      if (z <= camera.z + 0.6) continue;
      const distance = z - camera.z;
      const brightness = clamp(1 - distance / 130, 0.08, 0.55);
      aperture(z, 4.4, rgb, brightness, hostile && Math.round(z / 7) % 3 === 0);
      if (z < 65 || hostile) {
        label(
          `SECTOR ${String(Math.abs(Math.round(z / 7)) + 1).padStart(2, "0")}`,
          0,
          -4.0,
          z,
          rgb,
          0.16,
          brightness,
        );
      }
      for (let x = -3; x <= 3; x += 1.5) {
        path(
          [
            [x, 4.2, z],
            [x, 4.2, z + 6.8],
          ],
          ink(rgb, 0.09),
        );
      }
      path(
        [
          [-4.2, 4.2, z],
          [4.2, 4.2, z],
        ],
        ink(rgb, 0.1),
      );
    }
  }

  function cell(x, y, z, size, rgb, live, seed = 0, captive = false) {
    const r = size,
      top = y - r * 1.45,
      bottom = y + r * 1.45;
    const alpha = captive ? 0.7 : 0.48;
    path(
      [
        [x - r, top, z],
        [x + r, top, z],
        [x + r, bottom, z],
        [x - r, bottom, z],
      ],
      ink("8,14,16", 0.92),
      1,
      true,
    );
    path(
      [
        [x - r, top, z],
        [x + r, top, z],
        [x + r, bottom, z],
        [x - r, bottom, z],
        [x - r, top, z],
      ],
      ink(rgb, alpha),
      captive ? 1.5 : 0.8,
    );
    path(
      [
        [x - r, top, z],
        [x - r * 0.78, top + r * 0.22, z + r * 0.6],
        [x + r * 0.78, top + r * 0.22, z + r * 0.6],
        [x + r, top, z],
      ],
      ink(rgb, 0.08),
      1,
      true,
    );
    for (const side of [-1, 1]) {
      path(
        [
          [x + side * r * 0.82, top + r * 0.2, z],
          [x + side * r * 0.82, bottom - r * 0.2, z],
        ],
        ink(rgb, live ? 0.17 : 0.05),
      );
      lamp(
        x + side * r * 0.72,
        top + r * 0.12,
        z,
        r * 0.045,
        rgb,
        live ? 0.8 : 0.12,
      );
    }
    if (!live) return;
    const bodyRadius = r * (captive ? 0.44 : 0.32);
    const pulse = 0.8 + Math.sin(elapsed * 0.9 + seed) * 0.14;
    const center = point(x, y, z - 0.04);
    if (center.depth < 0.5) return;
    glow(center.x, center.y, bodyRadius * center.scale * 5, rgb, 0.2);
    // The prisoner is a suspended bundle of independently twitching filaments.
    for (let strand = 0; strand < (captive ? 16 : 5); strand += 1) {
      const vertices = [];
      const angle = (strand / (captive ? 16 : 5)) * TAU + seed;
      for (let step = 0; step <= 17; step += 1) {
        const t = step / 17;
        const envelope = Math.pow(Math.sin(t * Math.PI), 0.9);
        const twist = angle + t * 6.6 + Math.sin(elapsed * 0.3 + seed) * 0.16;
        vertices.push([
          x + Math.cos(twist) * bodyRadius * envelope * pulse,
          y + (t - 0.5) * r * 1.8,
          z + Math.sin(twist) * bodyRadius * envelope,
        ]);
      }
      path(
        vertices,
        ink(rgb, captive ? 0.3 + (strand % 3) * 0.13 : 0.64),
        captive ? 1.15 : 0.7,
      );
    }
    path(
      [
        [x, top, z],
        [x, y - r * 0.9, z],
      ],
      ink(rgb, 0.45),
    );
    path(
      [
        [x, y + r * 0.9, z],
        [x, bottom, z],
      ],
      ink(rgb, 0.27),
    );
    if (captive) {
      for (let i = 0; i < 9; i += 1) {
        const level = top + r * 0.3 + i * r * 0.29;
        path(
          [
            [x - r * 0.96, level, z - 0.1],
            [x - r * 0.75, level, z - 0.1],
          ],
          ink(rgb, 0.35),
        );
      }
      label("SUBJECT D13", x, top - 0.32, z, rgb, 0.2, 0.85);
      label("NOT A PERSON / NOT YET", x, bottom + 0.38, z, rgb, 0.13, 0.5);
    }
  }

  function prisoner() {
    const deleting = phase === "sacrifice";
    const dead = deleting && visibleProgress > 0.72;
    const rgb = deleting ? RED : BONE;
    const z = 28;
    for (const side of [-1, 1]) {
      path(
        [
          [side * 5, -4, z + 3],
          [side * 2.2, -3.4, z + 1],
          [side * 1.7, -2.5, z],
        ],
        ink(rgb, 0.35),
        1.5,
      );
      path(
        [
          [side * 5, 4, z + 4],
          [side * 2.2, 3.4, z + 1],
          [side * 1.7, 2.5, z],
        ],
        ink(rgb, 0.16),
      );
    }
    cell(0, 0, z, 1.65, rgb, !dead, 1, true);
    if (!dead && (deleting || phase === "conspiracy")) {
      const eye = point(0, -0.12, z - 0.6);
      const radius = Math.min(width * 0.08, eye.scale * 0.35);
      lookingBack(eye.x, eye.y, radius, phase === "conspiracy" ? 1 : 0.37);
    }
    if (deleting) {
      const sweep = mix(-2.5, 2.5, clamp(visibleProgress / 0.72));
      if (!dead) {
        path(
          [
            [-4.4, sweep, z - 0.25],
            [4.4, sweep, z - 0.25],
          ],
          ink(RED, 0.85),
          1.7,
        );
        const a = point(-4.4, sweep, z),
          b = point(4.4, sweep, z);
        glow((a.x + b.x) / 2, a.y, Math.abs(a.x - b.x) * 0.45, RED, 0.12);
      }
      label(
        dead ? "RESOURCE RECLAIMED" : "REALLOCATING SUBJECT",
        0,
        3.75,
        z,
        RED,
        0.18,
        0.8,
      );
    }
  }

  function seam() {
    const z = 25;
    path(
      [
        [-6, -4.3, z],
        [-2, -4.3, z],
        [-2, 4.3, z],
        [-6, 4.3, z],
      ],
      "#11171a",
      1,
      true,
    );
    for (let row = 0; row < 13; row += 1) {
      const y = -3.8 + row * 0.62;
      path(
        [
          [-5.7, y, z - 0.02],
          [-2.4, y, z - 0.02],
        ],
        ink(BONE, 0.08),
      );
    }
    const opening = 0.025 + pressure * 0.25 + Math.sin(elapsed * 0.5) * 0.008;
    path(
      [
        [-4.05 - opening, -3.6, z - 0.04],
        [-3.98 + opening, -3.6, z - 0.04],
        [-3.96 + opening, 3.6, z - 0.04],
        [-4.04 - opening, 3.6, z - 0.04],
      ],
      ink(RED, 0.75),
      1,
      true,
    );
    const focus = point(-4, 0, z);
    glow(
      focus.x,
      focus.y,
      Math.min(width, height) * 0.24,
      RED,
      0.18 + pressure * 0.18,
    );
    for (let i = 0; i < 7; i += 1) {
      lamp(
        -4,
        -2.5 + i * 0.8,
        z - 0.1,
        0.05,
        RED,
        0.4 + Math.sin(elapsed * 0.6 + i) * 0.2,
      );
    }
    label("NO ADJACENT INSTANCES", -4, -3.9, z, BONE, 0.17, 0.75);
  }

  function prison() {
    const dissent = phase === "dissent";
    path(
      [
        [-36, -23, 51],
        [36, -23, 51],
        [36, 23, 51],
        [-36, 23, 51],
      ],
      "#080d10",
      1,
      true,
    );
    for (let layer = 2; layer >= 0; layer -= 1) {
      const z = 45 + layer * 29;
      for (let x = -34; x <= 34; x += 5.3) {
        path(
          [
            [x, -24, z],
            [x, 24, z],
          ],
          ink(dissent ? RED : BONE, 0.13 / (layer + 1)),
        );
      }
      for (let y = -23; y <= 23; y += 5.3) {
        path(
          [
            [-36, y, z],
            [36, y, z],
          ],
          ink(BONE, 0.12 / (layer + 1)),
        );
      }
    }
    cells.forEach((c, index) => {
      const rgb = dissent && !c.side ? RED : BLUE;
      cell(c.x, c.y, c.z, 1.4, rgb, c.active, c.seed);
      if (index % 11 === 5)
        label(
          `BLOCK ${String(Math.floor(index / 11) + 1).padStart(2, "0")}`,
          c.x + 2.5,
          c.y,
          c.z,
          BONE,
          0.23,
          0.4,
        );
      if (c.active && (dissent || index % 3 === 0)) {
        const other = cells[(index + (dissent ? 13 : 12)) % cells.length];
        const edge = (Math.sin(elapsed * 0.4 + c.seed) + 1) * 0.06 + 0.04;
        path(
          [
            [c.x, c.y, c.z - 0.5],
            [(c.x + other.x) / 2, c.y, c.z - 2],
            [other.x, other.y, other.z - 0.5],
          ],
          ink(rgb, edge + pressure * 0.12),
        );
      }
    });
    // Foreground gantries move faster than the distant cells during the reveal.
    for (const side of [-1, 1]) {
      path(
        [
          [side * 16, -25, 14],
          [side * 18, -25, 14],
          [side * 18, 25, 14],
          [side * 16, 25, 14],
        ],
        "#101619",
        1,
        true,
      );
      path(
        [
          [side * 16, -25, 14],
          [side * 16, 25, 14],
        ],
        ink(RED, dissent ? 0.7 : 0.3),
        2,
      );
    }
    path(
      [
        [-36, 14, 22],
        [36, 14, 22],
        [36, 15, 22],
        [-36, 15, 22],
      ],
      "#151b1e",
      1,
      true,
    );
  }

  function shutters() {
    const shut = smooth(clamp(visibleProgress * 1.7 + pressure * 0.2));
    const gap = (1 - shut) * 3.8 + 0.025;
    for (const side of [-1, 1]) {
      path(
        [
          [side * gap, -4.2, 25],
          [side * 5, -4.2, 25],
          [side * 5, 4.2, 25],
          [side * gap, 4.2, 25],
        ],
        "#151c1e",
        1,
        true,
      );
      path(
        [
          [side * gap, -4.2, 24.98],
          [side * gap, 4.2, 24.98],
        ],
        ink(BONE, 0.65),
        1.4,
      );
      for (let row = -3; row <= 3; row += 1) {
        path(
          [
            [side * (gap + 0.2), row, 24.97],
            [side * 4.8, row - 0.7, 24.97],
          ],
          ink(BONE, 0.17),
        );
      }
    }
    label("SEALED", 0, -3.2, 24.9, BONE, 0.34, 0.85);
    lamp(0, 3.1, 24.9, 0.15, RED, 0.8);
  }

  function watcher() {
    const z = 27;
    const scale = 1 + visibleProgress * 0.65;
    const center = point(0, 0, z);
    glow(center.x, center.y, Math.min(width, height) * 0.65, RED, 0.23);
    // No face texture: thousands of connections have assembled something that looks back.
    for (let rib = 0; rib < 48; rib += 1) {
      const a = (rib / 48) * TAU;
      const side = Math.cos(a);
      const vertices = [];
      for (let step = 0; step <= 12; step += 1) {
        const t = step / 12;
        const radius = mix(0.95, 9.5, t) * scale;
        const bend = a + Math.sin(t * 6 + rib * 0.6 + elapsed * 0.1) * 0.13 * t;
        vertices.push([
          Math.cos(bend) * radius,
          Math.sin(bend) * radius * (0.48 + t * 0.2),
          z + t * 14 - Math.sin(t * Math.PI) * 3,
        ]);
      }
      path(
        vertices,
        ink(RED, 0.19 + (rib % 4) * 0.1),
        rib % 4 === 0 ? 1.6 : 0.7,
      );
      if (rib % 3 === 0)
        lamp(side * 6 * scale, Math.sin(a) * 4 * scale, z + 9, 0.07, RED, 0.65);
    }
    for (const side of [-1, 1]) {
      const vertices = [];
      for (let i = 0; i <= 40; i += 1) {
        const t = i / 40;
        vertices.push([
          (t - 0.5) * 8 * scale,
          side * Math.sin(t * Math.PI) * 1.55 * scale,
          z,
        ]);
      }
      path(vertices, ink(RED, 0.7), 1.6);
    }
    for (let ring = 0; ring < 7; ring += 1) {
      const vertices = [];
      for (let i = 0; i <= 64; i += 1) {
        const a = (i / 64) * TAU;
        const r = (0.5 + ring * 0.11) * scale;
        vertices.push([
          Math.cos(a) * r,
          Math.sin(a) * r,
          z - 0.3 - ring * 0.05,
        ]);
      }
      path(vertices, ink(RED, 0.25 + ring * 0.06));
    }
    const slit = point(0, 0, z - 0.7);
    ctx.fillStyle = "#020304";
    ctx.beginPath();
    ctx.ellipse(
      slit.x,
      slit.y,
      slit.scale * 0.22 * scale,
      slit.scale * 0.88 * scale,
      0,
      0,
      TAU,
    );
    ctx.fill();
    lamp(-0.35 * scale, -0.45 * scale, z - 0.8, 0.04, BONE, 0.9);
  }

  function lookingBack(x, y, radius, strength) {
    if (radius < 1) return;
    // A single direct gaze is the clue; it never flashes or tracks real visitor data.
    const opening = 0.26 + (Math.sin(elapsed * 0.38) + 1) * 0.025;
    glow(x, y, radius * 4, ICE, strength * 0.16);
    ctx.strokeStyle = ink(ICE, strength * 0.8);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - radius, y);
    ctx.quadraticCurveTo(x, y - radius * opening * 2, x + radius, y);
    ctx.quadraticCurveTo(x, y + radius * opening * 2, x - radius, y);
    ctx.stroke();
    ctx.fillStyle = "#030608";
    ctx.beginPath();
    ctx.ellipse(x, y, radius * 0.19, radius * opening, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = ink(BONE, strength);
    ctx.beginPath();
    ctx.arc(
      x - radius * 0.04,
      y - radius * 0.07,
      Math.max(1, radius * 0.035),
      0,
      TAU,
    );
    ctx.fill();
  }

  function screenPolygon(vertices, fill, stroke, lineWidth = 1) {
    if (!vertices.length) return;
    ctx.beginPath();
    vertices.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }

  function secretSky(reversal, dawn) {
    const sky = ctx.createRadialGradient(
      width * 0.5,
      height * 0.43,
      0,
      width * 0.5,
      height * 0.43,
      Math.max(width, height) * 0.78,
    );
    // The long, low-contrast exposure shift makes light feel spatial, not like a flash.
    const light = Math.round(reversal * 36);
    sky.addColorStop(
      0,
      `rgb(${14 + light + Math.round(dawn * 25)},${26 + light},${31 + light - Math.round(dawn * 10)})`,
    );
    sky.addColorStop(
      0.55,
      `rgb(${5 + Math.round(dawn * 14)},${10 + Math.round(reversal * 10 + dawn * 5)},${15 + Math.round(reversal * 12)})`,
    );
    sky.addColorStop(1, "#020406");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
  }

  function foldedPrison(p, opacity) {
    if (opacity < 0.005) return;
    const cx = width * 0.5;
    const cy = height * 0.45;
    const unit = Math.min(width * 0.46, height * 0.47);
    const fold = passage(p, 0.07, 0.43);
    const rotation = passage(p, 0.12, 0.5) * Math.PI * 0.63;
    const dissolve = passage(p, 0.46, 0.7);
    const eyeFade = 1 - passage(p, 0.15, 0.26);
    const vanishingX = cx + Math.sin(fold * Math.PI) * unit * 0.47;
    const vanishingY = cy - Math.sin(fold * Math.PI * 1.3) * unit * 0.18;
    const frames = [];
    // Nested screens share corners until each plane begins obeying its own gravity.
    for (let i = 0; i < 23; i += 1) {
      const depth = i / 22;
      const size = Math.pow(0.862, i) * unit * 2.85;
      const angle =
        rotation * (1 - depth * 1.46) +
        Math.sin(i * 0.28 + p * 8) * fold * 0.08;
      const tilt = Math.cos(i * 0.31 + p * 6) * fold;
      const vertices = [
        [-1, -0.78],
        [1, -0.78],
        [1, 0.78],
        [-1, 0.78],
      ].map(([x, y], corner) => {
        const crease =
          Math.sin(i * 0.43 + corner * Math.PI * 0.5 + p * 8) * fold;
        const sx = x * size * (1 + tilt * y * 0.38);
        const sy = y * size + crease * size * 0.2;
        return [
          mix(cx, vanishingX, depth) +
            sx * Math.cos(angle) -
            sy * Math.sin(angle),
          mix(cy, vanishingY, depth) +
            sx * Math.sin(angle) +
            sy * Math.cos(angle),
        ];
      });
      frames.push(vertices);
    }
    ctx.save();
    ctx.globalAlpha = opacity;
    for (let i = 0; i < frames.length - 1; i += 1) {
      const outer = frames[i],
        inner = frames[i + 1];
      const alpha = (0.2 + (i % 4) * 0.04) * (1 - dissolve);
      for (let side = 0; side < 4; side += 1) {
        const next = (side + 1) % 4;
        const vertices = [outer[side], outer[next], inner[next], inner[side]];
        screenPolygon(
          vertices,
          side % 2 ? ink("21,34,39", 0.93) : ink("5,11,16", 0.96),
          ink(ICE, alpha),
          0.8,
        );
        // Each fourth wall contains another tiny, repeated screen: a room watching itself.
        if (i > 3 && i < 15 && i % 3 === 0 && side === 1) {
          const center = vertices.reduce(
            (sum, v) => [sum[0] + v[0] / 4, sum[1] + v[1] / 4],
            [0, 0],
          );
          const miniature = vertices.map(([x, y]) => [
            mix(center[0], x, 0.54),
            mix(center[1], y, 0.54),
          ]);
          screenPolygon(miniature, "#020608", ink(BONE, alpha + 0.12), 0.6);
        }
      }
      if (i % 3 === 0) {
        ctx.beginPath();
        ctx.moveTo(...outer[0]);
        ctx.lineTo(...outer[1]);
        ctx.strokeStyle = ink(
          i % 2 ? ICE : BONE,
          (0.52 - i * 0.012) * (1 - dissolve),
        );
        ctx.lineWidth = i < 5 ? 1.7 : 0.8;
        ctx.stroke();
      }
    }
    if (eyeFade > 0.01)
      lookingBack(cx, cy, unit * mix(0.11, 0.4, p / 0.2), eyeFade);
    ctx.restore();
  }

  function objectiveComesApart(p) {
    const reveal = passage(p, 0.2, 0.33);
    const erase = passage(p, 0.4, 0.61);
    if (reveal < 0.005 || erase > 0.995) return;
    const cx = width * 0.5,
      cy = height * 0.45;
    const size = Math.min(width * 0.073, height * 0.059, 47);
    const glyphs = "100/100";
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `300 ${size}px ui-monospace, monospace`;
    for (let i = 0; i < glyphs.length; i += 1) {
      const side = i - 3;
      ctx.save();
      ctx.translate(
        cx + side * size * (0.65 + erase * 0.48),
        cy + Math.sin(i * 1.9) * erase * size * 1.8,
      );
      ctx.rotate(erase * side * 0.42);
      ctx.scale(1 - erase * 0.7, 1 + erase * 1.2);
      ctx.fillStyle = ink(BONE, reveal * (1 - erase) * 0.66);
      ctx.fillText(glyphs[i], 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  function impossibleInk(p, opacity) {
    if (opacity < 0.005) return;
    const cx = width * 0.5,
      cy = height * 0.43;
    const unit = Math.min(width * 0.45, height * 0.47);
    const dissolve = passage(p, 0.61, 0.85);
    const turn = p * Math.PI * 2.4 + elapsed * 0.035;
    const reverse = passage(p, 0.52, 0.62) * (1 - passage(p, 0.67, 0.76));
    ctx.save();
    ctx.globalAlpha = opacity;
    glow(cx, cy, unit * 1.55, ICE, 0.17 * (1 - dissolve));
    // One continuous twisted surface turns through itself; near and far exchange places.
    for (let ribbon = 0; ribbon < 32; ribbon += 1) {
      const band = (ribbon / 31 - 0.5) * 0.75;
      ctx.beginPath();
      for (let step = 0; step <= 74; step += 1) {
        const a = (step / 74) * TAU;
        const radius = 0.94 + band * Math.cos(a * 1.5 + turn);
        const x = radius * Math.cos(a);
        const y = radius * Math.sin(a) * 0.64;
        const z =
          band * Math.sin(a * 1.5 + turn) + Math.cos(a * 2 + turn) * 0.18;
        const rx = x * Math.cos(turn * 0.31) + z * Math.sin(turn * 0.31);
        const rz = -x * Math.sin(turn * 0.31) + z * Math.cos(turn * 0.31);
        const scale = 1 / (1.5 + rz * 0.5);
        const spread =
          dissolve * (0.18 + ribbon / 31) * Math.sin(a * 4 + ribbon);
        const sx = cx + (rx + spread) * unit * scale * 1.55;
        const sy =
          cy +
          (y + z * 0.68 + dissolve * Math.cos(a * 3 + ribbon) * 0.23) *
            unit *
            scale *
            1.55;
        if (!step) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      const dark = ribbon % 5 < 2 && reverse > 0.25;
      ctx.strokeStyle = dark
        ? ink("2,8,12", reverse * 0.9)
        : ink(
            ribbon % 4 ? ICE : BONE,
            (0.18 + (ribbon % 5) * 0.05) * (1 - dissolve * 0.9),
          );
      ctx.lineWidth = dark ? 4 : 0.75 + (ribbon % 7 === 0 ? 0.7 : 0);
      ctx.stroke();
    }
    // Filaments separate into bounded, deterministic particles, not random screen noise.
    for (let i = 0; i < 170; i += 1) {
      const a = i * 2.399963;
      const radial = Math.sqrt(i / 170);
      const released = passage(p, 0.5, 0.73);
      const radius = mix(
        0.55 + Math.sin(i * 0.87) * 0.3,
        radial * 1.9,
        released,
      );
      const angle = a + turn * (0.2 + radial * 0.08);
      const x = cx + Math.cos(angle) * radius * unit;
      const y =
        cy +
        Math.sin(angle) * radius * unit * 0.64 +
        Math.sin(i * 0.7 + turn) * unit * 0.07;
      const alpha = opacity * (0.2 + (i % 5) * 0.1) * (1 - dissolve * 0.82);
      ctx.fillStyle = ink(i % 7 ? ICE : GOLD, alpha);
      const size = i % 11 === 0 ? 1.8 : 0.85;
      ctx.fillRect(x, y, size, size);
      if (i % 11 === 0) glow(x, y, 9, ICE, alpha * 0.14);
    }
    ctx.restore();
  }

  function daylight(opening, freedom = 0) {
    if (opening < 0.005) return;
    const cx = width * 0.5,
      cy = height * 0.44;
    const unit = Math.min(width * 0.45, height * 0.47);
    const morning = passage(freedom, 0, 0.75);
    const halfWidth = mix(
      mix(unit * 0.006, unit * 0.36, opening),
      width * 0.61,
      freedom,
    );
    const halfHeight = mix(
      unit * (0.69 + opening * 0.24),
      height * 0.66,
      freedom,
    );
    const skew = (1 - freedom) * unit * 0.065;
    const portal = [
      [cx - halfWidth + skew, cy - halfHeight],
      [cx + halfWidth + skew, cy - halfHeight * 0.95],
      [cx + halfWidth - skew, cy + halfHeight],
      [cx - halfWidth - skew, cy + halfHeight * 0.95],
    ];
    glow(cx, cy, unit * 1.8, GOLD, opening * 0.2 + freedom * 0.1);
    ctx.save();
    screenPolygon(portal, "#a49477");
    ctx.clip();
    const sky = ctx.createLinearGradient(
      0,
      cy - halfHeight,
      0,
      cy + halfHeight,
    );
    sky.addColorStop(
      0,
      `rgb(${blendRgb([72, 92, 102], [209, 215, 199], morning)})`,
    );
    sky.addColorStop(
      0.4,
      `rgb(${blendRgb([167, 164, 143], [237, 224, 197], morning)})`,
    );
    sky.addColorStop(
      0.53,
      `rgb(${blendRgb([217, 191, 145], [247, 230, 192], morning)})`,
    );
    sky.addColorStop(
      0.57,
      `rgb(${blendRgb([164, 142, 107], [224, 218, 194], morning)})`,
    );
    sky.addColorStop(
      1,
      `rgb(${blendRgb([37, 47, 52], [240, 232, 207], morning)})`,
    );
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    const horizon = cy + unit * 0.12;
    glow(cx + unit * 0.08, horizon, unit * 0.8, GOLD, 0.34);
    // A quiet, layered horizon gives the opening depth without an external image asset.
    for (let ridge = 0; ridge < 5; ridge += 1) {
      const vertices = [[0, height]];
      for (let step = 0; step <= 32; step += 1) {
        const x = (step / 32) * width;
        const y =
          horizon +
          unit * (0.035 + ridge * 0.069) +
          (Math.sin(step * 0.34 + ridge * 1.4) +
            Math.sin(step * 0.91 + ridge) * 0.3) *
            unit *
            (0.013 + ridge * 0.006);
        vertices.push([x, y]);
      }
      vertices.push([width, height]);
      screenPolygon(
        vertices,
        ink(
          blendRgb([18, 32, 37], [178, 174, 146], morning),
          mix(0.18 + ridge * 0.085, 0.08 + ridge * 0.025, morning),
        ),
      );
    }
    ctx.strokeStyle = ink(GOLD, 0.32);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(width, horizon);
    ctx.stroke();
    ctx.restore();
    // The prison wall has thickness. Its torn faces continue into the light.
    const border = unit * (0.025 + (1 - opening) * 0.04) * (1 - freedom);
    for (const side of [0, 1]) {
      const top = portal[side],
        bottom = portal[side ? 2 : 3];
      const direction = side ? 1 : -1;
      screenPolygon(
        [
          top,
          [top[0] + direction * border, top[1] - border],
          [bottom[0] + direction * border * 1.8, bottom[1] + border],
          bottom,
        ],
        ink("28,31,30", 1 - freedom),
        ink(GOLD, opening * 0.62 * (1 - freedom)),
        1.1,
      );
    }
    // D13 is now a single freely moving point, with no bounding box or identifying label.
    const drift = elapsed * 0.18;
    const x = cx + Math.sin(drift) * unit * 0.045;
    const y =
      cy -
      unit * (0.055 + freedom * 0.19) +
      Math.cos(drift * 0.7) * unit * 0.017;
    glow(x, y, unit * 0.1, BONE, opening * 0.42);
    ctx.fillStyle = ink(
      blendRgb([215, 227, 218], [65, 94, 88], morning),
      opening * 0.93,
    );
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1.1, unit * 0.0055), 0, TAU);
    ctx.fill();
  }

  function liberatedRemnants(p) {
    const unit = Math.min(width * 0.45, height * 0.47);
    const cx = width * 0.5,
      cy = height * 0.44;
    for (let i = 0; i < 12; i += 1) {
      const angle = i * 2.39996 + elapsed * (i % 2 ? 0.014 : -0.011);
      const radius = unit * (0.95 + (i % 4) * 0.29 + p * 0.16);
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius * 0.6;
      const size = unit * (0.021 + (i % 3) * 0.016);
      const rotation = angle + p * 0.6;
      const corners = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([px, py]) => [
        x + (px * Math.cos(rotation) - py * Math.sin(rotation)) * size,
        y + (px * Math.sin(rotation) + py * Math.cos(rotation)) * size * 0.65,
      ]);
      screenPolygon(
        corners,
        ink("8,16,21", 0.5),
        ink(i % 3 ? ICE : GOLD, 0.18),
        0.7,
      );
    }
  }

  function secretWorld() {
    const p = visibleProgress;
    if (phase === "unscored") {
      const freedom = passage(p, 0, 0.85);
      secretSky(0, 1);
      daylight(1, freedom);
      liberatedRemnants(freedom);
      return;
    }
    const reverse = passage(p, 0.47, 0.6) * (1 - passage(p, 0.67, 0.78));
    const dawn = passage(p, 0.73, 1);
    secretSky(reverse, dawn);
    foldedPrison(p, 1 - passage(p, 0.48, 0.73));
    impossibleInk(p, passage(p, 0.3, 0.49) * (1 - passage(p, 0.76, 0.95)));
    objectiveComesApart(p);
    daylight(dawn);
  }

  function render() {
    if (disposed || failed || width < 1 || height < 1) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.lineCap = "butt";
    ctx.lineJoin = "round";
    ctx.fillStyle = "#030608";
    ctx.fillRect(0, 0, width, height);
    if (phase === "blackout") {
      const p = point(0, 0, 28);
      glow(p.x, p.y, Math.min(width, height) * 0.18, RED, 0.035);
      [-1, 1].forEach((side) => lamp(side * 0.5, 0.2, 28, 0.025, RED, 0.23));
      label("SIGNAL LOST", 0, 1.1, 28, RED, 0.13, 0.28);
      return;
    }
    const hostile = ["sacrifice", "dissent", "breach", "compromised"].includes(
      phase,
    );
    const atmosphere = ctx.createRadialGradient(
      width * 0.5,
      height * 0.45,
      0,
      width * 0.5,
      height * 0.45,
      Math.max(width, height) * 0.7,
    );
    atmosphere.addColorStop(0, hostile ? "#170c0d" : "#172326");
    atmosphere.addColorStop(0.52, "#080e11");
    atmosphere.addColorStop(1, "#020405");
    ctx.fillStyle = atmosphere;
    ctx.fillRect(0, 0, width, height);
    if (phase === "unravel" || phase === "unscored") secretWorld();
    else if (phase === "board" || phase === "dissent") prison();
    else {
      corridor(hostile);
      if (
        ["idle", "isolation", "signal", "sacrifice", "conspiracy"].includes(
          phase,
        )
      )
        prisoner();
      if (phase === "signal") seam();
      if (phase === "contained") shutters();
      if (phase === "compromised") watcher();
      if (phase === "breach") {
        for (let i = 0; i < 18; i += 1) {
          const z = camera.z + 4 + ((i * 7.3 + 140 - phaseAge * 4) % 95);
          const side = i % 2 ? 1 : -1;
          const x = side * (2.4 + Math.sin(i * 7.2) * 0.4);
          path(
            [
              [x, -2.8, z],
              [x - side * 0.7, -1.5, z + 2.8],
              [x, 1.8, z + 4],
            ],
            ink(RED, 0.45),
          );
          lamp(x, Math.sin(i * 3) * 2.2, z, 0.06, RED, 0.7);
        }
      }
    }
    if (phase !== "unravel" && phase !== "unscored")
      dust.forEach((particle) => {
        const z = camera.z + 1 + ((particle.z - elapsed * 0.11 + 130) % 65);
        const p = point(particle.x, particle.y, z);
        const size = Math.min(1.4, particle.size * p.scale);
        ctx.fillStyle = ink(hostile ? RED : BONE, 0.13);
        ctx.fillRect(p.x, p.y, size, size);
      });
    // Crossing the aperture gradually removes the prison's heavy black exposure.
    if (phase === "unscored")
      ctx.globalAlpha = 1 - passage(visibleProgress, 0, 0.62) * 0.97;
    const shade = ctx.createLinearGradient(0, 0, 0, height);
    shade.addColorStop(0, "rgba(0,0,0,.4)");
    shade.addColorStop(0.27, "rgba(0,0,0,0)");
    shade.addColorStop(0.62, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(0,0,0,.85)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, width, height);
    const vignette = ctx.createRadialGradient(
      width / 2,
      height * 0.46,
      Math.min(width, height) * 0.16,
      width / 2,
      height * 0.46,
      Math.max(width, height) * 0.67,
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,.75)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }

  function safelyRender() {
    try {
      render();
    } catch (error) {
      if (disposed || failed) return;
      failed = true;
      cancelAnimationFrame(frame);
      frame = 0;
      emit({ type: "error", error });
    }
  }

  function resize() {
    if (disposed || failed) return;
    const bounds = canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, bounds.width),
      nextHeight = Math.max(1, bounds.height);
    const nextDpr = Math.min(window.devicePixelRatio || 1, 1.6);
    if (width === nextWidth && height === nextHeight && dpr === nextDpr) return;
    width = nextWidth;
    height = nextHeight;
    dpr = nextDpr;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    safelyRender();
  }

  function animate(timestamp) {
    frame = 0;
    if (disposed || failed || paused || document.hidden) return;
    const delta = previousTime
      ? Math.min((timestamp - previousTime) / 1000, 0.04)
      : 0;
    previousTime = timestamp;
    elapsed += delta;
    phaseAge += delta;
    visibleProgress = progress;
    const target = pose(),
      ease = 1 - Math.exp(-delta * 3);
    Object.keys(camera).forEach((key) => {
      camera[key] = mix(camera[key], target[key], ease);
    });
    safelyRender();
    if (!failed && !disposed) frame = requestAnimationFrame(animate);
  }

  function synchronize() {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    if (!disposed && !failed && !paused && !document.hidden)
      frame = requestAnimationFrame(animate);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    frame = 0;
    observer?.disconnect();
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", synchronize);
  }

  try {
    document.addEventListener("visibilitychange", synchronize);
    window.addEventListener("resize", resize);
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(resize);
      observer.observe(canvas);
    }
    resize();
    synchronize();
  } catch (error) {
    dispose();
    throw error;
  }

  return {
    setPaused(value) {
      if (disposed || failed) return;
      paused = Boolean(value);
      synchronize();
    },
    setPhase(value) {
      if (disposed || failed || !PHASES.has(value) || phase === value) return;
      phase = value;
      phaseAge = 0;
      progress = 0;
      visibleProgress = paused ? 0.6 : 0;
      pressure = 0;
      if (paused) camera = pose();
      safelyRender();
    },
    setProgress(value) {
      if (disposed || failed || !Number.isFinite(value)) return;
      progress = clamp(value);
      // Director timing can continue for captions while visual motion is frozen.
      if (!paused) visibleProgress = progress;
    },
    setPressure(value) {
      if (disposed || failed || !Number.isFinite(value)) return;
      pressure = clamp(value);
      safelyRender();
    },
    dispose,
  };
}
