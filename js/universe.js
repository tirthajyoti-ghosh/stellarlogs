// Universe data - stars, planets, etc.

import { camera, universeWidth, universeHeight } from './canvas.js';
import { spaceship } from './spaceship.js';

// DOM elements
const infoPanel = document.getElementById("info");
const systemIndicator = document.getElementById("current-system");

// Star systems - each representing a section of the portfolio
const starSystems = [
    {
        id: "work-experience",
        name: "Work Experience",
        x: 3000,
        y: 3000,
        starRadius: 120,
        starColor: "#FF9D00", // Orange star
        content: "My professional work history and experiences...",
        planets: [
            {
                name: "Senior Developer",
                radius: 50,
                color: "#FF5733",
                orbitRadius: 400,
                orbitSpeed: 0.0004,
                orbitAngle: Math.random() * Math.PI * 2,
                content: "Lead developer at XYZ Corp (2020-Present)...",
            },
            {
                name: "Backend Engineer",
                radius: 35,
                color: "#C70039",
                orbitRadius: 600,
                orbitSpeed: 0.0003,
                orbitAngle: Math.random() * Math.PI * 2,
                content: "Backend specialist at ABC Inc (2018-2020)...",
            },
            {
                name: "Junior Developer",
                radius: 25,
                color: "#900C3F",
                orbitRadius: 800,
                orbitSpeed: 0.0002,
                orbitAngle: Math.random() * Math.PI * 2,
                content: "Started my career at StartupXYZ (2016-2018)...",
            },
        ],
    },
    {
        id: "projects",
        name: "Projects",
        x: 12000,
        y: 5000,
        starRadius: 140,
        starColor: "#5CAFFB", // Blue star
        content: "My coding projects and applications...",
        planets: [
            {
                name: "Space Portfolio",
                radius: 60,
                color: "#33FF57",
                orbitRadius: 350,
                orbitSpeed: 0.0005,
                orbitAngle: Math.random() * Math.PI * 2,
                content: "This interactive space-themed portfolio...",
            },
            {
                name: "AI Chat App",
                radius: 45,
                color: "#00A86B",
                orbitRadius: 550,
                orbitSpeed: 0.0004,
                orbitAngle: Math.random() * Math.PI * 2,
                content: "Real-time chat application with AI suggestions...",
            },
            {
                name: "Recipe Finder",
                radius: 50,
                color: "#4B7F52",
                orbitRadius: 750,
                orbitSpeed: 0.0003,
                orbitAngle: Math.random() * Math.PI * 2,
                content: "Web app that helps find recipes based on available ingredients...",
            },
            {
                name: "Budget Tracker",
                radius: 30,
                color: "#98FB98",
                orbitRadius: 900,
                orbitSpeed: 0.0002,
                orbitAngle: Math.random() * Math.PI * 2,
                content: "Personal finance tracking application...",
            },
        ],
    },
    {
        id: "blog",
        name: "Blog",
        x: 20000,
        y: 8000,
        starRadius: 110,
        starColor: "#F6F0A3", // Yellow star
        content: "My tech blog and articles...",
        planets: [
            {
                name: "Web Dev Trends",
                radius: 55,
                color: "#3357FF",
                orbitRadius: 300,
                orbitSpeed: 0.0006,
                orbitAngle: Math.random() * Math.PI * 2,
                content: "Latest trends in web development for 2025...",
            },
            {
                name: "AI Revolution",
                radius: 40,
                color: "#6A5ACD",
                orbitRadius: 500,
                orbitSpeed: 0.0004,
                orbitAngle: Math.random() * Math.PI * 2,
                content: "How AI is changing the software industry...",
            },
            {
                name: "Clean Code",
                radius: 35,
                color: "#7B68EE",
                orbitRadius: 700,
                orbitSpeed: 0.0003,
                orbitAngle: Math.random() * Math.PI * 2,
                content: "Principles of writing maintainable code...",
            },
        ],
    },
    {
        id: "recommendations",
        name: "Recommendations",
        x: 4000,
        y: 15000,
        starRadius: 90,
        starColor: "#FF5376", // Pink star
        content: "Professional recommendations and testimonials...",
        planets: [
            {
                name: "CEO Testimonial",
                radius: 45,
                color: "#F3FF33",
                orbitRadius: 250,
                orbitSpeed: 0.0007,
                orbitAngle: Math.random() * Math.PI * 2,
                content: '"An exceptional developer who always delivers..." - Jane Doe, CEO',
            },
            {
                name: "Team Lead Review",
                radius: 40,
                color: "#FFCC33",
                orbitRadius: 450,
                orbitSpeed: 0.0005,
                orbitAngle: Math.random() * Math.PI * 2,
                content: '"Great team player with excellent problem-solving skills..." - John Smith, Lead Developer',
            },
        ],
    },
    {
        id: "current-reads",
        name: "Current Reading",
        x: 18000,
        y: 18000,
        starRadius: 80,
        starColor: "#FF33F6", // Purple star
        content: "Books I'm currently reading...",
        planets: [
            {
                name: "Clean Architecture",
                radius: 30,
                color: "#FF33F6",
                orbitRadius: 200,
                orbitSpeed: 0.0008,
                orbitAngle: Math.random() * Math.PI * 2,
                content: "Clean Architecture by Robert C. Martin - My notes and takeaways...",
            },
            {
                name: "Deep Work",
                radius: 25,
                color: "#DA70D6",
                orbitRadius: 350,
                orbitSpeed: 0.0006,
                orbitAngle: Math.random() * Math.PI * 2,
                content: "Deep Work by Cal Newport - Strategies I'm implementing...",
            },
        ],
    },
    {
        id: "shows",
        name: "TV Shows",
        x: 25000,
        y: 12000,
        starRadius: 100,
        starColor: "#33FFF3", // Cyan star
        content: "TV Shows I'm currently watching...",
        planets: [
            {
                name: "Sci-Fi Series",
                radius: 50,
                color: "#33FFF3",
                orbitRadius: 300,
                orbitSpeed: 0.0006,
                orbitAngle: Math.random() * Math.PI * 2,
                content: "My thoughts on the latest season of...",
            },
            {
                name: "Tech Documentaries",
                radius: 45,
                color: "#40E0D0",
                orbitRadius: 500,
                orbitSpeed: 0.0004,
                orbitAngle: Math.random() * Math.PI * 2,
                content: "Fascinating tech documentaries I've watched...",
            },
        ],
    },
    {
        id: "travel",
        name: "Travel Map",
        x: 8000,
        y: 22000,
        starRadius: 120,
        starColor: "#C433FF", // Violet star
        content: "Places I've visited around the world...",
        planets: [
            {
                name: "Europe",
                radius: 60,
                color: "#C433FF",
                orbitRadius: 400,
                orbitSpeed: 0.0005,
                orbitAngle: Math.random() * Math.PI * 2,
                content: "My adventures through various European countries...",
            },
            {
                name: "Asia",
                radius: 55,
                color: "#9370DB",
                orbitRadius: 650,
                orbitSpeed: 0.0003,
                orbitAngle: Math.random() * Math.PI * 2,
                content: "Exploring cultures across Asia...",
            },
            {
                name: "Americas",
                radius: 50,
                color: "#8A2BE2",
                orbitRadius: 900,
                orbitSpeed: 0.0002,
                orbitAngle: Math.random() * Math.PI * 2,
                content: "Road trips and city explorations in North and South America...",
            },
        ],
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
function checkPlanetProximity() {
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
                if (obj.isStar) {
                    console.log(`Viewing overview of system: ${obj.name}`);
                } else {
                    console.log(`Exploring item: ${obj.name} in ${obj.systemName}`);
                }
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

export {
    starSystems,
    allPlanets,
    stars,
    updateStarSystems,
    checkPlanetProximity
};