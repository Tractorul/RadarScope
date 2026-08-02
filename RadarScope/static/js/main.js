// Main application entry point

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize managers
    const wsManager = new WebSocketManager();
    const uiManager = new UIManager();
    const animationManager = new AnimationManager();
    const aircraftMap = new Map(); // icao24 -> Aircraft instance

    // Radar configuration
    let radarConfig = {
        centerX: window.innerWidth / 2,
        centerY: window.innerHeight / 2,
        radarRadiusPx: Math.min(window.innerWidth, window.innerHeight) / 2 - 50,
        radarRadiusNm: 80, // Default range in nautical miles
        showLabels: true,
        sweepEnabled: true,
        paused: false
    };

    // Update radar config when window resizes
    window.addEventListener('resize', () => {
        radarConfig.centerX = window.innerWidth / 2;
        radarConfig.centerY = window.innerHeight / 2;
        radarConfig.radarRadiusPx = Math.min(window.innerWidth, window.innerHeight) / 2 - 50;
    });

    // Initialize UI event listeners
    uiManager.init();

    // Connect to WebSocket
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${wsProtocol}://${window.location.host}/ws`;
    wsManager.connect(wsUrl);

    // Handle WebSocket messages
    window.addEventListener('message', (event) => {
        if (event.data.type === 'aircraft_update') {
            handleAircraftUpdate(event.data.data);
            uiManager.updateAircraftCount(event.data.data.length);
        }
        // ... other message types if needed
    });

    // Handle custom events from UI
    window.addEventListener('radar:rangechange', (e) => {
        radarConfig.radarRadiusNm = e.detail.rangeNm;
    });

    window.addEventListener('radar:labelstoggle', (e) => {
        radarConfig.showLabels = e.detail.show;
    });

    window.addEventListener('radar:sweeptoggle', (e) => {
        radarConfig.sweepEnabled = e.detail.enabled;
        // Update sweep animation via UI manager
        uiManager.updateSweepAnimation(e.detail.enabled);
    });

    window.addEventListener('radar:pausetoggle', (e) => {
        radarConfig.paused = e.detail.paused;
    });

    // Handle user location set (via geolocation or manual entry)
    window.addEventListener('user:location-set', (e) => {
        // In a real app, we would send this to the backend to set as center point
        // For now, we'll just update the UI
        uiManager.updateUserPosition(e.detail.latitude, e.detail.longitude);
    });

    // For simulation/testing without geolocation, we can set a default location
    // In a real app, we would use navigator.geolocation
    // For demo purposes, let's use a default location
    function setDefaultLocation() {
        const defaultLat = 39.7392; // Example: Denver
        const defaultLon = -104.9903;
        radarConfig.centerLat = defaultLat;
        radarConfig.centerLon = defaultLon;
        uiManager.updateUserPosition(defaultLat, defaultLon);
        // Notify that location is set
        window.dispatchEvent(new CustomEvent('user:location-set', { detail: { latitude: defaultLat, longitude: defaultLon } }));
    }

    // Set default location (in a real app, we'd use geolocation and fallback to this)
    setDefaultLocation();

    // Handle aircraft updates
    function handleAircraftUpdate(aircraftDataList) {
        if (radarConfig.paused) return; // Skip updates if paused

        // Update existing aircraft or create new ones
        aircraftDataList.forEach(data => {
            const icao24 = data.icao24;
            let aircraft = aircraftMap.get(icao24);
            if (!aircraft) {
                aircraft = new Aircraft(data);
                aircraftMap.set(icao24, aircraft);
                // Create DOM elements for this aircraft
                const radarDisplay = document.getElementById('radar-display');
                aircraft.createElements(radarDisplay);
            } else {
                aircraft.update(data);
            }
        });

        // Remove aircraft that are no longer in the update (optional, for fade out)
        // For simplicity, we'll keep them and let them fade out naturally
        // In a more complete implementation, we would mark missing aircraft as lost
    }

    // Animation loop for updating aircraft positions and rendering
    function updateRadar(timestamp, deltaTime) {
        // Update interpolation for all aircraft
        aircraftMap.forEach(aircraft => {
            if (!radarConfig.paused) {
                aircraft.updateInterpolation(deltaTime, 5.0); // 5.0 is interpolation speed
            }
            // Update display
            aircraft.updateDisplay(radarConfig);
        });

        // Handle fading out of aircraft that haven't been updated recently
        aircraftMap.forEach((aircraft, icao24) => {
            // If aircraft hasn't been updated for more than 5 seconds, start fading
            const timeSinceUpdate = (Date.now() - aircraft.last_update.getTime()) / 1000;
            if (timeSinceUpdate > 5 && aircraft.alpha > 0) {
                aircraft.lost(); // This will start the fade out
                // Update alpha based on time since last update
                aircraft.alpha = Math.max(0, 1 - ((timeSinceUpdate - 5) * 0.2)); // Fade over 5 seconds after the initial 5
            }
        });
    }

    // FPS counting the screen updates for FPS
    let frameCount = 0;
    let lastFpsTime = performance.now();

    function calculateFPS(timestamp) {
        frameCount++;
        if (timestamp - lastFpsTime >= 1000) {
            const fps = Math.round((frameCount * 1000) / (timestamp - lastFpsTime));
            uiManager.updateFPS(fps);
            frameCount = 0;
            lastFpsTime = timestamp;
        }
    }

    // Add animation callbacks
    animationManager.addCallback(updateRadar);
    animationManager.addCallback(calculateFPS);

    // Start animation loop
    animationManager.start();

    // Update UTC time every second
    setInterval(() => {
        const now = new Date();
        const utcString = now.toUTCString().split(' ')[4]; // Extract HH:MM:SS
        uiManager.updateUTCTime(utcString);
    }, 1000);

    // Initial range display update
    uiManager.updateRangeDisplay(radarConfig.radarRadiusNm);
});

// Expose managers globally for debugging
window.wa = window.wa || {};
window.wa.wsManager = wsManager;
window.wa.uiManager = uiManager;
window.wa.animationManager = animationManager;