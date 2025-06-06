// Drawing functions for all game elements

import { canvas, ctx, camera } from './canvas.js';
import { spaceship } from './spaceship.js';
import { allPlanets, stars, starSystems, drawStarSprite, drawPlanetSprite } from './universe.js';

// Draw game
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background stars
    drawStars();

    // Draw orbit rings
    drawOrbitRings();

    // Draw planets and stars from the allPlanets list
    allPlanets.forEach((obj) => {
        if (obj.isStar) {
            // Try to draw with sprite first, fallback to procedural if needed
            const spriteDrawn = drawStarSprite(ctx, obj, camera);
            if (!spriteDrawn) {
                drawStar(obj.x, obj.y, obj.radius, obj.color);
            }
        } else {
            // Try to draw planet with sprite first, fallback to procedural if needed
            const spriteDrawn = drawPlanetSprite(ctx, obj, camera);
            if (!spriteDrawn) {
                drawPixelCircle(obj.x, obj.y, obj.radius, obj.color);
            }
        }
    });

    // Draw spaceship last (so it appears on top)
    drawSpaceship();
}

// Draw stars with parallax effect
function drawStars() {
    ctx.fillStyle = "white";
    stars.forEach((star, index) => {
        // Parallax effect - closer stars move faster
        const parallaxFactor = ((index % 3) + 1) * 0.2;

        const screenX = star.x - camera.x * parallaxFactor;
        const screenY = star.y - camera.y * parallaxFactor;

        // Wrap stars within viewport
        const wrappedX = ((screenX % canvas.width) + canvas.width) % canvas.width;
        const wrappedY = ((screenY % canvas.height) + canvas.height) % canvas.height;

        // Twinkle effect
        const twinkleSize = star.size * (0.7 + 0.3 * Math.sin(Date.now() * star.twinkleSpeed));

        ctx.fillRect(wrappedX, wrappedY, twinkleSize, twinkleSize);
    });
}

// Draw orbit rings
function drawOrbitRings() {
    starSystems.forEach((system) => {
        const screenX = system.x - camera.x;
        const screenY = system.y - camera.y;

        // Only draw if the star system is visible (or close to visible)
        if (
            screenX + 1000 < 0 ||
            screenX - 1000 > canvas.width ||
            screenY + 1000 < 0 ||
            screenY - 1000 > canvas.height
        ) {
            return;
        }

        // Draw orbit paths
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;

        system.planets.forEach((planet) => {
            ctx.beginPath();
            ctx.arc(
                screenX,
                screenY,
                planet.orbitRadius,
                0,
                Math.PI * 2
            );
            ctx.stroke();
        });
    });
}

