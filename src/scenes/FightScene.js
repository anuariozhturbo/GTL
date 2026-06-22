import Ash    from '../fighters/Ash.js'
import Merrs  from '../fighters/Merrs.js'
import Dice   from '../fighters/Dice.js'
import Thragg from '../fighters/Thragg.js'
import Lohe   from '../fighters/Lohe.js'
import { FIGHTER_CONFIGS } from '../fighters/configs.js'
import AIController      from '../ai/AIController.js'
import SmartAIController from '../ai/SmartAIController.js'
import HealthBar   from '../ui/HealthBar.js'
import RoundUI     from '../ui/RoundUI.js'
import ControlsHUD from '../ui/ControlsHUD.js'
import { recordMatch }                        from '../lib/supabase.js'
import { onlineSession, clearOnlineSession } from '../lib/onlineSession.js'
import NeonVoidStage     from '../stages/NeonVoid.js'
import VolcanoTempleStage from '../stages/VolcanoTemple.js'
import CyberCityStage    from '../stages/CyberCity.js'
import SpaceStationStage from '../stages/SpaceStation.js'

const FIGHTER_CLASSES = { ash: Ash, merrs: Merrs, dice: Dice, thragg: Thragg, lohe: Lohe }
const AI_PROFILES = {
  ash:    { aggression: 0.55, reactionMs: 220, attackRange: 130, preferredRange: 260 },
  merrs:  { aggression: 0.65, reactionMs: 180, attackRange: 140, preferredRange: 320 },
  dice:   { aggression: 0.60, reactionMs: 200, attackRange: 130, preferredRange: 300 },
  thragg: { aggression: 0.75, reactionMs: 250, attackRange: 140, preferredRange: 200 },
  lohe:   { aggression: 0.70, reactionMs: 210, attackRange: 145, preferredRange: 270 },
}

const DIFFICULTY_MOD = {
  easy:   { aggrMult: 0.38, reactionAdd: 380, rangeMult: 0.72 },
  medium: { aggrMult: 1.00, reactionAdd:   0, rangeMult: 1.00 },
  hard:   { aggrMult: 1.40, reactionAdd: -130, rangeMult: 1.30 },
}

function applyDifficulty(profile, difficulty) {
  const mod = DIFFICULTY_MOD[difficulty] || DIFFICULTY_MOD.medium
  return {
    aggression:     Math.min(0.98, profile.aggression * mod.aggrMult),
    reactionMs:     Math.max(40,   profile.reactionMs + mod.reactionAdd),
    attackRange:    profile.attackRange    * mod.rangeMult,
    preferredRange: profile.preferredRange * mod.rangeMult,
  }
}

const ROUND_TIME = 99
const ROUNDS_TO_WIN = 2
const WORLD_W = 2560

export default class FightScene extends Phaser.Scene {
  constructor() { super('FightScene') }

  init(data) {
    this.mode       = data.mode       || 'pvp'
    this.p1Key      = data.p1         || 'ash'
    this.p2Key      = data.p2         || 'thragg'
    this.stageKey   = data.stage      || 'neonvoid'
    this.difficulty = data.difficulty || 'medium'
    this.p1Wins     = 0
    this.p2Wins     = 0
    this.roundNum   = 1
  }

