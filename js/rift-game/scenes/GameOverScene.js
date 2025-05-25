export class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    create() {
        this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 - 50, 'GAME OVER', {
            fontSize: '48px',
            fill: '#ff0000',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 + 20, 'Press R to Restart', {
            fontSize: '24px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Get the final score from the UIScene or GameScene if needed
        // For example, if score was stored in registry:
        // const finalScore = this.registry.get('finalScore');
        // this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 + 60, 'Score: ' + finalScore, { fontSize: '20px', fill: '#fff' }).setOrigin(0.5);


        this.input.keyboard.on('keydown-R', () => {
            // Reset relevant data if necessary (e.g. score in registry)
            // this.registry.set('finalScore', 0);
            this.scene.stop('GameOverScene');
            this.scene.stop('UIScene'); 
            this.scene.start('BootScene'); // Or directly to GameScene if assets are still loaded
        });

        // Optionally, add a button to go back to the main portfolio
        const backButton = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 + 100, 'Back to Portfolio', {
            fontSize: '20px',
            fill: '#00ffff',
            backgroundColor: '#333',
            padding: { x:10, y:5 }
        }).setOrigin(0.5).setInteractive();

        backButton.on('pointerdown', () => {
            // Transition back to the main portfolio page
            window.location.href = '../index.html'; // Adjust path as necessary
        });
    }
}
