import AIController from './AIController.js'

const STRATEGIES = ['aggressive', 'aerial', 'pressure', 'zoner', 'defensive']

export default class SmartAIController extends AIController {
  constructor(fighter, profile = {}) {
    // Enhanced base stats for AvA exhibition
    super(fighter, {
      aggression:     Math.min(0.95, (profile.aggression     ?? 0.65) * 1.30),
      reactionMs:     Math.max(60,   (profile.reactionMs     ?? 200)  - 80),
      attackRange:    (profile.attackRange    ?? 130) * 1.15,
      preferredRange: (profile.preferredRange ?? 280) * 1.10,
    })

    this.strategy      = 'aggressive'
    this.stratTimer    = 0
    this.comboCount    = 0
    this.comboTimer    = 0
    this.crossUpActive = false
    this.harassTimer   = 0
  }

  update(delta) {
    this.stratTimer  -= delta
    this.comboTimer  -= delta
    this.harassTimer -= delta

    // Cycle strategy every 2–4 seconds for variety
    if (this.stratTimer <= 0) {
      this._pickStrategy()
      this.stratTimer = 2000 + Math.random() * 2000
    }

    // Reset combo if too much time passed without attack landing
    if (this.comboTimer <= 0) this.comboCount = 0

    super.update(delta)
  }

  _pickStrategy() {
    // Weight strategies — aggressive and aerial more common for entertainment
    const pool = ['aggressive', 'aggressive', 'aerial', 'aerial', 'pressure', 'zoner', 'defensive']
    const pick = pool[Math.floor(Math.random() * pool.length)]
    if (pick !== this.strategy) this.strategy = pick
  }

  decide() {
    const f   = this.fighter
    const opp = f.opponent
    if (!opp) return

    const dist     = f.distToOpponent
    const onGround = f.body.blocked.down
    const oppVuln  = opp.hurtTimer > 80 || opp.stunTimer > 0

    // ── Universal: punish immediately when opponent is vulnerable ────
    if (oppVuln) {
      if (dist <= this.attackRange * 1.1) {
        this.comboCount++
        this.comboTimer = 400
        this.set('attack', 110)
        return
      }
      if (f.specialCooldown <= 0 && this.trySpecial(dist)) {
        this.set('special', 200)
        return
      }
      this.set('approach', 120)
      return
    }

    // ── Strategy dispatch ────────────────────────────────────────────
    switch (this.strategy) {
      case 'aerial':    this._decideAerial(dist, onGround);   return
      case 'pressure':  this._decidePressure(dist, onGround); return
      case 'zoner':     this._decideZoner(dist, onGround);    return
      case 'defensive': this._decideDefensive(dist, onGround);return
      default:          super.decide()
    }
  }

  // ── Aerial strategy: jump approaches, cross-ups, air attacks ──────
  _decideAerial(dist, onGround) {
    const f   = this.fighter
    const opp = f.opponent
    const oppHitting = opp.state === 'attack' || opp.state === 'special'

    // Dodge incoming attack with jump
    if (oppHitting && dist < this.attackRange * 1.8 && onGround && Math.random() < 0.6) {
      this.set('jump', 220)
      return
    }

    // Far away: jump-approach
    if (dist > this.preferredRange * 1.3) {
      if (onGround && Math.random() < 0.7) { this.set('jump', 280); return }
      this.set('approach', 200)
      return
    }

    // Cross-up jump over opponent
    if (onGround && dist < this.attackRange * 2.5 && Math.random() < 0.30) {
      this.crossUpActive = true
      this.set('jump', 320)
      return
    }

    // Air attack when close and airborne
    if (!onGround && dist <= this.attackRange * 1.3 && f.attackCooldown <= 0) {
      this.set('attack', 130)
      return
    }

    // Ranged + jump mix
    if (dist < this.preferredRange) {
      this.tryRanged()
      if (onGround && Math.random() < 0.45) { this.set('jump', 200); return }
      this.set('approach', 180)
      return
    }

    this.set('approach', 200)
  }

  // ── Pressure strategy: relentless close-range offense ─────────────
  _decidePressure(dist, onGround) {
    const f   = this.fighter
    const opp = f.opponent
    const oppHitting = opp.state === 'attack' || opp.state === 'special'

    // Block incoming hit then immediately counter
    if (oppHitting && dist < this.attackRange * 1.4 && Math.random() < 0.45) {
      this.set('block', 180)
      return
    }

    if (dist <= this.attackRange) {
      this.comboCount++
      this.comboTimer = 350

      if (this.comboCount <= 3) {
        this.set('attack', 120)
        return
      }
      // After 3-hit combo: special or brief retreat then re-engage
      this.comboCount = 0
      if (f.specialCooldown <= 0 && this.trySpecial(dist)) {
        this.set('special', 200); return
      }
      this.set('retreat', 180 + Math.random() * 140)
      return
    }

    if (dist < this.preferredRange * 1.1) {
      this.tryRanged()
      this.set('approach', 160)
      return
    }

    this.set('approach', 240)
  }

