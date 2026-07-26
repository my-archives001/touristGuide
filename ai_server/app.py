from flask import Flask, jsonify, request
from flask_cors import CORS
from pydantic import ValidationError
import math
import os
import random

from config import config
from constants import constants
from models import RoutePlanRequest, PathFindRequest
from security import check_flask_rate_limit
from logger import setup_flask_logging, get_logger

app = Flask(__name__)

# Apply observability and logging hooks
setup_flask_logging(app, service_name="python-route-planner")
route_logger = get_logger("python-route-planner")

# Apply rate limiter hook before each request
app.before_request(check_flask_rate_limit)

# CORS — restrict to allowed origins
CORS(app, origins=config.CORS_ORIGINS, supports_credentials=True)

districts_data = {
   "thanjavur": {
        "coords": {
            "Gangaikonda Cholapuram Temple": [11.2100, 79.4395],
            "Thiruvaiyaru Temple": [10.8844, 79.1038],
            "Kallanai Dam": [10.8554, 78.9369],
            "Thirukattupalli Fields": [10.8558, 78.9651],
            "Sivaganga Fort": [10.7879, 79.1392],
            "Schwartz Church Complex": [10.7877, 79.1375],
            "Thanjavur Maratha Palace": [10.7870, 79.1379],
            "Brihadeeswarar Temple": [10.7828, 79.1318],
            "Cauvery River Delta": [10.7801, 79.1505],
            "Airavatesvara Temple": [10.7765, 79.1262]
        }
    },
    "madurai": {
        "coords": {
            "Dindigul Fort": [10.3629, 77.9695],
            "Pazhamudhircholai Murugan Temple": [10.0487, 78.1668],
            "Azhagar Hills": [10.0480, 78.1700],
            "Vandiyur Teppakulam": [9.9262, 78.1446],
            "Koodal Azhagar Temple": [9.9210, 78.1145],
            "Meenakshi Amman Temple": [9.9195, 78.1193],
            "Thirumalai Nayakkar Mahal": [9.9197, 78.1211],
            "Thiruparankundram Murugan Temple": [9.8854, 78.0734],
            "Samanar Hills Caves": [9.8823, 78.0708],
            "Samanar Hills": [9.8820, 78.0705]
        }
    },
    "tiruchirappalli": {
        "coords": {
            "Pachamalai Hills": [11.2667, 78.5833],
            "Samayapuram Mariamman Temple": [10.9361, 78.7442],
            "Mukkombu Dam": [10.9242, 78.6175],
            "Srirangam Ranganathaswamy Temple": [10.8629, 78.6937],
            "Jambukeswarar Temple": [10.8533, 78.6992],
            "Kallanai (Grand Anicut)": [10.8491, 78.8297],
            "Rockfort Ucchi Pillayar Temple": [10.8308, 78.7047],
            "Rock Fort Complex": [10.8307, 78.7046],
            "Old Trichy Fort Walls": [10.8289, 78.6885],
            "Mukkombu Fort Remains": [10.9240, 78.6187],
        }
    },
    "kanchipuram": {
        "coords": {
            "Palar River Valley": [12.8500, 79.7830],
            "Varadaraja Perumal Temple": [12.8378, 79.7058],
            "Kanchipuram Fort Ruins": [12.8370, 79.7045],
            "Ekambareswarar Temple": [12.8356, 79.7036],
            "Kamakshi Amman Temple": [12.8345, 79.7040],
            "Kailasanathar Temple": [12.8341, 79.7032],
            "Thennangur Countryside": [12.5671, 79.5544],
            "Vedanthangal Bird Sanctuary": [12.5252, 79.8360],
            "Vandavasi Fort": [12.5046, 79.6125],
            "Alamparai Fort": [12.2448, 79.7452]
        }
    },
    "tirunelveli": {
        "coords": {
            "Sankaranarayanar Temple": [9.1743, 77.5447],
            "Courtallam Falls": [8.9311, 77.2765],
            "Nellaiappar Temple": [8.7270, 77.6844],
            "Papanasam Dam": [8.7156, 77.3333],
            "Panchalankurichi Fort": [8.7225, 77.7782],
            "Krishnapuram Temple": [8.6978, 77.6667],
            "Cheranmahadevi Fort Remains": [8.6942, 77.5499],
            "Agasthiyar Hills": [8.6282, 77.2825],
            "Thirukurungudi Temple": [8.4158, 77.6331],
            "Udayagiri Fort": [8.3147, 77.3991]
        }
    },
    "chennai": {
        "coords": {
            "Fort St. George": [13.0827, 80.2864],
            "Chepauk Palace": [13.0610, 80.2788],
            "Valluvar Kottam": [13.0579, 80.2434],
            "Parthasarathy Temple": [13.0588, 80.2780],
            "Marina Beach": [13.0499, 80.2824],
            "Kapaleeshwarar Temple": [13.0330, 80.2686],
            "Aadhi Kesava Perumal Temple": [13.0215, 80.2213],
            "Guindy National Park": [13.0038, 80.2207],
            "Elliots Beach": [12.9982, 80.2726],
            "Marundeeswarar Temple": [12.9825, 80.2598]
        }
    }
}

