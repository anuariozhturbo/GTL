export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene') }

  preload() {
    const W = this.scale.width, H = this.scale.height
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x0a0018, 0x0a0018, 0x1a0035, 0x1a0035, 1)
    bg.fillRect(0, 0, W, H)
    this.add.text(W/2, H/2 - 80, 'CHAOS', {
      fontSize: '80px', color: '#9b59b6', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#ffffff', strokeThickness: 2
    }).setOrigin(0.5)
    this.add.text(W/2, H/2 - 10, 'CONSTRUCT', {
      fontSize: '40px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5)
    this.add.rectangle(W/2, H/2 + 60, 400, 18, 0x222222)
    const bar = this.add.rectangle(W/2 - 198, H/2 + 60, 4, 14, 0x9b59b6).setOrigin(0, 0.5)
    this.load.on('progress', v => { bar.width = 396 * v })
  }

  create() {
    this.buildTextures()
    this.time.delayedCall(600, () => this.scene.start('AuthScene'))
  }

  // ── sprite-sheet factory ────────────────────────────────────────────
  g(fw, fh, n) {
    const gr = this.make.graphics({ x: 0, y: 0, add: false })
    gr.done = (key) => {
      gr.generateTexture(key, fw * n, fh)
      gr.destroy()
      const tex = this.textures.get(key)
      for (let i = 0; i < n; i++) tex.add(i, 0, i * fw, 0, fw, fh)
    }
    return gr
  }

  // ── primitives ──────────────────────────────────────────────────────
  // filled rounded rect with dark shadow outline
  box(gr, color, x, y, w, h, r) {
    r = r || 3
    gr.fillStyle(0x000000, 0.6)
    gr.fillRoundedRect(x - 1, y - 1, w + 2, h + 2, r + 1)
    gr.fillStyle(color, 1)
    gr.fillRoundedRect(x, y, w, h, r)
  }
  // filled circle with dark shadow outline
  dot(gr, color, x, y, r) {
    gr.fillStyle(0x000000, 0.6)
    gr.fillCircle(x, y, r + 1)
    gr.fillStyle(color, 1)
    gr.fillCircle(x, y, r)
  }
  // star polygon using {x,y} points
  star(gr, cx, cy, pts, outer, inner) {
    const arr = []
    for (let i = 0; i < pts * 2; i++) {
      const a = (i * Math.PI) / pts - Math.PI / 2
      const rad = i % 2 === 0 ? outer : inner
      arr.push({ x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad })
    }
    gr.fillPoints(arr, true)
  }

  // diagonal filled-rect limb between two endpoints (for angled arms in attack poses)
  lineLimb(gr, color, x1, y1, x2, y2, thick) {
    const dx = x2 - x1, dy = y2 - y1
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const nx = (-dy / len) * (thick * 0.5)
    const ny = (dx / len) * (thick * 0.5)
    gr.fillStyle(0x000000, 0.45)
    gr.fillPoints([{x:x1+nx+1,y:y1+ny+1},{x:x2+nx+1,y:y2+ny+1},{x:x2-nx+1,y:y2-ny+1},{x:x1-nx+1,y:y1-ny+1}], true)
    gr.fillStyle(color, 1)
    gr.fillPoints([{x:x1+nx,y:y1+ny},{x:x2+nx,y:y2+ny},{x:x2-nx,y:y2-ny},{x:x1-nx,y:y1-ny}], true)
  }

  // ── per-state face ─────────────────────────────────────────────────
  // hx,hy = head center
  face(gr, state, hx, hy, skin, eyeCol) {
    eyeCol = eyeCol || 0x111111
    const angry = state === 'attack' || state === 'special'
    const hurt  = state === 'hurt'
    const dead  = state === 'die'

    // eyebrows
    if (angry) {
      gr.fillStyle(0x111111, 1)
      gr.fillRect(hx - 9, hy - 8, 7, 2)
      gr.fillRect(hx + 2,  hy - 8, 7, 2)
    }

    // eyes
    if (dead || hurt) {
      gr.fillStyle(0x444444, 1)
      gr.fillRect(hx - 8, hy - 3, 5, 2)
      gr.fillRect(hx + 3,  hy - 3, 5, 2)
    } else if (angry) {
      gr.fillStyle(eyeCol, 1)
      gr.fillRect(hx - 9, hy - 4, 6, 5)
      gr.fillRect(hx + 3,  hy - 4, 6, 5)
    } else {
      gr.fillStyle(eyeCol, 1)
      gr.fillCircle(hx - 4, hy - 3, 3.5)
      gr.fillCircle(hx + 4, hy - 3, 3.5)
      gr.fillStyle(0xffffff, 0.65)
      gr.fillCircle(hx - 3, hy - 4, 1.2)
      gr.fillCircle(hx + 5, hy - 4, 1.2)
    }

    // mouth
    if (angry) {
      gr.fillStyle(0x111111, 1)
      gr.fillRect(hx - 5, hy + 5, 10, 4)
      gr.fillStyle(skin, 1)
      gr.fillRect(hx - 4, hy + 6, 8, 2)
    } else if (hurt) {
      gr.fillStyle(0x111111, 1)
      gr.fillRect(hx - 3, hy + 5, 6, 2)
    }
  }

  // ── shared humanoid body ────────────────────────────────────────────
  // All pose props use SHORT names: laX laY laH raX raY raH llX rlX llY rlY llH rlH
  drawBody(gr, ox, oy, pose, C) {
    const cx  = ox + 40         // centre of 80-px frame
    const tl  = pose.torsoLean || 0
    const ty  = pose.torsoY    || 0
    const hy  = pose.headY     || 0

    // body measurements (with per-character overrides from C)
    const tW  = C.tW  || 32
    const tH  = C.tH  || 36
    const lW  = C.lW  || 12   // leg width
    const aW  = C.aW  || 12   // arm width
    const hR  = C.hR  || 13   // head radius

    // arm positions (offsets from cx+tl, or cx for legs)
    const laX = cx + tl + (pose.laX !== undefined ? pose.laX : -22)
    const raX = cx + tl + (pose.raX !== undefined ? pose.raX : tW/2 + 2)
    const laY = oy + (pose.laY !== undefined ? pose.laY : 28)
    const raY = oy + (pose.raY !== undefined ? pose.raY : 28)
    const laH = pose.laH !== undefined ? pose.laH : 24
    const raH = pose.raH !== undefined ? pose.raH : 24

    // leg positions
    const llX = cx + (pose.llX !== undefined ? pose.llX : -lW/2 - 4)
    const rlX = cx + (pose.rlX !== undefined ? pose.rlX :  lW/2 + 4)
    const llY = oy + (pose.llY !== undefined ? pose.llY : 60)
    const rlY = oy + (pose.rlY !== undefined ? pose.rlY : 60)
    const llH = pose.llH !== undefined ? pose.llH : 28
    const rlH = pose.rlH !== undefined ? pose.rlH : 28

    // torso
    const tX  = cx + tl - tW/2
    const tY  = oy + 26 + ty

    // head
    const hCx = cx + tl * 0.6
    const hCy = oy + 14 + hy + ty

    // ── draw order: back → front ──────────────────────────────────
    // legs
    this.box(gr, C.pants, llX - lW/2, llY, lW, llH, 4)
    this.box(gr, C.pants, rlX - lW/2, rlY, lW, rlH, 4)
    // knee crease
    gr.fillStyle(0x000000, 0.22)
    gr.fillRect(llX - lW/2, llY + llH * 0.42, lW, 3)
    gr.fillRect(rlX - lW/2, rlY + rlH * 0.42, lW, 3)
    // shoes
    if (C.shoe) {
      this.box(gr, C.shoe, llX - lW/2 - 2, llY + llH - 1, lW + 6, 8, 3)
      this.box(gr, C.shoe, rlX - lW/2 - 2, rlY + rlH - 1, lW + 6, 8, 3)
    }

    // torso
    this.box(gr, C.body, tX, tY, tW, tH, 5)
    // edge highlight / shadow
    gr.fillStyle(0xffffff, 0.09)
    gr.fillRoundedRect(tX + 2, tY + 4, 5, tH - 8, 2)
    gr.fillStyle(0x000000, 0.18)
    gr.fillRoundedRect(tX + tW - 7, tY + 4, 5, tH - 8, 2)

    // left arm (diagonal if laEnd defined in pose)
    let laEndX, laEndY
    if (pose.laEnd) {
      laEndX = ox + pose.laEnd.x; laEndY = oy + pose.laEnd.y
      this.lineLimb(gr, C.lSleeve || C.body, laX + aW/2, laY + 4, laEndX, laEndY, aW)
      this.dot(gr, C.skin, laEndX, laEndY, 5)
    } else {
      this.box(gr, C.lSleeve || C.body, laX, laY, aW, laH, 4)
      laEndX = laX + aW/2; laEndY = laY + laH + 1
      this.dot(gr, C.skin, laEndX, laEndY, 5)
    }
    // right arm (diagonal if raEnd defined in pose)
    let raEndX, raEndY
    if (pose.raEnd) {
      raEndX = ox + pose.raEnd.x; raEndY = oy + pose.raEnd.y
      this.lineLimb(gr, C.rSleeve || C.body, raX + aW/2, raY + 4, raEndX, raEndY, aW)
      this.dot(gr, C.skin, raEndX, raEndY, 5)
    } else {
      this.box(gr, C.rSleeve || C.body, raX, raY, aW, raH, 4)
      raEndX = raX + aW/2; raEndY = raY + raH + 1
      this.dot(gr, C.skin, raEndX, raEndY, 5)
    }

    // neck
    gr.fillStyle(C.skin, 1)
    gr.fillRect(hCx - 5, hCy + hR - 2, 10, 10)

    // head
    this.dot(gr, C.skin, hCx, hCy, hR)

    return { hCx, hCy, hR, tX, tY, tW, tH, laX, raX, laY, raY, laH, raH, llX, rlX, llY, rlY, llH, rlH, aW, lW, raEndX, raEndY, laEndX, laEndY }
  }

  buildTextures() {
    this.makeAsh()
    this.makeMerrs()
    this.makeDice()
    this.makeThragg()
    this.makePhantom()
    this.makeGolem()
    this.makeViper()
    this.makeNexus()
    this.makeLohe()
    this.makeShield()
    this.makeEffects()
  }

  // ══════════════════════════════════════════════════════════════════
  // ASH — purple coat, crown on head, bat wings, sledgehammer
  // ══════════════════════════════════════════════════════════════════
  makeAsh() {
    const C = { body: 0x7c3aed, pants: 0x4c1d95, skin: 0xf5cba7, shoe: 0x111122, glow: 0xc084fc }

    const POSES = {
      idle: [
        { torsoY:-3, headY:-2, laY:27, raY:20, laX:-26, raX:22, llH:28, rlH:28 },
        { torsoY:-6, headY:-4, laY:24, raY:17, laX:-28, raX:24, llH:29, rlH:27 },
        { torsoY:-3, headY:-2, laY:27, raY:20, laX:-26, raX:22, llH:28, rlH:28 },
        { torsoY: 0, headY: 0, laY:30, raY:23, laX:-24, raX:20, llH:27, rlH:29 },
      ],
      walk: [
        { torsoLean: 5, laY:17, raY:42, llY:52, rlY:68, llH:36, rlH:18 },
        { torsoLean: 8, laY:12, raY:48, llY:46, rlY:76, llH:42, rlH:10 },
        { torsoLean: 4, laY:21, raY:36, llY:56, rlY:64, llH:30, rlH:24 },
        { torsoLean:-4, laY:36, raY:21, llY:64, rlY:56, llH:24, rlH:30 },
        { torsoLean:-8, laY:48, raY:12, llY:76, rlY:46, llH:10, rlH:42 },
        { torsoLean:-5, laY:42, raY:17, llY:68, rlY:52, llH:18, rlH:36 },
      ],
      jump: [
        { torsoY: 6, torsoLean:-3, laY:34, raY:34, llY:74, rlY:74, llH:10, rlH:10 },
        { torsoY:-12, headY:-4, laY: 9, raY: 9, llY:80, rlY:80, llH: 6, rlH: 6 },
        { torsoY:-4,  headY:-1, laY:19, raY:19, llY:70, rlY:70, llH:20, rlH:20 },
      ],
      attack: [
        { torsoLean:-12, raX:6, raY:12, laY:36, headY:-3, torsoY:-2 },
        { torsoLean:-18, raEnd:{x:38,y:20}, laY:32, headY:-5, torsoY:-4 },
        { torsoLean:  4, raEnd:{x:60,y:26}, laY:28, headY:-1, torsoY: 0 },
        { torsoLean: 16, raEnd:{x:76,y:36}, laY:24, headY: 4, torsoY: 3 },
        { torsoLean:  9, raEnd:{x:68,y:52}, laY:30, headY: 1, torsoY: 0 },
      ],
      block: [
        { torsoLean:-6, laX:-36, laY:18, laH:18, raY:34, torsoY:-2 },
        { torsoLean:-8, laX:-38, laY:16, laH:16, raY:34, torsoY:-3 },
        { torsoLean:-8, laX:-38, laY:16, laH:16, raY:34, torsoY:-3 },
      ],
      hurt: [
        { torsoLean:-18, headY:-7, laY:16, raY:18, torsoY:-5 },
        { torsoLean:-10, headY:-3, laY:24, raY:26, torsoY:-2 },
        { torsoLean: -3, headY: 0, laY:30, raY:30, torsoY: 0 },
      ],
      die: [
        { torsoLean:20, torsoY:12, laY:48, raY:48, llH:15, rlH:15 },
        { torsoLean:30, torsoY:22, laY:58, raY:58, llH: 7, rlH: 7 },
        { torsoLean:36, torsoY:30, laY:62, raY:62, llH: 2, rlH: 2 },
      ],
      special: [
        { torsoY:-6,  laY:12, raY:12, headY:-5, laX:-28, raX:24 },
        { torsoY:-14, laY: 4, raY: 4, headY:-10, laX:-24, raX:20 },
        { torsoY:-8,  laY: 8, raY: 8, headY:-6,  laX:-30, raX:26 },
        { torsoY: 0,  laY:28, raY:28, headY: 0,  laX:-26, raX:22 },
      ],
    }

    Object.entries(POSES).forEach(([state, frames]) => {
      const gr = this.g(80, 104, frames.length)
      frames.forEach((pose, i) => {
        const ox = i * 80, oy = 4
        const cx = ox + 40
        const tl = pose.torsoLean || 0, ty = pose.torsoY || 0

        // Wing size varies by state — wider during action, drooping when hurt/dying
        const wW = (state === 'attack' || state === 'special') ? 38
          : state === 'jump'  ? 32
          : state === 'hurt'  ? 20
          : state === 'die'   ? 12
          : 28
        const wH = (state === 'attack' || state === 'special') ? 34
          : state === 'jump'  ? 30
          : state === 'hurt'  ? 16
          : state === 'die'   ?  8
          : 26
        const wCx = cx + tl * 0.4, wCy = oy + 40 + ty

        // Wing shadow/base layer
        gr.fillStyle(0x2d0052, 1)
        gr.fillTriangle(wCx-8, wCy-8, wCx-wW, wCy+wH, wCx-15, wCy+12)
        gr.fillTriangle(wCx+8, wCy-8, wCx+wW, wCy+wH, wCx+15, wCy+12)
        // Wing mid color
        gr.fillStyle(0x5b21b6, 1)
        gr.fillTriangle(wCx-7, wCy-6, wCx-wW+6, wCy+wH-5, wCx-13, wCy+10)
        gr.fillTriangle(wCx+7, wCy-6, wCx+wW-6, wCy+wH-5, wCx+13, wCy+10)
        // Wing highlight
        gr.fillStyle(0x8b5cf6, 0.65)
        gr.fillTriangle(wCx-5, wCy-4, wCx-Math.round(wW*0.58), wCy+Math.round(wH*0.58), wCx-10, wCy+8)
        gr.fillTriangle(wCx+5, wCy-4, wCx+Math.round(wW*0.58), wCy+Math.round(wH*0.58), wCx+10, wCy+8)
        // Wing vein lines
        gr.lineStyle(1, 0xa78bfa, 0.7)
        gr.lineBetween(wCx-8, wCy-4, wCx-wW+5, wCy+wH-7)
        gr.lineBetween(wCx+8, wCy-4, wCx+wW-5, wCy+wH-7)
        gr.lineStyle(1, 0x7c3aed, 0.4)
        gr.lineBetween(wCx-10, wCy, wCx-Math.round(wW*0.5), wCy+Math.round(wH*0.45))
        gr.lineBetween(wCx+10, wCy, wCx+Math.round(wW*0.5), wCy+Math.round(wH*0.45))

        // Aura glow — scales with attack frame intensity
        if (state === 'attack' || state === 'special') {
          const atkT = state === 'attack' ? i / (frames.length - 1) : 0.4 + 0.2 * (i % 2)
          gr.fillStyle(C.glow, 0.07 + atkT * 0.16)
          gr.fillEllipse(cx, oy + 52, 58 + atkT * 24, 42 + atkT * 16)
          gr.fillStyle(C.glow, 0.04 + atkT * 0.08)
          gr.fillEllipse(cx, oy + 52, 84 + atkT * 16, 64 + atkT * 10)
        }

        const p = this.drawBody(gr, ox, oy, pose, C)

        // Coat lapels with gold trim
        gr.fillStyle(0x6d28d9, 1)
        gr.fillTriangle(p.tX+9, p.tY, p.hCx-3, p.tY+14, p.tX, p.tY)
        gr.fillTriangle(p.tX+p.tW-9, p.tY, p.hCx+3, p.tY+14, p.tX+p.tW, p.tY)
        gr.lineStyle(1.5, 0xa78bfa, 0.65)
        gr.lineBetween(p.tX+9, p.tY, p.hCx-3, p.tY+14)
        gr.lineBetween(p.tX+p.tW-9, p.tY, p.hCx+3, p.tY+14)
        // Gold coat buttons
        gr.fillStyle(0xfbbf24, 1)
        gr.fillCircle(p.hCx, p.tY+10, 2.5); gr.fillCircle(p.hCx, p.tY+20, 2.5); gr.fillCircle(p.hCx, p.tY+30, 2.5)
        gr.fillStyle(0xfef9c3, 0.6)
        gr.fillCircle(p.hCx-0.5, p.tY+9, 1.2); gr.fillCircle(p.hCx-0.5, p.tY+19, 1.2); gr.fillCircle(p.hCx-0.5, p.tY+29, 1.2)

        // Hair — 5 dramatic spikes, tallest at center
        gr.fillStyle(0x1a0a00, 1)
        gr.fillEllipse(p.hCx, p.hCy - p.hR + 4, 32, 14)
        const ashSH = [9, 13, 17, 13, 9]
        for (let s = 0; s < 5; s++)
          gr.fillTriangle(p.hCx-11+s*5, p.hCy-p.hR+7, p.hCx-9+s*5, p.hCy-p.hR-ashSH[s], p.hCx-6+s*5, p.hCy-p.hR+7)

        // Gold crown — taller center spike, 3 gems
        const crX = p.hCx, crY = p.hCy - p.hR + 1
        gr.fillStyle(0xf59e0b, 1)
        gr.fillRect(crX-11, crY, 22, 7)
        gr.fillTriangle(crX-11, crY, crX-9, crY-10, crX-5, crY)
        gr.fillTriangle(crX-3,  crY, crX,   crY-16, crX+3, crY)
        gr.fillTriangle(crX+5,  crY, crX+9, crY-10, crX+11, crY)
        gr.fillStyle(0xfde68a, 0.65); gr.fillRect(crX-9, crY+1, 18, 2)
        gr.fillStyle(0xef4444, 1); gr.fillCircle(crX-7, crY+4, 2.5)
        gr.fillStyle(0xd946ef, 1); gr.fillCircle(crX, crY+4, 3.5)
        gr.fillStyle(0xef4444, 1); gr.fillCircle(crX+7, crY+4, 2.5)
        gr.fillStyle(0xf0abfc, 0.8); gr.fillCircle(crX, crY+4, 1.8)

        // Face
        this.face(gr, state, p.hCx, p.hCy, C.skin)

        // Purple glowing eyes (override)
        const ashEyeA = state === 'attack' || state === 'special' ? 1 : 0.88
        gr.fillStyle(0x7c3aed, ashEyeA)
        gr.fillCircle(p.hCx-4, p.hCy-3, 4); gr.fillCircle(p.hCx+4, p.hCy-3, 4)
        gr.fillStyle(0xddd6fe, ashEyeA)
        gr.fillCircle(p.hCx-4, p.hCy-3, 2.2); gr.fillCircle(p.hCx+4, p.hCy-3, 2.2)
        gr.fillStyle(0xffffff, 0.75)
        gr.fillCircle(p.hCx-3, p.hCy-4, 1); gr.fillCircle(p.hCx+5, p.hCy-4, 1)

        // Sledgehammer — runic engravings, anchored at hand
        const atkT2 = state === 'attack' ? i / (frames.length - 1) : 0
        const hx  = p.raEndX - 3
        const hy2 = p.raEndY - (state === 'attack'  ? [22,20,10, 2,18][i]||10
                               : state === 'special' ? [18,22,16,10][i]||12
                               : 12)
        if (state === 'attack' || state === 'special') {
          gr.fillStyle(C.glow, 0.28 + atkT2 * 0.48)
          gr.fillRoundedRect(hx-3, hy2, 11, 40, 2)
        }
        // Handle — leather-wrapped
        gr.fillStyle(0x78350f, 1); gr.fillRoundedRect(hx, hy2, 5, 40, 1)
        gr.fillStyle(0x4b1a00, 0.55)
        for (let w = 0; w < 6; w++) gr.fillRect(hx, hy2+2+w*6, 5, 3)
        gr.fillStyle(0x92400e, 0.4); gr.fillRect(hx+1, hy2, 2, 40)
        // Head glow
        gr.fillStyle(C.glow, state === 'attack' ? 0.34 + atkT2 * 0.52 : 0.44)
        gr.fillRoundedRect(hx-13, hy2-6, 32, 24, 5)
        // Head — dark steel
        gr.fillStyle(0x374151, 1); gr.fillRoundedRect(hx-12, hy2-4, 29, 20, 3)
        gr.fillStyle(0x4b5563, 1); gr.fillRoundedRect(hx-10, hy2-2, 25, 16, 2)
        gr.fillStyle(0x9ca3af, 0.5); gr.fillRect(hx-8, hy2+2, 18, 6)
        // Runic engravings
        const runeA = state === 'attack' ? 0.55 + atkT2*0.4 : 0.28
        gr.lineStyle(1, 0xc084fc, runeA)
        gr.lineBetween(hx-6, hy2+2, hx-6, hy2+14); gr.lineBetween(hx-6, hy2+8, hx+1, hy2+8)
        gr.lineBetween(hx+3, hy2+2, hx+3, hy2+14)
        gr.lineBetween(hx+7, hy2+2, hx+13, hy2+8); gr.lineBetween(hx+7, hy2+8, hx+13, hy2+14)
        // Impact burst — bigger
        if (state === 'attack' && i === 3) {
          gr.lineStyle(2, 0xfbbf24, 1)
          gr.lineBetween(hx+17, hy2-4, hx+28, hy2-20)
          gr.lineBetween(hx+17, hy2-4, hx+30, hy2-12)
          gr.lineBetween(hx+17, hy2-4, hx+24, hy2-22)
          gr.lineStyle(1.5, 0xc084fc, 0.95)
          gr.lineBetween(hx+17, hy2-4, hx+26, hy2-16)
          gr.fillStyle(0xfde68a, 1); gr.fillCircle(hx+17, hy2-4, 5)
          gr.fillStyle(0xffffff, 0.7); gr.fillCircle(hx+17, hy2-4, 2.5)
        }
        // Rivets
        gr.fillStyle(0x6b7280, 1)
        gr.fillCircle(hx-8, hy2+3, 2.5); gr.fillCircle(hx+15, hy2+3, 2.5)
        gr.fillCircle(hx-8, hy2+12, 2.5); gr.fillCircle(hx+15, hy2+12, 2.5)
      })
      gr.done(`ash_${state}`)
    })
  }

  // ══════════════════════════════════════════════════════════════════
  // MERRS — black hoodie / white left sleeve, headband, sword + bow
  // ══════════════════════════════════════════════════════════════════
  makeMerrs() {
    const C = { body: 0x111111, pants: 0x0d0d0d, skin: 0xf5cba7, lSleeve: 0xffffff, rSleeve: 0x111111, glow: 0x60a5fa }

    const POSES = {
      idle: [
        { torsoLean: 3, torsoY: 0,  laY:31, raY:22 },
        { torsoLean: 3, torsoY:-2,  laY:29, raY:20 },
        { torsoLean: 3, torsoY:-4,  laY:27, raY:18 },
        { torsoLean: 3, torsoY:-2,  laY:29, raY:20 },
      ],
      walk: [
        { torsoLean: 5, laY:18, raY:42, llY:52, rlY:68, llH:36, rlH:18 },
        { torsoLean: 8, laY:13, raY:47, llY:46, rlY:75, llH:42, rlH:11 },
        { torsoLean: 4, laY:22, raY:36, llY:56, rlY:64, llH:30, rlH:24 },
        { torsoLean:-4, laY:36, raY:22, llY:64, rlY:56, llH:24, rlH:30 },
        { torsoLean:-8, laY:47, raY:13, llY:75, rlY:46, llH:11, rlH:42 },
        { torsoLean:-5, laY:42, raY:18, llY:68, rlY:52, llH:18, rlH:36 },
      ],
      jump: [
        { torsoY: 6, torsoLean:-2, laY:32, raY:32, llY:74, rlY:74, llH:10, rlH:10 },
        { torsoY:-11, headY:-4, laY: 9, raY: 9, llY:80, rlY:80, llH: 6, rlH: 6 },
        { torsoY:-3,  headY:-1, laY:19, raY:19, llY:70, rlY:70, llH:20, rlH:20 },
      ],
      attack: [
        { torsoLean:-10, raX:8, raY:10, laY:36, headY:-3 },
        { torsoLean:-14, raEnd:{x:40,y:16}, laY:32, headY:-5 },
        { torsoLean:  6, raEnd:{x:62,y:24}, laY:28, headY:-1 },
        { torsoLean: 18, raEnd:{x:78,y:32}, laY:24, headY: 4 },
        { torsoLean: 10, raEnd:{x:70,y:48}, laY:30, headY: 1 },
      ],
      block: [
        { torsoLean:-6, laX:-34, laY:20, laH:20, raY:36 },
        { torsoLean:-8, laX:-36, laY:18, laH:18, raY:36, torsoY:-2 },
        { torsoLean:-8, laX:-36, laY:18, laH:18, raY:36, torsoY:-2 },
      ],
      hurt: [
        { torsoLean:-16, headY:-6, laY:18, raY:20, torsoY:-4 },
        { torsoLean: -9, headY:-3, laY:25, raY:27, torsoY:-2 },
        { torsoLean: -2, headY: 0, laY:30, raY:30, torsoY: 0 },
      ],
      die: [
        { torsoLean:18, torsoY:10, laY:46, raY:46, llH:16, rlH:16 },
        { torsoLean:28, torsoY:20, laY:56, raY:56, llH: 7, rlH: 7 },
        { torsoLean:34, torsoY:28, laY:60, raY:60, llH: 2, rlH: 2 },
      ],
      special: [
        { torsoLean:-6, raX:28, raY:16, headY:-2 },
        { torsoLean:20, raEnd:{x:74,y:28}, laY:32, headY:-4 },
        { torsoLean:16, raEnd:{x:70,y:36}, laY:30, headY:-3 },
        { torsoLean: 4, raX:20, raY:28, headY: 0 },
      ],
    }

    Object.entries(POSES).forEach(([state, frames]) => {
      const gr = this.g(80, 104, frames.length)
      frames.forEach((pose, i) => {
        const ox = i * 80, oy = 4
        const cx = ox + 40

        // Aura scales with attack intensity
        if (state === 'attack' || state === 'special') {
          const atkT = state === 'attack' ? i / (frames.length - 1) : 0.4 + 0.2 * (i % 2)
          gr.fillStyle(C.glow, 0.07 + atkT * 0.14)
          gr.fillEllipse(cx, oy + 52, 56 + atkT * 20, 42 + atkT * 12)
          gr.fillStyle(C.glow, 0.04 + atkT * 0.07)
          gr.fillEllipse(cx, oy + 52, 80 + atkT * 14, 60 + atkT * 8)
        }

        const p = this.drawBody(gr, ox, oy, pose, C)

        // Hood — with white inner edge
        gr.fillStyle(0x0d0d0d, 1)
        gr.fillEllipse(p.hCx, p.hCy - p.hR + 2, 36, 20)
        gr.fillRect(p.hCx - 18, p.hCy - p.hR + 8, 36, p.hR + 2)
        gr.fillStyle(0x000000, 0.4); gr.fillEllipse(p.hCx, p.hCy - p.hR + 6, 28, 12)
        gr.fillStyle(0x2a2a2a, 0.7); gr.fillEllipse(p.hCx, p.hCy - p.hR + 4, 32, 14)
        // White inner lining edge
        gr.fillStyle(0xffffff, 0.12); gr.fillEllipse(p.hCx, p.hCy - p.hR + 3, 34, 16)

        // Brown hair showing under hood
        gr.fillStyle(0x5c3a1e, 1); gr.fillEllipse(p.hCx, p.hCy - 4, 22, 10)

        // Blue headband (brighter, glows during special/attack)
        const hbGlow = state === 'special' || state === 'attack'
        gr.fillStyle(hbGlow ? 0x2563eb : 0x1d4ed8, 1)
        gr.fillRect(p.hCx - 14, p.hCy - 2, 28, 5)
        gr.fillStyle(hbGlow ? 0xbfdbfe : 0x3b82f6, hbGlow ? 0.85 : 0.55)
        gr.fillRect(p.hCx - 12, p.hCy - 1, 24, 2)

        // Face
        this.face(gr, state, p.hCx, p.hCy, C.skin)

        // Blue glowing eyes (override)
        const meEyeA = state === 'attack' || state === 'special' ? 1 : 0.82
        gr.fillStyle(0x3b82f6, meEyeA)
        gr.fillCircle(p.hCx-4, p.hCy-3, 4); gr.fillCircle(p.hCx+4, p.hCy-3, 4)
        gr.fillStyle(0xbae6fd, meEyeA)
        gr.fillCircle(p.hCx-4, p.hCy-3, 2.2); gr.fillCircle(p.hCx+4, p.hCy-3, 2.2)
        gr.fillStyle(0xffffff, 0.75)
        gr.fillCircle(p.hCx-3, p.hCy-4, 1); gr.fillCircle(p.hCx+5, p.hCy-4, 1)

        // Arrow quiver on right side (tips visible above shoulder)
        const qx = ox + 60, qy = oy + 24
        gr.fillStyle(0x92400e, 1); gr.fillRoundedRect(qx, qy+6, 9, 26, 3)
        gr.fillStyle(0x78350f, 0.6); gr.fillRect(qx+1, qy+8, 7, 22)
        for (let a = 0; a < 3; a++) {
          gr.fillStyle(0x78350f, 1); gr.fillRect(qx+2+a*2, qy-12, 1.5, 20)
          const fc = [0xef4444, 0x60a5fa, 0xfbbf24][a]
          gr.fillStyle(fc, 1)
          gr.fillTriangle(qx+1.5+a*2, qy-12, qx+2.5+a*2, qy-18, qx+3.5+a*2, qy-12)
        }

        // Sword — fuller groove, upgraded guard
        const atkT2 = state === 'attack' ? i / (frames.length - 1) : 0
        const sx = p.raEndX - 2
        const sy = p.raEndY - (state === 'attack'  ? [22,20,10, 2,18][i]||14
                               : state === 'special' ? [14,18,12,10][i]||12
                               : 14)
        gr.fillStyle(C.glow, state === 'attack' ? 0.28 + atkT2*0.5 : 0.32)
        gr.fillRect(sx-2, sy, 8, 16)
        gr.fillStyle(0xd1d5db, 1); gr.fillRect(sx, sy, 4, 40)
        gr.fillStyle(0xfafafa, 0.7); gr.fillRect(sx+1, sy, 2, 34)
        gr.fillStyle(0x9ca3af, 0.5); gr.fillRect(sx+3, sy+4, 1, 32)
        if (state === 'attack' && i === 3) {
          gr.lineStyle(2, 0x93c5fd, 1)
          gr.lineBetween(sx+2, sy, sx+13, sy-16); gr.lineBetween(sx+2, sy, sx+15, sy-8)
          gr.lineBetween(sx+2, sy, sx+9, sy-18)
          gr.lineStyle(1, 0x60a5fa, 0.8); gr.lineBetween(sx+2, sy, sx+6, sy-20)
          gr.fillStyle(0xbfdbfe, 0.95); gr.fillCircle(sx+2, sy, 5)
          gr.fillStyle(0xffffff, 0.6); gr.fillCircle(sx+2, sy, 2.5)
        }
        // Guard — wider gold
        gr.fillStyle(0xf59e0b, 1); gr.fillRect(sx-10, sy+12, 24, 5)
        gr.fillStyle(0xfbbf24, 0.6); gr.fillRect(sx-8, sy+13, 20, 2)
        // Grip + pommel
        gr.fillStyle(0x78350f, 1); gr.fillRoundedRect(sx, sy+17, 4, 12, 1)
        gr.fillStyle(0x4b1a00, 0.5); gr.fillRect(sx, sy+19, 4, 2); gr.fillRect(sx, sy+23, 4, 2)
        gr.fillStyle(0xf59e0b, 1); gr.fillCircle(sx+2, sy+31, 4.5)
        gr.fillStyle(0xfef3c7, 0.7); gr.fillCircle(sx+2, sy+30, 2)

        // Bow on left side — bigger, glowing string during special
        const bx = ox + 6, by = oy + 40
        gr.lineStyle(4, 0x92400e, 1)
        gr.beginPath(); gr.arc(bx+4, by, 26, -1.1, 1.1); gr.strokePath()
        gr.lineStyle(1, 0x78350f, 0.5)
        gr.beginPath(); gr.arc(bx+4, by, 22, -0.9, 0.9); gr.strokePath()
        gr.lineStyle(state === 'special' ? 2 : 1.5, state === 'special' ? 0x93c5fd : 0xd1d5db, 0.95)
        gr.lineBetween(bx+4, by-26, bx+4, by+26)
        if (state === 'idle' || state === 'walk') {
          gr.fillStyle(0x78350f, 1); gr.fillRect(bx+3, by-18, 1.5, 36)
          gr.fillStyle(0xef4444, 1); gr.fillTriangle(bx+2, by-18, bx+3.5, by-24, bx+5, by-18)
        }
      })
      gr.done(`merrs_${state}`)
    })
  }

  // ══════════════════════════════════════════════════════════════════
  // DICE — black hoodie, gold hex shades, gold chain, crossbow
  // ══════════════════════════════════════════════════════════════════
  makeDice() {
    const C = { body: 0x18181b, pants: 0x111111, skin: 0xf5cba7, shoe: 0x111111, glow: 0xfbbf24 }

    const POSES = {
      idle: [
        { torsoLean: 4, torsoY: 0,  laY:31, raY:26, llY:62, rlY:60 },
        { torsoLean: 4, torsoY:-2,  laY:29, raY:24, llY:62, rlY:60 },
        { torsoLean: 4, torsoY:-4,  laY:27, raY:22, llY:62, rlY:60 },
        { torsoLean: 4, torsoY:-2,  laY:29, raY:24, llY:62, rlY:60 },
      ],
      walk: [
        { torsoLean: 5, laY:17, raY:42, llY:52, rlY:68, llH:36, rlH:18 },
        { torsoLean: 7, laY:12, raY:47, llY:46, rlY:75, llH:42, rlH:11 },
        { torsoLean: 4, laY:21, raY:36, llY:56, rlY:64, llH:30, rlH:24 },
        { torsoLean:-4, laY:36, raY:21, llY:64, rlY:56, llH:24, rlH:30 },
        { torsoLean:-7, laY:47, raY:12, llY:75, rlY:46, llH:11, rlH:42 },
        { torsoLean:-5, laY:42, raY:17, llY:68, rlY:52, llH:18, rlH:36 },
      ],
      jump: [
        { torsoY: 6, torsoLean:-2, laY:34, raY:34, llY:74, rlY:74, llH:10, rlH:10 },
        { torsoY:-11, headY:-3, laY:10, raY:10, llY:80, rlY:80, llH: 6, rlH: 6 },
        { torsoY:-3,  headY:-1, laY:20, raY:20, llY:70, rlY:70, llH:20, rlH:20 },
      ],
      attack: [
        { torsoLean:-8,  raX:18, raY:16, laY:36 },
        { torsoLean:-12, raEnd:{x:38,y:18}, laY:32 },
        { torsoLean:  6, raEnd:{x:62,y:26}, laY:28 },
        { torsoLean: 14, raEnd:{x:76,y:36}, laY:24 },
        { torsoLean:  6, raEnd:{x:68,y:50}, laY:30 },
      ],
      block: [
        { torsoLean:-5, laX:-34, laY:22, laH:18, raY:36 },
        { torsoLean:-7, laX:-36, laY:20, laH:16, raY:36, torsoY:-2 },
        { torsoLean:-7, laX:-36, laY:20, laH:16, raY:36, torsoY:-2 },
      ],
      hurt: [
        { torsoLean:-16, headY:-6, laY:18, raY:20, torsoY:-4 },
        { torsoLean: -9, headY:-3, laY:24, raY:26, torsoY:-2 },
        { torsoLean: -2, headY: 0, laY:30, raY:30, torsoY: 0 },
      ],
      die: [
        { torsoLean:18, torsoY:10, laY:46, raY:46, llH:16, rlH:16 },
        { torsoLean:28, torsoY:20, laY:56, raY:56, llH: 7, rlH: 7 },
        { torsoLean:34, torsoY:28, laY:60, raY:60, llH: 2, rlH: 2 },
      ],
      special: [
        { torsoLean:-4, laY:14, raY:14, headY:-3, laX:-28 },
        { torsoLean:-8, laY: 8, raY: 8, headY:-6, laX:-24 },
        { torsoLean: 6, laY:18, raY:22, headY:-2, laX:-26 },
        { torsoLean: 1, laY:28, raY:28, headY: 0, laX:-26 },
      ],
    }

    Object.entries(POSES).forEach(([state, frames]) => {
      const gr = this.g(80, 104, frames.length)
      frames.forEach((pose, i) => {
        const ox = i * 80, oy = 4
        const cx = ox + 40

        // Gold aura scales with attack intensity
        if (state === 'attack' || state === 'special') {
          const atkT = state === 'attack' ? i / (frames.length - 1) : 0.4 + 0.2 * (i % 2)
          gr.fillStyle(C.glow, 0.07 + atkT * 0.13)
          gr.fillEllipse(cx, oy + 52, 56 + atkT * 18, 40 + atkT * 12)
          gr.fillStyle(C.glow, 0.04 + atkT * 0.06)
          gr.fillEllipse(cx, oy + 52, 78 + atkT * 12, 58 + atkT * 8)
        }

        const p = this.drawBody(gr, ox, oy, pose, C)

        // White sneaker soles with stripe
        gr.fillStyle(0xf0f0f0, 1)
        gr.fillRect(p.llX-p.lW/2-1, p.llY+p.llH+2, p.lW+4, 5)
        gr.fillRect(p.rlX-p.lW/2-1, p.rlY+p.rlH+2, p.lW+4, 5)
        gr.fillStyle(0xf59e0b, 0.8)
        gr.fillRect(p.llX-p.lW/2, p.llY+p.llH+3, p.lW+2, 2)
        gr.fillRect(p.rlX-p.lW/2, p.rlY+p.rlH+3, p.lW+2, 2)

        // Hoodie pocket
        gr.fillStyle(0x000000, 0.28); gr.fillRoundedRect(p.tX+5, p.tY+p.tH-13, 22, 11, 2)

        // Backwards snapback cap (on top of hood)
        const capY = p.hCy - p.hR - 2
        gr.fillStyle(0x111111, 1); gr.fillEllipse(p.hCx, capY, 38, 15)
        gr.fillRect(p.hCx - 19, capY - 2, 38, 8)
        // Brim (backwards — sticks out back-left in sprite orientation)
        gr.fillStyle(0x000000, 1); gr.fillRoundedRect(p.hCx-21, capY-3, 9, 5, 2)
        gr.fillStyle(0x1a1a1a, 0.7); gr.fillRect(p.hCx-19, capY-2, 6, 3)
        // Cap button top
        gr.fillStyle(0xf59e0b, 1); gr.fillCircle(p.hCx, capY-6, 2.5)
        // Cap logo on front (now facing side)
        gr.fillStyle(0xf59e0b, 0.9); gr.fillCircle(p.hCx+8, capY+1, 3.5)
        gr.fillStyle(0x000000, 0.7); gr.fillCircle(p.hCx+8, capY+1, 2)

        // Messy dark hair under cap
        gr.fillStyle(0x2c1a0a, 1); gr.fillEllipse(p.hCx, p.hCy-p.hR+5, 30, 14)
        for (let s = 0; s < 4; s++)
          gr.fillTriangle(p.hCx-10+s*7, p.hCy-p.hR+8, p.hCx-8+s*7, p.hCy-p.hR-5, p.hCx-5+s*7, p.hCy-p.hR+8)
        gr.fillTriangle(p.hCx-15, p.hCy-3, p.hCx-19, p.hCy-9, p.hCx-10, p.hCy-1)

        // Face
        this.face(gr, state, p.hCx, p.hCy, C.skin)

        // Gold hexagonal shades
        const gx = p.hCx, gy = p.hCy - 2
        gr.fillStyle(0xf59e0b, 1)
        gr.fillPoints([{x:gx-14,y:gy-2},{x:gx-10,y:gy-7},{x:gx-4,y:gy-7},{x:gx-1,y:gy-2},{x:gx-4,y:gy+3},{x:gx-10,y:gy+3}], true)
        gr.fillStyle(0x000000, 0.65)
        gr.fillPoints([{x:gx-13,y:gy-2},{x:gx-10,y:gy-6},{x:gx-5,y:gy-6},{x:gx-2,y:gy-2},{x:gx-5,y:gy+2},{x:gx-10,y:gy+2}], true)
        gr.fillStyle(0xf59e0b, 1)
        gr.fillPoints([{x:gx+1,y:gy-2},{x:gx+4,y:gy-7},{x:gx+10,y:gy-7},{x:gx+13,y:gy-2},{x:gx+10,y:gy+3},{x:gx+4,y:gy+3}], true)
        gr.fillStyle(0x000000, 0.65)
        gr.fillPoints([{x:gx+2,y:gy-2},{x:gx+5,y:gy-6},{x:gx+9,y:gy-6},{x:gx+12,y:gy-2},{x:gx+9,y:gy+2},{x:gx+5,y:gy+2}], true)
        gr.fillStyle(0xf59e0b, 1)
        gr.fillRect(gx-1, gy-1, 2, 3); gr.fillRect(gx-17, gy-1, 2, 3); gr.fillRect(gx+15, gy-1, 2, 3)
        gr.fillStyle(0xfde68a, 0.4)
        gr.fillPoints([{x:gx-13,y:gy-5},{x:gx-10,y:gy-6},{x:gx-6,y:gy-5},{x:gx-9,y:gy-3}], true)

        // Gold chain — more links, dice pendant
        gr.fillStyle(0xf59e0b, 1)
        for (let c = 0; c < 9; c++) gr.fillCircle(p.tX+3+c*3, p.tY+9, 1.8)
        // Dice pendant (square with dots)
        const pdX = p.tX+6, pdY = p.tY+14
        gr.fillStyle(0xf59e0b, 1); gr.fillRoundedRect(pdX, pdY, 12, 12, 2)
        gr.fillStyle(0x111111, 1)
        gr.fillCircle(pdX+3, pdY+3, 1.4); gr.fillCircle(pdX+9, pdY+3, 1.4)
        gr.fillCircle(pdX+6, pdY+6, 1.4)
        gr.fillCircle(pdX+3, pdY+9, 1.4); gr.fillCircle(pdX+9, pdY+9, 1.4)

        // Crossbow — scope + gold bolt tip
        const atkT2 = state === 'attack' ? i / (frames.length - 1) : 0
        const cbX = p.raEndX
        const cbY = p.raEndY - (state === 'attack' ? [14,18,6,4,12][i]||8 : 8)
        const ao  = state === 'attack' ? [-2,-6,-10,-8,0][i]||0 : 0
        gr.fillStyle(0x78350f, 1); gr.fillRoundedRect(cbX, cbY+5, 22+ao, 9, 2)
        gr.fillStyle(0x92400e, 0.4); gr.fillRect(cbX+1, cbY+6, 18, 4)
        // Scope (new detail)
        gr.fillStyle(0x1f2937, 1); gr.fillRoundedRect(cbX+4, cbY-9, 14, 5, 2)
        gr.fillStyle(0x60a5fa, 0.6); gr.fillCircle(cbX+15, cbY-7, 3)
        gr.fillStyle(0xbae6fd, 0.4); gr.fillCircle(cbX+15, cbY-7, 1.5)
        gr.fillStyle(0x374151, 1); gr.fillRect(cbX+4, cbY-4, 8, 18)
        gr.fillStyle(0x6b7280, 0.6); gr.fillRect(cbX+5, cbY-3, 6, 16)
        gr.lineStyle(3, 0x78350f, 1)
        gr.beginPath(); gr.arc(cbX+8, cbY+9, 14, -0.75, 0.75); gr.strokePath()
        gr.lineStyle(1.2, 0xe5e7eb, 0.95); gr.lineBetween(cbX+8, cbY-3, cbX+8, cbY+23)
        gr.fillStyle(0xd1d5db, 1); gr.fillRect(cbX+6, cbY+3, 14, 3)
        // Gold bolt tip
        gr.fillStyle(0xfbbf24, 1); gr.fillTriangle(cbX+20, cbY+3, cbX+26+ao, cbY+4, cbX+20, cbY+6)
        if (state === 'attack' && i === 3) {
          gr.lineStyle(2, 0xfbbf24, 1)
          gr.lineBetween(cbX+24, cbY+4, cbX+35, cbY-9); gr.lineBetween(cbX+24, cbY+4, cbX+37, cbY+1)
          gr.lineBetween(cbX+24, cbY+4, cbX+31, cbY-11)
          gr.lineStyle(1.5, 0xfef08a, 0.8); gr.lineBetween(cbX+24, cbY+4, cbX+33, cbY+12)
          gr.fillStyle(0xfef08a, 0.95); gr.fillCircle(cbX+24, cbY+4, 5)
          gr.fillStyle(0xffffff, 0.6); gr.fillCircle(cbX+24, cbY+4, 2.5)
        }
      })
      gr.done(`dice_${state}`)
    })
  }

  // ══════════════════════════════════════════════════════════════════
  // THRAGG — wide build, flame hoodie, dreads, red eyes, battle axe
  // ══════════════════════════════════════════════════════════════════
  makeThragg() {
    // Thragg uses 88px wide frames, manually drawn (wider body than drawBody supports)
    const SKIN = 0x3d1f0a
    const BODY = 0x111111
    const PANT = 0x0d0d0d

    const POSES = {
      idle: [
        { torsoY: 0, laY:28, raY:28, llX:-16, rlX:6 },
        { torsoY:-2, laY:26, raY:30, llX:-16, rlX:6 },
        { torsoY:-4, laY:24, raY:32, llX:-16, rlX:6 },
        { torsoY:-2, laY:26, raY:30, llX:-16, rlX:6 },
      ],
      walk: [
        { torsoLean: 4, laY:20, raY:40, llY:52, rlY:66, llH:36, rlH:20 },
        { torsoLean: 7, laY:14, raY:46, llY:46, rlY:74, llH:42, rlH:12 },
        { torsoLean: 3, laY:22, raY:36, llY:56, rlY:62, llH:30, rlH:26 },
        { torsoLean:-3, laY:36, raY:22, llY:62, rlY:56, llH:26, rlH:30 },
        { torsoLean:-7, laY:46, raY:14, llY:74, rlY:46, llH:12, rlH:42 },
        { torsoLean:-4, laY:40, raY:20, llY:66, rlY:52, llH:20, rlH:36 },
      ],
      jump: [
        { torsoY: 7, torsoLean:-2, laY:22, raY:22, llY:70, rlY:70, llH:12, rlH:12 },
        { torsoY:-10, headY:-4, laY: 8, raY: 8, llY:76, rlY:76, llH: 8, rlH: 8 },
        { torsoY:-4,  headY:-1, laY:16, raY:16, llY:68, rlY:68, llH:20, rlH:20 },
      ],
      attack: [
        { torsoLean:-12, raX:8, raY:6, laY:42, headY:-4 },
        { torsoLean:-18, raEnd:{x:50,y:14}, laY:38, headY:-6 },
        { torsoLean:  8, raEnd:{x:72,y:36}, laY:28, headY: 0 },
        { torsoLean: 20, raEnd:{x:84,y:52}, laY:24, headY: 5 },
        { torsoLean: 10, raEnd:{x:74,y:62}, laY:30, headY: 2 },
      ],
      block: [
        { torsoLean:-6, laX:-30, laY:18, laH:22, raY:34, headY:-2 },
        { torsoLean:-9, laX:-32, laY:16, laH:20, raY:34, headY:-3, torsoY:-2 },
        { torsoLean:-9, laX:-32, laY:16, laH:20, raY:34, headY:-3, torsoY:-2 },
      ],
      hurt: [
        { torsoLean:-16, headY:-6, laY:18, raY:20, torsoY:-5 },
        { torsoLean: -9, headY:-3, laY:24, raY:26, torsoY:-2 },
        { torsoLean: -2, headY: 0, laY:28, raY:28, torsoY: 0 },
      ],
      die: [
        { torsoLean:20, torsoY:12, laY:50, raY:50, llH:14, rlH:14 },
        { torsoLean:30, torsoY:22, laY:58, raY:58, llH: 6, rlH: 6 },
        { torsoLean:36, torsoY:30, laY:62, raY:62, llH: 1, rlH: 1 },
      ],
      special: [
        { torsoLean: 8, raX:16, raY:18, headY:-2, torsoY:2 },
        { torsoLean:14, raX:14, raY: 8, headY:-6, torsoY:-2 },
        { torsoLean:10, raX:12, raY:12, headY:-4 },
        { torsoLean: 2, raX:14, raY:28, headY: 0 },
      ],
    }

    Object.entries(POSES).forEach(([state, frames]) => {
      const gr = this.g(88, 112, frames.length)
      frames.forEach((pose, i) => {
        const ox  = i * 88, oy = 4
        const cx  = ox + 44           // centre of 88-px frame
        const tl  = pose.torsoLean || 0
        const ty  = pose.torsoY    || 0
        const hy  = pose.headY     || 0

        // dimensions
        const tW = 40, tH = 42
        const lW = 14, aW = 14, hR = 15

        // legs
        const llX = cx + (pose.llX ?? -14)
        const rlX = cx + (pose.rlX ??  4)
        const llY = oy + (pose.llY ?? 60)
        const rlY = oy + (pose.rlY ?? 60)
        const llH = pose.llH ?? 30
        const rlH = pose.rlH ?? 30

        // Red aura scales with attack intensity
        const atkT = (state === 'attack' || state === 'special')
          ? (state === 'attack' ? i / (frames.length - 1) : 0.4 + 0.2 * (i % 2))
          : 0
        if (atkT > 0) {
          gr.fillStyle(0xef4444, 0.08 + atkT * 0.14)
          gr.fillEllipse(cx, oy + 54, 66 + atkT * 22, 50 + atkT * 16)
          gr.fillStyle(0xef4444, 0.04 + atkT * 0.07)
          gr.fillEllipse(cx, oy + 54, 92 + atkT * 14, 72 + atkT * 10)
        }

        this.box(gr, PANT, llX-lW/2, llY, lW, llH, 4)
        this.box(gr, PANT, rlX-lW/2, rlY, lW, rlH, 4)
        gr.fillStyle(0x000000, 0.2)
        gr.fillRect(llX-lW/2, llY+llH*0.4, lW, 4)
        gr.fillRect(rlX-lW/2, rlY+rlH*0.4, lW, 4)

        // torso
        const tX = cx + tl - tW/2
        const tY = oy + 24 + ty
        this.box(gr, BODY, tX, tY, tW, tH, 5)
        // highlight / shadow
        gr.fillStyle(0xffffff, 0.08)
        gr.fillRoundedRect(tX+2, tY+4, 6, tH-8, 2)
        gr.fillStyle(0x000000, 0.2)
        gr.fillRoundedRect(tX+tW-8, tY+4, 6, tH-8, 2)
        // Flame prints (intensify during attack/special)
        const fb = tY + tH - 2, fc = cx + tl
        const flA = atkT > 0 ? 0.9 + atkT * 0.09 : 0.85
        gr.fillStyle(0xea580c, flA)
        gr.fillTriangle(fc-15, fb, fc-7, fb-20, fc+1,  fb)
        gr.fillTriangle(fc-2,  fb, fc+5, fb-24, fc+13, fb)
        gr.fillTriangle(fc+11, fb, fc+17,fb-16, fc+23, fb)
        gr.fillStyle(0xfbbf24, 0.75 + atkT * 0.15)
        gr.fillTriangle(fc-14, fb, fc-7, fb-12, fc+0,  fb)
        gr.fillTriangle(fc-1,  fb, fc+5, fb-15, fc+12, fb)
        gr.fillTriangle(fc+12, fb, fc+17,fb-10, fc+22, fb)
        gr.fillStyle(0xfef08a, 0.5 + atkT * 0.2)
        gr.fillTriangle(fc-12, fb, fc-7, fb-6,  fc-1,  fb)
        gr.fillTriangle(fc+1,  fb, fc+5, fb-8,  fc+11, fb)
        // zip
        gr.lineStyle(1.5, 0x333333, 0.8)
        gr.lineBetween(cx+tl, tY+2, cx+tl, tY+tH)

        // arms
        const laX = cx + tl + (pose.laX ?? -(tW/2 + 14))
        const raX = cx + tl + (pose.raX ?? (tW/2 + 2))
        const laY = oy + (pose.laY ?? 28)
        const raY = oy + (pose.raY ?? 28)
        const laH = pose.laH ?? 28
        const raH = pose.raH ?? 28

        this.box(gr, BODY, laX, laY, aW, laH, 4)
        this.dot(gr, SKIN, laX+aW/2, laY+laH+1, 5)
        let thRaEndX, thRaEndY
        if (pose.raEnd) {
          thRaEndX = ox + pose.raEnd.x; thRaEndY = oy + pose.raEnd.y
          this.lineLimb(gr, BODY, raX+aW/2, raY+4, thRaEndX, thRaEndY, aW)
          this.dot(gr, SKIN, thRaEndX, thRaEndY, 5)
        } else {
          this.box(gr, BODY, raX, raY, aW, raH, 4)
          thRaEndX = raX+aW/2; thRaEndY = raY+raH+1
          this.dot(gr, SKIN, thRaEndX, thRaEndY, 5)
        }

        // neck
        const hCx = cx + tl * 0.6
        const hCy = oy + 15 + hy + ty
        gr.fillStyle(SKIN, 1)
        gr.fillRect(hCx-6, hCy+hR-2, 12, 10)

        // head
        this.dot(gr, SKIN, hCx, hCy, hR)

        // dreadlocks hanging over face
        for (let d = 0; d < 9; d++) {
          const dx  = hCx - 20 + d * 5
          const dL  = 22 + (d % 3) * 7
          gr.fillStyle(0x1a0a00, 1)
          gr.fillRoundedRect(dx-3, hCy-hR+3, 6, dL, 3)
          // tip fade
          gr.fillStyle(0x2c1a0a, 0.7)
          gr.fillRoundedRect(dx-2, hCy-hR+3+dL-5, 4, 5, 2)
        }
        // dread crown
        gr.fillStyle(0x1a0a00, 1)
        gr.fillEllipse(hCx, hCy-hR+5, 38, 18)

        // Glowing red eyes (brighter during attack/special)
        gr.fillStyle(0xdc2626, atkT > 0 ? 0.99 : 0.95)
        gr.fillCircle(hCx-5, hCy-1, 4)
        gr.fillCircle(hCx+5, hCy-1, 4)
        gr.fillStyle(0xf97316, atkT > 0 ? 0.95 : 0.85)
        gr.fillCircle(hCx-5, hCy-1, 2)
        gr.fillCircle(hCx+5, hCy-1, 2)
        gr.fillStyle(0xffffff, 0.5)
        gr.fillCircle(hCx-4, hCy-2, 1)
        gr.fillCircle(hCx+6, hCy-2, 1)

        // Scar
        gr.lineStyle(1.5, 0x7f1d1d, 0.85)
        gr.lineBetween(hCx+4, hCy+3, hCx+10, hCy+9)

        // War paint streaks (orange-red across face)
        gr.lineStyle(2, 0xea580c, 0.75)
        gr.lineBetween(hCx-9, hCy-5, hCx-3, hCy+5)
        gr.lineBetween(hCx+3, hCy-5, hCx+9, hCy+5)
        gr.lineStyle(1.5, 0xfb923c, 0.5)
        gr.lineBetween(hCx-12, hCy+1, hCx-5, hCy+7)

        // Shoulder armor pads (over arms)
        const spY2 = oy + 24 + ty
        gr.fillStyle(0x1f2937, 1)
        gr.fillRoundedRect(cx+tl-tW/2-15, spY2-2, 15, 11, 3)
        gr.fillTriangle(cx+tl-tW/2-13, spY2-2, cx+tl-tW/2-7, spY2-9, cx+tl-tW/2-1, spY2-2)
        gr.fillStyle(0x374151, 0.7); gr.fillRect(cx+tl-tW/2-13, spY2+3, 11, 3)
        gr.fillStyle(0x1f2937, 1)
        gr.fillRoundedRect(cx+tl+tW/2, spY2-2, 15, 11, 3)
        gr.fillTriangle(cx+tl+tW/2+1, spY2-2, cx+tl+tW/2+7, spY2-9, cx+tl+tW/2+13, spY2-2)
        gr.fillStyle(0x374151, 0.7); gr.fillRect(cx+tl+tW/2+2, spY2+3, 11, 3)

        // Battle axe — bigger, meaner
        const ax = pose.raEnd ? thRaEndX - 2 : raX + aW + 1
        const ay = pose.raEnd ? thRaEndY - 34 : raY - 12
        if (atkT > 0) {
          gr.fillStyle(0xef4444, 0.24 + atkT*0.34)
          gr.fillRect(ax-2, ay, 10, 58)
        }
        // Handle — wrapped leather
        gr.fillStyle(0x78350f, 1); gr.fillRect(ax, ay, 6, 56)
        gr.fillStyle(0x92400e, 0.5)
        for (let w = 0; w < 8; w++) gr.fillRect(ax, ay+2+w*6, 6, 3)
        gr.fillStyle(0x4b1a00, 0.4); gr.fillRect(ax+1, ay, 3, 56)
        // Handle ring
        gr.fillStyle(0x9ca3af, 1); gr.fillRect(ax-2, ay+9, 10, 5)
        gr.fillStyle(0x6b7280, 1); gr.fillRect(ax-1, ay+10, 8, 3)
        // Axe head glow
        if (atkT > 0) {
          gr.fillStyle(0xef4444, 0.24 + atkT*0.38)
          gr.fillTriangle(ax-4, ay, ax+36, ay+18, ax-4, ay+48)
        }
        // Axe head — bigger blade
        gr.fillStyle(0x374151, 1); gr.fillTriangle(ax-2, ay, ax+36, ay+18, ax-2, ay+48)
        gr.fillStyle(0x6b7280, 1); gr.fillTriangle(ax, ay+2, ax+32, ay+18, ax, ay+44)
        // Blade inner highlight
        gr.fillStyle(0xd1d5db, 0.75); gr.fillTriangle(ax+2, ay+4, ax+26, ay+19, ax+2, ay+38)
        // Blade edge glint
        gr.fillStyle(0xf9fafb, 0.98); gr.fillTriangle(ax+24, ay+13, ax+32, ay+18, ax+24, ay+26)
        // Notch detail
        gr.fillStyle(0x111111, 0.5); gr.fillTriangle(ax+12, ay+9, ax+17, ay+14, ax+12, ay+19)
        // Back spike — longer
        gr.fillStyle(0x374151, 1); gr.fillTriangle(ax-2, ay+5, ax-18, ay+16, ax-2, ay+26)
        gr.fillStyle(0x4b5563, 1); gr.fillTriangle(ax, ay+7, ax-13, ay+16, ax, ay+24)
        // Impact sparks — bigger burst
        if (state === 'attack' && i === 3) {
          gr.lineStyle(2.5, 0xfbbf24, 1)
          gr.lineBetween(ax+32, ay+18, ax+44, ay+4)
          gr.lineBetween(ax+32, ay+18, ax+46, ay+12)
          gr.lineBetween(ax+32, ay+18, ax+40, ay+2)
          gr.lineStyle(2, 0xef4444, 0.95)
          gr.lineBetween(ax+32, ay+18, ax+42, ay+28)
          gr.lineBetween(ax+32, ay+18, ax+38, ay+30)
          gr.fillStyle(0xfef08a, 1); gr.fillCircle(ax+32, ay+18, 6)
          gr.fillStyle(0xffffff, 0.7); gr.fillCircle(ax+32, ay+18, 3)
        }
      })
      gr.done(`thragg_${state}`)
    })
  }

  // ══════════════════════════════════════════════════════════════════
  // PHANTOM — void shadow entity, purple-black, no face, wisps
  // ══════════════════════════════════════════════════════════════════
  makePhantom() {
    const C = { body: 0x1a0035, pants: 0x0d001f, skin: 0x2d0060, shoe: 0x0d001f, glow: 0x9b59b6, lSleeve: 0x1a0035, rSleeve: 0x1a0035 }

    const POSES = {
      idle: [
        { torsoY:-3, headY:-2, laY:27, raY:20 },
        { torsoY:-6, headY:-4, laY:24, raY:17 },
        { torsoY:-3, headY:-2, laY:27, raY:20 },
        { torsoY: 0, headY: 0, laY:30, raY:23 },
      ],
      walk: [
        { torsoLean: 5, laY:17, raY:42, llY:52, rlY:68, llH:36, rlH:18 },
        { torsoLean: 8, laY:12, raY:48, llY:46, rlY:76, llH:42, rlH:10 },
        { torsoLean: 4, laY:21, raY:36, llY:56, rlY:64, llH:30, rlH:24 },
        { torsoLean:-4, laY:36, raY:21, llY:64, rlY:56, llH:24, rlH:30 },
        { torsoLean:-8, laY:48, raY:12, llY:76, rlY:46, llH:10, rlH:42 },
        { torsoLean:-5, laY:42, raY:17, llY:68, rlY:52, llH:18, rlH:36 },
      ],
      jump: [
        { torsoY: 6, torsoLean:-3, laY:34, raY:34, llY:74, rlY:74, llH:10, rlH:10 },
        { torsoY:-12, headY:-4, laY: 9, raY: 9, llY:80, rlY:80, llH: 6, rlH: 6 },
        { torsoY:-4,  headY:-1, laY:19, raY:19, llY:70, rlY:70, llH:20, rlH:20 },
      ],
      attack: [
        { torsoLean:-12, raX:6, raY:12, laY:36, headY:-3, torsoY:-2 },
        { torsoLean:-18, raEnd:{x:38,y:20}, laY:32, headY:-5, torsoY:-4 },
        { torsoLean:  4, raEnd:{x:60,y:26}, laY:28, headY:-1, torsoY: 0 },
        { torsoLean: 16, raEnd:{x:76,y:36}, laY:24, headY: 4, torsoY: 3 },
        { torsoLean:  9, raEnd:{x:68,y:52}, laY:30, headY: 1, torsoY: 0 },
      ],
      block: [
        { torsoLean:-6, laX:-36, laY:18, laH:18, raY:34, torsoY:-2 },
        { torsoLean:-8, laX:-38, laY:16, laH:16, raY:34, torsoY:-3 },
        { torsoLean:-8, laX:-38, laY:16, laH:16, raY:34, torsoY:-3 },
      ],
      hurt: [
        { torsoLean:-18, headY:-7, laY:16, raY:18, torsoY:-5 },
        { torsoLean:-10, headY:-3, laY:24, raY:26, torsoY:-2 },
        { torsoLean: -3, headY: 0, laY:30, raY:30, torsoY: 0 },
      ],
      die: [
        { torsoLean:20, torsoY:12, laY:48, raY:48, llH:15, rlH:15 },
        { torsoLean:30, torsoY:22, laY:58, raY:58, llH: 7, rlH: 7 },
        { torsoLean:36, torsoY:30, laY:62, raY:62, llH: 2, rlH: 2 },
      ],
      special: [
        { torsoY:-6,  laY:12, raY:12, headY:-5 },
        { torsoY:-14, laY: 4, raY: 4, headY:-10 },
        { torsoY:-8,  laY: 8, raY: 8, headY:-6 },
        { torsoY: 0,  laY:28, raY:28, headY: 0 },
      ],
    }

    Object.entries(POSES).forEach(([state, frames]) => {
      const gr = this.g(80, 104, frames.length)
      frames.forEach((pose, i) => {
        const ox = i * 80, oy = 4
        const cx = ox + 40
        const tl = pose.torsoLean || 0, ty = pose.torsoY || 0

        // Void aura
        const atkT = (state === 'attack' || state === 'special') ? (i / (frames.length - 1)) : 0.2
        gr.fillStyle(0x4b0082, 0.12 + atkT * 0.18)
        gr.fillEllipse(cx, oy + 52, 64 + atkT * 28, 50 + atkT * 18)
        gr.fillStyle(0x6b21a8, 0.06 + atkT * 0.08)
        gr.fillEllipse(cx, oy + 52, 90 + atkT * 18, 68 + atkT * 10)

        // Shadow wisps at feet
        for (let w = 0; w < 3; w++) {
          gr.fillStyle(0x2d0060, 0.55 - w * 0.12)
          gr.fillEllipse(cx - 12 + w * 12, oy + 87 - w * 4, 18 - w * 4, 10 - w * 2)
        }

        const p = this.drawBody(gr, ox, oy, pose, C)

        // Shadow cloak flowing overlay
        gr.fillStyle(0x0d001f, 0.65)
        gr.fillRoundedRect(p.tX - 4, p.tY - 2, p.tW + 8, p.tH + 14, 4)
        gr.fillStyle(0x1a0035, 0.4)
        gr.fillRoundedRect(p.tX - 2, p.tY, p.tW + 4, p.tH + 8, 4)

        // Void hood
        gr.fillStyle(0x0d001f, 1)
        gr.fillEllipse(p.hCx, p.hCy - p.hR + 2, 36, 20)
        gr.fillRect(p.hCx - 18, p.hCy - p.hR + 8, 36, p.hR + 4)
        gr.fillStyle(0x000000, 0.85)
        gr.fillEllipse(p.hCx, p.hCy - p.hR + 6, 28, 12)

        // Glowing purple eyes — only eyes, no other face
        const eyeA = state === 'attack' || state === 'special' ? 1 : 0.85
        gr.fillStyle(0x9b59b6, eyeA)
        gr.fillCircle(p.hCx - 5, p.hCy - 2, 4)
        gr.fillCircle(p.hCx + 5, p.hCy - 2, 4)
        gr.fillStyle(0xd8b4fe, eyeA)
        gr.fillCircle(p.hCx - 5, p.hCy - 2, 2)
        gr.fillCircle(p.hCx + 5, p.hCy - 2, 2)
        gr.fillStyle(0xffffff, 0.7)
        gr.fillCircle(p.hCx - 4, p.hCy - 3, 1)
        gr.fillCircle(p.hCx + 6, p.hCy - 3, 1)

        // Shadow claw hand
        const hx = p.raEndX, hy = p.raEndY
        gr.fillStyle(0x2d0060, 0.9)
        gr.fillCircle(hx, hy, 7)
        gr.fillStyle(0x6b21a8, 0.7)
        for (let c = 0; c < 3; c++) {
          const ca = -0.4 + c * 0.4
          gr.fillTriangle(hx, hy - 2, hx + Math.cos(ca) * 14, hy + Math.sin(ca) * 14 - 5, hx + Math.cos(ca + 0.2) * 8, hy + Math.sin(ca + 0.2) * 8)
        }
      })
      gr.done(`phantom_${state}`)
    })
  }

  // ══════════════════════════════════════════════════════════════════
  // GOLEM — stone giant, wide build, glowing orange cracks
  // ══════════════════════════════════════════════════════════════════
  makeGolem() {
    const STONE = 0x4b5563
    const CRACK = 0xf97316
    const DARK  = 0x374151

    const POSES = {
      idle: [
        { torsoY: 0, laY:28, raY:28 },
        { torsoY:-2, laY:26, raY:30 },
        { torsoY:-4, laY:24, raY:32 },
        { torsoY:-2, laY:26, raY:30 },
      ],
      walk: [
        { torsoLean: 3, laY:20, raY:40, llY:52, rlY:66, llH:36, rlH:20 },
        { torsoLean: 5, laY:14, raY:46, llY:46, rlY:74, llH:42, rlH:12 },
        { torsoLean: 2, laY:22, raY:36, llY:56, rlY:62, llH:30, rlH:26 },
        { torsoLean:-2, laY:36, raY:22, llY:62, rlY:56, llH:26, rlH:30 },
        { torsoLean:-5, laY:46, raY:14, llY:74, rlY:46, llH:12, rlH:42 },
        { torsoLean:-3, laY:40, raY:20, llY:66, rlY:52, llH:20, rlH:36 },
      ],
      jump: [
        { torsoY: 6, torsoLean:-2, laY:22, raY:22, llY:70, rlY:70, llH:12, rlH:12 },
        { torsoY:-8, headY:-3, laY: 8, raY: 8, llY:76, rlY:76, llH: 8, rlH: 8 },
        { torsoY:-2, headY:-1, laY:16, raY:16, llY:68, rlY:68, llH:20, rlH:20 },
      ],
      attack: [
        { torsoLean:-10, raX:8, raY:6, laY:40, headY:-3 },
        { torsoLean:-16, raEnd:{x:50,y:14}, laY:36, headY:-5 },
        { torsoLean:  6, raEnd:{x:72,y:34}, laY:28, headY: 0 },
        { torsoLean: 18, raEnd:{x:86,y:52}, laY:24, headY: 4 },
        { torsoLean:  8, raEnd:{x:74,y:60}, laY:30, headY: 2 },
      ],
      block: [
        { torsoLean:-5, laX:-32, laY:18, laH:22, raY:34 },
        { torsoLean:-7, laX:-34, laY:16, laH:20, raY:34, torsoY:-2 },
        { torsoLean:-7, laX:-34, laY:16, laH:20, raY:34, torsoY:-2 },
      ],
      hurt: [
        { torsoLean:-14, headY:-5, laY:18, raY:20, torsoY:-4 },
        { torsoLean: -8, headY:-2, laY:24, raY:26, torsoY:-2 },
        { torsoLean: -2, headY: 0, laY:28, raY:28, torsoY: 0 },
      ],
      die: [
        { torsoLean:18, torsoY:10, laY:48, raY:48, llH:16, rlH:16 },
        { torsoLean:26, torsoY:20, laY:56, raY:56, llH: 8, rlH: 8 },
        { torsoLean:32, torsoY:28, laY:60, raY:60, llH: 2, rlH: 2 },
      ],
      special: [
        { torsoY:-2, laY:14, raY:14, headY:-2, torsoLean: 0 },
        { torsoY:-6, laY: 8, raY: 8, headY:-5, torsoLean: 0 },
        { torsoY:-4, laY:10, raY:10, headY:-3, torsoLean: 2 },
        { torsoY: 0, laY:28, raY:28, headY: 0, torsoLean: 0 },
      ],
    }

    const C = { body: STONE, pants: DARK, skin: STONE, shoe: DARK, glow: CRACK, tW: 38, tH: 42, lW: 15, aW: 15, hR: 16 }

    Object.entries(POSES).forEach(([state, frames]) => {
      const gr = this.g(88, 112, frames.length)
      frames.forEach((pose, i) => {
        const ox = i * 88, oy = 4
        const cx = ox + 44
        const atkT = (state === 'attack' || state === 'special') ? i / (frames.length - 1) : 0

        // Orange glow aura during attack
        if (atkT > 0) {
          gr.fillStyle(CRACK, 0.10 + atkT * 0.16)
          gr.fillEllipse(cx, oy + 56, 70 + atkT * 24, 54 + atkT * 16)
        }

        const p = this.drawBody(gr, ox, oy, pose, C)

        // Stone texture cracks on torso
        gr.lineStyle(1.5, CRACK, 0.7 + atkT * 0.28)
        gr.lineBetween(p.tX + 8,  p.tY + 8,  p.tX + 18, p.tY + 22)
        gr.lineBetween(p.tX + 18, p.tY + 22, p.tX + 12, p.tY + 34)
        gr.lineBetween(p.tX + 24, p.tY + 10, p.tX + 32, p.tY + 26)
        gr.lineStyle(1, CRACK, 0.45)
        gr.lineBetween(p.tX + 6,  p.tY + 18, p.tX + 14, p.tY + 28)

        // Stone block head (rectangular, not round)
        const hX = p.hCx - 16, hY = p.hCy - p.hR
        gr.fillStyle(STONE, 1)
        gr.fillRoundedRect(hX, hY, 32, 28, 3)
        gr.fillStyle(DARK, 0.3)
        gr.fillRect(hX, hY + 14, 32, 14)
        // Head cracks
        gr.lineStyle(1.5, CRACK, 0.65)
        gr.lineBetween(hX + 8, hY + 4, hX + 14, hY + 18)
        gr.lineBetween(hX + 20, hY + 6, hX + 26, hY + 16)
        // Glowing orange eyes
        gr.fillStyle(CRACK, 1)
        gr.fillRect(hX + 6,  hY + 8, 8, 6)
        gr.fillRect(hX + 18, hY + 8, 8, 6)
        gr.fillStyle(0xfef08a, 0.75)
        gr.fillRect(hX + 7,  hY + 9, 6, 4)
        gr.fillRect(hX + 19, hY + 9, 6, 4)

        // Giant stone fist (right hand)
        const fx = p.raEndX - 8, fy = p.raEndY - 8
        gr.fillStyle(STONE, 1)
        gr.fillRoundedRect(fx - 2, fy - 4, 22, 20, 4)
        gr.fillStyle(DARK, 0.3)
        gr.fillRect(fx, fy + 8, 18, 8)
        gr.lineStyle(1, CRACK, atkT > 0 ? 0.8 : 0.4)
        gr.lineBetween(fx + 4, fy + 2, fx + 10, fy + 14)
        if (state === 'attack' && i === 3) {
          gr.fillStyle(CRACK, 0.6)
          gr.fillCircle(fx + 10, fy + 8, 12)
          gr.lineStyle(2, 0xfef08a, 0.9)
          gr.lineBetween(fx + 20, fy, fx + 30, fy - 12)
          gr.lineBetween(fx + 20, fy, fx + 32, fy - 6)
        }
      })
      gr.done(`golem_${state}`)
    })
  }

  // ══════════════════════════════════════════════════════════════════
  // VIPER — green assassin, slim, snake hood, twin blades
  // ══════════════════════════════════════════════════════════════════
  makeViper() {
    const C = { body: 0x15803d, pants: 0x14532d, skin: 0x86efac, shoe: 0x14532d, glow: 0x4ade80, lSleeve: 0x166534, rSleeve: 0x15803d }

    const POSES = {
      idle: [
        { torsoLean: 4, torsoY: 0,  laY:30, raY:22 },
        { torsoLean: 4, torsoY:-2,  laY:28, raY:20 },
        { torsoLean: 4, torsoY:-4,  laY:26, raY:18 },
        { torsoLean: 4, torsoY:-2,  laY:28, raY:20 },
      ],
      walk: [
        { torsoLean: 6, laY:16, raY:42, llY:50, rlY:68, llH:38, rlH:18 },
        { torsoLean: 9, laY:10, raY:48, llY:44, rlY:76, llH:44, rlH:10 },
        { torsoLean: 5, laY:20, raY:36, llY:54, rlY:64, llH:32, rlH:24 },
        { torsoLean:-5, laY:36, raY:20, llY:64, rlY:54, llH:24, rlH:32 },
        { torsoLean:-9, laY:48, raY:10, llY:76, rlY:44, llH:10, rlH:44 },
        { torsoLean:-6, laY:42, raY:16, llY:68, rlY:50, llH:18, rlH:38 },
      ],
      jump: [
        { torsoY: 5, torsoLean:-3, laY:32, raY:32, llY:72, rlY:72, llH:10, rlH:10 },
        { torsoY:-13, headY:-5, laY: 8, raY: 8, llY:80, rlY:80, llH: 5, rlH: 5 },
        { torsoY:-4,  headY:-1, laY:18, raY:18, llY:70, rlY:70, llH:20, rlH:20 },
      ],
      attack: [
        { torsoLean:-11, raX:8, raY:10, laY:36, headY:-3 },
        { torsoLean:-16, raEnd:{x:40,y:16}, laY:32, headY:-5 },
        { torsoLean:  5, raEnd:{x:62,y:24}, laY:28, headY:-1 },
        { torsoLean: 17, raEnd:{x:78,y:32}, laY:24, headY: 4 },
        { torsoLean:  9, raEnd:{x:70,y:48}, laY:30, headY: 1 },
      ],
      block: [
        { torsoLean:-6, laX:-35, laY:20, laH:18, raY:36 },
        { torsoLean:-8, laX:-37, laY:18, laH:16, raY:36, torsoY:-2 },
        { torsoLean:-8, laX:-37, laY:18, laH:16, raY:36, torsoY:-2 },
      ],
      hurt: [
        { torsoLean:-15, headY:-6, laY:18, raY:20, torsoY:-4 },
        { torsoLean: -8, headY:-3, laY:24, raY:26, torsoY:-2 },
        { torsoLean: -2, headY: 0, laY:30, raY:30, torsoY: 0 },
      ],
      die: [
        { torsoLean:18, torsoY:10, laY:46, raY:46, llH:16, rlH:16 },
        { torsoLean:28, torsoY:20, laY:56, raY:56, llH: 7, rlH: 7 },
        { torsoLean:34, torsoY:28, laY:60, raY:60, llH: 2, rlH: 2 },
      ],
      special: [
        { torsoLean: 8, raX:18, raY:16, headY:-2 },
        { torsoLean:20, raEnd:{x:74,y:28}, laY:32, headY:-4 },
        { torsoLean:16, raEnd:{x:70,y:36}, laY:30, headY:-3 },
        { torsoLean: 4, raX:20, raY:28, headY: 0 },
      ],
    }

    Object.entries(POSES).forEach(([state, frames]) => {
      const gr = this.g(80, 104, frames.length)
      frames.forEach((pose, i) => {
        const ox = i * 80, oy = 4
        const cx = ox + 40
        const atkT = (state === 'attack' || state === 'special') ? i / (frames.length - 1) : 0

        // Green venom aura
        if (atkT > 0) {
          gr.fillStyle(0x4ade80, 0.08 + atkT * 0.13)
          gr.fillEllipse(cx, oy + 52, 54 + atkT * 18, 40 + atkT * 12)
        }

        const p = this.drawBody(gr, ox, oy, pose, C)

        // Snake-scale hood
        gr.fillStyle(0x14532d, 1)
        gr.fillEllipse(p.hCx, p.hCy - p.hR + 3, 32, 17)
        gr.fillRect(p.hCx - 16, p.hCy - p.hR + 9, 32, p.hR + 2)
        // Scale pattern
        gr.fillStyle(0x166534, 0.6)
        for (let r = 0; r < 3; r++)
          for (let col = 0; col < 4; col++)
            gr.fillEllipse(p.hCx - 12 + col * 8, p.hCy - p.hR + 10 + r * 5, 7, 4)
        // Viper eyes — slit pupils
        gr.fillStyle(0xfbbf24, 1)
        gr.fillEllipse(p.hCx - 5, p.hCy - 2, 8, 7)
        gr.fillEllipse(p.hCx + 5, p.hCy - 2, 8, 7)
        gr.fillStyle(0x000000, 1)
        gr.fillRect(p.hCx - 6, p.hCy - 4, 2, 7)
        gr.fillRect(p.hCx + 4, p.hCy - 4, 2, 7)

        // Twin blades anchored at hands
        const bx = p.raEndX - 1, by = p.raEndY - (state === 'attack' ? [20,18,8,2,16][i]||10 : 10)
        gr.fillStyle(0xd1d5db, 1); gr.fillRect(bx, by, 3, 28)
        gr.fillStyle(0x4ade80, atkT > 0 ? 0.55 : 0.3); gr.fillRect(bx - 1, by, 5, 12)
        gr.fillStyle(0xfafafa, 0.7); gr.fillRect(bx + 1, by, 1, 24)
        gr.fillStyle(0x14532d, 1); gr.fillRect(bx - 4, by + 10, 10, 4)
        // Impact
        if (state === 'attack' && i === 3) {
          gr.lineStyle(1.5, 0x4ade80, 0.95)
          gr.lineBetween(bx + 1, by, bx + 10, by - 10)
          gr.lineBetween(bx + 1, by, bx + 12, by - 4)
          gr.fillStyle(0xbbf7d0, 0.85); gr.fillCircle(bx + 1, by, 3)
        }
        // Left hand blade (smaller)
        const lbx = p.laEndX - 1, lby = p.laEndY - 8
        gr.fillStyle(0xd1d5db, 0.8); gr.fillRect(lbx, lby, 2, 20)
        gr.fillStyle(0x14532d, 1); gr.fillRect(lbx - 3, lby + 8, 8, 3)
      })
      gr.done(`viper_${state}`)
    })
  }

  // ══════════════════════════════════════════════════════════════════
  // NEXUS — rogue AI robot, blue/white circuit pattern
  // ══════════════════════════════════════════════════════════════════
  makeNexus() {
    const C = { body: 0x1e3a8a, pants: 0x1e40af, skin: 0x3b82f6, shoe: 0x1e3a8a, glow: 0x60a5fa, lSleeve: 0x1d4ed8, rSleeve: 0x1e3a8a }

    const POSES = {
      idle: [
        { torsoLean: 2, torsoY: 0,  laY:30, raY:22 },
        { torsoLean: 2, torsoY:-2,  laY:28, raY:20 },
        { torsoLean: 2, torsoY:-4,  laY:26, raY:18 },
        { torsoLean: 2, torsoY:-2,  laY:28, raY:20 },
      ],
      walk: [
        { torsoLean: 4, laY:18, raY:42, llY:52, rlY:68, llH:36, rlH:18 },
        { torsoLean: 7, laY:13, raY:47, llY:46, rlY:75, llH:42, rlH:11 },
        { torsoLean: 3, laY:22, raY:36, llY:56, rlY:64, llH:30, rlH:24 },
        { torsoLean:-3, laY:36, raY:22, llY:64, rlY:56, llH:24, rlH:30 },
        { torsoLean:-7, laY:47, raY:13, llY:75, rlY:46, llH:11, rlH:42 },
        { torsoLean:-4, laY:42, raY:18, llY:68, rlY:52, llH:18, rlH:36 },
      ],
      jump: [
        { torsoY: 5, torsoLean:-2, laY:32, raY:32, llY:72, rlY:72, llH:10, rlH:10 },
        { torsoY:-11, headY:-4, laY: 9, raY: 9, llY:80, rlY:80, llH: 6, rlH: 6 },
        { torsoY:-3,  headY:-1, laY:19, raY:19, llY:70, rlY:70, llH:20, rlH:20 },
      ],
      attack: [
        { torsoLean:-10, raX:8, raY:10, laY:36, headY:-3 },
        { torsoLean:-14, raEnd:{x:40,y:16}, laY:32, headY:-5 },
        { torsoLean:  6, raEnd:{x:62,y:24}, laY:28, headY:-1 },
        { torsoLean: 18, raEnd:{x:78,y:32}, laY:24, headY: 4 },
        { torsoLean: 10, raEnd:{x:70,y:48}, laY:30, headY: 1 },
      ],
      block: [
        { torsoLean:-5, laX:-34, laY:20, laH:20, raY:36 },
        { torsoLean:-7, laX:-36, laY:18, laH:18, raY:36, torsoY:-2 },
        { torsoLean:-7, laX:-36, laY:18, laH:18, raY:36, torsoY:-2 },
      ],
      hurt: [
        { torsoLean:-15, headY:-6, laY:18, raY:20, torsoY:-4 },
        { torsoLean: -8, headY:-3, laY:24, raY:26, torsoY:-2 },
        { torsoLean: -2, headY: 0, laY:30, raY:30, torsoY: 0 },
      ],
      die: [
        { torsoLean:18, torsoY:10, laY:46, raY:46, llH:16, rlH:16 },
        { torsoLean:28, torsoY:20, laY:56, raY:56, llH: 7, rlH: 7 },
        { torsoLean:34, torsoY:28, laY:60, raY:60, llH: 2, rlH: 2 },
      ],
      special: [
        { torsoLean:-4, laY:14, raY:14, headY:-3 },
        { torsoLean:-8, laY: 8, raY: 8, headY:-6 },
        { torsoLean: 6, laY:18, raY:22, headY:-2 },
        { torsoLean: 1, laY:28, raY:28, headY: 0 },
      ],
    }

    Object.entries(POSES).forEach(([state, frames]) => {
      const gr = this.g(80, 104, frames.length)
      frames.forEach((pose, i) => {
        const ox = i * 80, oy = 4
        const cx = ox + 40
        const atkT = (state === 'attack' || state === 'special') ? i / (frames.length - 1) : 0

        // Blue electric aura
        if (atkT > 0) {
          gr.fillStyle(0x3b82f6, 0.08 + atkT * 0.14)
          gr.fillEllipse(cx, oy + 52, 56 + atkT * 20, 42 + atkT * 12)
        }

        const p = this.drawBody(gr, ox, oy, pose, C)

        // Circuit lines on torso
        gr.lineStyle(1, 0x93c5fd, 0.7)
        gr.lineBetween(p.tX + 6,  p.tY + 6,  p.tX + 16, p.tY + 6)
        gr.lineBetween(p.tX + 16, p.tY + 6,  p.tX + 16, p.tY + 18)
        gr.lineBetween(p.tX + 16, p.tY + 18, p.tX + 28, p.tY + 18)
        gr.lineBetween(p.tX + 10, p.tY + 24, p.tX + 10, p.tY + 34)
        gr.lineBetween(p.tX + 10, p.tY + 34, p.tX + 24, p.tY + 34)
        // Node dots
        gr.fillStyle(0x60a5fa, 1)
        gr.fillCircle(p.tX + 16, p.tY + 6, 2)
        gr.fillCircle(p.tX + 16, p.tY + 18, 2)
        gr.fillCircle(p.tX + 10, p.tY + 34, 2)

        // Angular robot head with visor
        const hX = p.hCx - 14, hY = p.hCy - p.hR
        gr.fillStyle(0x1e3a8a, 1)
        gr.fillRoundedRect(hX, hY, 28, 26, 2)
        gr.fillStyle(0x1e40af, 0.4)
        gr.fillRect(hX, hY + 12, 28, 14)
        // Visor — glowing blue strip
        gr.fillStyle(0x0ea5e9, 1)
        gr.fillRect(hX + 3, hY + 7, 22, 8)
        gr.fillStyle(0xbae6fd, 0.65)
        gr.fillRect(hX + 3, hY + 7, 22, 3)
        // Data indicator lights
        gr.fillStyle(0x4ade80, 1); gr.fillCircle(hX + 6,  hY + 20, 2)
        gr.fillStyle(0xef4444, 1); gr.fillCircle(hX + 11, hY + 20, 2)
        gr.fillStyle(0x60a5fa, 1); gr.fillCircle(hX + 16, hY + 20, 2)
        gr.fillStyle(0xfbbf24, 1); gr.fillCircle(hX + 21, hY + 20, 2)
        // Edge panel lines
        gr.lineStyle(1, 0x93c5fd, 0.5)
        gr.lineBetween(hX + 2, hY + 4, hX + 2, hY + 22)
        gr.lineBetween(hX + 26, hY + 4, hX + 26, hY + 22)

        // Electric fist / discharge hand
        const hx = p.raEndX, hy = p.raEndY
        gr.fillStyle(0x1e3a8a, 1)
        gr.fillRoundedRect(hx - 6, hy - 4, 16, 14, 3)
        gr.lineStyle(1, 0x93c5fd, 0.7)
        gr.strokeRoundedRect(hx - 6, hy - 4, 16, 14, 3)
        if (atkT > 0) {
          gr.fillStyle(0x60a5fa, 0.4 + atkT * 0.4)
          gr.fillCircle(hx + 2, hy + 3, 9)
          gr.lineStyle(1.5, 0x93c5fd, 0.9)
          const angle = (state === 'attack' ? i * 1.2 : 0)
          gr.lineBetween(hx + 2, hy + 3, hx + 2 + Math.cos(angle) * 14, hy + 3 + Math.sin(angle) * 14)
          gr.lineBetween(hx + 2, hy + 3, hx + 2 + Math.cos(angle + 2.1) * 10, hy + 3 + Math.sin(angle + 2.1) * 10)
        }
        if (state === 'attack' && i === 3) {
          gr.lineStyle(2, 0xbae6fd, 1)
          gr.lineBetween(hx + 10, hy, hx + 22, hy - 12)
          gr.lineBetween(hx + 10, hy, hx + 24, hy - 6)
          gr.fillStyle(0xe0f2fe, 0.9); gr.fillCircle(hx + 10, hy, 4)
        }
      })
      gr.done(`nexus_${state}`)
    })
  }

  // ══════════════════════════════════════════════════════════════════
  // LOHE — fully golden warrior, yellow everything, sword + spear
  // ══════════════════════════════════════════════════════════════════
  makeLohe() {
    const C = { body: 0xfde047, pants: 0xca8a04, skin: 0xfef9c3, shoe: 0x92400e, glow: 0xfef08a, lSleeve: 0xf59e0b, rSleeve: 0xfde047 }

    const POSES = {
      idle: [
        { torsoLean: 3, torsoY: 0,  laY:31, raY:22 },
        { torsoLean: 3, torsoY:-2,  laY:29, raY:20 },
        { torsoLean: 3, torsoY:-4,  laY:27, raY:18 },
        { torsoLean: 3, torsoY:-2,  laY:29, raY:20 },
      ],
      walk: [
        { torsoLean: 5, laY:18, raY:42, llY:52, rlY:68, llH:36, rlH:18 },
        { torsoLean: 8, laY:13, raY:47, llY:46, rlY:75, llH:42, rlH:11 },
        { torsoLean: 4, laY:22, raY:36, llY:56, rlY:64, llH:30, rlH:24 },
        { torsoLean:-4, laY:36, raY:22, llY:64, rlY:56, llH:24, rlH:30 },
        { torsoLean:-8, laY:47, raY:13, llY:75, rlY:46, llH:11, rlH:42 },
        { torsoLean:-5, laY:42, raY:18, llY:68, rlY:52, llH:18, rlH:36 },
      ],
      jump: [
        { torsoY: 6, torsoLean:-2, laY:32, raY:32, llY:74, rlY:74, llH:10, rlH:10 },
        { torsoY:-11, headY:-4, laY: 9, raY: 9, llY:80, rlY:80, llH: 6, rlH: 6 },
        { torsoY:-3,  headY:-1, laY:19, raY:19, llY:70, rlY:70, llH:20, rlH:20 },
      ],
      attack: [
        { torsoLean:-10, raX:8, raY:10, laY:36, headY:-3 },
        { torsoLean:-14, raEnd:{x:40,y:16}, laY:32, headY:-5 },
        { torsoLean:  6, raEnd:{x:62,y:24}, laY:28, headY:-1 },
        { torsoLean: 18, raEnd:{x:78,y:32}, laY:24, headY: 4 },
        { torsoLean: 10, raEnd:{x:70,y:48}, laY:30, headY: 1 },
      ],
      block: [
        { torsoLean:-6, laX:-34, laY:20, laH:20, raY:36 },
        { torsoLean:-8, laX:-36, laY:18, laH:18, raY:36, torsoY:-2 },
        { torsoLean:-8, laX:-36, laY:18, laH:18, raY:36, torsoY:-2 },
      ],
      hurt: [
        { torsoLean:-16, headY:-6, laY:18, raY:20, torsoY:-4 },
        { torsoLean: -9, headY:-3, laY:25, raY:27, torsoY:-2 },
        { torsoLean: -2, headY: 0, laY:30, raY:30, torsoY: 0 },
      ],
      die: [
        { torsoLean:18, torsoY:10, laY:46, raY:46, llH:16, rlH:16 },
        { torsoLean:28, torsoY:20, laY:56, raY:56, llH: 7, rlH: 7 },
        { torsoLean:34, torsoY:28, laY:60, raY:60, llH: 2, rlH: 2 },
      ],
      special: [
        { torsoLean: 8, raX:16, raY:18, headY:-2 },
        { torsoLean:22, raEnd:{x:76,y:28}, laY:32, headY:-5 },
        { torsoLean:16, raEnd:{x:72,y:36}, laY:30, headY:-3 },
        { torsoLean: 2, raX:18, raY:28, headY: 0 },
      ],
    }

    Object.entries(POSES).forEach(([state, frames]) => {
      const gr = this.g(80, 104, frames.length)
      frames.forEach((pose, i) => {
        const ox = i * 80, oy = 4
        const cx = ox + 40
        const atkT = (state === 'attack' || state === 'special') ? i / (frames.length - 1) : 0

        // Golden aura
        if (atkT > 0) {
          gr.fillStyle(0xfde047, 0.09 + atkT * 0.15)
          gr.fillEllipse(cx, oy + 52, 56 + atkT * 20, 42 + atkT * 14)
          gr.fillStyle(0xfef9c3, 0.05 + atkT * 0.07)
          gr.fillEllipse(cx, oy + 52, 82 + atkT * 14, 60 + atkT * 8)
        }

        const p = this.drawBody(gr, ox, oy, pose, C)

        // Shoulder pauldrons (gold armor plates)
        gr.fillStyle(0xb45309, 1)
        gr.fillRoundedRect(p.tX-2, p.tY-5, 12, 8, 3)
        gr.fillRoundedRect(p.tX+p.tW-10, p.tY-5, 12, 8, 3)
        gr.fillStyle(0xfbbf24, 0.7)
        gr.fillRect(p.tX, p.tY-3, 8, 4); gr.fillRect(p.tX+p.tW-8, p.tY-3, 8, 4)
        // Pauldron spikes
        gr.fillStyle(0xca8a04, 1)
        gr.fillTriangle(p.tX+2, p.tY-5, p.tX+5, p.tY-11, p.tX+8, p.tY-5)
        gr.fillTriangle(p.tX+p.tW-8, p.tY-5, p.tX+p.tW-5, p.tY-11, p.tX+p.tW-2, p.tY-5)

        // Torso belt / sash
        gr.fillStyle(0xb45309, 1); gr.fillRect(p.tX, p.tY+p.tH-10, p.tW, 8)
        gr.fillStyle(0xfbbf24, 0.55); gr.fillRect(p.tX+2, p.tY+p.tH-8, p.tW-4, 3)
        this.box(gr, 0xfef9c3, p.tX+p.tW/2-5, p.tY+p.tH-9, 10, 7, 2)

        // Yellow spiky hair — alternating heights
        gr.fillStyle(0xfde047, 1)
        gr.fillEllipse(p.hCx, p.hCy-p.hR+5, 32, 14)
        const loheHH = [9, 14, 18, 14, 9, 12]
        for (let s = 0; s < 6; s++) {
          const lsx = p.hCx-13+s*5
          gr.fillTriangle(lsx, p.hCy-p.hR+8, lsx+2, p.hCy-p.hR-loheHH[s], lsx+5, p.hCy-p.hR+8)
        }
        gr.fillStyle(0xfef9c3, 0.6); gr.fillEllipse(p.hCx-2, p.hCy-p.hR+4, 14, 6)

        // Warrior headband
        gr.fillStyle(0xb45309, 1); gr.fillRect(p.hCx-14, p.hCy-1, 28, 5)
        gr.fillStyle(0xfbbf24, 0.7); gr.fillRect(p.hCx-12, p.hCy, 24, 2)
        gr.fillStyle(0xfde047, 1); gr.fillCircle(p.hCx, p.hCy+2, 3.5)
        gr.fillStyle(0xfef9c3, 0.85); gr.fillCircle(p.hCx, p.hCy+2, 1.8)

        // Face
        this.face(gr, state, p.hCx, p.hCy, C.skin, 0xb45309)

        // Yellow glowing eyes
        const loEyeA = state === 'attack' || state === 'special' ? 1 : 0.9
        gr.fillStyle(0xfbbf24, loEyeA)
        gr.fillCircle(p.hCx-4, p.hCy-3, 4); gr.fillCircle(p.hCx+4, p.hCy-3, 4)
        gr.fillStyle(0xfef9c3, loEyeA*0.85)
        gr.fillCircle(p.hCx-4, p.hCy-3, 2.2); gr.fillCircle(p.hCx+4, p.hCy-3, 2.2)
        gr.fillStyle(0xffffff, 0.75)
        gr.fillCircle(p.hCx-3, p.hCy-4, 1); gr.fillCircle(p.hCx+5, p.hCy-4, 1)

        // ── SWORD (right hand) — rune-glow blade ────────────────────
        const sx = p.raEndX - 2
        const sy = p.raEndY - (state === 'attack'  ? [22,20,10, 2,18][i]||14
                               : state === 'special' ? [14,18,12,10][i]||12
                               : 14)
        // Blade (black)
        gr.fillStyle(0x111111, 1); gr.fillRect(sx, sy, 4, 36)
        gr.fillStyle(0x555555, 0.8); gr.fillRect(sx+1, sy, 1, 32)
        gr.fillStyle(0xaaaaaa, 0.5); gr.fillRect(sx+2, sy, 1, 30)
        // Gold rune glow along blade edge
        const loRuneA = atkT > 0 ? 0.45 + atkT*0.4 : 0.2
        gr.lineStyle(0.8, 0xfbbf24, loRuneA)
        gr.lineBetween(sx+3, sy+5, sx+3, sy+14); gr.lineBetween(sx+3, sy+18, sx+3, sy+28)
        if (state === 'attack' && i === 3) {
          gr.lineStyle(2, 0xfef08a, 1)
          gr.lineBetween(sx+2, sy, sx+14, sy-16); gr.lineBetween(sx+2, sy, sx+16, sy-8)
          gr.lineBetween(sx+2, sy, sx+11, sy-18)
          gr.lineStyle(1.5, 0xfbbf24, 0.85); gr.lineBetween(sx+2, sy, sx+7, sy-20)
          gr.fillStyle(0xfffde7, 1); gr.fillCircle(sx+2, sy, 5)
          gr.fillStyle(0xffffff, 0.7); gr.fillCircle(sx+2, sy, 2.5)
        }
        // Guard (black)
        gr.fillStyle(0x111111, 1); gr.fillRect(sx-8, sy+10, 20, 5)
        gr.fillStyle(0x444444, 0.7); gr.fillRect(sx-6, sy+11, 16, 2)
        // Grip + pommel
        gr.fillStyle(0x1a1a1a, 1); gr.fillRoundedRect(sx, sy+15, 4, 11, 1)
        gr.fillStyle(0x333333, 0.5); gr.fillRect(sx, sy+17, 4, 2); gr.fillRect(sx, sy+21, 4, 2)
        gr.fillStyle(0x222222, 1); gr.fillCircle(sx+2, sy+28, 4.5)
        gr.fillStyle(0xfbbf24, 0.95); gr.fillCircle(sx+2, sy+28, 2.2)

        // ── SPEAR (left hand) — taller, more prominent head ─────────
        const spX = p.laEndX
        const spYt = oy + 6
        // Shaft
        gr.fillStyle(0x111111, 1); gr.fillRect(spX-2, spYt, 4, 74)
        gr.fillStyle(0x444444, 0.5); gr.fillRect(spX-1, spYt, 2, 70)
        // Spearhead — larger triangle
        gr.fillStyle(0x111111, 1)
        gr.fillTriangle(spX-8, spYt+16, spX+2, spYt, spX+9, spYt+16)
        gr.fillStyle(0x888888, 0.75)
        gr.fillTriangle(spX-2, spYt+14, spX+2, spYt+3, spX+5, spYt+14)
        gr.fillStyle(0xcccccc, 0.4); gr.fillTriangle(spX+1, spYt+12, spX+2, spYt+5, spX+4, spYt+12)
        // Crossguard
        gr.fillStyle(0x111111, 1); gr.fillRect(spX-10, spYt+16, 20, 5)
        gr.fillStyle(0x555555, 0.65); gr.fillRect(spX-8, spYt+17, 16, 2)
        // Tip glow during attack/special
        if (atkT > 0) {
          gr.fillStyle(0xfde047, 0.18 + atkT*0.25); gr.fillCircle(spX+1, spYt+3, 10)
        }
      })
      gr.done(`lohe_${state}`)
    })
  }

  // ══════════════════════════════════════════════════════════════════
  // SHIELD + EFFECTS
  // ══════════════════════════════════════════════════════════════════
  makeShield() {
    if (this.textures.exists('shield')) return
    const gr = this.make.graphics({ x: 0, y: 0, add: false })
    // rim
    gr.fillStyle(0x94a3b8, 1); gr.fillRoundedRect(2, 1, 32, 50, 7)
    // body
    gr.fillStyle(0xdde4f0, 1); gr.fillRoundedRect(4, 3, 28, 46, 6)
    // inner bevel
    gr.lineStyle(1.5, 0xffffff, 0.5); gr.strokeRoundedRect(6, 5, 24, 42, 4)
    // cross
    gr.fillStyle(0x7099cc, 0.9); gr.fillRect(16, 8, 6, 34); gr.fillRect(7, 20, 22, 6)
    gr.fillStyle(0xffffff, 0.35); gr.fillRect(17, 8, 3, 34); gr.fillRect(7, 21, 22, 3)
    // boss diamond
    gr.fillStyle(0x4a6fa5, 1)
    gr.fillPoints([{x:18,y:16},{x:26,y:23},{x:18,y:30},{x:10,y:23}], true)
    gr.fillStyle(0xaabddf, 0.7)
    gr.fillPoints([{x:18,y:18},{x:23,y:23},{x:18,y:28},{x:13,y:23}], true)
    gr.generateTexture('shield', 36, 52)
    gr.destroy()
  }

  makeEffects() {
    const mk = (key, w, h, fn) => {
      if (this.textures.exists(key)) return
      const gr = this.make.graphics({ x: 0, y: 0, add: false })
      fn(gr); gr.generateTexture(key, w, h); gr.destroy()
    }

    mk('hitspark', 192, 64, gr => {
      [0xffffff,0xffd700,0xff8c00].forEach((c,f) => {
        gr.fillStyle(c, 1); this.star(gr, f*64+32, 32, 8, 26-f*4, 10-f*2)
      })
    })
    mk('blockspark', 96, 48, gr => {
      gr.fillStyle(0x60a5fa, 1); this.star(gr, 48, 24, 6, 22, 9)
      gr.fillStyle(0xbfdbfe, 0.8); this.star(gr, 48, 24, 6, 12, 5)
      gr.fillStyle(0xffffff, 0.6); this.star(gr, 48, 24, 6, 6, 2)
    })
    mk('explosion', 480, 80, gr => {
      [10,22,38,52,44,28,12].forEach((s,f) => {
        gr.fillStyle(0xcc3300, 0.9); gr.fillCircle(f*68+40, 40, s+4)
        gr.fillStyle(0xff6600, 1);   gr.fillCircle(f*68+40, 40, s)
        gr.fillStyle(0xffcc00, 0.9); gr.fillCircle(f*68+40, 40, s*0.55)
        gr.fillStyle(0xffffff, 0.6); gr.fillCircle(f*68+40, 40, s*0.2)
      })
    })
    mk('burn', 160, 40, gr => {
      for (let f = 0; f < 5; f++) {
        gr.fillStyle(0xcc2200,0.85); gr.fillTriangle(f*32+4,40,f*32+16,2,f*32+28,40)
        gr.fillStyle(0xff6600,0.9);  gr.fillTriangle(f*32+7,40,f*32+16,10,f*32+25,40)
        gr.fillStyle(0xffcc00,0.7);  gr.fillTriangle(f*32+11,40,f*32+16,18,f*32+21,40)
      }
    })
    mk('stunstar', 36, 36, gr => {
      gr.fillStyle(0xffee00,1); this.star(gr,18,18,5,16,7)
      gr.fillStyle(0xffffff,0.7); this.star(gr,18,18,5,7,3)
    })
    mk('arrow', 40, 10, gr => {
      gr.fillStyle(0x8B4513,1); gr.fillRect(0,3,32,4)
      gr.fillStyle(0x888888,1); gr.fillTriangle(28,0,40,5,28,10)
      gr.fillStyle(0xffffff,0.6); gr.fillRect(0,3,8,2)
    })
    mk('flamebolt', 36, 18, gr => {
      gr.fillStyle(0xff4400,1); gr.fillEllipse(18,9,34,16)
      gr.fillStyle(0xffaa00,1); gr.fillEllipse(18,9,22,10)
      gr.fillStyle(0xffff88,0.8); gr.fillCircle(24,9,5)
      gr.fillStyle(0xffffff,0.6); gr.fillCircle(26,8,2)
    })
    mk('tnt', 32, 40, gr => {
      gr.fillStyle(0xcc0000,1); gr.fillRoundedRect(2,6,28,30,4)
      gr.fillStyle(0x991111,1); gr.fillRect(2,14,28,4); gr.fillRect(2,24,28,4)
      gr.fillStyle(0xff3333,0.7); gr.fillRect(5,10,22,6); gr.fillRect(5,20,22,6)
      gr.fillStyle(0x555555,1); gr.fillRect(12,2,8,6)
      gr.fillStyle(0xffdd00,0.9); gr.fillRect(14,0,4,4)
    })
    mk('net', 60, 48, gr => {
      gr.lineStyle(2,0xaaaa00,0.9)
      for (let r=0;r<6;r++) gr.lineBetween(0,r*9,60,r*9)
      for (let c=0;c<8;c++) gr.lineBetween(c*8,0,c*8,48)
      gr.lineStyle(1.5,0x888800,0.6)
      gr.lineBetween(0,0,60,48); gr.lineBetween(60,0,0,48)
    })
    mk('hook', 22, 26, gr => {
      gr.lineStyle(3,0xb0b0b0,1)
      gr.beginPath(); gr.moveTo(11,0); gr.lineTo(11,17)
      gr.arc(7,17,4,0,Math.PI*1.5,false); gr.strokePath()
      gr.fillStyle(0xd8d8d8,1); gr.fillCircle(11,0,3)
    })
  }
}
