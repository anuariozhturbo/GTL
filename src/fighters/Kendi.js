import Fighter from './Fighter.js'

export default class Kendi extends Fighter {
  setupUnique() {
    this._lastUpTapAt = 0
    this._flightCooldown = 0
  }

  resetUnique() {
    this._lastUpTapAt = 0
    this._flightCooldown = 0
  }

  handleInput(cursors) {
    if (this.stunTimer > 0 || this.hurtTimer > 0 || this.state === 'dead') return
    if (this.attackLocked) return

    const onGround = this.body.blocked.down
    this.isGrounded = onGround

    if (cursors.block.isDown && onGround) {
      this.setBlocking(true)
      return
    }
    this.setBlocking(false)

    if (Phaser.Input.Keyboard.JustDown(cursors.special)) {
      this.useSpecial()
      return
    }

    if (Phaser.Input.Keyboard.JustDown(cursors.attack) && this.attackCooldown <= 0) {
      this.doAttack()
      return
    }

    const upPressed = Phaser.Input.Keyboard.JustDown(cursors.up)
    if (upPressed) {
      const now = this.scene.time.now
      if (now - this._lastUpTapAt <= this.cfg.flightTapWindow && this._flightCooldown <= 0) {
        this._blueFlameLift()
        this._lastUpTapAt = 0
        return
      }
      this._lastUpTapAt = now

      if (onGround) {
        this.doJump()
      }
    }

    if (this.state !== 'attack' && this.state !== 'special') {
      if (cursors.left.isDown) {
        this.setVelocityX(-this.cfg.speed)
        this.setState('walk')
        this.setFacing(-1)
      } else if (cursors.right.isDown) {
        this.setVelocityX(this.cfg.speed)
        this.setState('walk')
        this.setFacing(1)
      } else if (onGround) {
        this.setVelocityX(0)
        this.setState('idle')
      }
    }
  }

  _blueFlameLift() {
    if (this.stunTimer > 0 || this.hurtTimer > 0 || this.state === 'dead') return
    this._flightCooldown = this.cfg.flightCooldown
    this.setVelocityY(-this.cfg.flightForce)
    this.setVelocityX(this.facing * this.cfg.flightForwardBoost)
    this.setState('jump')

    for (let i = 0; i < 18; i++) {
      const p = this.scene.add.circle(
        this.x + Phaser.Math.Between(-18, 18),
        this.y + 38,
        Phaser.Math.Between(2, 5),
        i % 2 === 0 ? 0x38bdf8 : 0x1d4ed8,
        0.85
      ).setDepth(4)
      this.scene.tweens.add({
        targets: p,
        x: p.x + Phaser.Math.Between(-26, 26),
        y: p.y + Phaser.Math.Between(26, 64),
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: 360 + Math.random() * 180,
        ease: 'Quad.Out',
        onComplete: () => p.destroy(),
      })
    }
  }

  doSpecial() {
    if (this.specialCooldown > 0 || !this.opponent) return
    this.specialCooldown = this.cfg.specialCooldown
    this.setState('special')
    this.attackLocked = true
    this.faceOpponent()

    this.scene.time.delayedCall(180, () => {
      if (!this.active || !this.opponent) return
      this._spawnBlueFireArrow()
    })

    this.scene.time.delayedCall(420, () => {
      this.attackLocked = false
      if (this.state === 'special') this.setState('idle')
    })
  }

  _spawnBlueFireArrow() {
    const arrow = this.scene.add.triangle(
      this.x + this.facing * 36,
      this.y - 42,
      0, -8,
      28, 0,
      0, 8,
      0x38bdf8,
      1
    ).setDepth(5)
    this.scene.physics.add.existing(arrow)
    arrow.body.setAllowGravity(false)

    let hit = false
    const owner = this
    const life = this.scene.time.delayedCall(this.cfg.arrowLifetime, () => {
      seekEvt.remove()
      arrow.destroy()
    })

    const seekEvt = this.scene.time.addEvent({ delay: 16, loop: true, callback: () => {
      if (!arrow.active || !owner.active) {
        seekEvt.remove()
        return
      }

      const target = owner.opponent
      if (!target || target.state === 'dead') {
        arrow.destroy()
        seekEvt.remove()
        return
      }

      const angle = Phaser.Math.Angle.Between(arrow.x, arrow.y, target.x, target.y - 35)
      arrow.rotation = angle
      arrow.body.setVelocity(Math.cos(angle) * owner.cfg.arrowSpeed, Math.sin(angle) * owner.cfg.arrowSpeed)

      const trail = owner.scene.add.circle(arrow.x, arrow.y, 4, 0x60a5fa, 0.55).setDepth(4)
      owner.scene.tweens.add({
        targets: trail, alpha: 0, scaleX: 0.1, scaleY: 0.1, duration: 170,
        onComplete: () => trail.destroy(),
      })

      if (!hit && Math.abs(arrow.x - target.x) < 34 && Math.abs(arrow.y - (target.y - 35)) < 58) {
        hit = true
        life.remove()
        seekEvt.remove()
        const dmg = Math.floor(target.maxHp * owner.cfg.arrowDamagePct)
        target.takeDamage(dmg, true, owner)
        owner._blueBurst(target.x, target.y - 35)
        arrow.destroy()
      }
    }})
  }

  _blueBurst(x, y) {
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2
      const p = this.scene.add.circle(x, y, 3, i % 2 === 0 ? 0x38bdf8 : 0x93c5fd, 0.9).setDepth(6)
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * Phaser.Math.Between(35, 95),
        y: y + Math.sin(angle) * Phaser.Math.Between(25, 75),
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: 320,
        ease: 'Quad.Out',
        onComplete: () => p.destroy(),
      })
    }
  }

  updateUnique(delta) {
    if (this._flightCooldown > 0) this._flightCooldown -= delta
  }

  get specialReady() { return this.specialCooldown <= 0 }
}
