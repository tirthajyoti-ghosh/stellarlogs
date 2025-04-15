// Canvas setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const infoPanel = document.getElementById("info");
const planetData = document.getElementById("planet-data");
const speedIndicator = document.getElementById("current-speed");
const headingIndicator = document.getElementById("current-heading");
const systemIndicator = document.getElementById("current-system");
const thrusterIndicator = document.getElementById("thruster-indicator");
const locationIndicator = document.getElementById("current-location");
const radarCanvas = document.getElementById("radar-sweep");
const radarCtx = radarCanvas.getContext("2d");
const navPanelToggle = document.getElementById("nav-panel-toggle");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight; // Use full height now that dashboard is gone

// Camera for viewport
const camera = {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height,
};

// Game variables
const spaceship = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: 32,
    height: 32,
    velocityX: 0,
    velocityY: 0,
    acceleration: 0.15,
    maxSpeed: 12,
    friction: 0.97,
    rotationAngle: -Math.PI / 2,
    rotationSpeed: 0.1,
    thrusting: false,
    // Boost properties
    boostFactor: 2,
    boostDuration: 1000, // milliseconds
    boostCooldown: 0,
    boostAvailable: true,
    boostActive: false,
    boostStartTime: 0,
    boostCooldownStartTime: 0,
    // Tracking nearest objects
    nearestSystem: null,
    nearestPlanet: null,
};

