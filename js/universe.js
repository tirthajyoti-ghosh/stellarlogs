// Universe data - stars, planets, etc.

import { camera, universeWidth, universeHeight } from './canvas.js';
import { openModal } from './modal.js';
import { portfolioContent } from './content.js';
import { setInteractButtonVisibility } from './touch-controls.js';
import spriteManager from './sprite-manager.js';
import { StarSpriteRenderer } from './star-sprites.js';
import { PlanetSpriteRenderer } from './planet-sprites.js';

// DOM elements
const infoPanel = document.getElementById("info");
const systemIndicator = document.getElementById("current-system");

// Initialize sprite renderers
const starRenderer = new StarSpriteRenderer(spriteManager);
const planetRenderer = new PlanetSpriteRenderer(spriteManager);

// Star configuration mapping for sprites
const STAR_SYSTEM_CONFIG = {
    'workExperience': {
        spriteIndex: 0, // Use first star sprite (Y: 0-199px)
        color: portfolioContent.workExperience.starColor
    },
    'projects': {
        spriteIndex: 1, // Second star sprite (Y: 200-399px)  
        color: portfolioContent.projects.starColor
    },
    'blog': {
        spriteIndex: 2, // Third star sprite (Y: 400-599px)
        color: portfolioContent.blog.starColor
    },
    'recommendations': {
        spriteIndex: 3, // Fourth star sprite (Y: 600-799px)
        color: portfolioContent.recommendations.starColor
    },
    'reading': {
        spriteIndex: 4, // Fifth star sprite (Y: 800-999px)
        color: portfolioContent.reading.starColor
    },
    'shows': {
        spriteIndex: 5, // Sixth star sprite (Y: 1000-1199px)
        color: portfolioContent.shows.starColor
    },
    'travel': {
        spriteIndex: 6, // Seventh star sprite (Y: 1200-1399px)
        color: portfolioContent.travel.starColor
    }
};

// Function to get star configuration
function getStarConfig(systemKey) {
    return STAR_SYSTEM_CONFIG[systemKey] || {
        spriteIndex: 0,
        color: '#ffffff'
    };
}

// Function to draw star with sprite support
function drawStarSprite(ctx, star, camera) {
    const screenX = star.x - camera.x;
    const screenY = star.y - camera.y;
    
    // Use sprite renderer if available and sprite is loaded
    if (starRenderer && spriteManager.isLoaded() && star.spriteIndex !== undefined) {
        return starRenderer.drawStar(ctx, star, screenX, screenY, star.radius);
    }
    
    return false; // Fallback to procedural rendering
}

// Function to draw planet with sprite support
function drawPlanetSprite(ctx, planet, camera) {
    const screenX = planet.x - camera.x;
    const screenY = planet.y - camera.y;
    
    // Use sprite renderer if available and sprite is loaded
    if (planetRenderer && spriteManager.isLoaded()) {
        return planetRenderer.drawPlanet(ctx, planet, screenX, screenY, planet.radius);
    }
    
    return false; // Fallback to procedural rendering
}

