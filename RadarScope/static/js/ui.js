// UI Module: Handles DOM updates and user interactions not covered by other modules

class UIManager {
    constructor() {
        this.uiElements = {};
        this.initializeElements();
    }

    /**
     * Initialize references to UI elements
     */
    initializeElements() {
        this.uiElements = {
            rangeSelect: document.getElementById('range-select'),
            labelsToggle: document.getElementById('labels-toggle'),
            sweepToggle: document.getElementById('sweep-toggle'),
            pauseToggle: document.getElementById('pause-toggle'),
            pauseBtn: document.getElementById('pause-btn'),
            trackCount: document.getElementById('track-count'),
            fpsCounter: document.getElementById('fps-counter'),
            utcTime: document.getElementById('utc-time'),
            userPosition: document.getElementById('user-position'),
            statusIndicator: document.getElementById('status-indicator'),
            aircraftInfoPanel: document.getElementById('aircraft-info-panel'),
            closeInfoPanel: document.getElementById('close-info-panel'),
            infoIcao24: document.getElementById('info-icao24'),
            infoCallsign: document.getElementById('info-callsign'),
            infoLatitude: document.getElementById('info-latitude'),
            infoLongitude: document.getElementById('info-longitude'),
            infoAltitude: document.getElementById('info-altitude'),
            infoVelocity: document.getElementById('info-velocity'),
            infoHeading: document.getElementById('info-heading'),
            infoUpdated: document.getElementById('info-updated'),
            locateBtn: document.getElementById('locate-btn'),
            latInput: document.getElementById('lat-input'),
            lonInput: document.getElementById('lon-input'),
            manualLocation: document.getElementById('manual-location')
        };
    }

    /**
     * Initialize UI event listeners
     */
    init() {
        // Range selection
        if (this.uiElements.rangeSelect) {
            this.uiElements.rangeSelect.addEventListener('change', (e) => {
                const rangeValue = e.target.value;
                // Convert the option value to nautical miles for radar scaling
                // The values in the HTML are already in nautical miles for the radar radius
                const rangeNm = parseFloat(rangeValue);
                // Notify WebSocket manager or radar system of range change
                window.dispatchEvent(new CustomEvent('radar:rangechange', { detail: { rangeNm } }));
            });
        }

        // Labels toggle
        if (this.uiElements.labelsToggle) {
            this.uiElements.labelsToggle.addEventListener('change', (e) => {
                window.dispatchEvent(new CustomEvent('radar:labelstoggle', { detail: { show: e.target.checked } }));
            });
        }

        // Sweep toggle
        if (this.uiElements.sweepToggle) {
            this.uiElements.sweepToggle.addEventListener('change', (e) => {
                window.dispatchEvent(new CustomEvent('radar:sweeptoggle', { detail: { enabled: e.target.checked } }));
            });
        }

        // Pause toggle
        if (this.uiElements.pauseToggle) {
            this.uiElements.pauseToggle.addEventListener('change', (e) => {
                window.dispatchEvent(new CustomEvent('radar:pausetoggle', { detail: { paused: e.target.checked } }));
            });
        }

        // Pause button (alternative)
        if (this.uiElements.pauseBtn) {
            this.uiElements.pauseBtn.addEventListener('click', () => {
                const isPaused = this.uiElements.pauseBtn.textContent === 'Pause';
                this.uiElements.pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
                window.dispatchEvent(new CustomEvent('radar:pausetoggle', { detail: { paused: !isPaused } }));
            });
        }

        // Close info panel
        if (this.uiElements.closeInfoPanel) {
            this.uiElements.closeInfoPanel.addEventListener('click', () => {
                this.hideAircraftInfo();
            });
        }

        // Locate button (manual location entry)
        if (this.uiElements.locateBtn) {
            this.uiElements.locateBtn.addEventListener('click', () => {
                this.handleManualLocation();
            });
        }

        // Set up event listeners for custom events
        this.setupEventListeners();
    }

    /**
     * Set up custom event listeners
     */
    setupEventListeners() {
        // Handle aircraft click to show info
        window.addEventListener('aircraft:click', (e) => {
            this.showAircraftInfo(e.detail.aircraft);
        });

        // Handle range change
        window.addEventListener('radar:rangechange', (e) => {
            this.updateRangeDisplay(e.detail.rangeNm);
        });

        // Handle labels toggle
        window.addEventListener('radar:labelstoggle', (e) => {
            this.uiElements.labelsToggle.checked = e.detail.show;
        });

        // Handle sweep toggle
        window.addEventListener('radar:sweeptoggle', (e) => {
            this.uiElements.sweepToggle.checked = e.detail.enabled;
            this.updateSweepAnimation(e.detail.enabled);
        });

        // Handle pause toggle
        window.addEventListener('radar:pausetoggle', (e) => {
            this.uiElements.pauseToggle.checked = e.detail.paused;
            this.uiElements.pauseBtn.textContent = e.detail.paused ? 'Resume' : 'Pause';
        });
    }

