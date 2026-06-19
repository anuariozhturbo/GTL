// FSM AI — works for PvAI and AIvAI modes
export default class AIController {
  constructor(fighter, profile = {}) {
    this.fighter        = fighter
    this.aggression     = profile.aggression     ?? 0.6
    this.reactionMs     = profile.reactionMs     ?? 200
    this.attackRange    = profile.attackRange    ?? 140
    this.preferredRange = profile.preferredRange ?? 280

    this.aiState       = 'approach'
    this.stateTimer    = 0
    this.decisionTimer = 0
    this.pressureCount = 0
  }

  update(delta) {
    const f = this.fighter
    const opp = f.opponent
    if (!opp || f.state === 'dead') return
    if (f.stunTimer > 0 || f.hurtTimer > 0) {
      this.stateTimer = 0
      return
    }

    this.stateTimer    -= delta
    this.decisionTimer -= delta

    f.faceOpponent()
    this.executeState()

    if (this.decisionTimer <= 0) {
      this.decide()
      this.decisionTimer = this.reactionMs + Math.random() * 80
    }
  }

  decide() {
    const f   = this.fighter
    const opp = f.opponent
    const dist        = f.distToOpponent
    const onGround    = f.body.blocked.down
    const oppHitting  = opp.state === 'attack' || opp.state === 'special'
    const hpRatio     = f.hp / f.maxHp

    // ── Defensive: dodge when opponent attacks in range ──────────────
    if (oppHitting && dist < this.attackRange * 1.5) {
      const roll = Math.random()
      if (roll < (1 - this.aggression) * 0.78) {
        this.set('block', 260 + Math.random() * 360)
        return
      }
      if (roll < (1 - this.aggression) * 0.96) {
        this.set('retreat', 190 + Math.random() * 240)
        return
      }
      if (roll < (1 - this.aggression) && onGround) {
        this.set('jump', 180)
        return
      }
    }

    // ── Low HP: conserve more ────────────────────────────────────────
    if (hpRatio < 0.25 && dist < this.preferredRange && Math.random() < 0.45) {
      this.set('retreat', 320 + Math.random() * 300)
      return
    }

    // ── In attack range ──────────────────────────────────────────────
    if (dist <= this.attackRange) {
      if (f.attackCooldown <= 0 && Math.random() < this.aggression * 0.92) {
        this.pressureCount++
        this.set('attack', 140)
        // After 2–3 attacks in a row, retreat briefly to mix-up
        if (this.pressureCount >= 2 + Math.floor(Math.random() * 2)) {
          this.pressureCount = 0
          this.set('retreat', 200 + Math.random() * 200)
        }
        return
      }
      if (this.trySpecial(dist)) { this.set('special', 220); return }
      if (Math.random() < 0.4) { this.set('retreat', 180); return }
      this.set('idle', 100)
      return
    }

    // ── Mid range ────────────────────────────────────────────────────
    if (dist < this.preferredRange) {
      this.tryRanged()
      if (this.trySpecial(dist)) { this.set('special', 220); return }
      const r = Math.random()
      if (r < 0.62) { this.set('approach', 260 + Math.random() * 180); return }
      if (r < 0.78 && onGround) { this.set('jump', 180); return }
      this.set('idle', 110)
      return
    }

    // ── Far: close the gap ──────────────────────────────────────────
    if (Math.random() < 0.18 && onGround) {
      this.set('jump', 200)
    } else {
      this.set('approach', 360 + Math.random() * 280)
    }
  }

  set(state, duration) {
    this.aiState   = state
    this.stateTimer = duration ?? 200
  }

  executeState() {
    const f   = this.fighter
    const opp = f.opponent
    if (!opp) return
    const dir = opp.x > f.x ? 1 : -1

    switch (this.aiState) {
      case 'approach':
        f.setBlocking(false)
        f.setVelocityX(dir * f.cfg.speed)
        if (f.state !== 'jump') f.setState('walk')
        break

      case 'retreat':
        f.setBlocking(false)
        f.setVelocityX(-dir * f.cfg.speed * 0.85)
        if (f.state !== 'jump') f.setState('walk')
        break

      case 'attack':
        f.setBlocking(false)
        f.setVelocityX(0)
        if (f.attackCooldown <= 0 && f.state !== 'attack') f.doAttack()
        break

      case 'block':
        f.setVelocityX(0)
        f.setBlocking(true)
        if (this.stateTimer <= 0) f.setBlocking(false)
        break

      case 'jump':
        f.setBlocking(false)
        if (f.body.blocked.down) f.doJump()
        f.setVelocityX(dir * f.cfg.speed)
        if (f.state !== 'jump' && this.stateTimer <= 0) this.set('approach', 200)
        break

      case 'special':
        f.setBlocking(false)
        f.setVelocityX(0)
        f.useSpecial()
        this.set('idle', 200)
        break

      case 'idle':
        f.setVelocityX(0)
        if (f.state !== 'block' && f.state !== 'attack' && f.state !== 'special')
          f.setState('idle')
        break
    }
  }

  trySpecial(dist) {
    const f = this.fighter
    if (f.specialCooldown > 0) return false
    if (Math.random() > this.aggression * 0.58) return false
    const n = f.constructor.name
    if (n === 'Ash'    && dist < 450) return true
    if (n === 'Merrs'  && dist < 550) return true
    if (n === 'Dice'   && f.activeTNT) return true
    if (n === 'Thragg' && dist < 400) return true
    return false
  }

  tryRanged() {
    const f = this.fighter
    if (Math.random() > 0.62) return
    const n = f.constructor.name
    if (n === 'Merrs'  && f.bowReady)      f.fireBow?.()
    if (n === 'Dice'   && f.tntReady)      f.dropTNT?.()
    if (n === 'Dice'   && f.crossbowReady) f.fireCrossbow?.()
    if (n === 'Thragg' && f.dashReady)     f.spearDash?.()
  }
}
