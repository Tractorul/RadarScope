// WebSocket communication handler

class WebSocketManager {
    constructor() {
        this.socket = null;
        this.reconnectInterval = 3000; // 3 seconds
        this.reconnectTimeout = null;
        this.isConnected = false;
        this.messageHandlers = new Map();
        this.aircraftMap = new Map(); // icao24 -> Aircraft object
        this.aircraftContainer = null;
        this.radarParams = {
            centerX: 0,
            centerY: 0,
            radarRadiusPx: 0,
            radarRadiusNm: 0,
            showLabels: true
        };
        this.updateInterval = null;
        this.fpsCounter = {
            frames: 0,
            lastTime: performance.now(),
            fps: 0
        };
        this.stats = {
            aircraftCount: 0,
            updateLatency: 0
        };
    }

    /**
     * Initialize WebSocket connection
     * @param {string} url - WebSocket URL
     */
    connect(url) {
        this.disconnect(); // Clean up any existing connection

        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            this.isConnected = true;
            this.updateStatus(true);
            console.log('WebSocket connected');
            // Start update loop
            this.startUpdateLoop();
        };

        this.socket.onmessage = (event) => {
            this.handleMessage(event.data);
        };

        this.socket.onclose = () => {
            this.isConnected = false;
            this.updateStatus(false);
            console.log('WebSocket disconnected');
            // Attempt to reconnect
            this.scheduleReconnect();
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.isConnected = false;
            this.updateStatus(false);
        };
    }

    /**
     * Disconnect WebSocket
     */
    disconnect() {
        if this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.isConnected = false;
        this.updateStatus(false);
        this.stopUpdateLoop();
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    /**
     * Schedule reconnection attempt
     */
    scheduleReconnect() {
        if (this.reconnectTimeout) return;
        this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            if (!this.isConnected) {
                console.log('Attempting to reconnect...');
                this.connect(this.socket ? this.socket.url : '');
            }
        }, this.reconnectInterval);
    }

    /**
     * Update connection status indicator
     * @param {boolean} connected - Connection status
     */
    updateStatus(connected) {
        const statusIndicator = document.getElementById('status-indicator');
        if (statusIndicator) {
            statusIndicator.setAttribute('status', connected ? 'ok' : 'warning');
        }
    }

    /**
     * Register a message handler for a specific message type
     * @param {string} type - Message type
     * @param {function} callback - Callback function
     */
    onMessage(type, callback) {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, []);
        }
        this.messageHandlers.get(type).push(callback);
    }

    /**
     * Handle incoming WebSocket message
     * @param {string} data - Message data
     */
    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            const handlers = this.messageHandlers.get(message.type);
            if (handlers) {
                handlers.forEach(handler => handler(message));
            }
        } catch (e) {
            console.error('Error parsing WebSocket message:', e, data);
        }
    }

    /**
     * Set the aircraft container element
     * @param {HTMLElement} container - Container for aircraft elements
     */
    setAircraftContainer(container) {
        this.aircraftContainer = container;
    }

    /**
     * Update radar parameters for positioning
     * @param {Object} params - Radar parameters
     */
    setRadarParams(params) {
        this.radarParams = { ...this.radarParams, ...params };
    }

    /**
     * Start the update loop for animations and FPS counting
     */
    startUpdateLoop() {
        this.stopUpdateLoop(); // Ensure no duplicate
        this.updateInterval = setInterval(() => this.update(), 1000 / 60); // 60 FPS
    }

    /**
     * Stop the update loop
     */
    stopUpdateLoop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Update loop: handle interpolation, FPS, etc.
     */
    update() {
        const now = performance.now();
        const deltaTime = (now - this.fpsCounter.lastTime) / 1000; // in seconds

        // Update FPS counter
        this.fpsCounter.frames++;
        if (now - this.fpsCounter.lastTime >= 1000) {
            this.fpsCounter.fps = this.fpsCounter.frames;
            this.fpsCounter.frames = 0;
            this.fpsCounter.lastTime = now;
            this.updateFPSDisplay();
        }

        // Update aircraft positions (interpolation)
        if (this.aircraftContainer) {
            this.aircraftMap.forEach(aircraft => {
                aircraft.updateInterpolation(deltaTime, 5.0); // 5.0 is interpolation speed
                aircraft.updateDisplay(this.radarParams);
            });
        }

        // Update stats display
        this.updateStatsDisplay();
    }

    /**
     * Update FPS display
     */
    updateFPSDisplay() {
        const fpsElement = document.getElementById('fps-counter');
        if (fpsElement) {
            fpsElement.textContent = `FPS: ${this.fpsCounter.fps}`;
        }
    }

    /**
     * Update stats display
     */
    updateStatsDisplay() {
        const statsElement = document.getElementById('aircraft-count');
        if (statsElement) {
            statsElement.textContent = `Aircraft: ${this.aircraftMap.size}`;
        }
        // Update UTC time
        const utcTimeElement = document.getElementById('utc-time');
        if (utcTimeElement) {
            utcTimeElement.textContent = new Date().toUTCString().split(' ')[4];
        }
        // Update user coordinates (if available)
        // This would be updated from geolocation or manual input
    }

    /**
     * Handle aircraft update message
     * @param {Object} message - WebSocket message
     */
    handleAircraftUpdate(message) {
        const startTime = performance.now();
        const aircraftData = message.data || [];

        // Update each aircraft
        aircraftData.forEach(data => {
            const icao24 = data.icao24;
            let aircraft = this.aircraftMap.get(icao24);
            if (!aircraft) {
                // New aircraft
                aircraft = new Aircraft(data);
                if (this.aircraftContainer) {
                    aircraft.createElements(this.aircraftContainer);
                }
                this.aircraftMap.set(icao24, aircraft);
            } else {
                // Existing aircraft
                aircraft.update(data);
            }
        });

        // Remove aircraft that are no longer in the update (they will fade out)
        // We'll mark them as lost in the next update cycle if they don't appear
        // For simplicity, we'll just let them fade out via the update loop
        // In a more sophisticated system, we'd send a "remove" message

        // Update stats
        this.stats.aircraftCount = aircraftData.length;
        this.stats.updateLatency = performance.now() - startTime;
    }

    /**
     * Initialize the WebSocket manager
     * @param {Object} options - Configuration options
     */
    init(options = {}) {
        // Set up message handlers
        this.onMessage('aircraft_update', (msg) => this.handleAircraftUpdate(msg));

        // Connect to WebSocket
        const wsUrl = options.url || `ws://${window.location.host}/ws`;
        this.connect(wsUrl);

        // Set up UI event listeners
        this.setupUIListeners();
    }

    /**
     * Set up UI event listeners for controls
     */
    setupUIListeners() {
        // Zoom control
        const zoomSelect = document.getElementById('zoom-select');
        if (zoomSelect) {
            zoomSelect.addEventListener('change', (e) => {
                const rangeNm = parseFloat(e.target.value);
                this.setRadarParams({ radarRadiusNm: rangeNm });
                // Update range labels (would need to update the UI elements)
                this.updateRangeLabels(rangeNm);
            });
        }

        // Labels toggle
        const labelsToggle = document.getElementById('labels-toggle');
        if (labelsToggle) {
            labelsToggle.addEventListener('change', (e) => {
                this.setRadarParams({ showLabels: e.target.checked });
            });
        }

        // Sweep toggle
        const sweepToggle = document.getElementById('sweep-toggle');
        if (sweepToggle) {
            sweepToggle.addEventListener('change', (e) => {
                const sweepLine = document.querySelector('.sweep-line');
                const sweepGlow = document.querySelector('.sweep-glow');
                if (sweepLine && sweepGlow) {
                    if (e.target.checked) {
                        sweepLine.style.animationPlayState = 'running';
                        sweepGlow.style.animationPlayState = 'running';
                    } else {
                        sweepLine.style.animationPlayState = 'paused';
                        sweepGlow.style.animationPlayState = 'paused';
                    }
                }
            });
        }

        // Pause/resume button
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                if (this.updateInterval) {
                    this.stopUpdateLoop();
                    pauseBtn.textContent = 'Resume';
                } else {
                    this.startUpdateLoop();
                    pauseBtn.textContent = 'Pause';
                }
            });
        }

        // Manual location input (if geolocation denied)
        const locateBtn = document.getElementById('locate-btn');
        if (locateBtn) {
            locateBtn.addEventListener('click', () => {
                const latInput = document.getElementById('lat-input');
                const lonInput = document.getElementById('lon-input');
                if (latInput && lonInput) {
                    const lat = parseFloat(latInput.value);
                    const lon = parseFloat(lonInput.value);
                    if (!isNaN(lat) && !isNaN(lon)) {
                        // In a real app, we would send this to the backend to update the center point
                        // For now, we'll just update the UI
                        document.getElementById('user-lat').textContent = lat.toFixed(4);
                        document.getElementById('user-lon').textContent = lon.toFixed(4);
                        // Hide manual input
                        document.getElementById('manual-location').style.display = 'none';
                    }
                }
            });
        }
    }

    /**
     * Update range labels on the radar display
     * @param {number} rangeNm - Current range in nautical miles
     */
    updateRangeLabels(rangeNm) {
        // Update the range labels in the UI
        const rangeLabels = document.querySelectorAll('.range-label');
        rangeLabels.forEach((label, index) => {
            // We would need to know the actual ranges of the rings
            // For simplicity, we'll just update the largest ring label
            if (index === rangeLabels.length - 1) {
                label.textContent = `${rangeNm} NM`;
            }
        });
    }
}

// Export for use in other modules
window.WebSocketManager = WebSocketManager;