    /**
     * Update range display in UI
     * @param {number} rangeNm - Range in nautical miles
     */
    updateRangeDisplay(rangeNm) {
        // Update the range label in the UI
        // Assuming we have a display for current range
        const rangeDisplay = document.getElementById('current-range');
        if (rangeDisplay) {
            rangeDisplay.textContent = `${rangeNm} NM`;
        }
        // Also update the large range label on the radar
        const maxRangeLabel = document.querySelector('.range-label.max');
        if (maxRangeLabel) {
            maxRangeLabel.textContent = `${rangeNm} NM`;
        }
    }

    /**
     * Update sweep animation based on enabled state
     * @param {boolean} enabled - Whether sweep should be animated
     */
    updateSweepAnimation(enabled) {
        const sweepLine = document.querySelector('.sweep-line');
        const sweepGlow = document.querySelector('.sweep-glow');
        if (sweepLine && sweepGlow) {
            if (enabled) {
                sweepLine.style.animationPlayState = 'running';
                sweepGlow.style.animationPlayState = 'running';
            } else {
                sweepLine.style.animationPlayState = 'paused';
                sweepGlow.style.animationPlayState = 'paused';
            }
        }
    }

    /**
     * Update aircraft count display
     * @param {number} count - Number of aircraft
     */
    updateAircraftCount(count) {
        if (this.uiElements.trackCount) {
            this.uiElements.trackCount.textContent = count;
        }
    }

    /**
     * Update FPS counter
     * @param {number} fps - Frames per second
     */
    updateFPS(fps) {
        if (this.uiElements.fpsCounter) {
            this.uiElements.fpsCounter.textContent = `${fps} FPS`;
        }
    }

    /**
     * Update UTC time display
     * @param {string} timeString - Time string to display
     */
    updateUTCTime(timeString) {
        if (this.uiElements.utcTime) {
            this.uiElements.utcTime.textContent = timeString;
        }
    }

    /**
     * Update user position display
     * @param {number} latitude - Latitude in degrees
     * @param {number} longitude - Longitude in degrees
     */
    updateUserPosition(latitude, longitude) {
        if (this.uiElements.userPosition) {
            this.uiElements.userPosition.textContent = `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;
        }
    }

    /**
     * Update connection status indicator
     * @param {string} status - 'ok', 'warning', 'error'
     */
    updateConnectionStatus(status) {
        if (this.uiElements.statusIndicator) {
            this.uiElements.statusIndicator.setAttribute('status', status);
        }
    }

    /**
     * Show aircraft information panel
     * @param {Aircraft} aircraft - Aircraft object to display info for
     */
    showAircraftInfo(aircraft) {
        const info = aircraft.getInfo();
        this.uiElements.infoIcao24.textContent = info.icao24;
        this.uiElements.infoCallsign.textContent = info.callsign;
        this.uiElements.infoLatitude.textContent = info.latitude;
        this.uiElements.infoLongitude.textContent = info.longitude;
        this.uiElements.infoAltitude.textContent = info.altitude;
        this.uiElements.infoVelocity.textContent = info.velocity;
        this.uiElements.infoHeading.textContent = info.heading;
        this.uiElements.infoUpdated.textContent = info.updated;

        this.uiElements.aircraftInfoPanel.classList.remove('hidden');
    }

    /**
     * Hide aircraft information panel
     */
    hideAircraftInfo() {
        this.uiElements.aircraftInfoPanel.classList.add('hidden');
    }

    /**
     * Handle manual location entry
     */
    handleManualLocation() {
        const lat = parseFloat(this.uiElements.latInput.value);
        const lon = parseFloat(this.uiElements.lonInput.value);
        if (!isNaN(lat) && !isNaN(lon)) {
            // Validate latitude and longitude ranges
            if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
                // In a real app, send this to the backend to set the radar center
                // For now, just update the UI and hide the manual input
                this.updateUserPosition(lat, lon);
                this.uiElements.manualLocation.style.display = 'none';
                // Notify the system that the user location has been set manually
                window.dispatchEvent(new CustomEvent('user:location-set', { detail: { latitude: lat, longitude: lon } }));
            } else {
                alert('Please enter valid latitude (-90 to 90) and longitude (-180 to 180)');
            }
        } else {
            alert('Please enter valid numbers for latitude and longitude');
        }
    }

    /**
     * Show manual location input when geolocation is denied or unavailable
     */
    showManualLocationInput() {
        if (this.uiElements.manualLocation) {
            this.uiElements.manualLocation.style.display = 'block';
        }
    }

    /**
     * Hide manual location input
     */
    hideManualLocationInput() {
        if (this.uiElements.manualLocation) {
            this.uiElements.manualLocation.style.display = 'none';
        }
    }
}

// Export for use in other modules
window.UIManager = UIManager;