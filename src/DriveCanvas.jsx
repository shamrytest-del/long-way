import { useEffect, useRef, useState } from "react";

const MESSAGES = [
  "Take the long way.",
  "There is time.",
  "Let the horizon hold it.",
  "Nothing is asking you to hurry.",
  "Keep a little wonder.",
  "The quiet finds you here.",
];

const PALETTES = {
  dawn: {
    ground: "#9c9b59",
    fields: ["#a9a45c", "#c3a765", "#8d9251", "#c5b36f", "#7f8c52"],
    road: "#d9ba73",
    shoulder: "#f1d78f",
    trees: ["#415c35", "#596c3a", "#6d743b"],
    water: "#718b7f",
    shade: "rgba(73, 67, 41, .28)",
    overlay: "rgba(203, 135, 96, .11)",
  },
  day: {
    ground: "#90964f",
    fields: ["#a4a252", "#c5aa57", "#848e4a", "#b8a75d", "#788746"],
    road: "#d7b569",
    shoulder: "#f0d587",
    trees: ["#3e5b32", "#566c35", "#6a753a"],
    water: "#63837a",
    shade: "rgba(60, 65, 38, .24)",
    overlay: "rgba(244, 198, 91, .06)",
  },
  golden: {
    ground: "#929344",
    fields: ["#aca04b", "#c5a14e", "#7f8943", "#baa155", "#717f3c"],
    road: "#d8b266",
    shoulder: "#f3d37a",
    trees: ["#40572f", "#5a6632", "#6d6e32"],
    water: "#657b6e",
    shade: "rgba(58, 55, 29, .34)",
    overlay: "rgba(220, 151, 50, .12)",
  },
  night: {
    ground: "#334c46",
    fields: ["#3a5548", "#4e5d47", "#2c4942", "#435a48", "#294039"],
    road: "#78775e",
    shoulder: "#a3a177",
    trees: ["#17352f", "#244139", "#304a3d"],
    water: "#294e53",
    shade: "rgba(10, 24, 24, .38)",
    overlay: "rgba(17, 31, 54, .28)",
  },
};