# ---- Utility Function to calculate Haversine distance ---- #
def haversine(coord1, coord2):
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    R = constants.EARTH_RADIUS_KM  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (math.sin(dphi/2)**2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2)
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

# ---- API Routes ---- #

@app.route("/api/districts", methods=["GET"])
def get_districts():
    return jsonify(list(districts_data.keys()))

@app.route("/api/district/<district>", methods=["GET"])
def get_district_data(district):
    district = district.lower()
    if district not in districts_data:
        return jsonify({"error": "District not found"}), 404
    coords = districts_data[district]["coords"]
    nodes = [{"id": name, "lat": lat, "lon": lon} for name, (lat, lon) in coords.items()]
    return jsonify({"coords": coords, "nodes": nodes})

@app.route("/api/plan-route", methods=["POST"])
def plan_route():
    try:
        req_data = RoutePlanRequest.parse_obj(request.get_json() or {})
    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400

    district = req_data.district
    start = req_data.start
    if district not in districts_data:
        return jsonify({"error": "Invalid district"}), 400

    coords = districts_data[district]["coords"]
    names = list(coords.keys())

    if start and start in names:
        pass  # use user start
    else:
        start = random.choice(names)  # fallback

    unvisited = set(names)
    unvisited.remove(start)

    order = [start]
    total_distance = 0
    current = start

    # Nearest neighbor approach
    while unvisited:
        nearest = min(unvisited, key=lambda p: haversine(coords[current], coords[p]))
        total_distance += haversine(coords[current], coords[nearest])
        order.append(nearest)
        unvisited.remove(nearest)
        current = nearest

    return jsonify({
        "order": order,
        "total_distance_km": round(total_distance, 2),
        "start_point": start
    })

@app.route("/api/find-path", methods=["POST"])
def find_path():
    try:
        req_data = PathFindRequest.parse_obj(request.get_json() or {})
    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400

    district = req_data.district
    start = req_data.start
    end = req_data.end

    if district not in districts_data:
        return jsonify({"error": "District not found"}), 404

    coords = districts_data[district]["coords"]
    if start not in coords or end not in coords:
        return jsonify({"error": "Invalid locations"}), 400

    start_coord, end_coord = coords[start], coords[end]

    # Convert to simple x-y (lon-lat) for projection math
    x1, y1 = start_coord[1], start_coord[0]
    x2, y2 = end_coord[1], end_coord[0]

    def perpendicular_distance(px, py):
        num = abs((y2 - y1) * px - (x2 - x1) * py + x2 * y1 - y2 * x1)
        den = math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2)
        return (num / den) * 111  # deg→km approx

    def projection_factor(px, py):
        # projection of vector start→point onto start→end (0=start, 1=end)
        vx, vy = x2 - x1, y2 - y1
        ux, uy = px - x1, py - y1
        denom = vx * vx + vy * vy
        if denom == 0:
            return 0
        return (vx * ux + vy * uy) / denom

    nearby_points = []
    for name, coord in coords.items():
        if name in [start, end]:
            continue
        px, py = coord[1], coord[0]
        dist_from_line = perpendicular_distance(px, py)
        if dist_from_line <= constants.ROUTE_MAX_PERPENDICULAR_DIST_KM:  # within threshold km
            t = projection_factor(px, py)
            nearby_points.append((t, name))

    # ✅ Sort by position along the path line (not radial distance)
    nearby_points.sort(key=lambda x: x[0])

    path = [start] + [p[1] for p in nearby_points if 0 <= p[0] <= 1] + [end]

    # Compute total path distance
    total_distance = sum(
        haversine(coords[path[i]], coords[path[i + 1]]) for i in range(len(path) - 1)
    )

    return jsonify({
        "path": path,
        "path_coords": [coords[p] for p in path],
        "total_distance_km": round(total_distance, 2),
        "estimated_time_minutes": round((total_distance / constants.ROUTE_DEFAULT_SPEED_KMPH) * 60, 1),
        "intermediate_sites": path[1:-1]
    })

@app.route("/", methods=["GET", "HEAD"])
@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "service": "thamizh-thadam-route-planner"})

# ---- Run Server ---- #
if __name__ == "__main__":
    route_logger.info(f"Starting Python Route Planner server on http://{config.FLASK_HOST}:{config.FLASK_PORT}")
    app.run(host=config.FLASK_HOST, port=config.FLASK_PORT, debug=config.FLASK_DEBUG)