// Star systems - each representing a section of the portfolio
const starSystems = [
    {
        id: portfolioContent.workExperience.id,
        name: portfolioContent.workExperience.name,
        x: 3000,
        y: 3000,
        starRadius: 120,
        starColor: portfolioContent.workExperience.starColor,
        // Add star sprite configuration
        spriteIndex: getStarConfig('workExperience').spriteIndex,
        animationTime: Math.random() * 100,
        content: portfolioContent.workExperience.overview,
        planets: portfolioContent.workExperience.planets.map((planet, index) => {
            return {
                name: planet.name,
                radius: 50 - index * 5, // Decreasing sizes
                color: planet.color,
                orbitRadius: 500 + index * 250, // Increased from 400 + index * 200
                orbitSpeed: 0.0005 - index * 0.0001, // Decreasing speeds
                orbitAngle: Math.random() * Math.PI * 2,
                content: planet.overview,
                details: planet.details
            };
        })
    },
    {
        id: portfolioContent.projects.id,
        name: portfolioContent.projects.name,
        x: 12000,
        y: 5000,
        starRadius: 140,
        starColor: portfolioContent.projects.starColor,
        // Add star sprite configuration
        spriteIndex: getStarConfig('projects').spriteIndex,
        animationTime: Math.random() * 100,
        content: portfolioContent.projects.overview,
        planets: portfolioContent.projects.planets.map((planet, index) => {
            return {
                name: planet.name,
                radius: 60 - index * 5,
                color: planet.color,
                orbitRadius: 450 + index * 250, // Increased from 350 + index * 200
                orbitSpeed: 0.0005 - index * 0.0001,
                orbitAngle: Math.random() * Math.PI * 2,
                content: planet.overview,
                details: planet.details
            };
        })
    },
    {
        id: portfolioContent.blog.id,
        name: portfolioContent.blog.name,
        x: 20000,
        y: 8000,
        starRadius: 110,
        starColor: portfolioContent.blog.starColor,
        // Add star sprite configuration
        spriteIndex: getStarConfig('blog').spriteIndex,
        animationTime: Math.random() * 100,
        content: portfolioContent.blog.overview,
        planets: portfolioContent.blog.planets.map((planet, index) => {
            return {
                name: planet.name,
                radius: 55 - index * 5,
                color: planet.color,
                orbitRadius: 400 + index * 250, // Increased from 300 + index * 200
                orbitSpeed: 0.0006 - index * 0.0001,
                orbitAngle: Math.random() * Math.PI * 2,
                content: planet.overview,
                details: planet.details
            };
        })
    },
    {
        id: portfolioContent.recommendations.id,
        name: portfolioContent.recommendations.name,
        x: 4000,
        y: 15000,
        starRadius: 90,
        starColor: portfolioContent.recommendations.starColor,
        // Add star sprite configuration
        spriteIndex: getStarConfig('recommendations').spriteIndex,
        animationTime: Math.random() * 100,
        content: portfolioContent.recommendations.overview,
        planets: portfolioContent.recommendations.planets.map((planet, index) => {
            return {
                name: planet.name,
                radius: 45 - index * 5,
                color: planet.color,
                orbitRadius: 350 + index * 250, // Increased from 250 + index * 200
                orbitSpeed: 0.0007 - index * 0.0001,
                orbitAngle: Math.random() * Math.PI * 2,
                content: planet.overview,
                details: planet.details
            };
        })
    },
    {
        id: portfolioContent.reading.id,
        name: portfolioContent.reading.name,
        x: 18000,
        y: 18000,
        starRadius: 80,
        starColor: portfolioContent.reading.starColor,
        // Add star sprite configuration
        spriteIndex: getStarConfig('reading').spriteIndex,
        animationTime: Math.random() * 100,
        content: portfolioContent.reading.overview,
        planets: portfolioContent.reading.planets.map((planet, index) => {
            return {
                name: planet.name,
                radius: 30 - index * 5,
                color: planet.color,
                orbitRadius: 300 + index * 180, // Increased from 200 + index * 150
                orbitSpeed: 0.0008 - index * 0.0002,
                orbitAngle: Math.random() * Math.PI * 2,
                content: planet.overview,
                details: planet.details
            };
        })
    },
    {
        id: portfolioContent.shows.id,
        name: portfolioContent.shows.name,
        x: 25000,
        y: 12000,
        starRadius: 100,
        starColor: portfolioContent.shows.starColor,
        // Add star sprite configuration
        spriteIndex: getStarConfig('shows').spriteIndex,
        animationTime: Math.random() * 100,
        content: portfolioContent.shows.overview,
        planets: portfolioContent.shows.planets.map((planet, index) => {
            return {
                name: planet.name,
                radius: 50 - index * 5,
                color: planet.color,
                orbitRadius: 400 + index * 250, // Increased from 300 + index * 200
                orbitSpeed: 0.0006 - index * 0.0002,
                orbitAngle: Math.random() * Math.PI * 2,
                content: planet.overview,
                details: planet.details
            };
        })
    },
    {
        id: portfolioContent.travel.id,
        name: portfolioContent.travel.name,
        x: 8000,
        y: 22000,
        starRadius: 120,
        starColor: portfolioContent.travel.starColor,
        // Add star sprite configuration
        spriteIndex: getStarConfig('travel').spriteIndex,
        animationTime: Math.random() * 100,
        content: portfolioContent.travel.overview,
        planets: portfolioContent.travel.planets.map((planet, index) => {
            return {
                name: planet.name,
                radius: 60 - index * 5,
                color: planet.color,
                orbitRadius: 500 + index * 300, // Increased from 400 + index * 250
                orbitSpeed: 0.0005 - index * 0.0001,
                orbitAngle: Math.random() * Math.PI * 2,
                content: planet.overview,
                details: planet.details
            };
        })
    },
];

