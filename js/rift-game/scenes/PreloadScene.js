export class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload() {
        // Display a loading bar or progress indicator
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(this.cameras.main.width / 2 - 160, this.cameras.main.height / 2 - 25, 320, 50);

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading...',
            style: {
                font: '20px monospace',
                fill: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);

        const percentText = this.make.text({
            x: width / 2,
            y: height / 2,
            text: '0%',
            style: {
                font: '18px monospace',
                fill: '#ffffff'
            }
        });
        percentText.setOrigin(0.5, 0.5);

        this.load.on('progress', (value) => {
            percentText.setText(parseInt(value * 100) + '%');
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(this.cameras.main.width / 2 - 150, this.cameras.main.height / 2 - 15, 300 * value, 30);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
            this.scene.start('GameScene');
            this.scene.launch('UIScene'); // Launch UI scene concurrently
        });

        // Load game assets (replace with actual paths and keys)
        // Player
        this.load.image('playerShip', 'assets/PNG/playerShip1_blue.png'); // Example path
        this.load.image('playerLaser', 'assets/PNG/Lasers/laserBlue01.png');

        // Enemies
        this.load.image('enemyDrone', 'assets/PNG/Enemies/enemyBlack1.png');
        this.load.image('enemySentinel', 'assets/PNG/Enemies/enemyRed2.png'); 
        this.load.image('enemySeeker', 'assets/PNG/Enemies/enemyGreen3.png');
        this.load.image('enemyLaser', 'assets/PNG/Lasers/laserRed01.png');
        // this.load.spritesheet('mothership', 'assets/mothership_spritesheet.png', { frameWidth: 128, frameHeight: 128 }); // Example

        // Power-ups
        this.load.image('shieldPowerUp', 'assets/PNG/Power-ups/shield_gold.png');
        this.load.image('multiShotPowerUp', 'assets/PNG/Power-ups/powerupBlue_bolt.png');

        // Environment
        // this.load.image('starfield', 'assets/starfield_background.png'); // Remove or comment out if not used
        this.load.image('debris', 'assets/PNG/Meteors/meteorBrown_med1.png');

        // UI & SFX
        // this.load.image('healthIcon', 'assets/health_icon.png');
        // this.load.audio('shootSfx', 'assets/sfx/shoot.wav');
        // this.load.audio('explosionSfx', 'assets/sfx/explosion.wav');
        // this.load.audio('powerUpSfx', 'assets/sfx/powerup.wav');
        // this.load.audio('gameMusic', 'assets/music/game_music.mp3');

        // Memory Fragments
        // this.load.image('memoryFragment', 'assets/memory_fragment.png');
    }

    create() {
        // Any setup needed after preloading but before starting the main game scene
    }
}
