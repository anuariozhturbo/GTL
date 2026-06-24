import Fighter from './Fighter.js'

export default class Ryu extends Fighter {
  setupUnique() {
    this._lastDownTapAt = 0
    this._spikeCooldown = 0
    this._chaosShape = 0
  }

  resetUnique() {
    this._lastDownTapAt = 0
    this._spikeCooldown = 0
    this._chaosShape = 0
  }

  handleInput(cursors) {
    if (Phaser.Input.Keyboard.JustDown(cursors.down)) {
      const now = this.scene.time.now
      if (now - this._lastDownTapAt <= this.cfg.spikeTapWindow && this._spikeCooldown <= 0) {
        this._spawnDestructionSpikes()
        this._lastDownTapAt = 0
        return
      }
      this._lastDownTapAt = now
    }
    super.handleInput(cursors)
  }

  _spawnDestructionSpikes() {
    const opp = this.opponent
    if (!opp || opp.state === 'dead') return

    this._spikeCooldown = this.cfg.spikeCooldown
    const x = opp.x
    const y = 575
    const spikes = this.scene.add.graphics().setDepth(4)
    spikes.fillStyle(0x16a34a, 0.9)
    spikes.lineStyle(2, 0xbbf7d0, 0.9)

    for (let i = 0; i < 5; i++) {
      const sx = x - 56 + i * 28
      const h = 38 + (i % 2) * 22
      spikes.fillTriangle(sx - 12, y, sx, y - h, sx + 12, y)
      spikes.strokeTriangle(sx - 12, y, sx, y - h, sx + 12, y)
    }

    this.scene.tweens.add({
      targets: spikes,
      y: -12,
      duration: 120,
      yoyo: true,
      hold: 160,
      ease: 'Back.Out',
      onComplete: () => spikes.destroy(),
    })

    this.scene.time.delayedCall(110, () => {
      if (!opp.active || opp.state === 'dead') return
      if (Math.abs(opp.x - x) < this.cfg.spikeRange && opp.body.blocked.down) {
        opp.takeDamage(this.cfg.spikeDamage, false, this)
        opp.setVelocityY(-this.cfg.spikeLaunch)
        this._greenBurst(opp.x, opp.y - 20)
      }
    })
  }

  doSpecial() {
    if (this.specialCooldown > 0 || !this.opponent) return
    this.specialCooldown = this.cfg.specialCooldown
    this.setState('special')
    this.attackLocked = true
    this.faceOpponent()

    this.scene.time.delayedCall(160, () => {
      if (this.active) this._throwChaosEnergy()
    })

    this.scene.time.delayedCall(400, () => {
      this.attackLocked = false
      if (this.state === 'special') this.setState('idle')
    })
  }

  _throwChaosEnergy() {
    const shape = this._chaosShape % 4
    this._chaosShape++

    let orb
    const x = this.x + this.facing * 38
    const y = this.y - 42
    if (shape === 0) {
      orb = this.scene.add.circle(x, y, 15, 0x22c55e, 0.95)
    } else if (shape === 1) {
      orb = this.scene.add.triangle(x, y, 0, -17, 20, 14, -20, 14, 0x16a34a, 0.95)
    } else if (shape === 2) {
      orb = this.scene.add.rectangle(x, y, 25, 25, 0x4ade80, 0.95)
      orb.rotation = Math.PI / 4
    } else {
      orb = this.scene.add.polygon(x, y, [
        { x: 0, y: -18 }, { x: 16, y: -6 }, { x: 11, y: 15 },
        { x: -11, y: 15 }, { x: -16, y: -6 },
      ], 0x15803d, 0.95)
    }

    orb.setDepth(5)
    this.scene.physics.add.existing(orb)
    orb.body.setAllowGravity(false)
    orb.body.setVelocityX(this.facing * this.cfg.chaosSpeed)

    const spin = this.scene.tweens.add({
      targets: orb,
      rotation: orb.rotation + Math.PI * 2,
      duration: 520,
      repeat: -1,
      ease: 'Linear',
    })

    const trailEvt = this.scene.time.addEvent({ delay: 28, loop: true, callback: () => {
      if (!orb.active) { trailEvt.remove(); return }
      const p = this.scene.add.circle(orb.x, orb.y, 5, 0x86efac, 0.55).setDepth(4)
      this.scene.tweens.add({ targets: p, alpha: 0, scaleX: 0.1, scaleY: 0.1, duration: 180, onComplete: () => p.destroy() })
    }})

    const hitEvt = this.scene.time.addEvent({ delay: 16, loop: true, callback: () => {
      if (!orb.active) { hitEvt.remove(); return }
      const opp = this.opponent
      if (opp && opp.state !== 'dead' && Math.abs(orb.x - opp.x) < 38 && Math.abs(orb.y - (opp.y - 35)) < 62) {
        opp.takeDamage(Math.floor(opp.maxHp * this.cfg.chaosDamagePct), true, this)
        this._greenBurst(opp.x, opp.y - 35)
        cleanup()
      }
      if (orb.x < 0 || orb.x > this.scene.physics.world.bounds.width) cleanup()
    }})

    const life = this.scene.time.delayedCall(this.cfg.chaosLifetime, () => cleanup())
    const cleanup = () => {
      if (!orb.active) return
      spin.stop()
      trailEvt.remove()
      hitEvt.remove()
      life.remove()
      orb.destroy()
    }
  }

  _greenBurst(x, y) {
    for (let i = 0; i < 22; i++) {
      const angle = (i / 22) * Math.PI * 2
      const p = this.scene.add.circle(x, y, 3, i % 2 === 0 ? 0x22c55e : 0xbbf7d0, 0.9).setDepth(6)
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * Phaser.Math.Between(40, 100),
        y: y + Math.sin(angle) * Phaser.Math.Between(28, 80),
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: 330,
        ease: 'Quad.Out',
        onComplete: () => p.destroy(),
      })
    }
  }

  updateUnique(delta) {
    if (this._spikeCooldown > 0) this._spikeCooldown -= delta
  }

  get specialReady() { return this.specialCooldown <= 0 }
}
