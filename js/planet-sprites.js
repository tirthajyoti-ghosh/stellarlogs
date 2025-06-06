export class PlanetSpriteRenderer {
    constructor(spriteManager) {
        this.spriteManager = spriteManager;
        this.FRAME_WIDTH = 100; // Each frame is 100px wide (5000px ÷ 50 frames) for most planets
        this.FRAME_HEIGHT = 100; // Each planet variant is 100px tall for most planets
        this.TOTAL_FRAMES = 50; // 50 animation frames per planet
        this.TOTAL_VARIANTS = 5; // 5 different variants per planet type
        
        // Special dimensions for gas-giant-ring
        this.GAS_RING_FRAME_WIDTH = 300; // 15000px ÷ 50 frames = 300px per frame
        this.GAS_RING_FRAME_HEIGHT = 300; // Each gas-giant-ring variant is 300px tall (1500px ÷ 5 variants)
        this.GAS_RING_VARIANTS = 5; // 5 variants for gas-giant-ring (1500px total height ÷ 300px per variant)
        
        // Planet types in astrophysical order
        this.PLANET_TYPES = [
            'barren-world',
            'lava-world',
            'terrestrial-dry',
            'terrestrial-wet',
            'gas-giant',
            'gas-giant-ring',
            'ice-world'
        ];
    }

    // Determine planet type based on orbital position (distance from star)
    getPlanetTypeByPosition(planetIndex) {
        switch(planetIndex) {
            case 0: // Closest to star
                return Math.random() < 0.5 ? 'barren-world' : 'lava-world';
            case 1: // Inner planets
                return Math.random() < 0.5 ? 'terrestrial-dry' : 'terrestrial-wet';
            case 2: // Mid-range
                return 'gas-giant';
            case 3: // Outer
                return 'gas-giant-ring';
            default: // Farthest (4+)
                return 'ice-world';
        }
    }

    drawPlanet(ctx, planet, screenX, screenY, radius) {
        // Get planet type if not already assigned
        if (!planet.planetType) {
            planet.planetType = this.getPlanetTypeByPosition(planet.orbitIndex || 0);
        }
        
        // Get random variant if not already assigned
        if (planet.planetVariant === undefined) {
            if (planet.planetType === 'gas-giant-ring') {
                planet.planetVariant = Math.floor(Math.random() * this.GAS_RING_VARIANTS); // Random from 0-4
            } else {
                planet.planetVariant = Math.floor(Math.random() * this.TOTAL_VARIANTS);
            }
        }
        
        // Initialize animation time if not set
        if (planet.animationTime === undefined) {
            planet.animationTime = Math.random() * 100;
        }
        
        const planetSprite = this.spriteManager.getSprite(planet.planetType);
        if (!planetSprite) {
            // Fallback to procedural rendering if sprite not loaded
            return false;
        }

        // Calculate current animation frame - increase multiplier for more visible animation
        const animTime = planet.animationTime || 0;
        const animationFrame = Math.floor(animTime * 3) % this.TOTAL_FRAMES;
        
        // Use different dimensions for gas-giant-ring
        let frameWidth, frameHeight, sourceX, sourceY;
        
        if (planet.planetType === 'gas-giant-ring') {
            frameWidth = this.GAS_RING_FRAME_WIDTH;
            frameHeight = this.GAS_RING_FRAME_HEIGHT;
            sourceX = animationFrame * this.GAS_RING_FRAME_WIDTH;
            sourceY = planet.planetVariant * this.GAS_RING_FRAME_HEIGHT; // 0-4 variants
        } else {
            frameWidth = this.FRAME_WIDTH;
            frameHeight = this.FRAME_HEIGHT;
            sourceX = animationFrame * this.FRAME_WIDTH;
            sourceY = planet.planetVariant * this.FRAME_HEIGHT;
        }
        
        // Destination size - different scaling based on planet type
        let destSize;
        if (planet.planetType === 'gas-giant-ring') {
            destSize = radius * 8; // Much larger for ringed planets to show rings prominently
        } else if (planet.planetType === 'gas-giant') {
            destSize = radius * 3.5; // Gas giants are larger than terrestrial planets
        } else {
            destSize = radius * 2.5; // Regular planets made slightly larger
        }
        
        const destX = screenX - destSize / 2;
        const destY = screenY - destSize / 2;

        ctx.save();
        
        // Add subtle glow effect for planets based on type
        this.addPlanetGlow(ctx, planet.planetType, radius);
        
        ctx.drawImage(
            planetSprite,
            sourceX, sourceY, frameWidth, frameHeight, // Source
            destX, destY, destSize, destSize // Destination
        );
        
        ctx.restore();
        
        return true; // Successfully drew sprite
    }

    // Add planet-type specific glow effects
    addPlanetGlow(ctx, planetType, radius) {
        let glowColor;
        let glowIntensity = radius * 0.2;
        
        switch(planetType) {
            case 'lava-world':
                glowColor = '#ff4500';
                glowIntensity = radius * 0.4;
                break;
            case 'barren-world':
                glowColor = '#8b4513';
                glowIntensity = radius * 0.1;
                break;
            case 'terrestrial-dry':
                glowColor = '#daa520';
                glowIntensity = radius * 0.15;
                break;
            case 'terrestrial-wet':
                glowColor = '#4169e1';
                glowIntensity = radius * 0.2;
                break;
            case 'gas-giant':
                glowColor = '#ffa500';
                glowIntensity = radius * 0.4; // Increased glow for gas giants
                break;
            case 'gas-giant-ring':
                glowColor = '#ffb347';
                glowIntensity = radius * 0.6; // Even more glow for ringed planets
                break;
            case 'ice-world':
                glowColor = '#87ceeb';
                glowIntensity = radius * 0.25;
                break;
            default:
                glowColor = '#ffffff';
                glowIntensity = radius * 0.1;
        }
        
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = glowIntensity;
    }

    updatePlanetAnimation(planet, deltaTime) {
        // Initialize animation time if not set
        if (planet.animationTime === undefined) {
            planet.animationTime = Math.random() * 100;
        }
        
        // Different planet types rotate at different speeds - slightly increased all speeds
        let rotationSpeed = 0.7; // Increased from 0.5 to 0.7 (base speed)
        
        if (planet.planetType) {
            switch(planet.planetType) {
                case 'gas-giant':
                case 'gas-giant-ring':
                    rotationSpeed = 1.1; // Gas giants rotate faster (increased from 0.8)
                    break;
                case 'ice-world':
                    rotationSpeed = 0.4; // Ice worlds rotate slower (increased from 0.3)
                    break;
                case 'lava-world':
                    rotationSpeed = 1.4; // Lava worlds rotate fastest (increased from 1.0)
                    break;
                case 'terrestrial-dry':
                    rotationSpeed = 0.8; // Dry terrestrials (new, medium speed)
                    break;
                case 'terrestrial-wet':
                    rotationSpeed = 0.9; // Wet terrestrials (new, slightly faster)
                    break;
                case 'barren-world':
                    rotationSpeed = 0.6; // Barren worlds (new, slower)
                    break;
            }
        }
        
        planet.animationTime += deltaTime * rotationSpeed;
        
        // Keep animation time in reasonable bounds
        if (planet.animationTime > 1000) {
            planet.animationTime -= 1000;
        }
    }
}