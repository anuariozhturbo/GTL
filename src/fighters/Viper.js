import Fighter from './Fighter.js'

export default class Viper extends Fighter {
  setupUnique() {
    this.dashCooldown   = 0
    this.doubleJumpAvail = true
    this._poisonTargets  = new Map()  // target → { remaining, tickTimer }
  }

  resetUnique() {
    this.dashCooldown    = 0
    this.doubleJumpAvail = true
    this._poisonTargets  = new Map()
  }

  // Double jump override
  doJump(force) {
    if (this.body.blocked.down) {
      this.doubleJumpAvail = true
      super.doJump(force)
    } else if (this.doubleJumpAvail) {
      this.doubleJumpAvail = false
      this.setVelocityY(-(this.cfg.jumpForce * 0.82))
      this.setState('jump')
      // Air dash VFX
      this.scene.spawnGlideTrail?.(this.x, this.y, this)
    }
  }

  // On hit: apply poison to opponent
  checkHit() {
    if (!this.opponent || this.opponent.state === 'dead') return
    if (this.distToOpponent < this.cfg.attackRange) {
      this.opponent.takeDamage(this.cfg.attackDamage, true, this)
      this._applyPoison(this.opponent)
    }
  }

  _applyPoison(target) {
    const existing = this._poisonTargets.get(target)
    // Stack: refresh duration, keep existing if newer
    this._poisonTargets.set(target, {
      remaining: this.cfg.poisonDuration,
      tickTimer: existing ? existing.tickTimer : 0,
    })
    // Green poison tint flash
    target.setTint(0x4ade80)
    this.scene.time.delayedCall(200, () => { if (target.active) target.clearTint() })
  }

  // Special: forward blade dash — deals damage to anything in path
  doSpecial() {
    if (this.specialCooldown > 0 || this.dashCooldown > 0) return
    this.specialCooldown = this.cfg.specialCooldown
    this.dashCooldown    = this.cfg.dashCooldown
    this.setState('special')
    this.setVelocityX(this.facing * this.cfg.dashSpeed)
    this.setVelocityY(-120)

    const trailEvt = this.scene.time.addEvent({ delay: 30, loop: true, callback: () => {
      if (!this.active) { trailEvt.remove(); return }
      this.scene.spawnGlideTrail?.(this.x, this.y, this)
    }})

    // Hit window — check opponent during dash
    const hitEvt = this.scene.time.addEvent({ delay: 20, loop: true, callback: () => {
      if (!this.active) { hitEvt.remove(); return }
      const opp = this.opponent
      if (opp && opp.state !== 'dead' && this.distToOpponent < this.cfg.attackRange * 1.4) {
        opp.takeDamage(this.cfg.dashDamage, false, this)
        this._applyPoison(opp)
        hitEvt.remove()
      }
    }})

    this.scene.time.delayedCall(320, () => {
      trailEvt.remove()
      hitEvt.remove()
      this.setVelocityX(0)
      if (this.state === 'special') this.setState('idle')
    })
  }

  updateUnique(delta) {
    if (this.dashCooldown > 0) this.dashCooldown -= delta

    // Tick poison on all tracked targets
    for (const [target, data] of this._poisonTargets) {
      if (!target.active || target.state === 'dead') {
        this._poisonTargets.delete(target)
        continue
      }
      data.remaining  -= delta
      data.tickTimer  -= delta

      if (data.tickTimer <= 0) {
        data.tickTimer = 600
        const dmg = target.maxHp * this.cfg.poisonDamagePct
        target.hp = Math.max(0, target.hp - dmg)
        this.scene.events.emit('hpChanged', target)
        this.scene.spawnBurnEffect?.(target.x, target.y - 30)
        if (target.hp <= 0) target.die()
      }

      if (data.remaining <= 0) this._poisonTargets.delete(target)
    }
  }

  get specialReady() { return this.specialCooldown <= 0 }
  get dashReady()    { return this.dashCooldown <= 0 }
}
