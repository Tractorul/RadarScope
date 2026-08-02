class RadarScope {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.sweepAngle = 0;
        this.sweepSpeed = 0.012; // O idee mai lent pentru un aspect militar autentic
        this.maxRadarRangeKM = 50.0; // NOU: Scalare la 50 KM distanță maximă
        this.aircraftTargets = [];

        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.startAnimationLoop();
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height) - 20;
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = size * dpr;
        this.canvas.height = size * dpr;
        this.canvas.style.width = `${size}px`;
        this.canvas.style.height = `${size}px`;

        this.ctx.scale(dpr, dpr);
        this.displaySize = size;
        this.centerX = size / 2;
        this.centerY = size / 2;
        this.radius = (size / 2) - 25;
    }

    updateAircraftData(newAircraftList) {
        const currentMap = new Map(this.aircraftTargets.map(p => [p.icao24, p]));

        this.aircraftTargets = newAircraftList.map(ac => {
            const old = currentMap.get(ac.icao24);
            // Dacă avionul exista deja, îi păstrăm intensitatea curentă ca să nu clipească la refresh
            return {
                ...ac,
                intensity: old ? old.intensity : 0.45
            };
        });
    }

    startAnimationLoop() {
        const render = () => {
            this.sweepAngle = (this.sweepAngle + this.sweepSpeed) % (2 * Math.PI);
            this.draw();
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.displaySize, this.displaySize);

        // 1. Fundal și Inele Concentrice (Redesenează inelele gridului pentru 50km)
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#020617';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#1e293b';
        ctx.stroke();

        const rings = 4;
        ctx.font = '9px monospace';
        ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
        for (let i = 1; i <= rings; i++) {
            const r = (this.radius / rings) * i;
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, r, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(34, 197, 94, 0.12)';
            ctx.setLineDash([4, 4]);
            ctx.stroke();

            // Afișează distanța pe inele (ex: 12.5km, 25km, 37.5km, 50km)
            const rangeText = `${((this.maxRadarRangeKM / rings) * i).toFixed(1)} km`;
            ctx.fillText(rangeText, this.centerX + 5, this.centerY - r + 12);
        }
        ctx.setLineDash([]);

        // Axe Grid
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.08)';
        ctx.beginPath();
        ctx.moveTo(this.centerX - this.radius, this.centerY); ctx.lineTo(this.centerX + this.radius, this.centerY);
        ctx.moveTo(this.centerX, this.centerY - this.radius); ctx.lineTo(this.centerX, this.centerY + this.radius);
        ctx.stroke();

        // Cardinale
        ctx.fillStyle = 'rgba(34, 197, 94, 0.7)';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('N', this.centerX, this.centerY - this.radius - 12);
        ctx.fillText('S', this.centerX, this.centerY + this.radius + 12);
        ctx.fillText('E', this.centerX + this.radius + 12, this.centerY);
        ctx.fillText('W', this.centerX - this.radius - 12, this.centerY);

        // 2. Randare Avioane cu Date Complete (Viteză, Altitudine)
        this.aircraftTargets.forEach(ac => {
            const targetRadius = (ac.distance / this.maxRadarRangeKM) * this.radius;
            const x = this.centerX + Math.sin(ac.bearing) * targetRadius;
            const y = this.centerY - Math.cos(ac.bearing) * targetRadius;

            let normalizedSweep = (this.sweepAngle - Math.PI / 2);
            normalizedSweep = (normalizedSweep + 2 * Math.PI) % (2 * Math.PI);

            let diff = normalizedSweep - ac.bearing;
            diff = Math.atan2(Math.sin(diff), Math.cos(diff));

            // Când linia trece peste el, strălucește la maxim
            if (diff > 0 && diff < 0.15) {
                ac.intensity = 1.0;
            } else {
                // NOU: Nu mai coboară sub 0.45 -> Rămâne permanent vizibil pe ecran!
                ac.intensity = Math.max(0.45, ac.intensity - 0.002);
            }

            // Desenare Blip Tăiat (Țintă Radar Militară)
            ctx.beginPath();
            ctx.arc(x, y, 4.5, 0, 2 * Math.PI);
            ctx.fillStyle = `rgba(34, 197, 94, ${ac.intensity})`;
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 10 * ac.intensity;
            ctx.fill();
            ctx.shadowBlur = 0;

            // NOU: Caseta Tehnică cu Date (Callsign, Viteza, Altitudine)
            ctx.fillStyle = `rgba(167, 243, 208, ${ac.intensity})`;
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'left';

            // Afișăm datele structurat pe linii text distincte
            ctx.fillText(ac.callsign, x + 10, y - 10);

            ctx.fillStyle = `rgba(148, 163, 184, ${ac.intensity * 0.9})`;
            ctx.font = '9px monospace';
            ctx.fillText(`SPD: ${Math.round(ac.velocity)} km/h`, x + 10, y);
            ctx.fillText(`ALT: ${Math.round(ac.altitude)} m`, x + 10, y + 10);

            // Linie fină indicatoare care leagă blip-ul de textul lui dacă e selectat vizual prin strălucire
            ctx.strokeStyle = `rgba(34, 197, 94, ${ac.intensity * 0.3})`;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + 8, y - 5);
            ctx.stroke();
        });

        // 3. Mătura Radar (Sweep efect phosphor)
        const steps = 60;
        for (let i = 0; i < steps; i++) {
            const alpha = 1 - (i / steps);
            const angle = this.sweepAngle - (i * 0.0025);
            ctx.beginPath();
            ctx.moveTo(this.centerX, this.centerY);
            ctx.lineTo(this.centerX + Math.cos(angle) * this.radius, this.centerY + Math.sin(angle) * this.radius);
            ctx.strokeStyle = `rgba(34, 197, 94, ${alpha * 0.20})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Raza principală ascuțită
        ctx.beginPath();
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.centerX + Math.cos(this.sweepAngle) * this.radius, this.centerY + Math.sin(this.sweepAngle) * this.radius);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2.5;
        ctx.stroke();
    }
}

// Inițializare interfețe
document.addEventListener('DOMContentLoaded', () => {
    const radar = new RadarScope('radar-canvas');
    const geoBtn = document.getElementById('geo-btn');
    const radarMessage = document.getElementById('radar-message');
    const connectionStatus = document.getElementById('connection-status');
    let ws = null;

    if (geoBtn) {
        geoBtn.addEventListener('click', () => {
            radarMessage.textContent = "Se obțin coordonatele GPS precise...";

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;

                    document.getElementById('lat-val').textContent = lat.toFixed(4);
                    document.getElementById('lon-val').textContent = lon.toFixed(4);
                    radarMessage.textContent = "Conectare la serverul de telemetrie...";

                    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                    ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

                    ws.onopen = () => {
                        connectionStatus.textContent = "Online (Filtru Proximitate 50km)";
                        connectionStatus.style.color = "#22c55e";
                        radarMessage.textContent = "Scanare activă la rezoluție înaltă. Monitorizare vectori...";
                        ws.send(JSON.stringify({ lat: lat, lon: lon }));
                    };

                    ws.onmessage = (event) => {
                        const data = JSON.parse(event.data);
                        if (data.aircraft) {
                            radar.updateAircraftData(data.aircraft);
                        }
                    };

                    ws.onerror = () => {
                        radarMessage.textContent = "Eroare de legătură la flux WebSocket.";
                    };

                    ws.onclose = () => {
                        connectionStatus.textContent = "Offline (Deconectat)";
                        connectionStatus.style.color = "#ef4444";
                    };
                },
                (err) => {
                    radarMessage.textContent = "Eroare: Permisiunea de locație a fost respinsă.";
                }
            );
        });
    }
});