// Create a flat list of all planets for radar and detection purposes
const allPlanets = [];
starSystems.forEach((system) => {
    // Add the star with sprite configuration
    allPlanets.push({
        x: system.x,
        y: system.y,
        radius: system.starRadius,
        color: system.starColor,
        name: system.name + " System",
        content: system.content,
        isStar: true,
        systemId: system.id,
        // Add sprite properties for stars
        spriteIndex: system.spriteIndex,
        animationTime: system.animationTime
    });

    // Add each planet
    system.planets.forEach((planet) => {
        // Calculate position based on orbit
        const planetX = system.x + Math.cos(planet.orbitAngle) * planet.orbitRadius;
        const planetY = system.y + Math.sin(planet.orbitAngle) * planet.orbitRadius;

        allPlanets.push({
            x: planetX,
            y: planetY,
            baseX: system.x,
            baseY: system.y,
            radius: planet.radius,
            color: planet.color,
            name: planet.name,
            content: planet.content,
            orbitRadius: planet.orbitRadius,
            orbitSpeed: planet.orbitSpeed,
            orbitAngle: planet.orbitAngle,
            systemName: system.name,
            systemId: system.id,
            isPlanet: true,
            details: planet.details,
        });
    });
});

// Stars background - more stars for larger universe
const stars = [];
for (let i = 0; i < 4000; i++) {
    stars.push({
        x: Math.random() * universeWidth,
        y: Math.random() * universeHeight,
        size: Math.random() * 3,
        twinkleSpeed: Math.random() * 0.05,
    });
}

// Update function to update planet positions in their orbits and star animations
function updateStarSystems() {
    // Find planets in the allPlanets array and update their positions
    for (let i = 0; i < allPlanets.length; i++) {
        const obj = allPlanets[i];
        if (obj.isPlanet) {
            // Update orbit angle
            obj.orbitAngle += obj.orbitSpeed;
            if (obj.orbitAngle > Math.PI * 2) {
                obj.orbitAngle -= Math.PI * 2;
            }

            // Update position based on orbit
            obj.x = obj.baseX + Math.cos(obj.orbitAngle) * obj.orbitRadius;
            obj.y = obj.baseY + Math.sin(obj.orbitAngle) * obj.orbitRadius;
            
            // Initialize animation time if not set
            if (obj.animationTime === undefined) {
                obj.animationTime = Math.random() * 100;
            }
            
            // Initialize orbit index if not set
            if (obj.orbitIndex === undefined) {
                // Find this planet's orbit index by looking at the star system
                const system = starSystems.find(s => s.id === obj.systemId);
                if (system) {
                    const planetIndex = system.planets.findIndex(p => p.name === obj.name);
                    obj.orbitIndex = planetIndex >= 0 ? planetIndex : 0;
                }
            }
            
            // Update planet animation - ensure planetRenderer is available
            if (planetRenderer) {
                planetRenderer.updatePlanetAnimation(obj, 0.016); // ~60fps delta time
            } else {
                // Manual animation update if renderer not available
                obj.animationTime += 0.016 * 0.008; // Default rotation speed
                if (obj.animationTime > 1000) {
                    obj.animationTime -= 1000;
                }
            }
        } else if (obj.isStar && obj.spriteIndex !== undefined) {
            // Update star animation time - increased speed
            obj.animationTime += 0.025; // Increased from 0.016 to 0.025
            if (obj.animationTime > 1000) {
                obj.animationTime -= 1000;
            }
        }
    }
    
    // Also update the star systems array for consistency
    starSystems.forEach((system, systemIndex) => {
        if (system.spriteIndex !== undefined) {
            system.animationTime += 0.055; // Increased from 0.036 to 0.055
            if (system.animationTime > 1000) {
                system.animationTime -= 1000;
            }
        }
        
        // Sync planet data between starSystems and allPlanets arrays
        system.planets.forEach((planet, planetIndex) => {
            if (planet.orbitIndex === undefined) {
                planet.orbitIndex = planetIndex;
            }
            // Initialize animation time if not set
            if (planet.animationTime === undefined) {
                planet.animationTime = Math.random() * 100;
            }
            
            // Find corresponding planet in allPlanets and sync animation data
            const allPlanet = allPlanets.find(p => 
                p.isPlanet && 
                p.systemId === system.id && 
                p.name === planet.name
            );
            
            if (allPlanet) {
                // Sync animation properties
                allPlanet.orbitIndex = planetIndex;
                if (allPlanet.animationTime === undefined) {
                    allPlanet.animationTime = planet.animationTime;
                }
                // Sync planet type and variant if already determined
                if (planet.planetType) allPlanet.planetType = planet.planetType;
                if (planet.planetVariant !== undefined) allPlanet.planetVariant = planet.planetVariant;
            }
        });
    });
}

