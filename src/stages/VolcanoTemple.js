export default class VolcanoTempleStage {
  constructor(scene) {
    this.scene = scene;
    this.WW = 2560;
    this.H = 720;
    this.movingPlatforms = [];

    this._lavaGlow = null;
    this._geyserGraphic = null;
    this._hazardTimer = null;
    this._geyserActive = false;
    this._geyserActivateTimer = null;
    this._ashParticles = [];
    this._lastSpawn = 0;
    this._lavaTime = 0;
  }

  create() {
    const scene = this.scene;
    const WW = this.WW;

    // 1. Sky gradient background
    const sky = scene.add.graphics();
    sky.setDepth(0);
    sky.fillGradientStyle(0x1a0200, 0x1a0200, 0x3a0800, 0x3a0800, 1);
    sky.fillRect(0, 0, WW, this.H);

    // 2. Distant volcano silhouettes
    const volcanoes = scene.add.graphics();
    volcanoes.setDepth(0);
    volcanoes.fillStyle(0x000000, 1);

    // Left volcano
    volcanoes.fillTriangle(200, 540, 0, 540, 100, 300);
    volcanoes.fillTriangle(400, 540, 150, 540, 300, 250);
    volcanoes.fillRect(0, 540, 450, 60);

    // Right volcano
    volcanoes.fillTriangle(WW - 200, 540, WW, 540, WW - 100, 300);
    volcanoes.fillTriangle(WW - 400, 540, WW - 150, 540, WW - 300, 250);
    volcanoes.fillRect(WW - 450, 540, 450, 60);

    // 3. Stone temple back wall
    const backWall = scene.add.graphics();
    backWall.setDepth(0);
    backWall.fillStyle(0x200500, 1);
    backWall.fillRect(0, 0, WW, 480);

    // Stone grid overlay for texture
    backWall.lineStyle(1, 0x2a0800, 0.4);
    for (let gx = 0; gx < WW; gx += 80) {
      backWall.lineBetween(gx, 0, gx, 480);
    }
    for (let gy = 0; gy < 480; gy += 60) {
      backWall.lineBetween(0, gy, WW, gy);
    }

    // 4. Crumbling stone pillars
    const pillarXPositions = [160, 640, 1280, 1920, 2400];
    const pillars = scene.add.graphics();
    pillars.setDepth(0);

    for (const px of pillarXPositions) {
      pillars.fillStyle(0x2a1505, 1);
      pillars.fillRect(px - 14, 180, 28, 380);

      // Pillar highlight
      pillars.fillStyle(0x3d2010, 0.6);
      pillars.fillRect(px - 10, 180, 6, 380);

      // Cracks
      pillars.lineStyle(1, 0x1a0a02, 0.8);
      pillars.lineBetween(px - 5, 220, px + 3, 260);
      pillars.lineBetween(px + 3, 260, px - 2, 290);
      pillars.lineBetween(px - 8, 350, px + 6, 380);
      pillars.lineBetween(px + 6, 380, px, 410);

      // Pillar cap
      pillars.fillStyle(0x3d2010, 1);
      pillars.fillRect(px - 18, 176, 36, 12);
    }

    // 5. Glowing lava river base layers
    const lavaBase = scene.add.graphics();
    lavaBase.setDepth(0);
    // Outer dark layer
    lavaBase.fillStyle(0x4a0800, 1);
    lavaBase.fillRect(0, 540, WW, 60);
    // Mid orange layer
    lavaBase.fillStyle(0xff4400, 1);
    lavaBase.fillRect(0, 548, WW, 44);
    // Inner bright band
    lavaBase.fillStyle(0xffaa00, 1);
    lavaBase.fillRect(0, 558, WW, 20);
    // Inner white-hot core
    lavaBase.fillStyle(0xffcc44, 0.6);
    lavaBase.fillRect(0, 563, WW, 10);

    // 6. Lava glow (animated in update)
    this._lavaGlow = scene.add.graphics();
    this._lavaGlow.setDepth(0);
    this._lavaGlow.fillStyle(0xff4400, 0.3);
    this._lavaGlow.fillRect(0, 520, WW, 40);

    // 7. Primary neon floor line at y=555
    const floorLine = scene.add.graphics();
    floorLine.setDepth(0);
    floorLine.lineStyle(2.5, 0xff4400, 1);
    floorLine.lineBetween(0, 555, WW, 555);

    // 8. Corner marks and floor decorations
    const decor = scene.add.graphics();
    decor.setDepth(0);
    decor.lineStyle(2, 0xff4400, 0.8);

    // Corner marks
    const corners = [[80, 555], [2480, 555]];
    for (const [cx, cy] of corners) {
      decor.lineBetween(cx - 20, cy, cx + 20, cy);
      decor.lineBetween(cx, cy - 20, cx, cy + 20);
    }

    // Floor rune marks
    decor.lineStyle(1, 0x3d2010, 0.7);
    for (let rx = 200; rx < WW; rx += 300) {
      decor.lineBetween(rx - 30, 553, rx + 30, 553);
      decor.lineBetween(rx, 548, rx, 558);
    }

    // Stage boundary markers
    decor.lineStyle(2, 0xff4400, 0.5);
    decor.lineBetween(80, 400, 80, 560);
    decor.lineBetween(2480, 400, 2480, 560);

    // 5 & geyser graphic container
    this._geyserGraphic = scene.add.graphics();
    this._geyserGraphic.setDepth(0);
    this._geyserGraphic.setVisible(false);

    // LEFT PLATFORM
    const leftPlat = scene.add.rectangle(580, 425, 260, 20, 0x3d1a05);
    leftPlat.setDepth(0);
    scene.physics.add.existing(leftPlat, true);
    scene.platforms.add(leftPlat);

    // Left platform visual
    const leftPlatDecor = scene.add.graphics();
    leftPlatDecor.setDepth(0);
    leftPlatDecor.fillStyle(0x4a2008, 1);
    leftPlatDecor.fillRect(580 - 130, 415, 260, 5);
    leftPlatDecor.lineStyle(1, 0xff4400, 0.6);
    leftPlatDecor.lineBetween(580 - 130, 415, 580 + 130, 415);

    // RIGHT PLATFORM
    const rightPlat = scene.add.rectangle(1980, 425, 260, 20, 0x3d1a05);
    rightPlat.setDepth(0);
    scene.physics.add.existing(rightPlat, true);
    scene.platforms.add(rightPlat);

    // Right platform visual
    const rightPlatDecor = scene.add.graphics();
    rightPlatDecor.setDepth(0);
    rightPlatDecor.fillStyle(0x4a2008, 1);
    rightPlatDecor.fillRect(1980 - 130, 415, 260, 5);
    rightPlatDecor.lineStyle(1, 0xff4400, 0.6);
    rightPlatDecor.lineBetween(1980 - 130, 415, 1980 + 130, 415);

    // Ensure stageHazards array exists
    if (!scene.stageHazards) {
      scene.stageHazards = [];
    }

    // GEYSER HAZARD TIMER
    this._hazardTimer = scene.time.addEvent({
      delay: 7000,
      loop: true,
      callback: () => {
        this._activateGeyser();
      }
    });
  }

  _activateGeyser() {
    const scene = this.scene;
    this._geyserActive = true;
    this._geyserGraphic.setVisible(true);

    // Add hazard zone
    if (!scene.stageHazards) scene.stageHazards = [];
    this._geyserHazard = { x: 1185, y: 380, w: 190, h: 175, damage: 10, lastTick: 0, active: true };
    scene.stageHazards.push(this._geyserHazard);

    // Deactivate after 1500ms
    this._geyserActivateTimer = scene.time.delayedCall(1500, () => {
      this._deactivateGeyser();
    });
  }

  _deactivateGeyser() {
    this._geyserActive = false;
    this._geyserGraphic.setVisible(false);
    this._geyserGraphic.clear();

    if (this._geyserHazard) {
      this._geyserHazard.active = false;
      const scene = this.scene;
      if (scene.stageHazards) {
        const idx = scene.stageHazards.indexOf(this._geyserHazard);
        if (idx !== -1) scene.stageHazards.splice(idx, 1);
      }
      this._geyserHazard = null;
    }
  }

  update(time, delta) {
    this._lavaTime += delta;

    // Lava glow animation
    if (this._lavaGlow) {
      const alpha = 0.2 + 0.15 * Math.sin(this._lavaTime * 0.003);
      this._lavaGlow.clear();
      this._lavaGlow.fillStyle(0xff4400, alpha);
      this._lavaGlow.fillRect(0, 520, this.WW, 40);
    }

    // Geyser animation when active
    if (this._geyserActive && this._geyserGraphic) {
      this._geyserGraphic.clear();
      const gx = 1280;
      const gw = 80;

      // Base glow
      this._geyserGraphic.fillStyle(0xff4400, 0.4);
      this._geyserGraphic.fillRect(gx - gw / 2, 480, gw, 80);

      // Rising column
      this._geyserGraphic.fillStyle(0xff6600, 0.7);
      this._geyserGraphic.fillRect(gx - 25, 380, 50, 180);

      // Bright core
      this._geyserGraphic.fillStyle(0xffcc00, 0.6);
      this._geyserGraphic.fillRect(gx - 12, 380, 24, 180);

      // Animated particles (use time to offset)
      const particleOffset = (this._lavaTime * 0.3) % 60;
      for (let i = 0; i < 6; i++) {
        const py = 555 - particleOffset - i * 30;
        const px = gx + (Math.sin(this._lavaTime * 0.005 + i) * 20);
        const pAlpha = 0.4 + 0.3 * Math.sin(this._lavaTime * 0.01 + i);
        this._geyserGraphic.fillStyle(0xffaa00, pAlpha);
        this._geyserGraphic.fillCircle(px, py, 6 - i * 0.5);
      }
    }

    // Falling ash particles
    if (time - this._lastSpawn > 60) {
      this._lastSpawn = time;
      const ashX = Math.random() * this.WW;
      const ash = this.scene.add.graphics();
      ash.setDepth(0);
      const radius = 2 + Math.random() * 2;
      ash.fillStyle(0x333333, 0.6);
      ash.fillCircle(0, 0, radius);
      ash.x = ashX;
      ash.y = -10;

      const driftX = (Math.random() - 0.5) * 40;
      this.scene.tweens.add({
        targets: ash,
        x: ashX + driftX,
        y: 600,
        alpha: 0,
        duration: 3000 + Math.random() * 1000,
        ease: 'Linear',
        onComplete: () => {
          ash.destroy();
        }
      });

      this._ashParticles.push(ash);
    }

    // Clean up destroyed ash references
    this._ashParticles = this._ashParticles.filter(a => a && a.active);
  }

  destroy() {
    if (this._hazardTimer) {
      this._hazardTimer.remove(false);
      this._hazardTimer = null;
    }
    if (this._geyserActivateTimer) {
      this._geyserActivateTimer.remove(false);
      this._geyserActivateTimer = null;
    }
    for (const ash of this._ashParticles) {
      if (ash && ash.active) ash.destroy();
    }
    this._ashParticles = [];
  }
}
