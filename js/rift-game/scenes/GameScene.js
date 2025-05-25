export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.player = null;
        this.cursors = null;
        this.shootKey = null;
        this.playerLasers = null;
        this.stars = null; // Group for individual stars
        this.numStars = 1000; // Increased number of stars
    }

    create() {
        // Create a dynamic texture for a white dot star
        const starGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        starGraphics.fillStyle(0xffffff);
        starGraphics.fillCircle(2, 2, 2); // Create a small circle (dot) of radius 2
        starGraphics.generateTexture('starDot', 4, 4); // Generate a 4x4 texture from it
        starGraphics.destroy();

        // Create a group for stars
        this.stars = this.physics.add.group();

        // Create individual stars
        for (let i = 0; i < this.numStars; i++) {
            const x = Phaser.Math.Between(0, this.cameras.main.width);
            const y = Phaser.Math.Between(0, this.cameras.main.height);
            const star = this.stars.create(x, y, 'starDot'); // Use the generated 'starDot' texture
            star.setBlendMode(Phaser.BlendModes.ADD); // Optional: makes stars brighter
            star.setVelocityY(Phaser.Math.Between(20, 60)); // Random downward speed
            star.setScale(Phaser.Math.FloatBetween(0.1, 0.6));
            star.setAlpha(Phaser.Math.FloatBetween(0.3, 1));
            star.setDepth(0); // Ensure stars are behind everything else
        }

        // Player setup
        this.player = this.physics.add.sprite(this.cameras.main.width / 2, this.cameras.main.height - 50, 'playerShip');
        this.player.setCollideWorldBounds(true);
        this.player.setDepth(1); // Ensure player is above background
        this.player.health = 3;
        this.player.lastFired = 0;

        // Player Lasers Group
        this.playerLasers = this.physics.add.group({
            defaultKey: 'playerLaser',
            maxSize: 30
        });

        // Controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.shootKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Emit event to UI scene for initial health
        this.events.emit('updateHealth', this.player.health);

        // Simple enemy for testing (will be expanded in later phases)
        const enemy = this.physics.add.sprite(this.cameras.main.width / 2, 50, 'enemyDrone');
        enemy.setScale(0.5);

        // Basic collision (will be expanded)
        this.physics.add.overlap(this.playerLasers, enemy, this.hitEnemy, null, this);
    }

    update(time, delta) {
        // Update stars
        this.stars.children.iterate((star) => {
            if (star.y > this.cameras.main.height + star.displayHeight) {
                star.y = -star.displayHeight;
                star.x = Phaser.Math.Between(0, this.cameras.main.width);
                star.setVelocityY(Phaser.Math.Between(20, 60)); // Reset speed
                star.setScale(Phaser.Math.FloatBetween(0.1, 0.6)); // Reset scale
                star.setAlpha(Phaser.Math.FloatBetween(0.3, 1)); // Reset alpha
            }
        });

        // Player movement
        this.player.setVelocity(0);

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-200);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(200);
        }

        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-200);
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(200);
        }

        // Player shooting
        if (this.shootKey.isDown && time > this.player.lastFired) {
            const laser = this.playerLasers.get(this.player.x, this.player.y - 30);
            if (laser) {
                laser.setActive(true);
                laser.setVisible(true);
                laser.setVelocityY(-400);
                this.player.lastFired = time + 250; // Fire rate: 4 shots per second
            }
        }

        // Laser cleanup
        this.playerLasers.children.each(laser => {
            if (laser.active && laser.y < -50) {
                laser.setActive(false);
                laser.setVisible(false);
            }
        });
    }

    hitEnemy(laser, enemy) {
        laser.setActive(false);
        laser.setVisible(false);
        laser.destroy(); // Or recycle
        enemy.destroy(); // For now, just destroy the enemy
        // Add score, explosion, etc. later
        this.events.emit('addScore', 10);
    }

    // Placeholder for player taking damage
    playerHit(player, enemyLaserOrEnemy) {
        this.player.health--;
        this.events.emit('updateHealth', this.player.health);
        // Add invulnerability, screen shake, etc.
        if (this.player.health <= 0) {
            this.gameOver();
        }
    }

    gameOver() {
        this.scene.pause('GameScene');
        this.scene.start('GameOverScene');
        this.scene.stop('UIScene');
    }
}
