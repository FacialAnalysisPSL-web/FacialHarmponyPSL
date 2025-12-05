// =============================
// VARIABLES GLOBALES
// =============================
let image = document.getElementById("uploadedImage");
let canvas = document.getElementById("pointsCanvas");
let ctx = canvas.getContext("2d");
let points = [];
let pointIndex = 0;

const pointNames = [
    "Pupila izquierda",
    "Pupila derecha",
    "Borde interno ojo izquierdo",
    "Borde externo ojo izquierdo",
    "Borde interno ojo derecho",
    "Borde externo ojo derecho",
    "Fosa nasal izquierda",
    "Fosa nasal derecha",
    "Base nasal",
    "Entrecejo",
    "Comisura izquierda",
    "Comisura derecha",
    "Pómulo izquierdo",
    "Pómulo derecho",
    "Mandíbula izquierda",
    "Mandíbula derecha",
    "Superior labio",
    "Inferior labio",
    "Mentón",
    "Mentón izquierdo",
    "Mentón derecho",
    "Hairline"
];

document.getElementById("imageUpload").addEventListener("change", loadImage);


// =============================
// CARGAR IMAGEN
// =============================
function loadImage(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        image.onload = function() {
            // Ajusta el canvas al tamaño REAL visible de la imagen
            canvas.width = image.clientWidth;
            canvas.height = image.clientHeight;

            canvas.style.width = image.clientWidth + "px";
            canvas.style.height = image.clientHeight + "px";

            canvas.style.display = "block";
            image.style.display = "block";

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            points = [];
            pointIndex = 0;
            updateInstruction();
        }
        image.src = e.target.result;
    }
    reader.readAsDataURL(file);
}


// =============================
// CAPTURAR CLICS (PUNTOS)
// =============================
canvas.addEventListener("click", function(e) {
    if (pointIndex >= 22) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    points.push({ x, y });

    drawPoint(x, y, pointIndex + 1);

    pointIndex++;

    updateInstruction();

    if (pointIndex === 22) {
        document.getElementById("calculateBtn").style.display = "block";
    }
});


// =============================
// DIBUJAR PUNTO
// =============================
function drawPoint(x, y, number) {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(number, x + 6, y - 6);
}

function updateInstruction() {
    if (pointIndex < 22) {
        document.getElementById("instructionText").innerText =
            `Coloca: ${pointNames[pointIndex]} (${pointIndex + 1}/22)`;
    } else {
        document.getElementById("instructionText").innerText =
            "Listo. Presiona CALCULAR.";
    }
}


// =============================
// FUNCIONES ÚTILES
// =============================
function dist(a, b) {
    return Math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2);
}

function deviationPercent(observed, ideal) {
    return Math.abs(observed - ideal) / ideal * 100;
}

function metricScore(basePoints, deviation) {
    let penalization = basePoints * (deviation / 100);
    let finalScore = basePoints - penalization;
    if (finalScore < 0) finalScore = 0;
    return { penalization, finalScore };
}


// =============================
// CÁLCULOS DE LAS 11 MÉTRICAS
// =============================
document.getElementById("calculateBtn").addEventListener("click", calculateAllMetrics);

