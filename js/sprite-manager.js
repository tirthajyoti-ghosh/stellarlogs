class SpriteManager {
    constructor() {
        this.sprites = {};
        this.loaded = false;
        this.loadPromises = [];
        this.loadedCount = 0;
        this.totalSprites = 0;
    }

    async loadSprite(name, path) {
        this.totalSprites++;
        const img = new Image();
        const promise = new Promise((resolve, reject) => {
            img.onload = () => {
                this.loadedCount++;
                resolve(img);
            };
            img.onerror = () => reject(new Error(`Failed to load ${path}`));
        });
        img.src = path;
        this.loadPromises.push(promise);
        this.sprites[name] = await promise;
        return img;
    }

    async loadAllSprites() {
        const sprites = [
            { name: 'barren-world', path: 'assets/sprites/barren-world.png' },
            { name: 'gas-giant', path: 'assets/sprites/gas-giant.png' },
            { name: 'gas-giant-ring', path: 'assets/sprites/gas-giant-ring.png' },
            { name: 'ice-world', path: 'assets/sprites/ice-world.png' },
            { name: 'lava-world', path: 'assets/sprites/lava-world.png' },
            { name: 'terrestrial-dry', path: 'assets/sprites/terrestrial-dry.png' },
            { name: 'terrestrial-wet', path: 'assets/sprites/terrestrial-wet.png' },
            { name: 'stars', path: 'assets/sprites/stars.png' },
            { name: 'spaceship', path: 'assets/sprites/spaceship.png' }
        ];

        await Promise.all(sprites.map(sprite => this.loadSprite(sprite.name, sprite.path)));
        this.loaded = true;
    }

    getSprite(name) {
        return this.sprites[name];
    }

    getLoadProgress() {
        return this.totalSprites > 0 ? this.loadedCount / this.totalSprites : 0;
    }

    isLoaded() {
        return this.loaded;
    }
}

export default new SpriteManager();