// Draw pixelated spaceship - cylindrical with flatter nose and darker sleek colors
function drawSpaceship() {
    const screenX = spaceship.x - camera.x;
    const screenY = spaceship.y - camera.y;

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(spaceship.rotationAngle);

    // Spaceship body (draw using pixels)
    const pixelSize = 3; // Larger pixels for more prominent appearance
    
    // Define spaceship shape in a pixel grid (relative to center) - darker, sleeker colors
    const shipPixels = [
        // Flatter nose/forward section
        { x: -1, y: -10, color: "#2c3e50" }, // Darker blue-gray for primary hull
        { x: 0, y: -10, color: "#34495e" },  // Slightly lighter tone for highlight
        { x: 1, y: -10, color: "#2c3e50" },
        
        // Forward hull section - cylindrical with flat front
        { x: -2, y: -9, color: "#2c3e50" },
        { x: -1, y: -9, color: "#34495e" },
        { x: 0, y: -9, color: "#3d566e" },   // Subtle highlight at center
        { x: 1, y: -9, color: "#34495e" },
        { x: 2, y: -9, color: "#2c3e50" },
        
        // Command/Bridge section with windows
        { x: -3, y: -8, color: "#2c3e50" },
        { x: -2, y: -8, color: "#34495e" },
        { x: -1, y: -8, color: "#3498db" }, // Window - blue tinted
        { x: 0, y: -8, color: "#3498db" },  // Window
        { x: 1, y: -8, color: "#3498db" },  // Window
        { x: 2, y: -8, color: "#34495e" },
        { x: 3, y: -8, color: "#2c3e50" },

        { x: -3, y: -7, color: "#2c3e50" },
        { x: -2, y: -7, color: "#34495e" },
        { x: -1, y: -7, color: "#5dade2" }, // Bright window
        { x: 0, y: -7, color: "#5dade2" },  // Bright window
        { x: 1, y: -7, color: "#5dade2" },  // Bright window
        { x: 2, y: -7, color: "#34495e" },
        { x: 3, y: -7, color: "#2c3e50" },

        // Main cylindrical hull - long and uniform width
        { x: -3, y: -6, color: "#2c3e50" },
        { x: -2, y: -6, color: "#34495e" },
        { x: -1, y: -6, color: "#3d566e" },
        { x: 0, y: -6, color: "#3d566e" },
        { x: 1, y: -6, color: "#3d566e" },
        { x: 2, y: -6, color: "#34495e" },
        { x: 3, y: -6, color: "#2c3e50" },

        { x: -3, y: -5, color: "#2c3e50" },
        { x: -2, y: -5, color: "#34495e" },
        { x: -1, y: -5, color: "#3d566e" },
        { x: 0, y: -5, color: "#3d566e" },
        { x: 1, y: -5, color: "#3d566e" },
        { x: 2, y: -5, color: "#34495e" },
        { x: 3, y: -5, color: "#2c3e50" },

        // Middle section with accent stripes (cylindrical hull)
        { x: -3, y: -4, color: "#2c3e50" },
        { x: -2, y: -4, color: "#e74c3c" }, // Red accent stripe
        { x: -1, y: -4, color: "#3d566e" },
        { x: 0, y: -4, color: "#3d566e" },
        { x: 1, y: -4, color: "#3d566e" },
        { x: 2, y: -4, color: "#e74c3c" }, // Red accent stripe
        { x: 3, y: -4, color: "#2c3e50" },
        
        // Continuing cylindrical hull
        { x: -3, y: -3, color: "#2c3e50" },
        { x: -2, y: -3, color: "#34495e" },
        { x: -1, y: -3, color: "#3d566e" },
        { x: 0, y: -3, color: "#3d566e" },
        { x: 1, y: -3, color: "#3d566e" },
        { x: 2, y: -3, color: "#34495e" },
        { x: 3, y: -3, color: "#2c3e50" },
        
        { x: -3, y: -2, color: "#2c3e50" },
        { x: -2, y: -2, color: "#34495e" },
        { x: -1, y: -2, color: "#3d566e" },
        { x: 0, y: -2, color: "#3d566e" },
        { x: 1, y: -2, color: "#3d566e" },
        { x: 2, y: -2, color: "#34495e" },
        { x: 3, y: -2, color: "#2c3e50" },
        
        { x: -3, y: -1, color: "#2c3e50" },
        { x: -2, y: -1, color: "#e74c3c" }, // Red accent stripe
        { x: -1, y: -1, color: "#3d566e" },
        { x: 0, y: -1, color: "#3d566e" },
        { x: 1, y: -1, color: "#3d566e" },
        { x: 2, y: -1, color: "#e74c3c" }, // Red accent stripe
        { x: 3, y: -1, color: "#2c3e50" },
        
        // Lower hull section
        { x: -3, y: 0, color: "#2c3e50" },
        { x: -2, y: 0, color: "#34495e" },
        { x: -1, y: 0, color: "#3d566e" },
        { x: 0, y: 0, color: "#3d566e" },
        { x: 1, y: 0, color: "#3d566e" },
        { x: 2, y: 0, color: "#34495e" },
        { x: 3, y: 0, color: "#2c3e50" },
        
        { x: -3, y: 1, color: "#2c3e50" },
        { x: -2, y: 1, color: "#34495e" },
        { x: -1, y: 1, color: "#3d566e" },
        { x: 0, y: 1, color: "#3d566e" },
        { x: 1, y: 1, color: "#3d566e" },
        { x: 2, y: 1, color: "#34495e" },
        { x: 3, y: 1, color: "#2c3e50" },
        
        // Reaction control system (RCS) thrusters - darker metallic
        { x: -4, y: -7, color: "#1c2833" }, // Forward RCS
        { x: 4, y: -7, color: "#1c2833" },  // Forward RCS
        { x: -4, y: 0, color: "#1c2833" },  // Aft RCS
        { x: 4, y: 0, color: "#1c2833" },   // Aft RCS
        
        // Engine section - widening slightly for drive cone
        { x: -4, y: 2, color: "#2c3e50" },
        { x: -3, y: 2, color: "#2c3e50" },
        { x: -2, y: 2, color: "#34495e" },
        { x: -1, y: 2, color: "#3d566e" },
        { x: 0, y: 2, color: "#3d566e" },
        { x: 1, y: 2, color: "#3d566e" },
        { x: 2, y: 2, color: "#34495e" },
        { x: 3, y: 2, color: "#2c3e50" },
        { x: 4, y: 2, color: "#2c3e50" },
        
        // Drive section - modern engine housing
        { x: -4, y: 3, color: "#34495e" },
        { x: -3, y: 3, color: "#7f8c8d" }, // Engine housing - metallic
        { x: -2, y: 3, color: "#7f8c8d" }, // Engine housing
        { x: -1, y: 3, color: "#3d566e" },
        { x: 0, y: 3, color: "#3d566e" },
        { x: 1, y: 3, color: "#3d566e" },
        { x: 2, y: 3, color: "#7f8c8d" }, // Engine housing
        { x: 3, y: 3, color: "#7f8c8d" }, // Engine housing
        { x: 4, y: 3, color: "#34495e" },
        
        // Main engine bell - darker, more modern look
        { x: -4, y: 4, color: "#2c3e50" },
        { x: -3, y: 4, color: "#1c2833" }, // Engine casing - very dark
        { x: -2, y: 4, color: "#1c2833" }, // Engine casing
        { x: -1, y: 4, color: "#1c2833" }, // Engine casing
        { x: 0, y: 4, color: "#1c2833" },  // Central engine
        { x: 1, y: 4, color: "#1c2833" },  // Engine casing
        { x: 2, y: 4, color: "#1c2833" },  // Engine casing
        { x: 3, y: 4, color: "#1c2833" },  // Engine casing
        { x: 4, y: 4, color: "#2c3e50" },

        // Engine nozzle/exhaust
        { x: -3, y: 5, color: "#1c2833" }, // Left side of nozzle
        { x: -2, y: 5, color: "#1c2833" }, // Left side of nozzle
        { x: -1, y: 5, color: "#1c2833" }, // Left side of nozzle
        { x: 0, y: 5, color: "#1c2833" },  // Center of nozzle
        { x: 1, y: 5, color: "#1c2833" },  // Right side of nozzle
        { x: 2, y: 5, color: "#1c2833" },  // Right side of nozzle
        { x: 3, y: 5, color: "#1c2833" },  // Right side of nozzle
        
        // Radiator panels (extending from the sides of the cylindrical hull) - darker, more modern
        { x: -5, y: -4, color: "#1c2833" }, // Left radiator
        { x: -5, y: -3, color: "#1c2833" }, // Left radiator
        { x: -5, y: -2, color: "#1c2833" }, // Left radiator
        { x: -5, y: -1, color: "#1c2833" }, // Left radiator
        { x: -5, y: 0, color: "#1c2833" },  // Left radiator
        
        { x: 5, y: -4, color: "#1c2833" },  // Right radiator
        { x: 5, y: -3, color: "#1c2833" },  // Right radiator
        { x: 5, y: -2, color: "#1c2833" },  // Right radiator
        { x: 5, y: -1, color: "#1c2833" },  // Right radiator
        { x: 5, y: 0, color: "#1c2833" },   // Right radiator
    ];

    // Draw ship pixels
    shipPixels.forEach((pixel) => {
        ctx.fillStyle = pixel.color;
        ctx.fillRect(
            pixel.x * pixelSize,
            pixel.y * pixelSize,
            pixelSize,
            pixelSize
        );
    });

    // Draw rocket exhaust if thrusting - blue fusion drive exhaust
    if (spaceship.thrusting) {
        // Main engine exhaust - focused beam (Epstein drive style)
        const mainExhaustPixels = [
            // Central engine exhaust beam - single high-energy plume
            { x: 0, y: 6, color: "#3498db" },   // Blue exhaust core
            { x: 0, y: 7, color: "#2980b9" },
            { x: 0, y: 8, color: "#2980b9" },
            { x: 0, y: 9, color: "#2980b9", opacity: 0.9 },
            { x: 0, y: 10, color: "#2980b9", opacity: 0.7 },
            { x: 0, y: 11, color: "#2980b9", opacity: 0.5 },
            
            // Wider exhaust near the nozzle
            { x: -1, y: 6, color: "#3498db", opacity: 0.9 },
            { x: 1, y: 6, color: "#3498db", opacity: 0.9 },
            { x: -2, y: 6, color: "#2980b9", opacity: 0.8 },
            { x: 2, y: 6, color: "#2980b9", opacity: 0.8 },
            
            // Exhaust glow around the beam
            { x: -1, y: 7, color: "#5dade2", opacity: 0.7 },
            { x: 1, y: 7, color: "#5dade2", opacity: 0.7 },
            { x: -2, y: 7, color: "#5dade2", opacity: 0.5 },
            { x: 2, y: 7, color: "#5dade2", opacity: 0.5 },
            { x: -1, y: 8, color: "#5dade2", opacity: 0.5 },
            { x: 1, y: 8, color: "#5dade2", opacity: 0.5 },
            
            // Hot spots at nozzle exits
            { x: -2, y: 5.5, color: "#ecf0f1", opacity: 0.8 }, // White hot at nozzle
            { x: -1, y: 5.5, color: "#ecf0f1", opacity: 0.9 }, // White hot at nozzle
            { x: 0, y: 5.5, color: "#ecf0f1" },  // White hot at nozzle center
            { x: 1, y: 5.5, color: "#ecf0f1", opacity: 0.9 }, // White hot at nozzle
            { x: 2, y: 5.5, color: "#ecf0f1", opacity: 0.8 }, // White hot at nozzle
        ];
        
        // Create dynamic exhaust effect based on time
        const exhaustVariation = Date.now() % 4; // 0, 1, 2, or 3
        
        // Draw main exhaust
        mainExhaustPixels.forEach((pixel) => {
            // Calculate animation effects - subtler for fusion drive
            const yOffset = Math.sin(Date.now() / 200 + pixel.x) * 0.2;
            const xOffset = Math.cos(Date.now() / 300 + pixel.y) * 0.1;
            
            // Set opacity if defined
            ctx.globalAlpha = pixel.opacity !== undefined ? pixel.opacity : 1;
            
            ctx.fillStyle = pixel.color;
            ctx.fillRect(
                (pixel.x + xOffset) * pixelSize,
                (pixel.y + yOffset + exhaustVariation * 0.1) * pixelSize, // Subtler variation
                pixelSize,
                pixel.y > 8 ? pixelSize * 1.2 : pixelSize // Slightly expand distant exhaust
            );
        });
        
        // Reset opacity
        ctx.globalAlpha = 1;

        // Add boost exhaust if active - longer, more focused fusion drive
        if (spaceship.boostActive) {
            const boostExhaustPixels = [
                // Extended center engine beam
                { x: 0, y: 12, color: "#2980b9", opacity: 0.4 },
                { x: 0, y: 13, color: "#2980b9", opacity: 0.3 },
                { x: 0, y: 14, color: "#2980b9", opacity: 0.2 },
                { x: 0, y: 15, color: "#2980b9", opacity: 0.1 },
                { x: 0, y: 16, color: "#2980b9", opacity: 0.05 },
                { x: 0, y: 17, color: "#2980b9", opacity: 0.025 },
                
                // Additional glow for boost mode
                { x: -1, y: 9, color: "#5dade2", opacity: 0.3 },
                { x: 1, y: 9, color: "#5dade2", opacity: 0.3 },
                { x: -1, y: 10, color: "#5dade2", opacity: 0.2 },
                { x: 1, y: 10, color: "#5dade2", opacity: 0.2 },
                
                // Shock diamonds in exhaust (visible in high-efficiency drives)
                { x: 0, y: 9, color: "#ecf0f1", opacity: 0.7 },
                { x: 0, y: 13, color: "#ecf0f1", opacity: 0.4 },
                
                // RCS thruster effects during maneuvers
                { x: -4, y: -6, color: "#5dade2", opacity: 0.6 },
                { x: 4, y: -6, color: "#5dade2", opacity: 0.6 },
                { x: -4, y: 1, color: "#5dade2", opacity: 0.6 },
                { x: 4, y: 1, color: "#5dade2", opacity: 0.6 },
            ];
            
            boostExhaustPixels.forEach((pixel) => {
                // More dramatic animation for boost
                const yOffset = Math.sin(Date.now() / 150 + pixel.x * 2) * 0.4;
                const xOffset = Math.cos(Date.now() / 250 + pixel.y) * 0.15;
                
                ctx.globalAlpha = pixel.opacity || 0.5;
                ctx.fillStyle = pixel.color;
                
                // Calculate size variation based on position
                const sizeVariation = pixel.y > 12 ? 1.3 : 1.1;
                
                ctx.fillRect(
                    (pixel.x + xOffset) * pixelSize,
                    (pixel.y + yOffset + exhaustVariation * 0.1) * pixelSize,
                    pixelSize * sizeVariation,
                    pixelSize * sizeVariation
                );
            });
            
            // Add ionization particles for boost - fusion plasma
            for (let i = 0; i < 6; i++) {
                const particleX = (Math.random() * 4 - 2) * pixelSize;
                const particleY = (Math.random() * 8 + 10) * pixelSize;
                const particleSize = Math.random() * 1 + 0.5;
                
                ctx.globalAlpha = Math.random() * 0.5 + 0.2;
                const colors = ["#3498db", "#2980b9", "#ecf0f1", "#5dade2"];
                ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                
                ctx.fillRect(
                    particleX,
                    particleY,
                    particleSize,
                    particleSize * 1.5
                );
            }
            
            // Reset opacity
            ctx.globalAlpha = 1;
        }
        
        // Engine glow effect - blue fusion drive
        const glowRadius = spaceship.boostActive ? 24 : 18; 
        
        // Draw engine glow
        const gradient = ctx.createRadialGradient(
            0, 5 * pixelSize, 0,
            0, 5 * pixelSize, glowRadius
        );
        
        if (spaceship.boostActive) {
            gradient.addColorStop(0, 'rgba(52, 152, 219, 0.95)'); // Bright blue
            gradient.addColorStop(0.4, 'rgba(41, 128, 185, 0.6)'); // Medium blue
        } else {
            gradient.addColorStop(0, 'rgba(52, 152, 219, 0.8)'); // Blue
            gradient.addColorStop(0.5, 'rgba(41, 128, 185, 0.4)'); // Darker blue
        }
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 5 * pixelSize, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // RCS thruster glows (smaller, only visible during boost)
        if (spaceship.boostActive && Math.random() > 0.5) {
            const rcsPositions = [
                {x: -4, y: -7}, // Forward RCS
                {x: 4, y: -7},  // Forward RCS
                {x: -4, y: 0},  // Aft RCS
                {x: 4, y: 0},   // Aft RCS
            ];
            
            // Only show some RCS thrusters randomly for effect
            for (let i = 0; i < 2; i++) {
                const rcs = rcsPositions[Math.floor(Math.random() * rcsPositions.length)];
                
                const rcsGradient = ctx.createRadialGradient(
                    rcs.x * pixelSize, rcs.y * pixelSize, 0,
                    rcs.x * pixelSize, rcs.y * pixelSize, 6
                );
                
                rcsGradient.addColorStop(0, 'rgba(52, 152, 219, 0.8)'); 
                rcsGradient.addColorStop(0.7, 'rgba(41, 128, 185, 0.3)');
                rcsGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                
                ctx.fillStyle = rcsGradient;
                ctx.beginPath();
                ctx.arc(rcs.x * pixelSize, rcs.y * pixelSize, 6, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    ctx.restore();
}

// Draw pixelated circle (for planets)
function drawPixelCircle(x, y, radius, color) {
    const pixelSize = 4;
    ctx.fillStyle = color;

    const screenX = x - camera.x;
    const screenY = y - camera.y;

    // Only draw if the planet is visible on screen (with some margin)
    if (
        screenX + radius + 100 < 0 ||
        screenX - radius - 100 > canvas.width ||
        screenY + radius + 100 < 0 ||
        screenY - radius - 100 > canvas.height
    ) {
        return;
    }

    for (let i = -radius; i < radius; i += pixelSize) {
        for (let j = -radius; j < radius; j += pixelSize) {
            if (i * i + j * j < radius * radius) {
                ctx.fillRect(
                    screenX + i,
                    screenY + j,
                    pixelSize,
                    pixelSize
                );
            }
        }
    }
}

// Draw a star (with glow effect) - kept as fallback for procedural rendering
function drawStar(x, y, radius, color) {
    const screenX = x - camera.x;
    const screenY = y - camera.y;

    // Only draw if the star is visible (or close to visible)
    if (
        screenX + radius + 200 < 0 ||
        screenX - radius - 200 > canvas.width ||
        screenY + radius + 200 < 0 ||
        screenY - radius - 200 > canvas.height
    ) {
        return;
    }

    // Draw star glow
    const gradient = ctx.createRadialGradient(
        screenX,
        screenY,
        radius * 0.5,
        screenX,
        screenY,
        radius * 2
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screenX, screenY, radius * 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw star core
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Add some random bright spots to make the star look more dynamic
    ctx.fillStyle = "#FFFFFF";
    const spots = Math.floor(radius / 10);
    for (let i = 0; i < spots; i++) {
        const spotX = screenX + (Math.random() - 0.5) * radius * 1.8;
        const spotY = screenY + (Math.random() - 0.5) * radius * 1.8;
        const spotSize = Math.random() * 3 + 1;
        ctx.beginPath();
        ctx.arc(spotX, spotY, spotSize, 0, Math.PI * 2);
        ctx.fill();
    }
}

export {
    draw,
    drawStars,
    drawOrbitRings,
    drawSpaceship,
    drawPixelCircle,
    drawStar
};