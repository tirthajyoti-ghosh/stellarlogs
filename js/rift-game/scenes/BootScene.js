export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Load minimal assets for the preload scene (e.g., loading bar)
        this.load.image('logo', 'assets/preview.png'); // Path seems correct from your previous edit
    }

    create() {
        // Add a visual element to confirm BootScene runs
        this.add.image(this.cameras.main.width / 2, 100, 'logo').setScale(0.3); // Display the logo, adjusted scale
        this.add.text(this.cameras.main.width / 2, 200, 'BootScene Active! Starting PreloadScene shortly...', { font: '16px Arial', fill: '#ffff00' }).setOrigin(0.5);

        // Start PreloadScene after a short delay to see the text/logo
        this.time.delayedCall(2000, () => { // Wait 2 seconds
            this.scene.start('PreloadScene');
        });
    }
}
