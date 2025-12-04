// ===============================
// VARIABLES GLOBALES
// ===============================
const canvas = document.getElementById("photoCanvas");
const ctx = canvas.getContext("2d");
const imageUpload = document.getElementById("imageUpload");

let img = new Image();
let clickedPoints = [];

// Lista de 22 puntos en orden
const pointNames = [
    "Pupila izquierda","Pupila derecha",
    "Borde interno ojo izq","Borde externo ojo izq",
    "Borde interno ojo der","Borde externo ojo der",
    "Fosa nasal izq","Fosa nasal der",
    "Base de la nariz","Entrecejo",
    "Comisura izq","Comisura der",
    "Pómulo izq","Pómulo der",
    "Mandíbula izq","Mandíbula der",
    "Sup labio sup","Inf labio inf",
    "Mentón","Lado izq mentón",
    "Lado der mentón","Hairline"
];

// PESOS
const weights = {
    midface: 0.18,
    fwhr: 0.12,
    face_height: 0.12,
    es_ratio: 0.12,
    jaw_width: 0.12,
    nose_ratio: 0.12,
    nose_width: 0.08,
    nose_lips: 0.08,
    nose_chin: 0.06,
    chin_philtrum: 0.06,
    one_eye: 0.05
};

// ===============================
// FUNCIÓN DE SCORE EXACTO
// ===============================
function strictScore(deviation) {

    const d = deviation * 100; // Convertir a porcentaje

    if (d <= 2)
        return 100 - (d * 2); // 0%→100, 2%→96

    if (d <= 5)
        return 96 - ((d - 2) * ((96 - 90) / (5 - 2))); // 2→96 a 5→90

    if (d <= 10)
        return 90 - ((d - 5) * ((90 - 85) / (10 - 5))); // 5→90 a 10→85

    if (d <= 15)
        return 85 - ((d - 10) * ((85 - 81) / (15 - 10))); // 10→85 a 15→81

    if (d <= 20)
        return 81 - ((d - 15) * ((81 - 75) / (20 - 15))); // 15→81 a 20→75

    if (d <= 30)
        return 75 - ((d - 20) * ((75 - 65) / (30 - 20))); // 20→75 a 30→65

    return Math.max(0, 65 - (d - 30) * 1.5); // castigo extra
}

// ===============================
// CARGAR Y DIBUJAR IMAGEN
// ===============================
imageUpload.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;

    img.src = URL.createObjectURL(file);
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        clickedPoints = [];
        updateInstructions();
    };
});

// ===============================
// REGISTRO DE PUNTOS
// ===============================
canvas.addEventListener("click", e => {
    if (clickedPoints.length >= 22) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    clickedPoints.push({ x, y });

    drawPoint(x, y, clickedPoints.length);
    updateInstructions();

    if (clickedPoints.length === 22) {
        document.getElementById("calculateBtn").style.display = "block";
    }
});

function drawPoint(x, y, number) {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "yellow";
    ctx.font = "16px Arial";
    ctx.fillText(number, x + 8, y - 8);
}

function updateInstructions() {
    const i = clickedPoints.length;
    document.getElementById("instructions").innerText =
        i < 22 ? `Punto ${i + 1}: ${pointNames[i]}` : "Todos los puntos colocados.";
}

// ===============================
// FUNCIÓN DISTANCIA
// ===============================
function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

// ===============================
// CÁLCULOS Y MÉTRICAS
// ===============================
document.getElementById("calculateBtn").addEventListener("click", () => {
    const p = clickedPoints;

    const metrics = {};

    // 1) Midface ratio
    const pupilLine = dist(p[0], p[1]);
    const midfaceHeight = Math.abs(p[16].y - ((p[0].y + p[1].y) / 2));
    metrics.midface = midfaceHeight / pupilLine;

    // 2) FWHR
    metrics.fwhr = dist(p[12], p[13]) / dist(p[9], p[16]);

    // 3) Face height
    metrics.face_height = dist(p[21], p[18]) / dist(p[12], p[13]);

    // 4) ES ratio
    metrics.es_ratio = pupilLine / dist(p[12], p[13]);

    // 5) Jaw width
    metrics.jaw_width = dist(p[14], p[15]) / dist(p[12], p[13]);

    // 6) Nose ratio
    const nose_length = dist(p[9], p[8]);
    const nose_width = dist(p[6], p[7]);
    metrics.nose_ratio = nose_length / nose_width;

    // 7) Nose width
    metrics.nose_width = nose_width / dist(p[12], p[13]);

    // 8) Nose–lips
    metrics.nose_lips = dist(p[10], p[11]) / nose_width;

    // 9) Nose = chin width
    metrics.nose_chin = nose_width / dist(p[19], p[20]);

    // 10) Chin-philtrum
    const philtrum = dist(p[16], p[8]);
    const chin_len = dist(p[18], p[17]);
    metrics.chin_philtrum = chin_len / philtrum;

    // 11) One-eye distance
    const leftEye = dist(p[3], p[2]);
    const rightEye = dist(p[5], p[4]);
    metrics.one_eye = (leftEye + rightEye) / (2 * pupilLine);

    // Ideales
    const ideals = {
        midface: 1.0,
        fwhr: 1.99,
        face_height: 1.37,
        es_ratio: 0.46,
        jaw_width: 0.94,
        nose_ratio: 1.45,
        nose_width: 0.25,
        nose_lips: 1.55,
        nose_chin: 1.00,
        chin_philtrum: 2.40,
        one_eye: 1.0
    };

    // ===============================
    // PUNTAJES EXACTOS
    // ===============================
    const scores = {};
    let finalScore = 0;

    for (let key in metrics) {
        const deviation = Math.abs(metrics[key] - ideals[key]) / ideals[key];
        const score = strictScore(deviation);

        scores[key] = score;
        finalScore += score * weights[key];
    }

    // ===============================
    // MOSTRAR RESULTADOS
    // ===============================
    let html = `<h3>Puntaje Final: ${finalScore.toFixed(1)}%</h3>`;

    for (let key in metrics) {
        html += `
        <p><b>${key}</b><br>
        Observado: ${metrics[key].toFixed(3)}<br>
        Ideal: ${ideals[key]}<br>
        Puntaje: ${scores[key].toFixed(1)}%</p>
        <hr>`;
    }

    document.getElementById("results").innerHTML = html;
    document.getElementById("downloadCsv").style.display = "block";

    // ===============================
    // CSV
    // ===============================
    document.getElementById("downloadCsv").onclick = () => {
        let csv = "Métrica,Observado,Ideal,Puntaje\n";
        for (let key in metrics) {
            csv += `${key},${metrics[key]},${ideals[key]},${scores[key]}\n`;
        }

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "armonia_facial.csv";
        a.click();
    };
});
