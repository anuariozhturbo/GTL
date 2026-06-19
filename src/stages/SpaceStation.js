export default class SpaceStationStage {
  constructor(scene) {
    this.scene = scene;
    this.WW = 2560;
    this.H = 720;
    this.movingPlatforms = [];

    this._warningLights = [];
    this._laser = null;
    this._laserActive = false;
    this._laserStartTime = 0;
    this._hazardTimer = null;
    this._laserScanY = 0;
  }

  create() {
    const scene = this.scene;
    const WW = this.WW;
    const H = this.H;

    // --- BACKGROUND ---
    const bg = scene.add.graphics();
    bg.setDepth(0);

    // 1. Space background
    bg.fillStyle(0x000410, 1);
    bg.fillRect(0, 0, WW, H);

    // 4. Station structure (metallic wall behind everything, drawn before stars)
    bg.fillStyle(0x060b14, 1);
    bg.fillRect(0, 0, WW, H - 200);

    // 2. Stars: 300 dots
    for (let i = 0; i < 300; i++) {
      const sx = Math.random() * WW;
      const sy = Math.random() * (H - 200);
      const alpha = 0.2 + Math.random() * 0.7;
      bg.fillStyle(0xe8f0ff, alpha);
      bg.fillRect(sx, sy, 1, 1);
    }

    // 3. Earth planet (right half, around x=2000)
    const earthGfx = scene.add.graphics();
    earthGfx.setDepth(0);
    earthGfx.setAlpha(0.55);

    // Blue ocean base
    earthGfx.fillStyle(0x1a5276, 1);
    earthGfx.fillCircle(2100, 200, 120);

    // Green land patches
    earthGfx.fillStyle(0x1e8449, 1);
    earthGfx.fillEllipse(2060, 180, 80, 50);
    earthGfx.fillStyle(0x27ae60, 1);
    earthGfx.fillEllipse(2140, 230, 60, 40);
    earthGfx.fillStyle(0x1e8449, 1);
    earthGfx.fillEllipse(2090, 260, 50, 30);

    // White cloud streak arcs on top
    earthGfx.lineStyle(3, 0xe8f0ff, 0.7);
    earthGfx.beginPath();
    earthGfx.arc(2100, 200, 100, Math.PI * 1.1, Math.PI * 1.5, false);
    earthGfx.strokePath();

    earthGfx.lineStyle(2, 0xe8f0ff, 0.5);
    earthGfx.beginPath();
    earthGfx.arc(2100, 200, 90, Math.PI * 1.3, Math.PI * 1.7, false);
    earthGfx.strokePath();

    earthGfx.lineStyle(2, 0xe8f0ff, 0.6);
    earthGfx.beginPath();
    earthGfx.arc(2100, 200, 110, Math.PI * 0.9, Math.PI * 1.2, false);
    earthGfx.strokePath();

    // 5. Structural beams: vertical rects every 320px
    const beamGfx = scene.add.graphics();
    beamGfx.setDepth(0);
    beamGfx.fillStyle(0x0d1520, 1);
    for (let bx = 0; bx < WW; bx += 320) {
      beamGfx.fillRect(bx, 0, 8, H);
    }

    // 6. Horizontal beams at y=200 and y=400
    beamGfx.fillRect(0, 200, WW, 6);
    beamGfx.fillRect(0, 400, WW, 6);

    // 8. Floor: metallic grating
    const floorGfx = scene.add.graphics();
    floorGfx.setDepth(0);
    floorGfx.fillStyle(0x0d1520, 1);
    floorGfx.fillRect(0, 554, WW, 30);

    // Fine horizontal lines every 4px
    floorGfx.lineStyle(1, 0x1a2535, 0.8);
    for (let fy = 554; fy <= 584; fy += 4) {
      floorGfx.beginPath();
      floorGfx.moveTo(0, fy);
      floorGfx.lineTo(WW, fy);
      floorGfx.strokePath();
    }

    // Neon floor line at y=555
    floorGfx.lineStyle(2, 0x4488ff, 1);
    floorGfx.beginPath();
    floorGfx.moveTo(0, 555);
    floorGfx.lineTo(WW, 555);
    floorGfx.strokePath();

    // 9. Station window panels at x=400, 1100, 1800
    const windowGfx = scene.add.graphics();
    windowGfx.setDepth(0);
    const windowXs = [400, 1100, 1800];
    for (const wx of windowXs) {
      windowGfx.fillStyle(0x050d1a, 1);
      windowGfx.fillRect(wx, 80, 200, 100);
      windowGfx.lineStyle(2, 0x2244aa, 1);
      windowGfx.strokeRect(wx, 80, 200, 100);

      // Small stars visible through windows
      for (let ws = 0; ws < 20; ws++) {
        const wsx = wx + 5 + Math.random() * 190;
        const wsy = 85 + Math.random() * 90;
        const walpha = 0.3 + Math.random() * 0.6;
        windowGfx.fillStyle(0xe8f0ff, walpha);
        windowGfx.fillRect(wsx, wsy, 1, 1);
      }
    }

    // 7. Warning lights along ceiling
    const lightColors = [0xff4422, 0xffaa00, 0xff4422, 0xffaa00, 0xff4422];
    const lightXs = [0, 640, 1280, 1920, 2560];
    this._warningLights = [];
    for (let li = 0; li < lightXs.length; li++) {
      const lightGfx = scene.add.graphics();
      lightGfx.setDepth(0);
      lightGfx.fillStyle(lightColors[li], 1);
      lightGfx.fillCircle(lightXs[li], 30, 5);
      this._warningLights.push({
        gfx: lightGfx,
        x: lightXs[li],
        color: lightColors[li],
        phase: li * (Math.PI / 2.5)
      });
    }

    // --- PLATFORMS ---

    // Left platform: centerX=520, centerY=430, width=220
    const leftPlat = scene.add.rectangle(520, 430, 220, 20, 0x1a2535);
    leftPlat.setDepth(0);
    scene.physics.add.existing(leftPlat, true);
    scene.platforms.add(leftPlat);

    // Left platform highlight
    const leftPlatDecor = scene.add.graphics();
    leftPlatDecor.setDepth(0);
    leftPlatDecor.fillStyle(0x4488ff, 1);
    leftPlatDecor.fillRect(520 - 110, 430 - 10, 220, 3);

    // Right platform: centerX=2040, centerY=430, width=220
    const rightPlat = scene.add.rectangle(2040, 430, 220, 20, 0x1a2535);
    rightPlat.setDepth(0);
    scene.physics.add.existing(rightPlat, true);
    scene.platforms.add(rightPlat);

    // Right platform highlight
    const rightPlatDecor = scene.add.graphics();
    rightPlatDecor.setDepth(0);
    rightPlatDecor.fillStyle(0x4488ff, 1);
    rightPlatDecor.fillRect(2040 - 110, 430 - 10, 220, 3);

    // --- LASER HAZARD ---
    this._laser = scene.add.graphics();
    this._laser.setDepth(0);
    this._laserActive = false;
    this._laserStartTime = 0;
    this._laserScanY = 0;

    // Push laser hazard zone to scene.stageHazards
    const laserHazard = { x: 1250, y: 0, w: 60, h: 560, damage: 15, lastTick: 0, active: false };
    this._laserHazard = laserHazard;
    scene.stageHazards.push(laserHazard);

    // Periodic laser timer: every 8000ms
    this._hazardTimer = scene.time.addEvent({
      delay: 8000,
      loop: true,
      callback: () => {
        this._laserActive = true;
        this._laserHazard.active = true;
        this._laserStartTime = scene.time.now;
        this._laserScanY = 0;

        // Deactivate after 1200ms
        scene.time.delayedCall(1200, () => {
          this._laserActive = false;
          this._laserHazard.active = false;
          this._laser.clear();
        });
      }
    });
  }

  update(time, delta) {
    // Animate warning lights (pulse with sin wave)
    for (const light of this._warningLights) {
      const alpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * 0.003 + light.phase));
      light.gfx.clear();
      light.gfx.fillStyle(light.color, alpha);
      light.gfx.fillCircle(light.x, 30, 5);

      // Glow effect
      light.gfx.fillStyle(light.color, alpha * 0.3);
      light.gfx.fillCircle(light.x, 30, 10);
    }

    // Animate laser
    if (this._laserActive) {
      const elapsed = time - this._laserStartTime;
      const progress = Math.min(elapsed / 1200, 1);
      this._laserScanY = progress * 555;

      const alphaVar = 0.7 + 0.2 * Math.sin(time * 0.05);

      this._laser.clear();

      // Main laser beam
      this._laser.lineStyle(4, 0xff0044, alphaVar * 0.9);
      this._laser.beginPath();
      this._laser.moveTo(1280, 0);
      this._laser.lineTo(1280, 555);
      this._laser.strokePath();

      // Wider glow
      this._laser.lineStyle(12, 0xff0044, alphaVar * 0.2);
      this._laser.beginPath();
      this._laser.moveTo(1280, 0);
      this._laser.lineTo(1280, 555);
      this._laser.strokePath();

      // Laser edges (full width zone)
      this._laser.lineStyle(1, 0xff6688, alphaVar * 0.4);
      this._laser.beginPath();
      this._laser.moveTo(1250, 0);
      this._laser.lineTo(1250, 555);
      this._laser.strokePath();

      this._laser.lineStyle(1, 0xff6688, alphaVar * 0.4);
      this._laser.beginPath();
      this._laser.moveTo(1310, 0);
      this._laser.lineTo(1310, 555);
      this._laser.strokePath();

      // Scanning line moving from y=0 to y=555
      this._laser.lineStyle(3, 0xffffff, alphaVar * 0.8);
      this._laser.beginPath();
      this._laser.moveTo(1250, this._laserScanY);
      this._laser.lineTo(1310, this._laserScanY);
      this._laser.strokePath();
    }
  }

  destroy() {
    if (this._hazardTimer) {
      this._hazardTimer.remove(false);
      this._hazardTimer = null;
    }
  }
}
