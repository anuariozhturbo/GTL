import Fighter from './Fighter.js'

export default class Overclock extends Fighter {
  setupUnique() {
    this.pulseCooldown = 0
  }

  resetUnique() {
    this.pulseCooldown = 0
  }

  checkHit() {
    const opp = this.opponent
    if (!opp || opp.state === 'dead') return

    if (this.distToOpponent < this.cfg.attackRange) {
      opp.takeDamage(this.cfg.attackDamage, true, this)
      if (this.pulseCooldown <= 0) {
        this.pulseCooldown = this.cfg.pulseCooldown
        opp.applyStun(this.cfg.pulseStun)
        this.scene.spawnBlockRipple?.(opp.x, opp.y - 35)
      }
    }
  }

  doSpecial() {
    if (this.specialCooldown > 0 || !this.opponent) return
    this.specialCooldown = this.cfg.specialCooldown
    this.setState('special')
    this.attackLocked = true
    this.faceOpponent()

    const dir = this.facing
    this.setVelocityX(dir * this.cfg.rushSpeed)
    this.setVelocityY(-60)

    let hit = false
    const trailEvt = this.scene.time.addEvent({ delay: 28, loop: true, callback: () => {
      if (!this.active) { trailEvt.remove(); return }
      this.scene.spawnDashTrail?.(this.x, this.y, this)
    }})

    const hitEvt = this.scene.time.addEvent({ delay: 16, loop: true, callback: () => {
      if (!this.active) { hitEvt.remove(); return }
      const opp = this.opponent
      if (!hit && opp && opp.state !== 'dead' && this.distToOpponent < this.cfg.attackRange * 1.5) {
        hit = true
        opp.takeDamage(Math.floor(opp.maxHp * this.cfg.rushDamagePct), false, this)
        opp.applyStun(this.cfg.rushStun)
        this.scene.spawnExplosion?.(opp.x, opp.y - 20)
        hitEvt.remove()
      }
    }})

    this.scene.time.delayedCall(this.cfg.rushDuration, () => {
      trailEvt.remove()
      hitEvt.remove()
      this.attackLocked = false
      this.setVelocityX(0)
      if (this.state === 'special') this.setState('idle')
    })
  }

  updateUnique(delta) {
    if (this.pulseCooldown > 0) this.pulseCooldown -= delta
  }
}
