export default class NeonVoidStage {
  constructor(scene) {
    this.scene = scene;
    this.WW = 2560;
    this.H = 720;
    this.movingPlatforms = [];
    this._floorLineGraphics = null;
    this._hazardTimer = null;
  }

  create() {
    const scene = this.scene;
    const WW = this.WW;
    const H = this.H;

    // ── Background ──────────────────────────────────────────────────────────
    const bg = scene.add.graphics();
    bg.setDepth(0);

    // Dark purple gradient (simulate with layered rects)
    bg.fillStyle(0x0a0015, 1);
    bg.fillRect(0, 0, WW, H);

    // Gradient bands from top to bottom
    const gradientSteps = 12;
    for (let i = 0; i < gradientSteps; i++) {
      const t = i / gradientSteps;
      const alpha = 0.08 + t * 0.12;
      const color = t < 0.5 ? 0x1a0033 : 0x06001a;
      bg.fillStyle(color, alpha);
      bg.fillRect(0, (H / gradientSteps) * i, WW, H / gradientSteps + 1);
    }

    // ── Grid lines ───────────────────────────────────────────────────────────
    const grid = scene.add.graphics();
    grid.setDepth(0);
    grid.lineStyle(1, 0x2d0066, 0.25);

    // Vertical grid lines every 80px
    for (let x = 0; x <= WW; x += 80) {
      grid.beginPath();
      grid.moveTo(x, 0);
      grid.lineTo(x, H);
      grid.strokePath();
    }

    // Horizontal grid lines every 60px
    for (let y = 0; y <= H; y += 60) {
      grid.beginPath();
      grid.moveTo(0, y);
      grid.lineTo(WW, y);
      grid.strokePath();
    }

    // ── Neon accent bands ────────────────────────────────────────────────────
    const bands = scene.add.graphics();
    bands.setDepth(0);

    // Band at y=180
    bands.fillStyle(0x7b2fbe, 0.12);
    bands.fillRect(0, 174, WW, 12);
    bands.lineStyle(1, 0xb44fff, 0.5);
    bands.beginPath();
    bands.moveTo(0, 180);
    bands.lineTo(WW, 180);
    bands.strokePath();

    // Band at y=360
    bands.fillStyle(0x7b2fbe, 0.12);
    bands.fillRect(0, 354, WW, 12);
    bands.lineStyle(1, 0xb44fff, 0.5);
    bands.beginPath();
    bands.moveTo(0, 360);
    bands.lineTo(WW, 360);
    bands.strokePath();

    // ── Watermark text ───────────────────────────────────────────────────────
    for (let wx = 0; wx < WW; wx += 1280) {
      const wm = scene.add.text(wx + 640, 270, 'CHAOS CONSTRUCT', {
        fontFamily: 'Arial',
        fontSize: '48px',
        color: '#3d0066',
        alpha: 0.18,
      });
      wm.setOrigin(0.5, 0.5);
      wm.setAlpha(0.18);
      wm.setAngle(-20);
      wm.setDepth(0);
    }

    // ── Edge columns ─────────────────────────────────────────────────────────
    const cols = scene.add.graphics();
    cols.setDepth(0);

    const gemYPositions = [160, 320, 480];
    const columnXPositions = [80, 2480];

    columnXPositions.forEach((cx) => {
      // Column body
      cols.fillStyle(0x0d0026, 1);
      cols.fillRect(cx - 18, 0, 36, H);
      cols.lineStyle(2, 0x9b59b6, 0.8);
      cols.strokeRect(cx - 18, 0, 36, H);

      // Neon gems
      gemYPositions.forEach((gy) => {
        cols.fillStyle(0xb44fff, 1);
        cols.fillCircle(cx, gy, 6);
        cols.fillStyle(0xffffff, 0.6);
        cols.fillCircle(cx - 2, gy - 2, 2);
        // Glow ring
        cols.lineStyle(2, 0x9b59b6, 0.5);
        cols.strokeCircle(cx, gy, 10);
      });
    });

    // ── Mid-field columns ────────────────────────────────────────────────────
    const midCols = scene.add.graphics();
    midCols.setDepth(0);

    const midXPositions = [WW / 4, WW / 2, (WW * 3) / 4];
    midXPositions.forEach((mx) => {
      midCols.fillStyle(0x0d0026, 0.7);
      midCols.fillRect(mx - 8, 0, 16, H);
      midCols.lineStyle(1, 0x6c3483, 0.4);
      midCols.strokeRect(mx - 8, 0, 16, H);
    });

    // ── Crowd silhouettes ────────────────────────────────────────────────────
    const crowd = scene.add.graphics();
    crowd.setDepth(0);
    crowd.fillStyle(0x0a0015, 1);

    const drawCrowdSide = (startX) => {
      for (let i = 0; i < 8; i++) {
        const bx = startX + i * 9;
        const bh = 30 + Math.sin(i * 1.3) * 15;
        // body
        crowd.fillStyle(0x12002a, 1);
        crowd.fillRect(bx, 490 - bh, 8, bh);
        // head
        crowd.fillCircle(bx + 4, 490 - bh - 5, 5);
      }
    };

    drawCrowdSide(0);
    drawCrowdSide(WW - 72);

    // ── Stage base (below y=556) ──────────────────────────────────────────────
    const base = scene.add.graphics();
    base.setDepth(0);

    // Stage base fill
    base.fillStyle(0x06001a, 1);
    base.fillRect(0, 556, WW, H - 556);

    // Base top edge
    base.lineStyle(3, 0x4a235a, 1);
    base.beginPath();
    base.moveTo(0, 556);
    base.lineTo(WW, 556);
    base.strokePath();

    // Base interior lines
    base.lineStyle(1, 0x2d0066, 0.4);
    for (let bx = 0; bx < WW; bx += 160) {
      base.beginPath();
      base.moveTo(bx, 556);
      base.lineTo(bx, H);
      base.strokePath();
    }

    // ── Floor glow zone ──────────────────────────────────────────────────────
    const floorGlow = scene.add.graphics();
    floorGlow.setDepth(0);

    for (let gi = 0; gi < 6; gi++) {
      const ga = 0.12 - gi * 0.018;
      floorGlow.fillStyle(0x9b59b6, ga);
      floorGlow.fillRect(80, 555 - gi * 5, WW - 160, gi * 5 + 5);
    }

    // ── Primary neon floor line (stored for update animation) ────────────────
    this._floorLineGraphics = scene.add.graphics();
    this._floorLineGraphics.setDepth(0);
    this._drawFloorLine(1.0);

    // ── Stars ────────────────────────────────────────────────────────────────
    for (let s = 0; s < 200; s++) {
      const sx = Math.random() * WW;
      const sy = Math.random() * 500;
      const sr = 1 + Math.random();
      const star = scene.add.graphics();
      star.setDepth(0);
      star.fillStyle(0xffffff, 1);
      star.fillCircle(sx, sy, sr);

      const maxAlpha = 0.6 + Math.random() * 0.3;
      const dur = 1500 + Math.random() * 1500;

      scene.tweens.add({
        targets: star,
        alpha: { from: 0.1, to: maxAlpha },
        duration: dur,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }

    // ── Floating neon platforms ───────────────────────────────────────────────
    const platformDefs = [
      { cx: 560, cy: 430, w: 220 },
      { cx: 1280, cy: 390, w: 200 },
      { cx: 2000, cy: 430, w: 220 },
    ];

    platformDefs.forEach(({ cx, cy, w }) => {
      // Platform rectangle (static physics body)
      const plat = scene.add.rectangle(cx, cy, w, 20, 0x06001a);
      plat.setDepth(0);
      scene.physics.add.existing(plat, true);
      scene.platforms.add(plat);

      // Neon top edge decoration
      const platDeco = scene.add.graphics();
      platDeco.setDepth(0);
      platDeco.lineStyle(2.5, 0x9b59b6, 1);
      platDeco.beginPath();
      platDeco.moveTo(cx - w / 2, cy - 10);
      platDeco.lineTo(cx + w / 2, cy - 10);
      platDeco.strokePath();

      // Side border lines
      platDeco.lineStyle(1, 0x6c3483, 0.6);
      platDeco.strokeRect(cx - w / 2, cy - 10, w, 20);

      // Glow gems at each end
      const gemPositions = [
        { gx: cx - w / 2, gy: cy - 10 },
        { gx: cx + w / 2, gy: cy - 10 },
      ];

      gemPositions.forEach(({ gx, gy }) => {
        platDeco.fillStyle(0xb44fff, 1);
        platDeco.fillCircle(gx, gy, 4);
        platDeco.fillStyle(0xffffff, 0.7);
        platDeco.fillCircle(gx - 1, gy - 1, 1.5);
        platDeco.lineStyle(1.5, 0x9b59b6, 0.4);
        platDeco.strokeCircle(gx, gy, 7);
      });

      // Ambient glow below platform
      platDeco.fillStyle(0x9b59b6, 0.07);
      platDeco.fillRect(cx - w / 2 + 4, cy, w - 8, 12);
    });
  }

  _drawFloorLine(alpha) {
    const g = this._floorLineGraphics;
    if (!g) return;
    g.clear();
    g.lineStyle(3, 0x9b59b6, alpha);
    g.beginPath();
    g.moveTo(80, 555);
    g.lineTo(this.WW - 80, 555);
    g.strokePath();

    // Secondary glow line
    g.lineStyle(6, 0x7b2fbe, alpha * 0.35);
    g.beginPath();
    g.moveTo(80, 555);
    g.lineTo(this.WW - 80, 555);
    g.strokePath();
  }

  update(time, delta) {
    // Pulse the floor line
    if (this._floorLineGraphics) {
      const alpha = Math.sin(time * 0.002) * 0.3 + 0.7;
      this._drawFloorLine(alpha);
    }
  }

  destroy() {
    if (this._hazardTimer) {
      this._hazardTimer.remove();
      this._hazardTimer = null;
    }
  }
}