// Check if spaceship is near a celestial object
function checkPlanetProximity(spaceship) {
    let foundNearby = false;
    let nearestObject = null;
    let nearestDistance = Infinity;

    for (const obj of allPlanets) {
        const dx = spaceship.x - obj.x;
        const dy = spaceship.y - obj.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Track nearest object for targeting reticle
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestObject = obj;
        }

        // Adjust proximity threshold based on whether it's a star or planet
        const proximityThreshold = obj.radius + (obj.isStar ? 200 : 50);

        if (distance < proximityThreshold) {
            // Prepare info panel content based on object type
            let infoContent;
            const interactHint = window.isTouchDevice ? "Tap here" : "Press <span class=\"key-hint\">E</span>";

            if (obj.isStar) {
                infoContent = `<h2>${obj.name}</h2>
                              <p>${obj.content}</p>
                              <p>This star system contains multiple planets to explore.</p>
                              <p>${interactHint} to view an overview of this section</p>`;
            } else {
                infoContent = `<h2>${obj.name}</h2>
                              <p><em>Part of the ${obj.systemName} system</em></p>
                              <p>${obj.content}</p>
                              ${obj.details ? `<p>${interactHint} to explore this item</p>` : ''}`;
            }

            infoPanel.innerHTML = infoContent;
            
            // Position the info panel relative to the ship and screen boundaries
            const screenX = spaceship.x - camera.x;
            const screenY = spaceship.y - camera.y;
            const panelWidth = infoPanel.offsetWidth;
            const panelHeight = infoPanel.offsetHeight;
            const margin = 20; // Margin from ship and screen edges

            let panelLeft = screenX + 40; // Default: to the right of the ship
            let panelTop = screenY - panelHeight - margin; // Default: above the ship

            // Adjust if panel goes off-screen horizontally
            if (panelLeft + panelWidth + margin > window.innerWidth) {
                panelLeft = screenX - panelWidth - 40; // Move to the left of the ship
            }
            if (panelLeft < margin) {
                panelLeft = margin; // Prevent going off left edge
            }

            // Adjust if panel goes off-screen vertically
            if (panelTop < margin) {
                panelTop = screenY + margin + 20; // Move below the ship (20 is approx ship height)
            }
            if (panelTop + panelHeight + margin > window.innerHeight) {
                panelTop = window.innerHeight - panelHeight - margin; // Prevent going off bottom edge
            }

            infoPanel.style.left = `${panelLeft}px`;
            infoPanel.style.top = `${panelTop}px`;
            infoPanel.style.display = "block";
            infoPanel.style.opacity = "1"; // Ensure it's visible
            
            // Update visual connection/styling based on object
            infoPanel.style.borderLeft = `3px solid ${obj.color || '#00ffff'}`;
            infoPanel.style.boxShadow = `0 0 15px 5px rgba(${parseInt((obj.color || '#00ffff').slice(1, 3), 16)}, 
                                                          ${parseInt((obj.color || '#00ffff').slice(3, 5), 16)}, 
                                                          ${parseInt((obj.color || '#00ffff').slice(5, 7), 16)}, 0.3)`;

            if (window.isTouchDevice) {
                setInteractButtonVisibility(!!(obj.isStar || obj.details)); // Show if interactable
            }

            // Logic for "entering" a section when pressing E or interact button
            if (keys["e"] || keys["E"] || window.eKeyPressed) { // window.eKeyPressed for touch
                // Only trigger once per keypress/tap
                if (!window.actionTakenThisFrame) { // Use a frame-based flag to prevent multiple triggers
                    window.actionTakenThisFrame = true;
                    
                    if (obj.isStar) {
                        openStarSystemModal(obj);
                    } else if (obj.details) {
                        openPlanetModal(obj);
                    }
                    // Reset eKeyPressed if it was set by touch, to allow next touch interaction
                    if(window.eKeyPressed) window.eKeyPressed = false; 
                }
            } else {
                window.actionTakenThisFrame = false; // Reset flag if key is not pressed
            }

            foundNearby = true;
            break;
        }
    }

    if (!foundNearby) {
        infoPanel.style.display = "none";
        infoPanel.style.opacity = "0";
        if (window.isTouchDevice) {
            setInteractButtonVisibility(false);
        }
        window.actionTakenThisFrame = false; // Ensure flag is reset when no object is nearby
    }

    // Update current system indicator
    let inSystem = false;
    starSystems.forEach(system => {
        const dx = spaceship.x - system.x;
        const dy = spaceship.y - system.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 2000) {
            systemIndicator.textContent = system.name;
            inSystem = true;
        }
    });
    
    if (!inSystem) {
        systemIndicator.textContent = "Deep Space";
    }
}

