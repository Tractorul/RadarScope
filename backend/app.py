import logging
import asyncio
from pathlib import Path

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.concurrency import run_in_threadpool

from backend.opensky import fetch_aircraft_in_range
from backend.radar_math import calculate_distance_and_bearing

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("radarscope")

BACKEND_DIR = Path(__file__).resolve().parent
BASE_DIR = BACKEND_DIR.parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BACKEND_DIR / "templates"

app = FastAPI(title="RadarScope", version="1.0.0")
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))


@app.get("/", response_class=HTMLResponse)
async def index(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request=request, name="index.html",
                                      context={"request": request, "title": "RadarScope | Live"})


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("Conexiune WebSocket client stabilită.")

    try:
        initial_data = await websocket.receive_json()
        user_lat = float(initial_data["lat"])
        user_lon = float(initial_data["lon"])

        # MODIFICARE: Reducem raza de scanare la 50.0 km pentru avioane foarte apropiate
        max_radius = 50.0

        logger.info(f"Radar inițializat la rază scurtă (50km): LAT={user_lat}, LON={user_lon}")

        while True:
            raw_aircraft = await run_in_threadpool(fetch_aircraft_in_range, user_lat, user_lon, max_radius)

            processed_aircraft = []
            for ac in raw_aircraft:
                dist, brg = calculate_distance_and_bearing(user_lat, user_lon, ac["lat"], ac["lon"])

                if dist <= max_radius:
                    processed_aircraft.append({
                        "icao24": ac["icao24"],
                        "callsign": ac["callsign"],
                        "distance": dist,
                        "bearing": brg,
                        "altitude": ac["altitude"],  # în metri
                        "velocity": ac["velocity"],  # în km/h
                        "heading": ac["heading"]
                    })

            await websocket.send_json({"aircraft": processed_aircraft})
            await asyncio.sleep(10)

    except WebSocketDisconnect:
        logger.info("Clientul a închis conexiunea WebSocket.")
    except Exception as e:
        logger.error(f"Excepție în bucla WebSocket: {e}")