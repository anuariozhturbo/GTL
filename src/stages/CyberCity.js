export default class CyberCityStage {
  constructor(scene) {
    this.scene = scene;
    this.WW = 2560;
    this.H = 720;
    this.movingPlatforms = [];
    this._lastSpawn = 0;
    this._hazardTimer = null;
    this._rainTimer = null;
    this._sparkLeft = null;
    this._sparkRight = null;
    this._hazardLeft = null;
    this._hazardRight = null;
  }

  create() {
    const scene = this.scene;
    const WW = this.WW;
    const H = this.H;

    // 1. Dark city sky gradient
    const skyGfx = scene.add.graphics();
    skyGfx.setDepth(0);
    skyGfx.fillGradientStyle(0x000a14, 0x000a14, 0x001a2e, 0x001a2e, 1);
    skyGfx.fillRect(0, 0, WW, H);

    // 2. City building silhouettes
    const buildingGfx = scene.add.graphics();
    buildingGfx.setDepth(0);
    buildingGfx.fillStyle(0x01080f, 1);

    const buildingData = [];
    const seed = [
      { x: 0,    w: 90,  h: 160 },
      { x: 80,   w: 70,  h: 120 },
      { x: 140,  w: 100, h: 190 },
      { x: 230,  w: 80,  h: 100 },
      { x: 300,  w: 130, h: 170 },
      { x: 420,  w: 60,  h: 80  },
      { x: 470,  w: 110, h: 200 },
      { x: 570,  w: 90,  h: 140 },
      { x: 650,  w: 75,  h: 110 },
      { x: 720,  w: 150, h: 180 },
      { x: 860,  w: 80,  h: 150 },
      { x: 930,  w: 120, h: 90  },
      { x: 1040, w: 65,  h: 170 },
      { x: 1100, w: 100, h: 130 },
      { x: 1190, w: 140, h: 195 },
      { x: 1320, w: 80,  h: 110 },
      { x: 1390, w: 90,  h: 160 },
      { x: 1470, w: 70,  h: 85  },
      { x: 1530, w: 130, h: 175 },
      { x: 1650, w: 60,  h: 140 },
      { x: 1700, w: 110, h: 100 },
      { x: 1800, w: 90,  h: 190 },
      { x: 1880, w: 75,  h: 130 },
      { x: 1950, w: 120, h: 160 },
      { x: 2060, w: 80,  h: 90  },
      { x: 2130, w: 100, h: 200 },
      { x: 2220, w: 70,  h: 120 },
      { x: 2280, w: 140, h: 170 },
      { x: 2410, w: 90,  h: 145 },
      { x: 2490, w: 80,  h: 110 },
    ];

    for (const b of seed) {
      const bY = 556 - b.h;
      buildingGfx.fillRect(b.x, bY, b.w, b.h);
      buildingData.push({ x: b.x, y: bY, w: b.w, h: b.h });
    }

    // 3. Building windows
    const windowGfx = scene.add.graphics();
    windowGfx.setDepth(0);
    const windowColors = [0xffff88, 0x88ffff, 0xff88ff];
    for (const b of buildingData) {
      const cols = Math.floor(b.w / 12);
      const rows = Math.floor(b.h / 14);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // pseudo-random: skip some windows
          const skip = ((b.x * 7 + row * 13 + col * 17) % 10);
          if (skip < 4) continue;
          const alpha = 0.3 + ((b.x + row + col) % 5) * 0.08;
          const color = windowColors[(b.x + row + col) % windowColors.length];
          windowGfx.fillStyle(color, Math.min(0.7, Math.max(0.3, alpha)));
          windowGfx.fillRect(b.x + col * 12 + 4, b.y + row * 14 + 4, 2, 3);
        }
      }
    }

    // 4. Neon signs
    const neonPalette = [0x00ffcc, 0xff00aa, 0x0088ff];
    const signs = [
      { text: 'NEON CITY',  x: 150,  y: 220, size: 18, color: 0x00ffcc },
      { text: 'CYBER CAFÉ', x: 520,  y: 250, size: 16, color: 0xff00aa },
      { text: 'HACK.NET',   x: 900,  y: 230, size: 15, color: 0x0088ff },
      { text: 'SYS.32',     x: 1350, y: 260, size: 14, color: 0x00ffcc },
      { text: 'UPLOAD',     x: 1800, y: 240, size: 17, color: 0xff00aa },
      { text: 'RUNTIME',    x: 2200, y: 225, size: 15, color: 0x0088ff },
    ];

    for (const sign of signs) {
      const t = scene.add.text(sign.x, sign.y, sign.text, {
        fontSize: sign.size + 'px',
        color: '#' + sign.color.toString(16).padStart(6, '0'),
        letterSpacing: 3,
        fontFamily: 'monospace',
      });
      t.setDepth(0);
    }

    // 5. Ground / floor
    const groundGfx = scene.add.graphics();
    groundGfx.setDepth(0);
    groundGfx.fillStyle(0x000d18, 1);
    groundGfx.fillRect(0, 556, WW, H - 556);
    // Neon floor line
    groundGfx.fillStyle(0x00ffcc, 1);
    groundGfx.fillRect(0, 555, WW, 2);

    // 7. Neon floor glow zone
    const glowGfx = scene.add.graphics();
    glowGfx.setDepth(0);
    glowGfx.fillStyle(0x00ffcc, 0.08);
    glowGfx.fillRect(0, 540, WW, 20);

    // Static platform: centerX=520, centerY=430, width=240
    const staticPlat = scene.add.rectangle(520, 430, 240, 20, 0x002a3a);
    staticPlat.setDepth(0);
    scene.physics.add.existing(staticPlat, true);
    scene.platforms.add(staticPlat);
    // Top edge glow
    const staticGlow = scene.add.graphics();
    staticGlow.setDepth(0);
    staticGlow.fillStyle(0x00ffcc, 1);
    staticGlow.fillRect(520 - 120, 430 - 10, 240, 2);

    // Moving platform: startX=1100, centerY=400, width=260
    const movPlat = scene.add.rectangle(1100, 400, 260, 20, 0x002a3a);
    movPlat.setDepth(0);
    scene.physics.add.existing(movPlat, false);
    movPlat.body.setImmovable(true);
    movPlat.body.setAllowGravity(false);

    // Top edge glow graphics for moving platform (updated in update())
    this._movPlatGlow = scene.add.graphics();
    this._movPlatGlow.setDepth(0);
    this._movPlat = movPlat;

    scene.tweens.add({
      targets: movPlat,
      x: 1560,
      duration: 4000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
      onUpdate: () => {
        if (movPlat.body) movPlat.body.reset(movPlat.x, movPlat.y);
      }
    });

    this.movingPlatforms.push(movPlat);

    // Hazard setup
    this._hazardLeft = { x: 700, y: 500, w: 100, h: 55, damage: 7, lastTick: 0, active: false };
    this._hazardRight = { x: 1700, y: 500, w: 100, h: 55, damage: 7, lastTick: 0, active: false };

    this._sparkLeft = scene.add.graphics();
    this._sparkLeft.setDepth(0);
    this._sparkRight = scene.add.graphics();
    this._sparkRight.setDepth(0);

    // Periodic hazard timer: activate every 6000ms for 1200ms
    this._hazardTimer = scene.time.addEvent({
      delay: 6000,
      loop: true,
      callback: () => {
        this._hazardLeft.active = true;
        this._hazardRight.active = true;
        if (!scene.stageHazards.includes(this._hazardLeft)) {
          scene.stageHazards.push(this._hazardLeft);
        }
        if (!scene.stageHazards.includes(this._hazardRight)) {
          scene.stageHazards.push(this._hazardRight);
        }
        scene.time.delayedCall(1200, () => {
          this._hazardLeft.active = false;
          this._hazardRight.active = false;
          const li = scene.stageHazards.indexOf(this._hazardLeft);
          if (li !== -1) scene.stageHazards.splice(li, 1);
          const ri = scene.stageHazards.indexOf(this._hazardRight);
          if (ri !== -1) scene.stageHazards.splice(ri, 1);
          this._sparkLeft.clear();
          this._sparkRight.clear();
        });
      }
    });
  }

  _drawLightning(gfx, x, y, w, h) {
    gfx.clear();
    // Draw a few jagged lightning bolt lines
    const colors = [0x00ffcc, 0xffffff, 0x00ffcc];
    for (let i = 0; i < 3; i++) {
      const col = colors[i % colors.length];
      gfx.lineStyle(i === 1 ? 1 : 2, col, i === 1 ? 1.0 : 0.7);
      // Main bolt from top-center down with zigzag
      const cx = x + w / 2 + (i - 1) * 6;
      gfx.beginPath();
      gfx.moveTo(cx, y);
      gfx.lineTo(cx - 8, y + h * 0.3);
      gfx.lineTo(cx + 6, y + h * 0.5);
      gfx.lineTo(cx - 4, y + h * 0.7);
      gfx.lineTo(cx + 3, y + h);
      gfx.strokePath();
    }
    // Small spark dots
    gfx.fillStyle(0xffffff, 0.9);
    gfx.fillRect(x + w / 2 - 1, y, 2, 2);
    gfx.fillRect(x + w / 2 + 5, y + h * 0.5 - 1, 2, 2);
  }

  update(time, delta) {
    const scene = this.scene;
    const WW = this.WW;

    // Rain: spawn every 20ms
    if (time - this._lastSpawn > 20) {
      this._lastSpawn = time;
      for (let i = 0; i < 3; i++) {
        const rx = Math.random() * WW;
        const rainRect = scene.add.rectangle(rx, -5, 1, 8, 0x4499cc);
        rainRect.setAlpha(0.4);
        rainRect.setDepth(0);
        const dur = 400 + Math.random() * 300;
        scene.tweens.add({
          targets: rainRect,
          y: 560,
          duration: dur,
          ease: 'Linear',
          onComplete: () => {
            rainRect.destroy();
          }
        });
      }
    }

    // Moving platform top edge glow
    if (this._movPlat && this._movPlatGlow) {
      this._movPlatGlow.clear();
      this._movPlatGlow.fillStyle(0x00ffcc, 1);
      this._movPlatGlow.fillRect(this._movPlat.x - 130, this._movPlat.y - 10, 260, 2);
    }

    // Hazard spark drawing
    if (this._hazardLeft && this._hazardLeft.active) {
      // Flicker: draw every other call
      const flicker = Math.floor(time / 80) % 2 === 0;
      if (flicker) {
        this._drawLightning(this._sparkLeft, this._hazardLeft.x, this._hazardLeft.y, this._hazardLeft.w, this._hazardLeft.h);
      } else {
        this._sparkLeft.clear();
      }
    }

    if (this._hazardRight && this._hazardRight.active) {
      const flicker = Math.floor(time / 80) % 2 === 1;
      if (flicker) {
        this._drawLightning(this._sparkRight, this._hazardRight.x, this._hazardRight.y, this._hazardRight.w, this._hazardRight.h);
      } else {
        this._sparkRight.clear();
      }
    }
  }

  destroy() {
    if (this._hazardTimer) {
      this._hazardTimer.remove(false);
      this._hazardTimer = null;
    }
    if (this._rainTimer) {
      this._rainTimer.remove(false);
      this._rainTimer = null;
    }
  }
}
