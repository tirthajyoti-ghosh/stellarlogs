export class StarSpriteRenderer {
    constructor(spriteManager) {
        this.spriteManager = spriteManager;
        this.FRAME_WIDTH = 200; // Each frame is 200px wide (10000px ÷ 50 frames)
        this.FRAME_HEIGHT = 200; // Each star is 200px tall (1400px ÷ 7 stars)
        this.TOTAL_FRAMES = 80; // 80 animation frames per star
        this.TOTAL_STARS = 7; // 7 different star types
    }

    drawStar(ctx, star, screenX, screenY, radius) {
        const starSprite = this.spriteManager.getSprite('stars');
        if (!starSprite) {
            // Fallback to procedural rendering if sprite not loaded
            return false;
        }

        // Calculate current animation frame
        const animationFrame = Math.floor((star.animationTime || 0) * 2) % this.TOTAL_FRAMES;
        
        // Source rectangle in sprite sheet
        const sourceX = animationFrame * this.FRAME_WIDTH;
        const sourceY = star.spriteIndex * this.FRAME_HEIGHT; // Which star (0-6)
        
        // Destination size - scale to desired radius (make stars bigger)
        const destSize = radius * 5;
        const destX = screenX - radius * 2.5; // Center properly with larger size
        const destY = screenY - radius * 2.5; // Center properly with larger size

        ctx.save();
        
        // Add glow effect for stars
        ctx.shadowColor = star.color || '#ffffff';
        ctx.shadowBlur = radius * 0.5;
        
        ctx.drawImage(
            starSprite,
            sourceX, sourceY, this.FRAME_WIDTH, this.FRAME_HEIGHT, // Source
            destX, destY, destSize, destSize // Destination
        );
        
        ctx.restore();
        
        return true; // Successfully drew sprite
    }

    updateStarAnimation(star, deltaTime) {
        // Update animation time for star
        if (!star.animationTime) star.animationTime = 0;
        star.animationTime += deltaTime * 0.01; // Adjust speed as needed
        
        // Keep animation time in reasonable bounds
        if (star.animationTime > 1000) {
            star.animationTime -= 1000;
        }
    }
}