function hash(seed, x, y = 0) {
  let value = Math.imul(x + 374761393, 668265263) ^ Math.imul(y + seed, 1274126177);
  value = (value ^ (value >>> 13)) * 1274126177;
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

export function roadCenter(worldY, width, seed) {
  const span = 430;
  const index = Math.floor(worldY / span);
  const t = smoothstep((worldY - index * span) / span);
  const a = hash(seed, index, 41) * 2 - 1;
  const b = hash(seed, index + 1, 41) * 2 - 1;
  const broad = Math.sin((worldY + seed * 13) * 0.00042) * width * 0.055;
  return width * 0.52 + (a + (b - a) * t) * width * 0.22 + broad;
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

function drawField(ctx, x, y, size, row, col, palette, seed) {
  const tone = palette.fields[Math.floor(hash(seed, row, col) * palette.fields.length)];
  const inset = 2;
  const jitter = (hash(seed + 2, row, col) - 0.5) * 28;
  ctx.fillStyle = tone;
  ctx.beginPath();
  ctx.moveTo(x + inset, y + inset + jitter * 0.15);
  ctx.lineTo(x + size - inset, y + inset - jitter * 0.18);
  ctx.lineTo(x + size - inset - jitter * 0.25, y + size - inset);
  ctx.lineTo(x + inset + jitter * 0.22, y + size - inset);
  ctx.closePath();
  ctx.fill();

  const style = Math.floor(hash(seed + 7, row, col) * 4);
  if (style === 1 || style === 2) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = style === 1 ? "#4d5e2d" : "#f2d87d";
    ctx.lineWidth = 2;
    const gap = 17 + Math.floor(hash(seed + 9, col, row) * 12);
    for (let offset = -size; offset < size * 2; offset += gap) {
      ctx.beginPath();
      ctx.moveTo(x + offset, y + size);
      ctx.lineTo(x + offset + size, y);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawTree(ctx, x, y, scale, palette, seedValue, shadowLength) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = palette.shade;
  ctx.beginPath();
  ctx.ellipse(shadowLength * 0.5, shadowLength * 0.46, 10 * scale, 25 * scale, -0.72, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.trees[Math.floor(seedValue * palette.trees.length)];
  ctx.beginPath();
  ctx.arc(0, 0, 10.5 * scale, 0, Math.PI * 2);
  ctx.arc(-4 * scale, 3 * scale, 7.5 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = "#f4dc83";
  ctx.beginPath();
  ctx.arc(-3 * scale, -3 * scale, 4.2 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHouse(ctx, x, y, scale, variant, palette, shadowLength, phase) {
  const width = 34 * scale;
  const height = 25 * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = palette.shade;
  ctx.beginPath();
  ctx.moveTo(5, 7);
  ctx.lineTo(width + shadowLength, 7 + shadowLength * 0.78);
  ctx.lineTo(width + shadowLength, height + shadowLength * 0.78);
  ctx.lineTo(shadowLength * 0.55, height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = variant > 0.5 ? "#e7ddbd" : "#d7d1ae";
  roundedRect(ctx, 0, 4, width, height, 1.5);
  ctx.fillStyle = variant > 0.66 ? "#a8543b" : variant > 0.33 ? "#36536a" : "#bd6a48";
  ctx.beginPath();
  ctx.moveTo(-3, 6);
  ctx.lineTo(width * 0.52, -6);
  ctx.lineTo(width + 4, 6);
  ctx.lineTo(width - 2, 12);
  ctx.lineTo(2, 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = phase === "night" ? "#f1c96a" : "#6b755c";
  ctx.fillRect(width * 0.21, height * 0.58, 5 * scale, 5 * scale);
  ctx.fillRect(width * 0.67, height * 0.58, 5 * scale, 5 * scale);
  ctx.restore();
}

function drawPond(ctx, x, y, width, height, palette) {
  ctx.save();
  ctx.fillStyle = palette.shade;
  ctx.beginPath();
  ctx.ellipse(x + 5, y + 7, width * 0.52, height * 0.52, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.water;
  ctx.beginPath();
  ctx.ellipse(x, y, width * 0.5, height * 0.5, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLandscape(ctx, width, height, offset, palette, seed, phase) {
  const cellSize = Math.max(180, Math.min(250, width / 6));
  const firstRow = Math.floor(offset / cellSize) - 1;
  const lastRow = Math.ceil((offset + height) / cellSize) + 1;
  const columns = Math.ceil(width / cellSize) + 1;

  ctx.fillStyle = palette.ground;
  ctx.fillRect(0, 0, width, height);

  for (let row = firstRow; row <= lastRow; row += 1) {
    const y = row * cellSize - offset;
    for (let col = -1; col <= columns; col += 1) {
      const x = col * cellSize;
      drawField(ctx, x, y, cellSize, row, col, palette, seed);

      const chance = hash(seed + 11, row, col);
      if (chance > 0.84) {
        const pondX = x + cellSize * (0.22 + hash(seed, col, row + 1) * 0.56);
        const pondY = y + cellSize * (0.24 + hash(seed, row + 2, col) * 0.5);
        drawPond(ctx, pondX, pondY, 48 + chance * 28, 32 + chance * 20, palette);
      }
    }
  }

  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let col = -1; col <= columns; col += 1) {
      const cellY = row * cellSize - offset;
      const amount = Math.floor(hash(seed + 19, row, col) * 7);
      for (let item = 0; item < amount; item += 1) {
        const worldY = row * cellSize + hash(seed + item * 7, row, col) * cellSize;
        const screenY = worldY - offset;
        const x = col * cellSize + hash(seed + item * 13, col, row) * cellSize;
        if (Math.abs(x - roadCenter(worldY, width, seed)) < 92) continue;
        const scale = 0.72 + hash(seed + 5, item + row, col) * 1.15;
        drawTree(ctx, x, screenY, scale, palette, hash(seed + 3, item, row + col), phase === "golden" ? 34 : 22);
      }

      const building = hash(seed + 27, row, col);
      if (building > 0.875) {
        const worldY = row * cellSize + cellSize * (0.3 + hash(seed, col + 4, row) * 0.38);
        const x = col * cellSize + cellSize * (0.22 + hash(seed, row + 8, col) * 0.5);
        if (Math.abs(x - roadCenter(worldY, width, seed)) > 108) {
          drawHouse(ctx, x, worldY - offset, 0.8 + building * 0.35, building, palette, phase === "golden" ? 39 : 24, phase);
        }
      }

      if (cellY > height + cellSize) break;
    }
  }
}

function roadPath(ctx, width, height, offset, seed) {
  ctx.beginPath();
  for (let y = -80; y <= height + 80; y += 18) {
    const x = roadCenter(offset + y, width, seed);
    if (y === -80) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
}

function drawRoad(ctx, width, height, offset, palette, seed, phase) {
  roadPath(ctx, width, height, offset, seed);
  ctx.strokeStyle = palette.shade;
  ctx.lineWidth = Math.max(116, width * 0.092);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  roadPath(ctx, width, height, offset, seed);
  ctx.strokeStyle = palette.shoulder;
  ctx.lineWidth = Math.max(106, width * 0.084);
  ctx.stroke();

  roadPath(ctx, width, height, offset, seed);
  ctx.strokeStyle = palette.road;
  ctx.lineWidth = Math.max(94, width * 0.074);
  ctx.stroke();

  ctx.save();
  ctx.setLineDash([1, 30]);
  ctx.lineDashOffset = -offset * 0.22;
  roadPath(ctx, width, height, offset, seed);
  ctx.strokeStyle = phase === "night" ? "rgba(244, 229, 168, .34)" : "rgba(255, 241, 187, .46)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawCar(ctx, width, height, offset, seed, phase) {
  const carY = height * 0.72;
  const worldY = offset + carY;
  const x = roadCenter(worldY, width, seed);
  const before = roadCenter(worldY - 10, width, seed);
  const after = roadCenter(worldY + 10, width, seed);
  const angle = Math.atan2(after - before, 20) * -1;

  ctx.save();
  ctx.translate(x, carY);
  ctx.rotate(angle);
  ctx.fillStyle = "rgba(43, 50, 34, .34)";
  ctx.beginPath();
  ctx.ellipse(8, 12, 14, 24, -0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#cf4f3d";
  roundedRect(ctx, -11, -22, 22, 44, 6);
  ctx.fillStyle = "#ea6650";
  roundedRect(ctx, -8, -18, 16, 14, 4);
  ctx.fillStyle = "#344d52";
  roundedRect(ctx, -8, -9, 16, 17, 3);
  ctx.fillStyle = "#9fd0d3";
  ctx.globalAlpha = 0.55;
  ctx.fillRect(-6, -7, 12, 4);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#8c2f2d";
  roundedRect(ctx, -8, 10, 16, 8, 3);
  ctx.fillStyle = "#ffd681";
  ctx.fillRect(-8, -20, 4, 3);
  ctx.fillRect(4, -20, 4, 3);

  if (phase === "night") {
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#ffe5a3";
    ctx.beginPath();
    ctx.moveTo(-8, -21);
    ctx.lineTo(-22, -76);
    ctx.lineTo(-2, -76);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, -21);
    ctx.lineTo(2, -76);
    ctx.lineTo(22, -76);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawWeather(ctx, width, height, weather, time) {
  if (weather.code >= 51 && weather.code < 70) {
    ctx.save();
    ctx.strokeStyle = "rgba(221, 232, 216, .24)";
    ctx.lineWidth = 1.2;
    const count = Math.min(110, Math.floor(width / 12));
    for (let index = 0; index < count; index += 1) {
      const x = (hash(weather.seed + 83, index, 2) * width + time * 0.055) % (width + 80) - 40;
      const y = (hash(weather.seed + 91, index, 7) * height + time * 0.16) % (height + 70) - 35;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 7, y + 17);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (weather.code >= 71 && weather.code <= 86) {
    ctx.save();
    ctx.fillStyle = "rgba(247, 241, 217, .58)";
    for (let index = 0; index < 70; index += 1) {
      const x = (hash(weather.seed + 111, index, 4) * width + Math.sin(time * 0.0003 + index) * 35) % width;
      const y = (hash(weather.seed + 131, index, 8) * height + time * 0.025) % height;
      ctx.beginPath();
      ctx.arc(x, y, 1.2 + hash(weather.seed, index, 9) * 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (weather.code === 45 || weather.code === 48) {
    ctx.fillStyle = "rgba(225, 222, 192, .18)";
    ctx.fillRect(0, 0, width, height);
  }
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function DriveCanvas({ weather, phase, started }) {
  const canvasRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!started) return undefined;
    const timer = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % MESSAGES.length);
    }, 18_000);
    return () => window.clearInterval(timer);
  }, [started]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { alpha: false });
    let animationFrame;
    let width = 0;
    let height = 0;
    let offset = 642;
    let previous = performance.now();

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const render = (time) => {
      const delta = Math.min(40, time - previous);
      previous = time;
      const speed = reducedMotion ? 3 : started ? 48 : 14;
      offset += (delta / 1000) * speed;
      const palette = PALETTES[phase] || PALETTES.golden;

      context.save();
      context.translate(Math.sin(time * 0.00018) * (reducedMotion ? 0 : 3), 0);
      drawLandscape(context, width, height, offset, palette, weather.seed, phase);
      drawRoad(context, width, height, offset, palette, weather.seed, phase);
      drawCar(context, width, height, offset, weather.seed, phase);
      context.fillStyle = palette.overlay;
      context.fillRect(-8, 0, width + 16, height);
      if (!reducedMotion) drawWeather(context, width, height, weather, time);
      context.restore();
      animationFrame = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    animationFrame = requestAnimationFrame(render);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrame);
    };
  }, [phase, reducedMotion, started, weather]);

  return (
    <div className="world" aria-label="An illustrated car driving endlessly through a changing countryside">
      <canvas ref={canvasRef} aria-hidden="true" />
      <p className={`reflection ${started ? "is-visible" : ""}`} key={messageIndex}>
        {MESSAGES[messageIndex]}
      </p>
    </div>
  );
}
