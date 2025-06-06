export class SpaceshipSpriteRenderer {
    constructor(spriteManager) {
        this.spriteManager = spriteManager;
        
        // Spaceship sprite dimensions
        this.TOTAL_WIDTH = 622;
        this.TOTAL_HEIGHT = 512;
        this.PHASES = 3; // rest, thrust, boost
        
        // Calculate individual phase width (assuming equal distribution for now)
        this.PHASE_WIDTH = Math.floor(this.TOTAL_WIDTH / this.PHASES); // ~207px per phase
        this.PHASE_HEIGHT = this.TOTAL_HEIGHT; // 512px height for all phases
        
        // Phase types
        this.PHASES_CONFIG = {
            REST: 0,    // Left-most: plain spaceship
            THRUST: 1,  // Center: blue exhaust
            BOOST: 2    // Right-most: orange bigger exhaust
        };
    }

    drawSpaceship(ctx, spaceship, screenX, screenY, rotation, phase = 'REST') {
        const spaceshipSprite = this.spriteManager.getSprite('spaceship');
        if (!spaceshipSprite) {
            // Fallback to procedural rendering if sprite not loaded
            return false;
        }

        // Get phase index
        const phaseIndex = this.PHASES_CONFIG[phase.toUpperCase()] || 0;
        
        // Source rectangle in sprite sheet
        const sourceX = phaseIndex * this.PHASE_WIDTH;
        const sourceY = 0;
        const sourceWidth = this.PHASE_WIDTH;
        const sourceHeight = this.PHASE_HEIGHT;
        
        // Calculate aspect ratio and maintain it
        const aspectRatio = sourceWidth / sourceHeight; // ~207/512 = ~0.4
        
        // Set desired height and calculate width to maintain aspect ratio
        const destHeight = 75; // Adjust this size as needed
        const destWidth = destHeight * aspectRatio;
        
        const destX = screenX - destWidth / 2;
        const destY = screenY - destHeight / 2;

        ctx.save();
        
        // Apply rotation
        ctx.translate(screenX, screenY);
        ctx.rotate(rotation);
        ctx.translate(-screenX, -screenY);
        
        // Add subtle glow effect for spaceship
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 10;
        
        ctx.drawImage(
            spaceshipSprite,
            sourceX, sourceY, sourceWidth, sourceHeight, // Source
            destX, destY, destWidth, destHeight // Destination - now maintains aspect ratio
        );
        
        ctx.restore();
        
        return true; // Successfully drew sprite
    }

    // Determine which phase to use based on spaceship state
    getSpaceshipPhase(spaceship) {
        // Check if boosting first (Shift key)
        if (window.keys && (window.keys['shift'] || window.keys['Shift'])) {
            return 'BOOST';
        }
        
        // Check if thrusting (W key pressed or spaceship has thrusting property)
        if (window.keys && (window.keys['w'] || window.keys['W'])) {
            return 'THRUST';
        }
        
        // Also check spaceship properties as fallback
        if (spaceship.isBoosting || spaceship.boostActive) {
            return 'BOOST';
        }
        
        if (spaceship.isThrusting || spaceship.thrusting || spaceship.velocity > 0.5) {
            return 'THRUST';
        }
        
        // Default to rest
        return 'REST';
    }
}