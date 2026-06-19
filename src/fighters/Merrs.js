import Fighter from './Fighter.js'

export default class Merrs extends Fighter {
  setupUnique() {
    this.bowCooldown = 0
    this.attackBoostTimer = 0
    this.inStunWindow = false
    this.pulling = false
  }

  resetUnique() {
    this.bowCooldown = 0
    this.attackBoostTimer = 0
    this.inStunWindow = false
    this.pulling = false
  }

  // Called from FightScene with extra action key
  fireBow() {
    if (this.bowCooldown > 0 || this.state === 'dead') return
    this.bowCooldown = this.cfg.bowCooldown
    const dir = this.facing
    this.scene.spawnArrow(this.x + dir * 30, this.y - 40, dir, this)
  }

  onBowHit() {
    this.attackBoostTimer = this.cfg.attackBoostDuration
    this.attackCooldown = 0
  }

  doAttack() {
    const cd = this.attackBoostTimer > 0 ? this.cfg.boostedCooldown : this.cfg.attackCooldown
    this.setState('attack')
    this.attackLocked = true
    this.attackCooldown = cd
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
    this.scene.time.delayedCall(120, () => {
      if (!this.opponent || this.opponent.state === 'dead') return
      if (this.distToOpponent < this.cfg.attackRange) {
        this.opponent.takeDamage(this.cfg.attackDamage, true, this)
        if (this.inStunWindow) {
          this.opponent.applyStun(this.cfg.stunDuration)
          this.inStunWindow = false
        }
      }
    })
    this.scene.time.delayedCall(380, () => {
      this.attackLocked = false
      this.setVelocityX(0)
      if (this.state === 'attack') this.setState('idle')
    })
  }

  doSpecial() {
    if (this.specialCooldown > 0) return
    this.specialCooldown = this.cfg.specialCooldown
    // Throw fishing hook — skill shot
    const dir = this.facing
    this.scene.spawnFishingHook(this.x + dir * 30, this.y - 40, dir, this)
  }

  onHookLanded(target) {
    // Pull target towards Merrs
    this.pulling = true
    const pullInterval = this.scene.time.addEvent({
      delay: 16,
      repeat: 40,
      callback: () => {
        if (!target || target.state === 'dead') { pullInterval.remove(); return }
        const dir = Math.sign(this.x - target.x)
        target.setVelocityX(dir * 420)
      }
    })

    // Open stun window when pull completes
    this.scene.time.delayedCall(700, () => {
      this.pulling = false
      this.inStunWindow = true
      this.scene.time.delayedCall(this.cfg.stunWindow, () => { this.inStunWindow = false })
    })
  }

  updateUnique(delta) {
    if (this.bowCooldown > 0) this.bowCooldown -= delta
    if (this.attackBoostTimer > 0) this.attackBoostTimer -= delta
  }

  get specialReady() { return this.specialCooldown <= 0 }
  get bowReady() { return this.bowCooldown <= 0 }
  get boosted() { return this.attackBoostTimer > 0 }
}