function calculateAllMetrics() {
    const r = {};

    // Alias para puntos
    const P = points;

    // =============================
    // 1. Midface ratio — 15 puntos
    // =============================
    const midfaceHeight = Math.abs(P[16].y - ((P[0].y + P[1].y) / 2));
    const eyeDistance = dist(P[0], P[1]);
    r.midface_obs = midfaceHeight / eyeDistance;
    r.midface_ideal = 1.0;
    r.midface_dev = deviationPercent(r.midface_obs, r.midface_ideal);
    r.midface = metricScore(15, r.midface_dev);

    // =============================
    // 2. FWHR — 10 puntos
    // =============================
    const faceWidth = dist(P[12], P[13]);
    const faceHeightMid = dist(P[9], P[16]);
    r.fwhr_obs = faceWidth / faceHeightMid;
    r.fwhr_ideal = 1.99;
    r.fwhr_dev = deviationPercent(r.fwhr_obs, r.fwhr_ideal);
    r.fwhr = metricScore(10, r.fwhr_dev);

    // =============================
    // 3. Face Height — 8 puntos
    // =============================
    const faceH = dist(P[21], P[18]);
    r.fh_obs = faceH / faceWidth;
    r.fh_ideal = 1.37;
    r.fh_dev = deviationPercent(r.fh_obs, r.fh_ideal);
    r.fh = metricScore(8, r.fh_dev);

    // =============================
    // 4. ES ratio — 7 puntos
    // =============================
    r.es_obs = eyeDistance / faceWidth;
    r.es_ideal = 0.46;
    r.es_dev = deviationPercent(r.es_obs, r.es_ideal);
    r.es = metricScore(7, r.es_dev);

    // =============================
    // 5. Jaw width — 12 puntos
    // =============================
    const jawWidth = dist(P[14], P[15]);
    r.jw_obs = jawWidth / faceWidth;
    r.jw_ideal = 0.94;
    r.jw_dev = deviationPercent(r.jw_obs, r.jw_ideal);
    r.jw = metricScore(12, r.jw_dev);

    // =============================
    // 6. Nose length to height — 6 puntos
    // =============================
    const noseLen = dist(P[9], P[8]);
    const noseWidth = dist(P[6], P[7]);
    r.nlh_obs = noseLen / noseWidth;
    r.nlh_ideal = 1.45;
    r.nlh_dev = deviationPercent(r.nlh_obs, r.nlh_ideal);
    r.nlh = metricScore(6, r.nlh_dev);

    // =============================
    // 7. Nose width — 6 puntos
    // =============================
    r.nw_obs = noseWidth / faceWidth;
    r.nw_ideal = 0.25;
    r.nw_dev = deviationPercent(r.nw_obs, r.nw_ideal);
    r.nw = metricScore(6, r.nw_dev);

    // =============================
    // 8. Nose–lips — 5 puntos
    // =============================
    const mouthWidth = dist(P[10], P[11]);
    r.nl_obs = mouthWidth / noseWidth;
    r.nl_ideal = 1.55;
    r.nl_dev = deviationPercent(r.nl_obs, r.nl_ideal);
    r.nl = metricScore(5, r.nl_dev);

    // =============================
    // 9. Nose = Chin — 8 puntos
    // =============================
    const chinWidth = dist(P[19], P[20]);
    r.nc_obs = noseWidth / chinWidth;
    r.nc_ideal = 1.00;
    r.nc_dev = deviationPercent(r.nc_obs, r.nc_ideal);
    r.nc = metricScore(8, r.nc_dev);

    // =============================
    // 10. Chin–Philtrum — 10 puntos
    // =============================
    const chinLen = dist(P[18], P[17]);
    const philtrum = dist(P[16], P[8]);
    r.cp_obs = chinLen / philtrum;
    r.cp_ideal = 2.40;
    r.cp_dev = deviationPercent(r.cp_obs, r.cp_ideal);
    r.cp = metricScore(10, r.cp_dev);

    // =============================
    // 11. One-eye distance — 13 puntos
    // =============================
    const eyeL = dist(P[3], P[2]);
    const eyeR = dist(P[5], P[4]);
    const ideal = (eyeL + inter + eyeR) / 3;
    const inter = eyeDistance;

    const obsDeviation =
        deviationPercent(eyeL, ideal) +
        deviationPercent(inter, ideal) +
        deviationPercent(eyeR, ideal);

    r.oe_dev = obsDeviation / 3;
    r.oe = metricScore(13, r.oe_dev);

    // =============================
    // PROMEDIO FINAL
    // =============================
    const totalFinal = (
        r.midface.finalScore + r.fwhr.finalScore + r.fh.finalScore +
        r.es.finalScore + r.jw.finalScore + r.nlh.finalScore +
        r.nw.finalScore + r.nl.finalScore + r.nc.finalScore +
        r.cp.finalScore + r.oe.finalScore
    ) / 11;

    showResults(r, totalFinal);
}


// =============================
// MOSTRAR RESULTADOS
// =============================
function showResults(r, total) {
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "";

    function block(title, obs, ideal, dev, base, penalty, final) {
        return `
            <div class="metric-block">
                <div class="metric-title">${title}</div>
                <div class="metric-item">Valor observado: ${obs.toFixed(3)}</div>
                <div class="metric-item">Valor ideal: ${ideal}</div>
                <div class="metric-item">% desviación: ${dev.toFixed(2)}%</div>
                <div class="metric-item">Puntos base: ${base}</div>
                <div class="metric-item">Penalización: ${penalty.toFixed(2)}</div>
                <div class="metric-item">Puntaje final: ${final.toFixed(2)}</div>
            </div>
        `;
    }

    resultsDiv.innerHTML += block("Midface Ratio", r.midface_obs, r.midface_ideal, r.midface_dev, 15, r.midface.penalization, r.midface.finalScore);
    resultsDiv.innerHTML += block("FWHR", r.fwhr_obs, r.fwhr_ideal, r.fwhr_dev, 10, r.fwhr.penalization, r.fwhr.finalScore);
    resultsDiv.innerHTML += block("Face Height", r.fh_obs, r.fh_ideal, r.fh_dev, 8, r.fh.penalization, r.fh.finalScore);
    resultsDiv.innerHTML += block("E–S Ratio", r.es_obs, r.es_ideal, r.es_dev, 7, r.es.penalization, r.es.finalScore);
    resultsDiv.innerHTML += block("Jaw Width", r.jw_obs, r.jw_ideal, r.jw_dev, 12, r.jw.penalization, r.jw.finalScore);
    resultsDiv.innerHTML += block("Nose L/H", r.nlh_obs, r.nlh_ideal, r.nlh_dev, 6, r.nlh.penalization, r.nlh.finalScore);
    resultsDiv.innerHTML += block("Nose Width", r.nw_obs, r.nw_ideal, r.nw_dev, 6, r.nw.penalization, r.nw.finalScore);
    resultsDiv.innerHTML += block("Nose–Lips", r.nl_obs, r.nl_ideal, r.nl_dev, 5, r.nl.penalization, r.nl.finalScore);
    resultsDiv.innerHTML += block("Nose = Chin", r.nc_obs, r.nc_ideal, r.nc_dev, 8, r.nc.penalization, r.nc.finalScore);
    resultsDiv.innerHTML += block("Chin–Philtrum", r.cp_obs, r.cp_ideal, r.cp_dev, 10, r.cp.penalization, r.cp.finalScore);
    resultsDiv.innerHTML += block("One-eye distance", r.oe_dev, 0, r.oe_dev, 13, r.oe.penalization, r.oe.finalScore);

    resultsDiv.innerHTML += `
        <h2>Puntaje Final Total: ${total.toFixed(2)}</h2>
    `;
}
