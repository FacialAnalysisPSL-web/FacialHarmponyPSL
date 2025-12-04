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
// Cargar y dibujar imagen
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
// Registro de puntos
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
// Función distancia
// ===============================
function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

// ===============================
// Cálculos y métricas
// ===============================
document.getElementById("calculateBtn").addEventListener("click", () => {
    const p = clickedPoints;

    const metrics = {};

    // 1) Midface ratio
    const pupilLine = dist(p[0], p[1]);
    const midfaceHeight = Math.abs(p[16].y - ((p[0].y + p[1].y) / 2));
    metrics.midface = midfaceHeight / pupilLine;
    const ideal_midface = 1.0;

    // 2) FWHR
    metrics.fwhr = dist(p[12], p[13]) / dist(p[9], p[16]);
    const ideal_fwhr = 1.99;

    // 3) Face height
    metrics.face_height = dist(p[21], p[18]) / dist(p[12], p[13]);
    const ideal_face_height = 1.37;

    // 4) ES ratio
    metrics.es_ratio = pupilLine / dist(p[12], p[13]);
    const ideal_es = 0.46;

    // 5) Jaw width
    metrics.jaw_width = dist(p[14], p[15]) / dist(p[12], p[13]);
    const ideal_jaw = 0.94;

    // 6) Nose length to height
    const nose_length = dist(p[9], p[8]);
    const nose_width = dist(p[6], p[7]);
    metrics.nose_ratio = nose_length / nose_width;
    const ideal_nose_ratio = 1.45;

    // 7) Nose width
    metrics.nose_width = nose_width / dist(p[12], p[13]);
    const ideal_nose_width = 0.25;

    // 8) Nose–lips
    metrics.nose_lips = dist(p[10], p[11]) / nose_width;
    const ideal_nl = 1.55;

    // 9) Nose = chin width
    metrics.nose_chin = nose_width / dist(p[19], p[20]);
    const ideal_nc = 1.0;

    // 10) Chin-philtrum
    const philtrum = dist(p[16], p[8]);
    const chin_len = dist(p[18], p[17]);
    metrics.chin_philtrum = chin_len / philtrum;
    const ideal_cp = 2.40;

    // 11) One-eye distance
    const leftEye = dist(p[3], p[2]);
    const rightEye = dist(p[5], p[4]);
    metrics.one_eye = (leftEye + rightEye) / (2 * pupilLine);
    const ideal_oe = 1;

    // ===============================
    // Calcular puntajes realistas
    // ===============================
    const ideals = {
        midface: ideal_midface,
        fwhr: ideal_fwhr,
        face_height: ideal_face_height,
        es_ratio: ideal_es,
        jaw_width: ideal_jaw,
        nose_ratio: ideal_nose_ratio,
        nose_width: ideal_nose_width,
        nose_lips: ideal_nl,
        nose_chin: ideal_nc,
        chin_philtrum: ideal_cp,
        one_eye: ideal_oe
    };

    const scores = {};
    let finalScore = 0;

    for (let key in metrics) {
        const deviation = Math.abs(metrics[key] - ideals[key]) / ideals[key];
        const score = Math.max(0, 100 - deviation * 100 * 1.5);
        scores[key] = score;
        finalScore += score * weights[key];
    }

    // ===============================
    // Mostrar resultados
    // ===============================
    let html = `<h3>Puntaje Final: ${finalScore.toFixed(1)}%</h3>`;

    for (let key in metrics) {
        html += `
            <p><b>${key}</b><br>
            Observado: ${metrics[key].toFixed(3)}<br>
            Ideal: ${ideals[key]}<br>
            Puntaje: ${scores[key].toFixed(1)}%</p>
            <hr>
        `;
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
        a.download = "armonía_facial.csv";
        a.click();
    };
});