// Function to open star system modal
function openStarSystemModal(starSystem) {
    // Find the full star system data if we're working with a simplified version
    const fullSystem = starSystems.find(s => 
        (starSystem.systemId && s.id === starSystem.systemId) || 
        (s.name === starSystem.name)
    );
    
    if (!fullSystem && !starSystem.content) {
        console.error("Star system data not found");
        return;
    }
    
    const system = fullSystem || starSystem;
    const exploreHint = window.isTouchDevice ? "Tap on a planet's entry or fly closer and tap the interact button" : "Fly closer to any planet and press <span class=\"key-hint\">E</span>";
    
    // Create modal content
    let content = `
        <p class=\"system-intro\">${system.content}</p>
        
        <h3>About this Section</h3>
        <p>This star system represents my ${system.name.toLowerCase()}. Explore the planets to learn more about specific aspects.</p>
        
        <h3>Planets in this System</h3>
        <ul class=\"planet-list\">
    `;
    
    // Add planets
    system.planets.forEach(planet => {
        content += `
            <li>
                <h4 style=\"color: ${planet.color}\">${planet.name}</h4>
                <p>${planet.content}</p>
            </li>
        `;
    });
    
    content += `
        </ul>
        
        <div class=\"navigation-tip\">
            <p>${exploreHint} to explore its details.</p>
        </div>
    `;
    
    // Open the modal with content
    openModal(system.name + " System", content, system.starColor);
}

// Function to open planet modal
function openPlanetModal(planet) {
    // Generate content based on the planet data
    const closeHint = window.isTouchDevice ? "Tap outside or use the close button" : "Press <span class=\"key-hint\">ESC</span>";
    let content = `
        <div class=\"planet-header\">
            <span class=\"planet-system\">Part of the ${planet.systemName} system</span>
        </div>
        
        <p>${planet.content}</p>
    `;
    
    content += planet.details;
    
    content += `
        <div class=\"navigation-tip\">
            <p>${closeHint} to close this view and continue exploring.</p>
        </div>
    `;
    
    // Open the modal with content
    openModal(planet.name, content, planet.color);
}

export {
    starSystems,
    allPlanets,
    stars,
    updateStarSystems,
    checkPlanetProximity,
    openStarSystemModal,
    openPlanetModal,
    getStarConfig,
    drawStarSprite,
    drawPlanetSprite
};