// Set universe size (much larger than viewport)
const universeWidth = 30000;
const universeHeight = 30000;

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
                content:
                    "Web app that helps find recipes based on available ingredients...",
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
                content:
                    '"An exceptional developer who always delivers..." - Jane Doe, CEO',
            },
            {
                name: "Team Lead Review",
                radius: 40,
                color: "#FFCC33",
                orbitRadius: 450,
                orbitSpeed: 0.0005,
                orbitAngle: Math.random() * Math.PI * 2,
                content:
                    '"Great team player with excellent problem-solving skills..." - John Smith, Lead Developer',
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
                content:
                    "Clean Architecture by Robert C. Martin - My notes and takeaways...",
            },
            {
                name: "Deep Work",
                radius: 25,
                color: "#DA70D6",
                orbitRadius: 350,
                orbitSpeed: 0.0006,
                orbitAngle: Math.random() * Math.PI * 2,
                content:
                    "Deep Work by Cal Newport - Strategies I'm implementing...",
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
                content:
                    "Road trips and city explorations in North and South America...",
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
        const planetX =
            system.x + Math.cos(planet.orbitAngle) * planet.orbitRadius;
        const planetY =
            system.y + Math.sin(planet.orbitAngle) * planet.orbitRadius;

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

// Input handling
const keys = {};

document.addEventListener("keydown", (e) => {
    keys[e.key] = true;
});

document.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

// Handle nav panel toggle
navPanelToggle.addEventListener("click", () => {
    const planetData = document.getElementById("planet-data");
    if (planetData.style.display === "none") {
        planetData.style.display = "block";
        navPanelToggle.textContent = "-";
    } else {
        planetData.style.display = "none";
        navPanelToggle.textContent = "+";
    }
});

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

function updateSpaceship() {
    // Apply thrust based on input - now always in the direction the ship is facing
    spaceship.thrusting = false;

    // Check if boost is active and if it should be deactivated
    if (spaceship.boostActive) {
        if (
            Date.now() - spaceship.boostStartTime >
            spaceship.boostDuration
        ) {
            spaceship.boostActive = false;
            spaceship.boostAvailable = true; // Immediately available again
        }
    }

    // Check if boost cooldown is complete
    if (!spaceship.boostAvailable && !spaceship.boostActive) {
        if (
            Date.now() - spaceship.boostCooldownStartTime >
            spaceship.boostCooldown
        ) {
            spaceship.boostAvailable = true;
        }
    }

    // Activate boost with Shift key
    if (
        keys["Shift"] &&
        !spaceship.boostActive &&
        spaceship.boostAvailable
    ) {
        spaceship.boostActive = true;
        spaceship.boostStartTime = Date.now();
    }

    // Apply regular thrust
    if (keys["ArrowUp"] || keys["w"]) {
        // Calculate acceleration based on boost status
        const currentAcceleration = spaceship.boostActive
            ? spaceship.acceleration * spaceship.boostFactor
            : spaceship.acceleration;

        spaceship.velocityX +=
            Math.cos(spaceship.rotationAngle - Math.PI / 2) *
            currentAcceleration;

        spaceship.velocityY +=
            Math.sin(spaceship.rotationAngle - Math.PI / 2) *
            currentAcceleration;

        spaceship.thrusting = true;
    }

    // Rotation
    if (keys["ArrowLeft"] || keys["a"]) {
        spaceship.rotationAngle -= spaceship.rotationSpeed;
    }
    if (keys["ArrowRight"] || keys["d"]) {
        spaceship.rotationAngle += spaceship.rotationSpeed;
    }

    // Update max speed based on boost
    const currentMaxSpeed = spaceship.boostActive
        ? spaceship.maxSpeed * spaceship.boostFactor
        : spaceship.maxSpeed;

    // Limit maximum speed
    const currentSpeed = Math.sqrt(
        spaceship.velocityX * spaceship.velocityX +
            spaceship.velocityY * spaceship.velocityY
    );
    if (currentSpeed > currentMaxSpeed) {
        const ratio = currentMaxSpeed / currentSpeed;
        spaceship.velocityX *= ratio;
        spaceship.velocityY *= ratio;
    }

    // Apply different friction based on boost status
    // Less friction during boost for more acceleration/deceleration time
    const currentFriction = spaceship.boostActive
        ? 0.99 // Higher value means less friction
        : spaceship.friction;

    spaceship.velocityX *= currentFriction;
    spaceship.velocityY *= currentFriction;

    // Update position
    spaceship.x += spaceship.velocityX;
    spaceship.y += spaceship.velocityY;

    // Wrap around universe edges
    if (spaceship.x > universeWidth) spaceship.x = 0;
    if (spaceship.x < 0) spaceship.x = universeWidth;
    if (spaceship.y > universeHeight) spaceship.y = 0;
    if (spaceship.y < 0) spaceship.y = universeHeight;

    // Update camera to follow spaceship
    camera.x = spaceship.x - canvas.width / 2;
    camera.y = spaceship.y - canvas.height / 2;

    // Keep camera within universe bounds
    camera.x = Math.max(
        0,
        Math.min(camera.x, universeWidth - camera.width)
    );
    camera.y = Math.max(
        0,
        Math.min(camera.y, universeHeight - camera.height)
    );

    // Update dashboard
    updateHUD();

    checkPlanetProximity();
}

// Draw pixelated spaceship
function drawSpaceship() {
    const screenX = spaceship.x - camera.x;
    const screenY = spaceship.y - camera.y;

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(spaceship.rotationAngle);

    // Spaceship body (draw using pixels)
    const pixelSize = 4;

    // Define spaceship shape in a pixel grid (relative to center)
    const shipPixels = [
        // Nose (now at the top/up direction)
        { x: 0, y: -3, color: "#3498db" },
        { x: -1, y: -2, color: "#3498db" },
        { x: 0, y: -2, color: "#3498db" },
        { x: 1, y: -2, color: "#3498db" },

        // Middle section
        { x: -2, y: -1, color: "#3498db" },
        { x: -1, y: -1, color: "#3498db" },
        { x: 0, y: -1, color: "#3498db" },
        { x: 1, y: -1, color: "#3498db" },
        { x: 2, y: -1, color: "#3498db" },

        { x: -3, y: 0, color: "#3498db" },
        { x: -2, y: 0, color: "#3498db" },
        { x: -1, y: 0, color: "#3498db" },
        { x: 0, y: 0, color: "#ffffff" }, // Cockpit
        { x: 1, y: 0, color: "#3498db" },
        { x: 2, y: 0, color: "#3498db" },
        { x: 3, y: 0, color: "#3498db" },

        // Wings
        { x: -4, y: 1, color: "#3498db" },
        { x: -3, y: 1, color: "#3498db" },
        { x: -2, y: 1, color: "#3498db" },
        { x: -1, y: 1, color: "#3498db" },
        { x: 0, y: 1, color: "#3498db" },
        { x: 1, y: 1, color: "#3498db" },
        { x: 2, y: 1, color: "#3498db" },
        { x: 3, y: 1, color: "#3498db" },
        { x: 4, y: 1, color: "#3498db" },

        // Rear section
        { x: -3, y: 2, color: "#3498db" },
        { x: -2, y: 2, color: "#3498db" },
        { x: -1, y: 2, color: "#3498db" },
        { x: 0, y: 2, color: "#3498db" },
        { x: 1, y: 2, color: "#3498db" },
        { x: 2, y: 2, color: "#3498db" },
        { x: 3, y: 2, color: "#3498db" },

        // Engines (at the bottom/down direction)
        { x: -2, y: 3, color: "#e74c3c" },
        { x: -1, y: 3, color: "#e74c3c" },
        { x: 0, y: 3, color: "#e74c3c" },
        { x: 1, y: 3, color: "#e74c3c" },
        { x: 2, y: 3, color: "#e74c3c" },
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

    // Draw thrust if engine is on
    if (spaceship.thrusting) {
        // Base thruster pixels
        const thrustPixels = [
            { x: -2, y: 4, color: "#f39c12" },
            { x: -1, y: 4, color: "#f1c40f" },
            { x: 0, y: 4, color: "#f1c40f" },
            { x: 1, y: 4, color: "#f39c12" },
            { x: 2, y: 4, color: "#f39c12" },
            { x: -1, y: 5, color: "#f39c12" },
            { x: 0, y: 5, color: "#f39c12" },
            { x: 1, y: 5, color: "#f39c12" },
        ];

        // Add extra flame length for boost
        if (spaceship.boostActive) {
            thrustPixels.push(
                { x: -2, y: 6, color: "#e74c3c" },
                { x: -1, y: 6, color: "#f39c12" },
                { x: 0, y: 6, color: "#f1c40f" },
                { x: 1, y: 6, color: "#f39c12" },
                { x: 2, y: 6, color: "#e74c3c" },
                { x: -1, y: 7, color: "#e74c3c" },
                { x: 0, y: 7, color: "#e74c3c" },
                { x: 1, y: 7, color: "#e74c3c" }
            );
        }

        // Animate thrust with more frequent flicker during boost
        if (Math.random() > (spaceship.boostActive ? 0.1 : 0.3)) {
            thrustPixels.forEach((pixel) => {
                ctx.fillStyle = pixel.color;
                ctx.fillRect(
                    pixel.x * pixelSize,
                    pixel.y * pixelSize,
                    pixelSize,
                    pixelSize
                );
            });
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

// Draw a star (with glow effect)
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
        const spotX =
            screenX + (Math.random() - 0.5) * radius * 1.8;
        const spotY =
            screenY + (Math.random() - 0.5) * radius * 1.8;
        const spotSize = Math.random() * 3 + 1;
        ctx.beginPath();
        ctx.arc(spotX, spotY, spotSize, 0, Math.PI * 2);
        ctx.fill();
    }
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

// Draw stars with parallax effect
function drawStars() {
    ctx.fillStyle = "white";
    stars.forEach((star, index) => {
        // Parallax effect - closer stars move faster
        const parallaxFactor = ((index % 3) + 1) * 0.2;

        const screenX = star.x - camera.x * parallaxFactor;
        const screenY = star.y - camera.y * parallaxFactor;

        // Wrap stars within viewport
        const wrappedX =
            ((screenX % canvas.width) + canvas.width) %
            canvas.width;
        const wrappedY =
            ((screenY % canvas.height) + canvas.height) %
            canvas.height;

        // Twinkle effect
        const twinkleSize =
            star.size *
            (0.7 + 0.3 * Math.sin(Date.now() * star.twinkleSpeed));

        ctx.fillRect(wrappedX, wrappedY, twinkleSize, twinkleSize);
    });
}

// Calculate bearing between two points (in degrees)
function calculateBearing(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;

    // Calculate angle in radians
    let angle = Math.atan2(dy, dx);

    // Convert to degrees
    let degrees = angle * (180 / Math.PI);

    // Normalize to 0-360 degrees
    if (degrees < 0) {
        degrees += 360;
    }

    return Math.round(degrees);
}

// Convert radians to degrees
function radToDeg(rad) {
    return rad * (180 / Math.PI);
}

// Convert degrees to compass direction
function degToCompass(deg) {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return directions[Math.round(deg / 45) % 8];
}

// Update HUD with ship and navigation data
function updateHUD() {
    // Update ship control indicators
    const currentSpeed = Math.sqrt(
        spaceship.velocityX * spaceship.velocityX +
            spaceship.velocityY * spaceship.velocityY
    );
    speedIndicator.textContent = currentSpeed.toFixed(2);

    // Calculate heading in degrees (0-360)
    const headingDeg =
        ((radToDeg(spaceship.rotationAngle) % 360) + 360) % 360;
    headingIndicator.textContent = `${Math.round(
        headingDeg
    )}° ${degToCompass(headingDeg)}`;

    // Update thrust indicator
    if (spaceship.thrusting) {
        thrusterIndicator.classList.add("thruster-active");
    } else {
        thrusterIndicator.classList.remove("thruster-active");
    }

    // Update boost meter
    const boostFill = document.getElementById("boost-fill");

    if (spaceship.boostActive) {
        // Show remaining boost time
        const remainingBoost =
            1 -
            (Date.now() - spaceship.boostStartTime) /
                spaceship.boostDuration;
        boostFill.style.width = `${remainingBoost * 100}%`;
        boostFill.classList.add("boost-active");
    } else {
        // Boost is available
        boostFill.style.width = "100%";
        boostFill.classList.remove("boost-active");
    }

    // Update location
    locationIndicator.textContent = `X:${Math.round(
        spaceship.x
    )} Y:${Math.round(spaceship.y)}`;

    // Update radar display
    updateRadar();

    // Update planet data list
    updatePlanetList();

    // Update direction indicators for off-screen objects
    updateDirectionIndicators();
}

// Update radar display for star systems
let radarAngle = 0;
function updateRadar() {
    // Clear radar
    radarCtx.clearRect(0, 0, radarCanvas.width, radarCanvas.height);

    // Set radar center point
    const centerX = radarCanvas.width / 2;
    const centerY = radarCanvas.height / 2;

    // Calculate radar scale (how much universe space fits in radar)
    const radarRange = 5000; // Increased range to see more star systems
    const radarScale = 40 / radarRange; // Adjust scale for smaller radar

    // Draw radar sweep line
    radarCtx.save();
    radarCtx.translate(centerX, centerY);
    radarCtx.rotate(radarAngle);

    // Draw sweep line
    radarCtx.beginPath();
    radarCtx.moveTo(0, 0);
    radarCtx.lineTo(60, 0);
    radarCtx.strokeStyle = "rgba(0, 255, 255, 0.7)";
    radarCtx.lineWidth = 1;
    radarCtx.stroke();

    // Add wider sweep "glow"
    radarCtx.beginPath();
    radarCtx.moveTo(0, 0);
    radarCtx.arc(0, 0, 60, -0.4, 0.4);
    radarCtx.fillStyle = "rgba(0, 255, 255, 0.15)";
    radarCtx.fill();
    radarCtx.restore();

    // Draw only stars on radar (for cleaner display)
    allPlanets.forEach((obj) => {
        if (obj.isStar) {
            // Calculate relative position to ship
            const dx = obj.x - spaceship.x;
            const dy = obj.y - spaceship.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Only show objects within radar range
            if (distance <= radarRange) {
                // Calculate radar position (ship is at center)
                const radarX = centerX + dx * radarScale;
                const radarY = centerY + dy * radarScale;

                // Calculate brightness based on sweep line
                const planetAngle = Math.atan2(dy, dx);
                const normalizedShipAngle =
                    ((radarAngle % (2 * Math.PI)) + 2 * Math.PI) %
                    (2 * Math.PI);
                const normalizedPlanetAngle =
                    ((planetAngle % (2 * Math.PI)) + 2 * Math.PI) %
                    (2 * Math.PI);

                let angleDifference = Math.abs(
                    normalizedShipAngle - normalizedPlanetAngle
                );
                if (angleDifference > Math.PI) {
                    angleDifference = 2 * Math.PI - angleDifference;
                }

                const brightness = Math.max(
                    0.2,
                    1 - angleDifference / 0.5
                );

                // Draw star blip
                radarCtx.fillStyle = `rgba(${parseInt(
                    obj.color.slice(1, 3),
                    16
                )}, ${parseInt(
                    obj.color.slice(3, 5),
                    16
                )}, ${parseInt(
                    obj.color.slice(5, 7),
                    16
                )}, ${brightness})`;
                radarCtx.beginPath();
                radarCtx.arc(radarX, radarY, 3, 0, Math.PI * 2);
                radarCtx.fill();
            }
        }
    });

    // Update radar angle
    radarAngle += 0.04; // Slightly faster sweep
    if (radarAngle > Math.PI * 2) {
        radarAngle = 0;
    }
}

// Show direction indicators for off-screen objects
function updateDirectionIndicators() {
    // Remove all existing indicators
    document.querySelectorAll('.direction-indicator:not(#direction-indicator-template)')
        .forEach(el => el.remove());
    
    const template = document.getElementById('direction-indicator-template');
    const screenPadding = 40; // Padding from screen edge
    
    // Only show indicators for stars within certain distance
    starSystems.forEach(system => {
        // Calculate relative position to ship
        const dx = system.x - spaceship.x;
        const dy = system.y - spaceship.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Only show indicators for systems not visible on screen but within range
        if (distance > 1000 && distance < 15000) {
            const screenX = canvas.width / 2 + dx;
            const screenY = canvas.height / 2 + dy;
            
            // Check if the system is off-screen
            if (screenX < 0 || screenX > canvas.width || 
                screenY < 0 || screenY > canvas.height) {
                
                // Create a new indicator
                const indicator = template.cloneNode(true);
                indicator.id = `indicator-${system.id}`;
                indicator.style.display = 'flex';
                
                // Set the indicator color and text
                indicator.querySelector('.direction-dot').style.backgroundColor = system.starColor;
                indicator.querySelector('.direction-system-name').textContent = system.name;
                
                // Calculate position at screen edge
                let indicatorX, indicatorY;
                
                // Calculate angle from screen center to object
                const angle = Math.atan2(dy, dx);
                
                // Calculate intersection with screen border
                const halfWidth = canvas.width / 2;
                const halfHeight = canvas.height / 2;
                
                // Check intersection with each screen edge
                if (Math.abs(Math.tan(angle)) > halfHeight / halfWidth) {
                    // Will intersect with top/bottom
                    const ySign = Math.sign(dy);
                    indicatorY = ySign > 0 ? canvas.height - screenPadding : screenPadding;
                    indicatorX = halfWidth + (indicatorY - halfHeight) / Math.tan(angle);
                } else {
                    // Will intersect with left/right
                    const xSign = Math.sign(dx);
                    indicatorX = xSign > 0 ? canvas.width - screenPadding : screenPadding;
                    indicatorY = halfHeight + Math.tan(angle) * (indicatorX - halfWidth);
                }
                
                // Position the indicator
                indicator.style.left = `${indicatorX}px`;
                indicator.style.top = `${indicatorY}px`;
                
                // Add to DOM
                document.getElementById('hud-container').appendChild(indicator);
            }
        }
    });
}

// Update planet list to show star systems and nearby planets
function updatePlanetList() {
    // Clear previous list
    planetData.innerHTML = "";

    // Extract only stars for main list
    const starsWithDistance = starSystems
        .map((system) => {
            const dx = system.x - spaceship.x;
            const dy = system.y - spaceship.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const bearing = calculateBearing(
                spaceship.x,
                spaceship.y,
                system.x,
                system.y
            );

            // Calculate relative bearing
            const shipHeading = radToDeg(spaceship.rotationAngle);
            let relativeBearing = bearing - shipHeading;
            if (relativeBearing < 0) relativeBearing += 360;

            return {
                id: system.id,
                name: system.name,
                color: system.starColor,
                distance,
                bearing,
                relativeBearing,
                planetCount: system.planets.length,
            };
        })
        .sort((a, b) => a.distance - b.distance);

    // Create header row
    const headerRow = document.createElement("div");
    headerRow.className = "planet-row";
    headerRow.style.borderBottom = "1px solid rgba(0,255,255,0.3)";
    headerRow.style.marginBottom = "8px";
    headerRow.style.paddingBottom = "5px";

    const headerIndicator = document.createElement("div");
    headerIndicator.style.width = "12px";

    const headerName = document.createElement("div");
    headerName.className = "planet-name";
    headerName.textContent = "STAR SYSTEM";
    headerName.style.fontWeight = "bold";

    const headerDistance = document.createElement("div");
    headerDistance.className = "planet-distance";
    headerDistance.textContent = "DIST";
    headerDistance.style.fontWeight = "bold";

    const headerDirection = document.createElement("div");
    headerDirection.className = "planet-direction";
    headerDirection.textContent = "DIR";
    headerDirection.style.fontWeight = "bold";

    headerRow.appendChild(headerIndicator);
    headerRow.appendChild(headerName);
    headerRow.appendChild(headerDistance);
    headerRow.appendChild(headerDirection);

    planetData.appendChild(headerRow);

    // Add star systems to the list
    starsWithDistance.forEach((system) => {
        const systemRow = document.createElement("div");
        systemRow.className = "planet-row";

        const indicator = document.createElement("div");
        indicator.className = "planet-indicator";
        indicator.style.backgroundColor = system.color;

        const nameEl = document.createElement("div");
        nameEl.className = "planet-name";
        nameEl.textContent = `${system.name} (${system.planetCount})`;

        const distanceEl = document.createElement("div");
        distanceEl.className = "planet-distance";
        distanceEl.textContent = `${Math.round(system.distance)}u`;

        const directionEl = document.createElement("div");
        directionEl.className = "planet-direction";

        // Direction arrow based on relative bearing
        let directionArrow;
        const rb = system.relativeBearing;

        if (rb > 345 || rb <= 15) directionArrow = "↑";
        else if (rb > 15 && rb <= 75) directionArrow = "↗";
        else if (rb > 75 && rb <= 105) directionArrow = "→";
        else if (rb > 105 && rb <= 165) directionArrow = "↘";
        else if (rb > 165 && rb <= 195) directionArrow = "↓";
        else if (rb > 195 && rb <= 255) directionArrow = "↙";
        else if (rb > 255 && rb <= 285) directionArrow = "←";
        else directionArrow = "↖";

        directionEl.textContent = `${directionArrow} ${system.bearing}°`;

        systemRow.appendChild(indicator);
        systemRow.appendChild(nameEl);
        systemRow.appendChild(distanceEl);
        systemRow.appendChild(directionEl);

        planetData.appendChild(systemRow);

        // Find the nearest star system
        if (system === starsWithDistance[0] && system.distance < 3000) {
            // Add a divider
            const divider = document.createElement("div");
            divider.style.padding = "3px";
            divider.style.fontSize = "10px";
            divider.style.color = "rgba(0, 255, 255, 0.6)";
            divider.style.textAlign = "center";
            divider.textContent = "PLANETS IN THIS SYSTEM";
            planetData.appendChild(divider);

            // Find the actual star system data
            const currentSystem = starSystems.find((s) => s.id === system.id);
            if (currentSystem) {
                // Add planets of the nearest system
                const planetsWithDistance = currentSystem.planets
                    .map((planet) => {
                        // Calculate current position
                        const planetX =
                            currentSystem.x +
                            Math.cos(planet.orbitAngle) * planet.orbitRadius;
                        const planetY =
                            currentSystem.y +
                            Math.sin(planet.orbitAngle) * planet.orbitRadius;

                        const dx = planetX - spaceship.x;
                        const dy = planetY - spaceship.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const bearing = calculateBearing(
                            spaceship.x,
                            spaceship.y,
                            planetX,
                            planetY
                        );

                        // Calculate relative bearing
                        const shipHeading = radToDeg(spaceship.rotationAngle);
                        let relativeBearing = bearing - shipHeading;
                        if (relativeBearing < 0) relativeBearing += 360;

                        return {
                            name: planet.name,
                            color: planet.color,
                            distance,
                            bearing,
                            relativeBearing,
                        };
                    })
                    .sort((a, b) => a.distance - b.distance);

                planetsWithDistance.forEach((planet) => {
                    const planetRow = document.createElement("div");
                    planetRow.className = "planet-row";
                    planetRow.style.paddingLeft = "15px"; // Indent planets

                    const indicator = document.createElement("div");
                    indicator.className = "planet-indicator";
                    indicator.style.backgroundColor = planet.color;
                    indicator.style.width = "8px";
                    indicator.style.height = "8px";

                    const nameEl = document.createElement("div");
                    nameEl.className = "planet-name";
                    nameEl.textContent = planet.name;

                    const distanceEl = document.createElement("div");
                    distanceEl.className = "planet-distance";
                    distanceEl.textContent = `${Math.round(planet.distance)}u`;

                    const directionEl = document.createElement("div");
                    directionEl.className = "planet-direction";

                    // Direction arrow
                    let directionArrow;
                    const rb = planet.relativeBearing;

                    if (rb > 345 || rb <= 15) directionArrow = "↑";
                    else if (rb > 15 && rb <= 75) directionArrow = "↗";
                    else if (rb > 75 && rb <= 105) directionArrow = "→";
                    else if (rb > 105 && rb <= 165) directionArrow = "↘";
                    else if (rb > 165 && rb <= 195) directionArrow = "↓";
                    else if (rb > 195 && rb <= 255) directionArrow = "↙";
                    else if (rb > 255 && rb <= 285) directionArrow = "←";
                    else directionArrow = "↖";

                    directionEl.textContent = `${directionArrow} ${planet.bearing}°`;

                    planetRow.appendChild(indicator);
                    planetRow.appendChild(nameEl);
                    planetRow.appendChild(distanceEl);
                    planetRow.appendChild(directionEl);

                    planetData.appendChild(planetRow);
                });
            }
        }
    });
}

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
            drawStar(obj.x, obj.y, obj.radius, obj.color);
        } else {
            drawPixelCircle(obj.x, obj.y, obj.radius, obj.color);
        }
    });

    // Draw spaceship last (so it appears on top)
    drawSpaceship();
}

// Game loop
function gameLoop() {
    updateSpaceship();
    updateStarSystems(); // Update planet orbits
    draw();
    requestAnimationFrame(gameLoop);
}

// Handle window resizing
window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight; // Use full height
    camera.width = canvas.width;
    camera.height = canvas.height;
});

// Start the game
gameLoop();