  // ── Zoner strategy: control space with ranged attacks + keepaway ───
  _decideZoner(dist, onGround) {
    const f = this.fighter
    const opp = f.opponent
    const oppHitting = opp.state === 'attack' || opp.state === 'special'

    // Back off if too close
    if (dist < this.attackRange * 1.3) {
      if (oppHitting && onGround && Math.random() < 0.5) {
        this.set('jump', 200); return
      }
      this.set('retreat', 260 + Math.random() * 180)
      return
    }

    // Preferred zone: spam ranged + specials
    if (dist < this.preferredRange * 1.2) {
      if (this.harassTimer <= 0) {
        this.tryRanged()
        this.harassTimer = 600 + Math.random() * 400
      }
      if (f.specialCooldown <= 0 && this.trySpecial(dist)) {
        this.set('special', 240); return
      }
      if (onGround && Math.random() < 0.25) { this.set('jump', 220); return }
      this.set('idle', 180)
      return
    }

    // Move to preferred zone
    this.set('approach', 200)
  }

  // ── Defensive strategy: wait for openings ─────────────────────────
  _decideDefensive(dist, onGround) {
    const f   = this.fighter
    const opp = f.opponent
    const oppHitting = opp.state === 'attack' || opp.state === 'special'
    const oppMoving  = opp.state === 'walk'

    // Block or dodge incoming attacks
    if (oppHitting && dist < this.attackRange * 1.6) {
      const r = Math.random()
      if (r < 0.40) { this.set('block',   260 + Math.random() * 200); return }
      if (r < 0.65) { this.set('retreat', 200 + Math.random() * 160); return }
      if (onGround)  { this.set('jump', 200); return }
    }

    // Punish when opponent finishes an attack
    if (opp.attackCooldown > 0 && dist <= this.attackRange * 1.2) {
      this.set('attack', 120); return
    }

    // Maintain spacing, use ranged occasionally
    if (dist < this.attackRange * 1.4) {
      this.set('retreat', 220); return
    }

    if (dist < this.preferredRange) {
      if (this.harassTimer <= 0) {
        this.tryRanged()
        this.harassTimer = 700
      }
      if (f.specialCooldown <= 0 && this.trySpecial(dist)) {
        this.set('special', 220); return
      }
      this.set('idle', 180)
      return
    }

    // Close in slowly
    if (oppMoving && Math.random() < 0.55) { this.set('approach', 200); return }
    this.set('idle', 200)
  }

  executeState() {
    super.executeState()

    // Cross-up logic: keep moving past opponent until fully crossed
    const f   = this.fighter
    const opp = f.opponent
    if (this.crossUpActive && opp) {
      const pastDir = opp.x > f.x ? 1 : -1
      if (f.state === 'jump') {
        if (Math.abs(f.x - opp.x) < 100) {
          f.setVelocityX(pastDir * f.cfg.speed * 1.4)
        }
      } else if (f.body.blocked.down) {
        this.crossUpActive = false
      }
    }

    // Edge awareness: near stage left/right bounds, don't fall off
    const bounds = f.scene.stageBounds
    if (bounds) {
      const nearEdge = f.x < bounds.left + 120 || f.x > bounds.right - 120
      if (nearEdge && (this.aiState === 'retreat' || this.aiState === 'approach')) {
        // Reverse direction when too close to edge
        const toCenter = f.x < (bounds.left + bounds.right) / 2 ? 1 : -1
        if (this.aiState === 'retreat') {
          f.setVelocityX(toCenter * f.cfg.speed * 0.7)
        }
      }
    }
  }

  // Override tryRanged to be more aggressive about using it
  tryRanged() {
    const f = this.fighter
    if (Math.random() > 0.80) return   // 80% chance to fire vs base 38%
    const n = f.constructor.name
    if (n === 'Merrs'  && f.bowReady)      f.fireBow?.()
    if (n === 'Dice'   && f.tntReady)      f.dropTNT?.()
    if (n === 'Dice'   && f.crossbowReady) f.fireCrossbow?.()
    if (n === 'Thragg' && f.dashReady)     f.spearDash?.()
  }

  // Override trySpecial to use it more opportunistically
  trySpecial(dist) {
    const f = this.fighter
    if (f.specialCooldown > 0) return false
    if (Math.random() > 0.82) return false   // up from 0.58 base
    const n = f.constructor.name
    if (n === 'Ash'    && dist < 500) return true
    if (n === 'Merrs'  && dist < 600) return true
    if (n === 'Dice'   && f.activeTNT) return true
    if (n === 'Thragg' && dist < 450) return true
    if (n === 'Trackstar' && dist < 560) return true
    if (n === 'Kendi' && dist < 760) return true
    if (n === 'Overclock' && dist < 460) return true
    return false
  }
}
