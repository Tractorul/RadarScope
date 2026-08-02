# RadarScope - Real-time Aircraft Radar Display

A military-style radar display that shows aircraft around your current location using data from the OpenSky Network.

## Features

- Real-time aircraft tracking using OpenSky Network API
- Military-style radar interface with rotating sweep
- Aircraft labeled with callsign, altitude, speed, and heading
- Interactive controls for range, labels, sweep, and pause
- Manual location entry when geolocation is denied
- FPS counter and aircraft count display
- UTC time and user coordinates display
- Aircraft information panel on click
- Smooth aircraft movement with interpolation
- Fade-out effect for lost aircraft
- Responsive design

## Technology Stack

- **Backend**: Python 3.12, FastAPI
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (no frameworks)
- **Communication**: WebSockets for real-time updates
- **Data Source**: OpenSky Network API
- **Styling**: Pure CSS with military radar aesthetic

## Installation

### Prerequisites

- Python 3.12 or higher
- pip (Python package installer)

### Setup

1. Clone the repository or download the source code
2. Navigate to the project directory:
   ```
   cd RadarScope
   ```
3. Create a virtual environment:
   ```
   python -m venv venv
   ```
4. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`
5. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

### Dependencies

See `requirements.txt` for exact versions:
- fastapi==0.104.1
- uvicorn==0.24.0
- opensky-api==0.1.5
- python-socketio==5.9.0

## Running the Application

1. Ensure your virtual environment is activated
2. Start the server:
   ```
   python app.py
   ```
3. Open your web browser and navigate to:
   ```
   http://localhost:8000
   ```

### First Run

When you first visit the site, your browser will ask for permission to access your location. Allow this for the radar to center on your current position.

If you deny location access or if geolocation is unavailable, you can manually enter your latitude and longitude using the manual input controls.

## Usage

### Controls

- **Range Selector**: Change the radar range (25km, 50km, 100km, 150km, 250km)
- **Labels Toggle**: Show/hide aircraft callsign labels
- **Sweep Toggle**: Start/stop the rotating radar sweep
- **Pause Button**: Pause/resume live updates (aircraft positions will freeze)
- **Manual Location**: Enter latitude/longitude if geolocation is denied

### Aircraft Interaction

- Click on any aircraft target to open an information panel showing:
  - ICAO24 address
  - Callsign
  - Latitude/Longitude
  - Altitude
  - Velocity
  - Heading
  - Last update time

### Display Elements

- **Top Left**: Range, labels, and sweep controls
- **Bottom Left**: Statistics including aircraft count, FPS, UTC time, and your coordinates
- **Top Right**: Connection status indicator (green = connected, yellow = disconnected)
- **Center**: Radar display with rotating sweep and aircraft targets
- **Clicking an Aircraft**: Opens detailed information panel

## How It Works

1. The frontend requests your geolocation via the browser
2. Your coordinates are sent to the backend via WebSocket
3. The backend periodically queries the OpenSky Network API for aircraft in your area
4. Aircraft data is sent to all connected clients via WebSocket
5. The frontend renders aircraft on the radar display using polar coordinates
6. Aircraft positions are interpolated between updates for smooth movement
7. The radar sweep rotates continuously to mimic a real radar display

## Customization

### Changing the Default Location

If you want to set a default location other than using geolocation, edit the `setDefaultLocation()` function in `static/js/main.js`.

### Adjusting Update Frequency

The backend updates aircraft data every 5 seconds (adjustable in `app.py`). The frontend renders at 60fps using interpolation.

### Changing Radar Appearance

Modify the CSS variables in `static/css/style.css` to change colors, sizes, and other visual aspects.

## API Endpoints

- **GET /** - Serves the main radar page
- **WebSocket /ws** - Real-time aircraft updates and location updates

### WebSocket Messages

**Client to Server:**
- `{ "type": "location_update", "latitude": number, "longitude": number }`
- `{ "type": "ui_command", ... }` (for UI interactions)

**Server to Client:**
- `{ "type": "aircraft_update", "data": [aircraft objects], "timestamp": string }`
- `{ "type": "error", "message": string, "timestamp": string }`

## Troubleshooting

### No Aircraft Showing

1. Check the connection status indicator (top-right)
2. Verify you have granted location permission or entered coordinates manually
3. Try increasing the range to see if aircraft are outside your current range
4. Check browser console for errors

### Performance Issues

- Reduce the radar range to decrease the number of aircraft displayed
- Disable aircraft labels if experiencing lag
- Ensure you're using a modern browser with good JavaScript performance

## Development

To modify the application:

1. Backend logic is in `app.py` and supporting modules in the root directory
2. Frontend logic is in `static/js/`:
   - `radar_math.js`: Coordinate conversion and math utilities
   - `aircraft.js`: Aircraft model and rendering
   - `websocket.js`: WebSocket communication handling
   - `ui.js`: User interface controls and updates
   - `animations.js`: Animation loop and requestAnimationFrame management
   - `main.js`: Application entry point and coordination
3. Styling is in `static/css/style.css`
4. HTML structure is in `templates/index.html`

## License

This project is open source and available under the MIT License.

## Acknowledgments

- [OpenSky Network](https://opensky-network.org/) for providing real-time aircraft data
- Inspired by traditional radar displays and air traffic control systems