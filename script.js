// ===============================
// VARIABLES GLOBALES
// ===============================
const canvas = document.getElementById("photoCanvas");
const ctx = canvas.getContext("2d");
const imageUpload = document.getElementById("imageUpload");

let img = new Image();
let clickedPoints = [];

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

// PESOS (los más importantes pesan más)
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
// PUNTAJE — OPCIÓN B (más estricto fuerte)
// ===============================
function strictScore(deviation) {

    const d = deviation * 100;

    if (d <= 2)
        return 90 - ((d / 2) * (90 - 88)); // 0→90, 2→88

    if (d <= 5)
        return 88 - ((d - 2) * ((88 - 80) / 3)); // 2→88, 5→80

    if (d <= 10)
        return 80 - ((d - 5) * ((80 - 70) / 5)); // 5→80, 10→70

    if (d <= 15)
        return 70 - ((d - 10) * ((70 - 60) / 5)); // 10→70, 15→60

    if (d <= 20)
        return 60 - ((d - 15) * ((60 - 50) / 5)); // 15→60, 20→50

    if (d <= 30)
        return 50 - ((d - 20) * ((50 - 40) / 10)); // 20→50, 30→40

    return Math.max(0, 40 - (d - 30) * 2.0); // castigo fuerte
}

// ===============================
// CARGAR IMAGEN
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
// CLICK PARA MARCAR PUNTOS
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

function drawPoint(x, y, id) {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "yellow";
    ctx.font = "16px Arial";
    ctx.fillText(id, x + 8, y - 8);
}

function updateInstructions() {
    const i = clickedPoints.length;
    document.getElementById("instructions").innerHTML =
        i < 22 ? `Punto ${i + 1}: ${pointNames[i]}` : "Puntos completos.";
}

// ===============================
// UTILIDAD DISTANCIA
// ===============================
function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

// ===============================
// CÁLCULOS
// ===============================
document.getElementById("calculateBtn").addEventListener("click", () => {

    const p = clickedPoints;
    const metrics = {};

    const pupilLine = dist(p[0], p[1]);
    const midfaceHeight = Math.abs(p[16].y - ((p[0].y + p[1].y) / 2));
    metrics.midface = midfaceHeight / pupilLine;

    metrics.fwhr = dist(p[12], p[13]) / dist(p[9], p[16]);
    metrics.face_height = dist(p[21], p[18]) / dist(p[12], p[13]);
    metrics.es_ratio = pupilLine / dist(p[12], p[13]);
    metrics.jaw_width = dist(p[14], p[15]) / dist(p[12], p[13]);

    const nose_length = dist(p[9], p[8]);
    const nose_width = dist(p[6], p[7]);
    metrics.nose_ratio = nose_length / nose_width;

    metrics.nose_width = nose_width / dist(p[12], p[13]);
    metrics.nose_lips = dist(p[10], p[11]) / nose_width;
    metrics.nose_chin = nose_width / dist(p[19], p[20]);

    const philtrum = dist(p[16], p[8]);
    const chin_len = dist(p[18], p[17]);
    metrics.chin_philtrum = chin_len / philtrum;

    const leftEye = dist(p[3], p[2]);
    const rightEye = dist(p[5], p[4]);
    metrics.one_eye = (leftEye + rightEye) / (2 * pupilLine);

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

    const scores = {};
    let finalScore = 0;

    for (let k in metrics) {
        const deviation = Math.abs(metrics[k] - ideals[k]) / ideals[k];
        const score = strictScore(deviation);

        scores[k] = score;
        finalScore += score * weights[k];
    }

    let html = `<h2>Puntaje Final: ${finalScore.toFixed(1)}%</h2><hr>`;

    for (let k in metrics) {
        html += `
        <p><b>${k}</b><br>
        Observado: ${metrics[k].toFixed(3)}<br>
        Ideal: ${ideals[k]}<br>
        Puntaje: ${scores[k].toFixed(1)}%</p>
        <hr>`;
    }

    document.getElementById("results").innerHTML = html;
    document.getElementById("downloadCsv").style.display = "block";

    document.getElementById("downloadCsv").onclick = () => {
        let csv = "Métrica,Observado,Ideal,Puntaje\n";
        for (let k in metrics) {
            csv += `${k},${metrics[k]},${ideals[k]},${scores[k]}\n`;
        }

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "armonia_facial.csv";
        a.click();
    };
});
