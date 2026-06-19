import Fighter from './Fighter.js'

export default class Thragg extends Fighter {
  setupUnique() {
    this.dashCooldown = 0
    this.isDashing = false
    this.hitCounter = 0
  }

  resetUnique() {
    this.dashCooldown = 0
    this.isDashing = false
    this.hitCounter = 0
  }

  // Every 3rd hit stuns the opponent
  checkHit() {
    if (!this.opponent || this.opponent.state === 'dead') return
    if (this.distToOpponent < this.cfg.attackRange) {
      this.opponent.takeDamage(this.cfg.attackDamage, true, this)
      this.hitCounter++
      if (this.hitCounter >= 3) {
        this.hitCounter = 0
        this.opponent.applyStun(this.cfg.hitStunDuration)
        // Visual cue: flash Thragg gold on the power hit
        this.setTint(0xffd700)
        this.scene.time.delayedCall(120, () => this.clearTint())
      }
    }
  }

  spearDash() {
    if (this.dashCooldown > 0 || this.state === 'dead') return
    this.dashCooldown = this.cfg.dashCooldown
    this.isDashing = true
    this.setState('special')
    this.setVelocityX(this.facing * this.cfg.dashSpeed)

    const trailEvt = this.scene.time.addEvent({ delay: 40, loop: true, callback: () => {
      this.scene.spawnDashTrail(this.x, this.y, this)
    }})

    this.scene.time.delayedCall(this.cfg.dashDuration, () => {
      this.isDashing = false
      trailEvt.remove()
      if (this.state === 'special') this.setState('idle')
    })
  }

  doSpecial() {
    if (this.specialCooldown > 0) return
    this.specialCooldown = this.cfg.specialCooldown
    const dir = this.facing
    this.scene.spawnNet(this.x + dir * 30, this.y - 40, dir, this)
  }

  updateUnique(delta) {
    if (this.dashCooldown > 0) this.dashCooldown -= delta
  }

  get specialReady() { return this.specialCooldown <= 0 }
  get dashReady() { return this.dashCooldown <= 0 }
}
