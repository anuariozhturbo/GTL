import Fighter from './Fighter.js'

export default class Ash extends Fighter {
  setupUnique() {
    this.isGliding = false
    this.wasAirborne = false
    this.aerialAttackPending = false
  }

  resetUnique() {
    this.isGliding = false
    this.wasAirborne = false
    this.aerialAttackPending = false
  }

  handleInput(cursors) {
    // Glide: hold jump while airborne
    if (!this.body.blocked.down && cursors.up.isDown && this.body.velocity.y > 0) {
      this.isGliding = true
      this.body.setGravityY(-1500) // reduce gravity = glide
    } else {
      this.isGliding = false
      this.body.setGravityY(0)
    }
    super.handleInput(cursors)
  }

  doAttack() {
    const wasInAir = !this.body.blocked.down
    this.setState('attack')
    this.attackLocked = true
    this.attackCooldown = this.cfg.attackCooldown
    this.setVelocityX(0)

    this.scene.tweens.killTweensOf(this)
    this.setScale(1)
    this.scene.tweens.add({
      targets: this, scaleX: 1.14,
      duration: 50, yoyo: true, ease: 'Back.Out',
    })

    if (this.opponent) {
      const dir = this.opponent.x > this.x ? 1 : -1
      this.setVelocityX(dir * 180)
    }

    this.setTint(0xffffff)
    this.scene.time.delayedCall(80, () => this.clearTint())
    this.scene.time.delayedCall(150, () => this.checkHit(wasInAir))
    this.scene.time.delayedCall(380, () => {
      this.attackLocked = false
      this.setVelocityX(0)
      if (this.state === 'attack') this.setState('idle')
    })
  }

  checkHit(wasAerial = false) {
    if (!this.opponent || this.opponent.state === 'dead') return
    const dist = this.distToOpponent
    if (dist < this.cfg.attackRange) {
      let dmg = this.cfg.attackDamage
      if (wasAerial) {
        dmg *= this.cfg.aerialDmgMult
        // Aerial bounce
        this.setVelocityY(-this.cfg.jumpForce * this.cfg.aerialBounceMult)
      }
      this.opponent.takeDamage(dmg, true, this)
    }
  }

  doSpecial() {
    if (!this.opponent || this.specialCooldown > 0) return
    this.specialCooldown = this.cfg.specialCooldown
    this.setState('special')

    const tx = this.opponent.x
    const ty = this.opponent.y

    // Visual wind-up
    this.scene.time.delayedCall(400, () => {
      this.scene.spawnExplosion(tx, ty - 20)
      const dmg = this.opponent.maxHp * this.cfg.specialDamagePct
      this.opponent.takeDamage(dmg, true, this) // blockable
      if (this.state === 'special') this.setState('idle')
    })
  }

  updateUnique() {
    // Update glide visual
    if (this.isGliding) {
      if (this.scene.time.now % 80 < 16)
        this.scene.spawnGlideTrail(this.x, this.y, this)
    }
  }
}
