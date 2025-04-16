// Navigation and HUD functions

import { camera, radarCanvas, radarCtx } from './canvas.js';
import { spaceship } from './spaceship.js';
import { allPlanets, starSystems } from './universe.js';
import { calculateBearing, radToDeg, degToCompass } from './utils.js';

// DOM elements
const planetData = document.getElementById("planet-data");
const speedIndicator = document.getElementById("current-speed");
const headingIndicator = document.getElementById("current-heading");
const thrusterIndicator = document.getElementById("thruster-indicator");
const locationIndicator = document.getElementById("current-location");
const systemIndicator = document.getElementById("current-system");

// Update HUD with ship and navigation data
function updateHUD() {
    // Update ship control indicators
    const currentSpeed = Math.sqrt(
        spaceship.velocityX * spaceship.velocityX +
            spaceship.velocityY * spaceship.velocityY
    );
    speedIndicator.textContent = currentSpeed.toFixed(2);

    // Calculate heading in degrees (0-360)
    const headingDeg = ((radToDeg(spaceship.rotationAngle) % 360) + 360) % 360;
    headingIndicator.textContent = `${Math.round(headingDeg)}° ${degToCompass(headingDeg)}`;

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
        const remainingBoost = 1 - (Date.now() - spaceship.boostStartTime) / spaceship.boostDuration;
        boostFill.style.width = `${remainingBoost * 100}%`;
        boostFill.classList.add("boost-active");
    } else {
        // Boost is available
        boostFill.style.width = "100%";
        boostFill.classList.remove("boost-active");
    }

    // Update location
    locationIndicator.textContent = `X:${Math.round(spaceship.x)} Y:${Math.round(spaceship.y)}`;

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
                const normalizedShipAngle = ((radarAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
                const normalizedPlanetAngle = ((planetAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

                let angleDifference = Math.abs(normalizedShipAngle - normalizedPlanetAngle);
                if (angleDifference > Math.PI) {
                    angleDifference = 2 * Math.PI - angleDifference;
                }

                const brightness = Math.max(0.2, 1 - angleDifference / 0.5);

                // Draw star blip
                radarCtx.fillStyle = `rgba(${parseInt(obj.color.slice(1, 3), 16)}, 
                                          ${parseInt(obj.color.slice(3, 5), 16)}, 
                                          ${parseInt(obj.color.slice(5, 7), 16)}, 
                                          ${brightness})`;
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
            const screenX = camera.width / 2 + dx;
            const screenY = camera.height / 2 + dy;
            
            // Check if the system is off-screen
            if (screenX < 0 || screenX > camera.width || 
                screenY < 0 || screenY > camera.height) {
                
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
                const halfWidth = camera.width / 2;
                const halfHeight = camera.height / 2;
                
                // Check intersection with each screen edge
                if (Math.abs(Math.tan(angle)) > halfHeight / halfWidth) {
                    // Will intersect with top/bottom
                    const ySign = Math.sign(dy);
                    indicatorY = ySign > 0 ? camera.height - screenPadding : screenPadding;
                    indicatorX = halfWidth + (indicatorY - halfHeight) / Math.tan(angle);
                } else {
                    // Will intersect with left/right
                    const xSign = Math.sign(dx);
                    indicatorX = xSign > 0 ? camera.width - screenPadding : screenPadding;
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
            const bearing = calculateBearing(spaceship.x, spaceship.y, system.x, system.y);

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
                        const planetX = currentSystem.x +
                            Math.cos(planet.orbitAngle) * planet.orbitRadius;
                        const planetY = currentSystem.y +
                            Math.sin(planet.orbitAngle) * planet.orbitRadius;

                        const dx = planetX - spaceship.x;
                        const dy = planetY - spaceship.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const bearing = calculateBearing(spaceship.x, spaceship.y, planetX, planetY);

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

export {
    updateHUD,
    updateRadar,
    updateDirectionIndicators,
    updatePlanetList
};