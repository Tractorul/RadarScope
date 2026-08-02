import logging
import math
import requests
from typing import List, Dict, Any

logger = logging.getLogger("radarscope.opensky")
OPENSKY_URL = "https://opensky-network.org/api/states/all"


def fetch_aircraft_in_range(lat: float, lon: float, radius_km: float = 150.0) -> List[Dict[str, Any]]:


    lat_delta = radius_km / 111.0
    cos_lat = math.cos(math.radians(lat))
    lon_delta = radius_km / (111.0 * cos_lat) if abs(cos_lat) > 0.01 else radius_km / 111.0

    params = {
        "lamin": lat - lat_delta,
        "lamax": lat + lat_delta,
        "lomin": lon - lon_delta,
        "lomax": lon + lon_delta
    }

    try:
        logger.info(f"Interogare OpenSky pentru regiunea: {params}")
        response = requests.get(OPENSKY_URL, params=params, timeout=5)

        if response.status_code == 200:
            data = response.json()
            states = data.get("states")
            if not states:
                return []

            aircraft_list = []
            for s in states:

                if s[5] is not None and s[6] is not None:
                    aircraft_list.append({
                        "icao24": s[0].strip(),
                        "callsign": s[1].strip() if s[1] else "UNK",
                        "lon": float(s[5]),
                        "lat": float(s[6]),
                        "altitude": float(s[7]) if s[7] else 0.0,
                        "velocity": float(s[9]) * 3.6 if s[9] else 0.0,  # Conversie m/s în km/h
                        "heading": float(s[10]) if s[10] else 0.0
                    })
            return aircraft_list
        else:
            logger.error(f"OpenSky API a răspuns cu cod HTTP: {response.status_code}")
            return []
    except Exception as e:
        logger.error(f"Eroare la comunicarea cu OpenSky API: {e}")
        return []