  create() {
    const W = this.scale.width, H = this.scale.height
    this.W = W; this.H = H
    const WW = WORLD_W

    // Physics + camera
    this.physics.world.setBounds(0, 0, WW, H)
    this.cameras.main.setBounds(0, 0, WW, H)
    this.stageBounds = { left: 80, right: WW - 80 }

    // Platform + hazard containers (populated by stage)
    this.platforms    = this.physics.add.staticGroup()
    this.stageHazards = []

    // Instantiate and draw stage
    const STAGE_MAP = {
      neonvoid:     NeonVoidStage,
      volcano:      VolcanoTempleStage,
      cybercity:    CyberCityStage,
      spacestation: SpaceStationStage,
    }
    const StageClass = STAGE_MAP[this.stageKey] || NeonVoidStage
    this.stage = new StageClass(this)
    this.stage.create()

    // Floor physics body (invisible — stage draws the visual floor line)
    this.floor = this.physics.add.staticGroup()
    const floorRect = this.add.rectangle(WW / 2, 575, WW, 40, 0x000000, 0)
    this.physics.add.existing(floorRect, true)
    this.floor.add(floorRect)

    // Animations
    this.createAnims()

    // Fighters — start near world center, spaced apart
    this.f1 = this.createFighter(this.p1Key, WORLD_W / 2 - 260, 520)
    this.f2 = this.createFighter(this.p2Key, WORLD_W / 2 + 260, 520)
    this.f1.opponent = this.f2
    this.f2.opponent = this.f1
    this.f2.setFacing(-1)

    // Colliders — floor + static platforms + moving platforms
    this.physics.add.collider(this.f1, this.floor)
    this.physics.add.collider(this.f2, this.floor)
    this.physics.add.collider(this.f1, this.platforms)
    this.physics.add.collider(this.f2, this.platforms)
    if (this.stage.movingPlatforms?.length) {
      this.stage.movingPlatforms.forEach(p => {
        this.physics.add.collider(this.f1, p)
        this.physics.add.collider(this.f2, p)
      })
    }

    // AI
    const p1Profile = applyDifficulty(AI_PROFILES[this.p1Key], this.difficulty)
    const p2Profile = applyDifficulty(AI_PROFILES[this.p2Key], this.difficulty)
    if (this.mode === 'ava') {
      // Both fighters use SmartAI — different starting strategies for variety
      this.ai1 = new SmartAIController(this.f1, AI_PROFILES[this.p1Key])
      this.ai2 = new SmartAIController(this.f2, AI_PROFILES[this.p2Key])
      // Stagger their initial strategies so they don't mirror each other
      this.ai1.strategy = 'aggressive'
      this.ai1.stratTimer = 2200
      this.ai2.strategy = 'aerial'
      this.ai2.stratTimer = 2800
    } else {
      this.ai1 = null
      this.ai2 = (this.mode === 'pve') ? new AIController(this.f2, p2Profile) : null
    }

    // Input
    // P1: WASD move  +  Z attack / X block / C special / V action
    // P2: Arrows move  +  K attack / L block / I special / O action
    this.keys1 = {
      left:    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right:   this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      up:      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      attack:  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      block:   this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X),
      special: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C),
      action:  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.V),
    }
    this.keys2 = {
      left:    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right:   this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      up:      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      attack:  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K),
      block:   this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L),
      special: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I),
      action:  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.O),
    }

    // UI
    const CHAR_META = {
      ash:    { name: 'ASH',    color: 0x7c3aed },
      merrs:  { name: 'MERRS',  color: 0x60a5fa },
      dice:   { name: 'DICE',   color: 0xf59e0b },
      thragg: { name: 'THRAGG', color: 0xef4444 },
      lohe:   { name: 'LOHE',   color: 0xfde047 },
    }
    const user = this.registry.get('user')
    const p1Name = (!user || user.isGuest) ? null : user.displayName
    this.hb1 = new HealthBar(this, 30,     20, false, CHAR_META[this.p1Key].name, CHAR_META[this.p1Key].color, p1Name)
    this.hb2 = new HealthBar(this, W - 30, 20, true,  CHAR_META[this.p2Key].name, CHAR_META[this.p2Key].color)
    this.roundUI = new RoundUI(this, W, this.p1Wins, this.p2Wins, this.roundNum, this.p1Key, this.p2Key)
    this.controlsHUD = new ControlsHUD(this)

    // Events
    this.events.on('hpChanged',    f => this.onHpChanged(f))
    this.events.on('fighterDead',  f => this.onFighterDead(f))

    // Projectile groups
    this.projectiles = this.add.group()

    // Leave button
    const leaveBtn = this.add.text(W / 2, H - 14, '[ LEAVE MATCH ]', {
      fontSize: '12px', fontFamily: 'monospace', color: '#3d1060',
    }).setOrigin(0.5).setDepth(20).setScrollFactor(0).setInteractive({ useHandCursor: true })
    leaveBtn.on('pointerover', () => leaveBtn.setColor('#9b59b6'))
    leaveBtn.on('pointerout',  () => leaveBtn.setColor('#3d1060'))
    leaveBtn.on('pointerdown', () => this.scene.start('MenuScene'))
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('MenuScene'))

    // Online mode: virtual keyboard for remote fighter + channel input listener
    if (this.mode === 'online' && onlineSession.channel) {
      this._remoteKeys = {
        left:    { isDown: false },
        right:   { isDown: false },
        up:      { isDown: false, _justDown: false },
        attack:  { isDown: false, _justDown: false },
        block:   { isDown: false },
        special: { isDown: false, _justDown: false },
        action:  { isDown: false, _justDown: false },
      }
      this._remoteReady    = false
      this._netTimer       = 0
      this._lastRemoteTime = Date.now()
      this._disconnected   = false

      onlineSession.channel.on('broadcast', { event: 'input' }, ({ payload }) => {
        const rk = this._remoteKeys
        rk.left.isDown       = !!payload.left
        rk.right.isDown      = !!payload.right
        rk.up.isDown         = !!payload.up
        rk.up._justDown      = !!payload.up_j
        rk.attack._justDown  = !!payload.attack_j
        rk.block.isDown      = !!payload.block
        rk.special._justDown = !!payload.special_j
        rk.action._justDown  = !!payload.action_j
        this._remoteReady    = true
        this._lastRemoteTime = Date.now()
      })
    }

    // Start round
    this.roundActive = false
    this.startRound()
  }

  createAnims() {
    const defs = [
      { key: 'ash',    states: { idle:4, walk:6, jump:3, attack:5, block:3, hurt:3, die:3, special:4, glide:5 } },
      { key: 'merrs',  states: { idle:4, walk:6, jump:3, attack:5, block:3, hurt:3, die:3, special:4 } },
      { key: 'dice',   states: { idle:4, walk:6, jump:3, attack:5, block:3, hurt:3, die:3, special:4 } },
      { key: 'thragg', states: { idle:4, walk:6, jump:3, attack:5, block:3, hurt:3, die:3, special:4 } },
      { key: 'lohe',   states: { idle:4, walk:6, jump:3, attack:5, block:3, hurt:3, die:3, special:4 } },
    ]
    const rates = { idle:8, walk:12, jump:10, attack:18, block:10, hurt:14, die:8, special:14, glide:10 }
    const loops = { idle:true, walk:true, jump:false, attack:false, block:true, hurt:false, die:false, special:false, glide:true }

    defs.forEach(({ key, states }) => {
      Object.entries(states).forEach(([state, frameCount]) => {
        const animKey = `${key}_${state}`
        if (this.anims.exists(animKey)) return
        const frames = []
        for (let i = 0; i < frameCount; i++) frames.push({ key: animKey, frame: i })
        this.anims.create({
          key: animKey,
          frames,
          frameRate: rates[state] || 8,
          repeat: loops[state] ? -1 : 0,
        })
      })
    })
  }

  createFighter(key, x, y) {
    const FighterClass = FIGHTER_CLASSES[key]
    const cfg = FIGHTER_CONFIGS[key]
    return new FighterClass(this, x, y, key, cfg)
  }

  startRound() {
    this.roundActive = false
    this.f1.respawn(WORLD_W / 2 - 260)
    this.f2.respawn(WORLD_W / 2 + 260)
    this.roundUI.setRound(this.roundNum)

    // Countdown then fight
    this.roundUI.showAnnouncement(`ROUND ${this.roundNum}`, 1500)
    this.time.delayedCall(1600, () => {
      this.roundUI.showAnnouncement('FIGHT!', 800)
      this.time.delayedCall(800, () => {
        this.roundActive = true
        this.startTimer()
      })
    })
  }

  startTimer() {
    this.timeLeft = ROUND_TIME
    this.roundUI.setTime(this.timeLeft)
    this.timerEvent = this.time.addEvent({
      delay: 1000, repeat: ROUND_TIME - 1,
      callback: () => {
        this.timeLeft--
        this.roundUI.setTime(this.timeLeft)
        if (this.timeLeft <= 0) this.endRound()
      }
    })
  }

  update(time, delta) {
    // Stage animation
    this.stage?.update(time, delta)

    // Smooth camera tracking — follow midpoint between fighters
    if (this.f1 && this.f2) {
      const midX = (this.f1.x + this.f2.x) / 2
      const targetScrollX = Phaser.Math.Clamp(midX - this.W / 2, 0, WORLD_W - this.W)
      this.cameras.main.scrollX += (targetScrollX - this.cameras.main.scrollX) * 0.1
    }

    if (!this.roundActive) return

    this._checkHazards()

    if (this.mode === 'online') {
      // ── Online: local fighter on keyboard, remote fighter on received inputs ──
      // Both clients always receive p1=localChar, p2=remoteChar from OnlineLobbyScene,
      // so f1 is ALWAYS the local player and f2 is ALWAYS the remote player.
      const localF    = this.f1
      const remoteF   = this.f2
      const localKeys = this.keys1

      // Snapshot just-down flags BEFORE handleInput consumes them via JustDown()
      const snap = {
        left:      localKeys.left.isDown,
        right:     localKeys.right.isDown,
        up:        localKeys.up.isDown,
        up_j:      localKeys.up._justDown      || false,
        attack_j:  localKeys.attack._justDown  || false,
        block:     localKeys.block.isDown,
        special_j: localKeys.special._justDown || false,
        action_j:  localKeys.action._justDown  || false,
      }

      localF.handleInput(localKeys)
      this.handleActionKey(localF, localKeys)

      if (this._remoteReady) {
        remoteF.handleInput(this._remoteKeys)
        this.handleActionKey(remoteF, this._remoteKeys)
        // Clear one-shot flags — isDown state persists for smooth held movement
        this._remoteKeys.up._justDown      = false
        this._remoteKeys.attack._justDown  = false
        this._remoteKeys.special._justDown = false
        this._remoteKeys.action._justDown  = false
      }

      // Broadcast local inputs at ~30 fps
      this._netTimer += delta
      if (this._netTimer >= 33) {
        this._netTimer -= 33
        onlineSession.channel?.send({ type: 'broadcast', event: 'input', payload: snap })
      }

      // Disconnect detection: no packet for 5 s
      if (this._remoteReady && Date.now() - this._lastRemoteTime > 5000) {
        this._handleDisconnect()
      }
    } else {
      // Player 1 input
      if (!this.ai1) {
        this.f1.handleInput(this.keys1)
        this.handleActionKey(this.f1, this.keys1)
      } else {
        this.ai1.update(delta)
      }

      // Player 2 input
      if (!this.ai2) {
        this.f2.handleInput(this.keys2)
        this.handleActionKey(this.f2, this.keys2)
      } else {
        this.ai2.update(delta)
      }
    }

    this.f1.update(delta)
    this.f2.update(delta)

    // Clamp to stage bounds
    this.f1.x = Phaser.Math.Clamp(this.f1.x, this.stageBounds.left, this.stageBounds.right)
    this.f2.x = Phaser.Math.Clamp(this.f2.x, this.stageBounds.left, this.stageBounds.right)

    // Update projectiles
    this.projectiles.getChildren().forEach(p => p.update?.(delta))
  }

  handleActionKey(fighter, keys) {
    if (!Phaser.Input.Keyboard.JustDown(keys.action)) return
    if (fighter instanceof Merrs)  fighter.fireBow()
    if (fighter instanceof Thragg) fighter.spearDash()
    if (fighter instanceof Dice) {
      if (keys.block.isDown) fighter.fireCrossbow()
      else fighter.dropTNT()
    }
  }

  onHpChanged(fighter) {
    if (fighter === this.f1) this.hb1.setHP(fighter.hp, fighter.maxHp)
    else                      this.hb2.setHP(fighter.hp, fighter.maxHp)
  }

  onFighterDead(fighter) {
    if (this.roundActive) this.endRound()
  }

  endRound() {
    if (!this.roundActive) return
    this.roundActive = false
    this.timerEvent?.remove()

    const winner = this.determineWinner()
    if (winner === 1) this.p1Wins++
    else if (winner === 2) this.p2Wins++

    this.roundUI.setWins(this.p1Wins, this.p2Wins)

    const msg = winner === 0 ? 'DRAW' : `PLAYER ${winner} WINS!`
    this.roundUI.showAnnouncement(msg, 2000)

    this.time.delayedCall(2500, () => {
      if (this.p1Wins >= ROUNDS_TO_WIN || this.p2Wins >= ROUNDS_TO_WIN) {
        this.endMatch()
      } else {
        this.roundNum++
        this.startRound()
      }
    })
  }

  determineWinner() {
    if (this.f1.state === 'dead' && this.f2.state !== 'dead') return 2
    if (this.f2.state === 'dead' && this.f1.state !== 'dead') return 1
    if (this.f1.state === 'dead' && this.f2.state === 'dead') return 0
    if (this.f1.hp > this.f2.hp) return 1
    if (this.f2.hp > this.f1.hp) return 2
    return 0
  }

  endMatch() {
    const winner = this.p1Wins >= ROUNDS_TO_WIN ? 1 : 2

    // Save W/L for logged-in P1 (fire-and-forget)
    const user = this.registry.get('user')
    if (user && !user.isGuest && user.id && winner !== 0) {
      recordMatch(user.id, winner === 1).catch(() => {})
    }

    this.scene.start('ResultScene', {
      winner, mode: this.mode,
      p1: this.p1Key, p2: this.p2Key,
      p1Wins: this.p1Wins, p2Wins: this.p2Wins,
    })
  }

  _handleDisconnect() {
    if (this._disconnected) return
    this._disconnected  = true
    this.roundActive    = false
    const W = this.scale.width, H = this.scale.height
    this.add.rectangle(W / 2, H / 2, 520, 110, 0x000000, 0.88).setDepth(50).setScrollFactor(0)
    this.add.text(W / 2, H / 2 - 14, 'OPPONENT DISCONNECTED', {
      fontSize: '26px', color: '#ef4444', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(51).setScrollFactor(0)
    this.add.text(W / 2, H / 2 + 20, 'Returning to menu...', {
      fontSize: '14px', color: '#888', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(51).setScrollFactor(0)
    this.time.delayedCall(2800, () => this.scene.start('MenuScene'))
  }

  shutdown() {
    if (this.mode === 'online') clearOnlineSession()
  }

  // ── VFX spawners (called by fighters) ───────────────────────────
  spawnHitSpark(x, y, blocked = false) {
    const mainCol = blocked ? 0x60a5fa : 0xffd700
    const secCol  = blocked ? 0x93c5fd : 0xff8c00
    const count   = blocked ? 9 : 16

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5
      const speed = 55 + Math.random() * 150
      const size  = 2 + Math.random() * 3
      const col   = Math.random() > 0.4 ? mainCol : secCol
      const p     = this.add.circle(x, y, size, col, 1).setDepth(6)
      const tx = x + Math.cos(angle) * speed
      const ty = y + Math.sin(angle) * speed
      const dur = 180 + Math.random() * 140
      this.tweens.add({ targets: p, x: tx, y: ty, alpha: 0, scaleX: 0.15, scaleY: 0.15,
        duration: dur, ease: 'Quad.Out', onComplete: () => p.destroy() })
    }

    // Center flash ring
    const ring = this.add.graphics().setDepth(5)
    ring.lineStyle(blocked ? 3 : 4, blocked ? 0x93c5fd : 0xffffff, 1)
    ring.strokeCircle(0, 0, blocked ? 6 : 8)
    ring.setPosition(x, y)
    this.tweens.add({ targets: ring, scaleX: blocked ? 4 : 5.5, scaleY: blocked ? 4 : 5.5,
      alpha: 0, duration: 180, onComplete: () => ring.destroy() })

    this.cameras.main.shake(blocked ? 50 : 80, blocked ? 0.004 : 0.012)
  }

  spawnExplosion(x, y) {
    // ── Ground scorch (lingers longest) ────────────────────────────
    const scorch = this.add.graphics().setDepth(3)
    scorch.fillStyle(0x1a0a00, 0.6)
    scorch.fillEllipse(x, y + 12, 88, 26)
    scorch.fillStyle(0x000000, 0.3)
    scorch.fillEllipse(x, y + 14, 52, 14)
    this.tweens.add({ targets: scorch, alpha: 0, duration: 1600, delay: 300,
      ease: 'Quad.In', onComplete: () => scorch.destroy() })

    // ── Double shockwave rings ──────────────────────────────────────
    const ring1 = this.add.graphics().setDepth(9)
    ring1.lineStyle(7, 0xff8c00, 1); ring1.strokeCircle(0, 0, 12); ring1.setPosition(x, y)
    this.tweens.add({ targets: ring1, scaleX: 13, scaleY: 13, alpha: 0, duration: 300,
      ease: 'Quad.Out', onComplete: () => ring1.destroy() })

    const ring2 = this.add.graphics().setDepth(7)
    ring2.lineStyle(3, 0xff4400, 0.75); ring2.strokeCircle(0, 0, 20); ring2.setPosition(x, y)
    this.tweens.add({ targets: ring2, scaleX: 9, scaleY: 9, alpha: 0, duration: 500,
      delay: 50, ease: 'Quad.Out', onComplete: () => ring2.destroy() })

    // ── Layered fireball: dark-red → orange → yellow → white ───────
    const fb = [
      { r: 5,  col: 0x7f1d1d, sEnd: 8.5, dur: 580, depth: 5 },
      { r: 7,  col: 0xdc2626, sEnd: 6.5, dur: 460, depth: 6 },
      { r: 10, col: 0xea580c, sEnd: 4.5, dur: 370, depth: 7 },
      { r: 13, col: 0xf97316, sEnd: 3.0, dur: 280, depth: 8 },
      { r: 14, col: 0xfbbf24, sEnd: 2.0, dur: 210, depth: 9 },
    ]
    fb.forEach(({ r, col, sEnd, dur, depth }) => {
      const c = this.add.circle(x, y, r, col, 1).setDepth(depth)
      this.tweens.add({ targets: c, scaleX: sEnd, scaleY: sEnd, alpha: 0,
        duration: dur, ease: 'Quad.Out', onComplete: () => c.destroy() })
    })

    // ── Bright core flash ───────────────────────────────────────────
    const flash = this.add.circle(x, y, 16, 0xffffff, 1).setDepth(11)
    this.tweens.add({ targets: flash, scaleX: 4.2, scaleY: 4.2, alpha: 0,
      duration: 130, ease: 'Quad.Out', onComplete: () => flash.destroy() })

    // ── Debris — tier 1: fast hot sparks (white/yellow) ────────────
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
      const spd   = 130 + Math.random() * 220
      const sz    = 1.5 + Math.random() * 2.5
      const col   = [0xffffff, 0xfef08a, 0xfbbf24, 0xfef9c3][i % 4]
      const p = this.add.circle(x, y, sz, col, 1).setDepth(10)
      this.tweens.add({ targets: p,
        x: x + Math.cos(angle) * spd, y: y + Math.sin(angle) * spd,
        alpha: 0, scaleX: 0.05, scaleY: 0.05,
        duration: 200 + Math.random() * 160, ease: 'Quad.Out',
        onComplete: () => p.destroy() })
    }

    // ── Debris — tier 2: slow burning embers (orange/red, fall) ────
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2 + (Math.random() - 0.5) * 0.6
      const spd   = 55 + Math.random() * 110
      const sz    = 3 + Math.random() * 5
      const col   = [0xff6600, 0xea580c, 0xdc2626, 0xff3300][i % 4]
      const p = this.add.circle(x, y, sz, col, 0.95).setDepth(7)
      this.tweens.add({ targets: p,
        x: x + Math.cos(angle) * spd,
        y: y + Math.sin(angle) * spd + 40 + Math.random() * 30,
        alpha: 0, scaleX: 0.1, scaleY: 0.1,
        duration: 420 + Math.random() * 240, ease: 'Quad.In',
        onComplete: () => p.destroy() })
    }

    // ── Ground sparks — horizontal scatter along floor ──────────────
    for (let i = 0; i < 12; i++) {
      const dir = i < 6 ? 1 : -1
      const ox2 = (Math.random() - 0.5) * 24
      const spd = 70 + Math.random() * 160
      const col = Math.random() > 0.5 ? 0xfbbf24 : 0xff6600
      const sp = this.add.circle(x + ox2, y + 6, 1.5 + Math.random() * 2, col, 0.9).setDepth(8)
      this.tweens.add({ targets: sp,
        x: x + ox2 + dir * spd, y: y + 10 + Math.random() * 18,
        alpha: 0, scaleX: 0.05, scaleY: 0.05,
        duration: 220 + Math.random() * 180, ease: 'Quad.Out',
        onComplete: () => sp.destroy() })
    }

    // ── Smoke puffs — rise and dissipate ───────────────────────────
    for (let i = 0; i < 5; i++) {
      const sx = x + (Math.random() - 0.5) * 44
      const sy = y - 8 + (Math.random() - 0.5) * 18
      const smoke = this.add.graphics().setDepth(4)
      smoke.fillStyle(0x374151, 0.32 - i * 0.04)
      smoke.fillEllipse(0, 0, 28 + i * 8, 20 + i * 6)
      smoke.setPosition(sx, sy)
      this.tweens.add({ targets: smoke,
        y: sy - 50 - Math.random() * 35,
        scaleX: 1.9 + Math.random() * 0.6, scaleY: 1.5 + Math.random() * 0.4,
        alpha: 0, duration: 750 + Math.random() * 450,
        delay: 60 + i * 55, ease: 'Quad.Out',
        onComplete: () => smoke.destroy() })
    }

    this.cameras.main.shake(400, 0.025)
  }

  spawnBurnEffect(x, y) {
    const burn = this.add.image(x, y, 'burn').setDepth(4).setScale(1.4)
    this.tweens.add({ targets: burn, y: y - 28, alpha: 0, scaleX: 1.8, scaleY: 1.8,
      duration: 480, ease: 'Quad.Out', onComplete: () => burn.destroy() })
    // Rising embers — more of them, varied colors
    for (let i = 0; i < 14; i++) {
      const ox  = (Math.random() - 0.5) * 44
      const col = [0xff6600, 0xffcc00, 0xff3300, 0xfbbf24, 0xef4444][i % 5]
      const sz  = 1.5 + Math.random() * 3
      const p   = this.add.circle(x + ox, y, sz, col, 0.9).setDepth(5)
      this.tweens.add({ targets: p,
        y: y - 40 - Math.random() * 55,
        x: x + ox + (Math.random() - 0.5) * 28,
        alpha: 0, scaleX: 0.1, scaleY: 0.1,
        duration: 380 + Math.random() * 280, ease: 'Quad.Out',
        onComplete: () => p.destroy() })
    }
    // Small flash at contact point
    const bf = this.add.circle(x, y, 8, 0xff8800, 0.75).setDepth(6)
    this.tweens.add({ targets: bf, scaleX: 2.5, scaleY: 2.5, alpha: 0,
      duration: 120, onComplete: () => bf.destroy() })
  }

  spawnGlideTrail(x, y, fighter) {
    if (fighter) {
      const img = this.add.image(fighter.x, fighter.y, fighter.texture.key, fighter.frame.name)
        .setFlipX(fighter.flipX).setScale(fighter.scaleX, fighter.scaleY)
        .setAlpha(0.38).setDepth(0).setTint(0x9b59b6)
      this.tweens.add({ targets: img, alpha: 0, duration: 200, onComplete: () => img.destroy() })
    } else {
      const trail = this.add.rectangle(x, y, 36, 7, 0x9b59b6, 0.5).setDepth(0)
      this.tweens.add({ targets: trail, alpha: 0, scaleX: 0, duration: 280, onComplete: () => trail.destroy() })
    }
  }

  spawnDashTrail(x, y, fighter) {
    if (fighter) {
      const img = this.add.image(fighter.x, fighter.y, fighter.texture.key, fighter.frame.name)
        .setFlipX(fighter.flipX).setScale(fighter.scaleX, fighter.scaleY)
        .setAlpha(0.40).setDepth(0).setTint(0x4ade80)
      this.tweens.add({ targets: img, alpha: 0, duration: 180, onComplete: () => img.destroy() })
    } else {
      const trail = this.add.rectangle(x, y, 55, 10, 0x16a34a, 0.6).setDepth(0)
      this.tweens.add({ targets: trail, alpha: 0, scaleX: 0.2, duration: 220, onComplete: () => trail.destroy() })
    }
  }

  spawnArrow(x, y, dir, owner) {
    const arrow = this.add.image(x, y, 'arrow').setDepth(3).setFlipX(dir === -1)
    this.physics.add.existing(arrow)
    arrow.body.setVelocityX(dir * 650)
    arrow.body.setAllowGravity(false)

    const arrowTrail = this.time.addEvent({ delay: 30, loop: true, callback: () => {
      if (!arrow.active) { arrowTrail.remove(); return }
      const t = this.add.circle(arrow.x, arrow.y, 2, 0xdddddd, 0.55).setDepth(2)
      this.tweens.add({ targets: t, alpha: 0, scaleX: 0.1, duration: 150, onComplete: () => t.destroy() })
    }})

    const check = this.time.addEvent({ delay: 16, loop: true, callback: () => {
      if (!arrow.active) { check.remove(); return }
      const opp = owner.opponent
      if (opp && Math.abs(arrow.x - opp.x) < 30 && Math.abs(arrow.y - opp.y) < 60) {
        opp.takeDamage(owner.cfg.bowDamage, true, owner)
        owner.onBowHit?.()
        arrow.destroy()
        check.remove()
      }
      if (arrow.x < 0 || arrow.x > this.scale.width) { arrow.destroy(); check.remove() }
    }})
  }

  spawnFishingHook(x, y, dir, owner) {
    const hook = this.add.image(x, y, 'hook').setDepth(3).setFlipX(dir === -1)
    this.physics.add.existing(hook)
    hook.body.setVelocityX(dir * 520)
    hook.body.setAllowGravity(false)

    const hookTrail = this.time.addEvent({ delay: 30, loop: true, callback: () => {
      if (!hook.active) { hookTrail.remove(); return }
      const t = this.add.circle(hook.x, hook.y, 2, 0x60a5fa, 0.5).setDepth(2)
      this.tweens.add({ targets: t, alpha: 0, scaleX: 0.1, duration: 150, onComplete: () => t.destroy() })
    }})

    const check = this.time.addEvent({ delay: 16, loop: true, callback: () => {
      if (!hook.active) { check.remove(); return }
      const opp = owner.opponent
      if (opp && Math.abs(hook.x - opp.x) < 35 && Math.abs(hook.y - opp.y) < 80) {
        hook.destroy()
        check.remove()
        owner.onHookLanded?.(opp)
      }
      if (hook.x < 0 || hook.x > this.scale.width) { hook.destroy(); check.remove() }
    }})
  }

  spawnFlameBolt(x, y, dir, damage, owner) {
    const bolt = this.add.image(x, y, 'flamebolt').setDepth(3).setFlipX(dir === -1)
    this.physics.add.existing(bolt)
    bolt.body.setVelocityX(dir * 720)
    bolt.body.setAllowGravity(false)

    const boltTrail = this.time.addEvent({ delay: 25, loop: true, callback: () => {
      if (!bolt.active) { boltTrail.remove(); return }
      const col = Math.random() > 0.45 ? 0xff6600 : 0xffcc00
      const t = this.add.circle(bolt.x, bolt.y, 3 + Math.random() * 2, col, 0.7).setDepth(2)
      this.tweens.add({ targets: t, alpha: 0, scaleX: 0.1, y: bolt.y - 8,
        duration: 200, onComplete: () => t.destroy() })
    }})

    const check = this.time.addEvent({ delay: 16, loop: true, callback: () => {
      if (!bolt.active) { check.remove(); return }
      const opp = owner.opponent
      if (opp && Math.abs(bolt.x - opp.x) < 35 && Math.abs(bolt.y - opp.y) < 70) {
        opp.takeDamage(damage, true, owner) // blockable
        this.spawnBurnEffect(opp.x, opp.y - 30)
        bolt.destroy(); check.remove()
      }
      if (bolt.x < 0 || bolt.x > this.scale.width) { bolt.destroy(); check.remove() }
    }})
  }

  spawnTNT(x, y, damage, owner) {
    const tnt = this.add.image(x, y, 'tnt').setDepth(3)
    this.physics.add.existing(tnt)
    tnt.body.setGravityY(800)
    tnt.damage = damage
    tnt.owner = owner

    // Explode on enemy contact
    const check = this.time.addEvent({ delay: 16, loop: true, callback: () => {
      if (!tnt.active) { check.remove(); return }
      const opp = owner.opponent
      if (opp && Math.abs(tnt.x - opp.x) < 40 && Math.abs(tnt.y - opp.y) < 60) {
        this.spawnExplosion(tnt.x, tnt.y)
        opp.takeDamage(tnt.damage, false, owner) // unblockable
        if (owner.activeTNT === tnt) owner.activeTNT = null
        tnt.destroy(); check.remove()
      }
    }})
    return tnt
  }

  spawnSpecialBolt(x, y, dx, dy, targetTNT, damage, owner) {
    const bolt = this.add.circle(x, y, 10, 0xffff00).setDepth(4)
    this.physics.add.existing(bolt)
    bolt.body.setVelocityX(dx * 800)
    bolt.body.setVelocityY(dy * 800)
    bolt.body.setAllowGravity(false)

    const specialTrail = this.time.addEvent({ delay: 20, loop: true, callback: () => {
      if (!bolt.active) { specialTrail.remove(); return }
      const t = this.add.circle(bolt.x, bolt.y, 5, 0xffee00, 0.75).setDepth(3)
      this.tweens.add({ targets: t, alpha: 0, scaleX: 0.2, scaleY: 0.2,
        duration: 140, onComplete: () => t.destroy() })
    }})

    const check = this.time.addEvent({ delay: 16, loop: true, callback: () => {
      if (!bolt.active) { check.remove(); return }
      if (!targetTNT || !targetTNT.active) { bolt.destroy(); check.remove(); return }
      if (Math.abs(bolt.x - targetTNT.x) < 20 && Math.abs(bolt.y - targetTNT.y) < 20) {
        this.spawnExplosion(targetTNT.x, targetTNT.y)
        this.cameras.main.shake(400, 0.02)
        owner.opponent?.takeDamage(damage, false, owner)
        targetTNT.destroy()
        bolt.destroy(); check.remove()
      }
    }})
  }

  spawnNet(x, y, dir, owner) {
    const net = this.add.image(x, y, 'net').setDepth(3)
    this.physics.add.existing(net)
    net.body.setVelocityX(dir * 450)
    net.body.setAllowGravity(false)

    const check = this.time.addEvent({ delay: 16, loop: true, callback: () => {
      if (!net.active) { check.remove(); return }
      const opp = owner.opponent
      if (opp && Math.abs(net.x - opp.x) < 45 && Math.abs(net.y - opp.y) < 70) {
        if (!opp.isBlocking) opp.applyStun(owner.cfg.netStunDuration)
        net.destroy(); check.remove()
      }
      if (net.x < 0 || net.x > this.scale.width) { net.destroy(); check.remove() }
    }})
  }

  spawnDust(x, y) {
    for (let i = 0; i < 12; i++) {
      const side = i < 6 ? -1 : 1
      const speed = 28 + Math.random() * 85
      const size  = 3 + Math.random() * 4
      const p = this.add.circle(x, y, size, 0x6b21a8, 0.45).setDepth(0)
      this.tweens.add({
        targets: p,
        x: x + side * speed * (0.5 + Math.random()),
        y: y - 8 - Math.random() * 18,
        alpha: 0, scaleX: 0.25, scaleY: 0.25,
        duration: 260 + Math.random() * 180, ease: 'Quad.Out',
        onComplete: () => p.destroy(),
      })
    }
  }

  _checkHazards() {
    const now = this.time.now
    this.stageHazards.forEach(h => {
      if (!h.active) return
      if (now - h.lastTick < 600) return
      for (const f of [this.f1, this.f2]) {
        if (f.state === 'dead') continue
        if (f.x > h.x && f.x < h.x + h.w && f.y > h.y && f.y < h.y + h.h) {
          f.takeDamage(h.damage, false, null)
          this.spawnBurnEffect(f.x, f.y - 30)
          h.lastTick = now
        }
      }
    })
  }

  spawnBlockRipple(x, y) {
    const ring = this.add.graphics().setDepth(5)
    ring.lineStyle(3, 0x93c5fd, 1)
    ring.strokeCircle(0, 0, 8)
    ring.setPosition(x, y)
    this.tweens.add({ targets: ring, scaleX: 5, scaleY: 5, alpha: 0, duration: 220,
      ease: 'Quad.Out', onComplete: () => ring.destroy() })
  }

  spawnKOEffect(x, y) {
    const W = this.W, H = this.H

    // White screen flash
    const flash = this.add.rectangle(W / 2, H / 2, W + 300, H + 300, 0xffffff, 1)
      .setScrollFactor(0).setDepth(30)
    this.tweens.add({ targets: flash, alpha: 0, duration: 650, ease: 'Quad.In',
      onComplete: () => flash.destroy() })

    // Heavy particle burst
    const cols = [0xffffff, 0xffd700, 0xff6600, 0x9b59b6, 0xef4444]
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2
      const speed = 90 + Math.random() * 300
      const size  = 3 + Math.random() * 7
      const p = this.add.circle(x, y, size, cols[i % cols.length], 1).setDepth(25)
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0, scaleX: 0.1, scaleY: 0.1,
        duration: 500 + Math.random() * 350, ease: 'Quad.Out',
        onComplete: () => p.destroy(),
      })
    }

    // Primary shockwave ring
    const ring = this.add.graphics().setDepth(24)
    ring.lineStyle(6, 0xffffff, 1); ring.strokeCircle(0, 0, 24); ring.setPosition(x, y)
    this.tweens.add({ targets: ring, scaleX: 11, scaleY: 11, alpha: 0, duration: 480,
      ease: 'Quad.Out', onComplete: () => ring.destroy() })

    // Secondary ring delayed
    this.time.delayedCall(120, () => {
      const ring2 = this.add.graphics().setDepth(24)
      ring2.lineStyle(3, 0x9b59b6, 0.85); ring2.strokeCircle(0, 0, 18); ring2.setPosition(x, y)
      this.tweens.add({ targets: ring2, scaleX: 8, scaleY: 8, alpha: 0, duration: 380,
        ease: 'Quad.Out', onComplete: () => ring2.destroy() })
    })

    this.cameras.main.shake(600, 0.028)

    // Physics slow-mo
    this.physics.world.timeScale = 0.14
    this.time.delayedCall(900, () => { if (this.physics?.world) this.physics.world.timeScale = 1 })
  }
}
