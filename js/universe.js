// Universe data - stars, planets, etc.

import { camera, universeWidth, universeHeight } from './canvas.js';
import { openModal } from './modal.js';
import { portfolioContent } from './content.js';

// DOM elements
const infoPanel = document.getElementById("info");
const systemIndicator = document.getElementById("current-system");

// Star systems - each representing a section of the portfolio

const starSystems = [
    {
        id: portfolioContent.workExperience.id,
        name: portfolioContent.workExperience.name,
        x: 3000,
        y: 3000,
        starRadius: 120,
        starColor: portfolioContent.workExperience.starColor,
        content: portfolioContent.workExperience.overview,
        planets: portfolioContent.workExperience.planets.map((planet, index) => {
            return {
                name: planet.name,
                radius: 50 - index * 5, // Decreasing sizes
                color: planet.color,
                orbitRadius: 400 + index * 200, // Increasing orbit radii
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
        content: portfolioContent.projects.overview,
        planets: portfolioContent.projects.planets.map((planet, index) => {
            return {
                name: planet.name,
                radius: 60 - index * 5,
                color: planet.color,
                orbitRadius: 350 + index * 200,
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
        content: portfolioContent.blog.overview,
        planets: portfolioContent.blog.planets.map((planet, index) => {
            return {
                name: planet.name,
                radius: 55 - index * 5,
                color: planet.color,
                orbitRadius: 300 + index * 200,
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
        content: portfolioContent.recommendations.overview,
        planets: portfolioContent.recommendations.planets.map((planet, index) => {
            return {
                name: planet.name,
                radius: 45 - index * 5,
                color: planet.color,
                orbitRadius: 250 + index * 200,
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
        content: portfolioContent.reading.overview,
        planets: portfolioContent.reading.planets.map((planet, index) => {
            return {
                name: planet.name,
                radius: 30 - index * 5,
                color: planet.color,
                orbitRadius: 200 + index * 150,
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
        content: portfolioContent.shows.overview,
        planets: portfolioContent.shows.planets.map((planet, index) => {
            return {
                name: planet.name,
                radius: 50 - index * 5,
                color: planet.color,
                orbitRadius: 300 + index * 200,
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
        content: portfolioContent.travel.overview,
        planets: portfolioContent.travel.planets.map((planet, index) => {
            return {
                name: planet.name,
                radius: 60 - index * 5,
                color: planet.color,
                orbitRadius: 400 + index * 250,
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
    // Add the star
    allPlanets.push({
        x: system.x,
        y: system.y,
        radius: system.starRadius,
        color: system.starColor,
        name: system.name + " System",
        content: system.content,
        isStar: true,
        systemId: system.id,
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

// Update function to update planet positions in their orbits
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
        }
    }
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

            if (obj.isStar) {
                infoContent = `<h2>${obj.name}</h2>
                              <p>${obj.content}</p>
                              <p>This star system contains multiple planets to explore.</p>
                              <p>Press <span class="key-hint">E</span> to view an overview of this section</p>`;
            } else {
                infoContent = `<h2>${obj.name}</h2>
                              <p><em>Part of the ${obj.systemName} system</em></p>
                              <p>${obj.content}</p>
                              <p>Press <span class="key-hint">E</span> to explore this item</p>`;
            }

            infoPanel.innerHTML = infoContent;
            
            // Position the info panel relative to the ship instead of over it
            const screenX = spaceship.x - camera.x;
            const screenY = spaceship.y - camera.y;
            
            // Position info panel above and to the right of the ship
            infoPanel.style.left = `${screenX + 40}px`;
            infoPanel.style.top = `${screenY - 20}px`;
            infoPanel.style.display = "block";
            
            // Add a connecting line from ship to panel
            infoPanel.style.borderLeft = `2px solid ${obj.color}`;
            infoPanel.style.boxShadow = `0 0 15px 5px rgba(${parseInt(obj.color.slice(1, 3), 16)}, 
                                                          ${parseInt(obj.color.slice(3, 5), 16)}, 
                                                          ${parseInt(obj.color.slice(5, 7), 16)}, 0.3)`;

            // Logic for "entering" a section when pressing E
            if (keys["e"] || keys["E"]) {
                // Only trigger once per keypress
                if (!window.eKeyPressed) {
                    window.eKeyPressed = true;
                    
                    if (obj.isStar) {
                        // Open modal with star system info
                        openStarSystemModal(obj);
                    } else {
                        // Open modal with planet info
                        openPlanetModal(obj);
                    }
                }
            } else {
                window.eKeyPressed = false;
            }

            foundNearby = true;
            break;
        }
    }

    if (!foundNearby) {
        infoPanel.style.display = "none";
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
    
    // Create modal content
    let content = `
        <p class="system-intro">${system.content}</p>
        
        <h3>About this Section</h3>
        <p>This star system represents my ${system.name.toLowerCase()}. Explore the planets to learn more about specific aspects.</p>
        
        <h3>Planets in this System</h3>
        <ul class="planet-list">
    `;
    
    // Add planets
    system.planets.forEach(planet => {
        content += `
            <li>
                <h4 style="color: ${planet.color}">${planet.name}</h4>
                <p>${planet.content}</p>
            </li>
        `;
    });
    
    content += `
        </ul>
        
        <div class="navigation-tip">
            <p>Fly closer to any planet and press <span class="key-hint">E</span> to explore its details.</p>
        </div>
    `;
    
    // Open the modal with content
    openModal(system.name + " System", content, system.starColor);
}

// Function to open planet modal

function openPlanetModal(planet) {
    console.log('====================================');
    console.log(planet);
    console.log('====================================');
    // Generate content based on the planet data
    let content = `
        <div class="planet-header">
            <span class="planet-system">Part of the ${planet.systemName} system</span>
        </div>
        
        <p>${planet.content}</p>
    `;
    
    // Add detailed content if available
    if (planet.details) {
        content += planet.details;
    } else {
        // Fallback to placeholder content
        content += `
            <div class="placeholder-content">
                <h3>Content Coming Soon</h3>
                <p>Detailed information for this item is still being prepared.</p>
            </div>
        `;
    }
    
    content += `
        <div class="navigation-tip">
            <p>Press <span class="key-hint">ESC</span> to close this view and continue exploring.</p>
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
    openPlanetModal
};