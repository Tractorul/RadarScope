import os
import requests
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="static")


@app.get("/")
async def get_dashboard(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("Conexiune WebSocket client stabilită.")

    # Preluăm credențialele în mod securizat din variabilele de mediu
    username = os.getenv("OPENSKY_USERNAME")
    password = os.getenv("OPENSKY_PASSWORD")

    try:
        while True:
            coords = await websocket.receive_json()
            lat = coords.get("lat")
            lon = coords.get("lon")

            if lat is None or lon is None:
                continue

            lamin, lamax = lat - 0.45, lat + 0.45
            lomin, lomax = lon - 0.63, lon + 0.63

            url = f"https://opensky-network.org/api/states/all?lamin={lamin}&lamax={lamax}&lomin={lomin}&lomax={lomax}"
            logger.info(f"Interogare OpenSky pentru regiunea: lat={lat}, lon={lon}")

            try:
                auth = (username, password) if username and password else None
                response = requests.get(url, auth=auth, timeout=7)

                if response.status_code == 200:
                    data = response.json()
                    states = data.get("states", []) or []

                    planes = []
                    for s in states:
                        if s[5] is not None and s[6] is not None:
                            planes.append({
                                "icao24": s[0],
                                "callsign": s[1].strip() if s[1] else "UNKNOWN",
                                "lon": s[5],
                                "lat": s[6],
                                "altitude": s[7] if s[7] else 0,
                                "velocity": s[9] if s[9] else 0,
                                "heading": s[10] if s[10] else 0
                            })

                    await websocket.send_json({"planes": planes})
                else:
                    logger.error(f"Eroare API OpenSky (Status {response.status_code})")
                    await websocket.send_json({"planes": []})

            except Exception as api_err:
                logger.error(f"Eroare la comunicarea cu OpenSky API: {api_err}")
                await websocket.send_json({"planes": []})

    except WebSocketDisconnect:
        logger.info("Clientul a închis conexiunea WebSocket.")