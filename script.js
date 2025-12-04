// ------------------------------
// CARGA DE IMAGEN
// ------------------------------
const fileInput = document.getElementById("fileInput");
const canvas = document.getElementById("photoCanvas");
const ctx = canvas.getContext("2d");
const calcBtn = document.getElementById("calculateBtn");
const resultsBox = document.getElementById("results");

let img = new Image();
let points = [];

fileInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = ev => {
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            points = [];

            calcBtn.classList.add("hidden");
            resultsBox.innerHTML = "";
        };
        img.src = ev.target.result;
    };
});

// ------------------------------
// MARCAR PUNTOS
// ------------------------------
canvas.addEventListener("click", e => {
    if (!img.src) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    points.push({ x, y });

    redrawPoints();

    if (points.length === 22) {
        calcBtn.classList.remove("hidden");
    }
});

function redrawPoints() {
    ctx.drawImage(img, 0, 0);
    ctx.fillStyle = "red";
    ctx.font = "20px Arial";

    points.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText(i + 1, p.x + 6, p.y + 6);
    });
}

// ------------------------------
// HERRAMIENTAS
// ------------------------------
function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

// ------------------------------
// TABLA EXACTA DE DANIELA
// ------------------------------
function scoreFromDeviation(d) {
    if (d <= 0.02) return 94;
    if (d <= 0.03) return lerp(94, 86, (d - 0.02) / 0.01);
    if (d <= 0.05) return lerp(86, 80, (d - 0.03) / 0.02);
    if (d <= 0.10) return lerp(80, 70, (d - 0.05) / 0.05);
    if (d <= 0.15) return lerp(70, 67, (d - 0.10) / 0.05);
    if (d <= 0.20) return lerp(67, 60, (d - 0.15) / 0.05);
    if (d <= 0.30) return lerp(60, 50, (d - 0.20) / 0.10);

    return 40; // Para desviaciones grandes
}

// ------------------------------
// CALCULAR MÉTRICAS
// ------------------------------
calcBtn.addEventListener("click", () => {
    if (points.length !== 22) return;

    const p = points;

    const metrics = [];

    const addMetric = (name, value, ideal) => {
        const dev = Math.abs(value - ideal) / ideal;
        metrics.push({
            name,
            value: value.toFixed(3),
            ideal,
            deviation: dev,
            score: scoreFromDeviation(dev)
        });
    };

    // 1. Midface ratio
    const pupMidY = (p[0].y + p[1].y) / 2;
    const midface = Math.abs(p[16].y - pupMidY) / dist(p[0], p[1]);
    addMetric("Midface Ratio", midface, 1.0);

    // 2. FWHR
    const fw = dist(p[12], p[13]) / Math.abs(p[3].y - p[16].y);
    addMetric("FWHR", fw, 1.99);

    // 3. Face Height
    const faceHeight = Math.abs(p[21].y - p[18].y) / dist(p[12], p[13]);
    addMetric("Face Height", faceHeight, 1.37);

    // 4. ES Ratio
    const es = dist(p[0], p[1]) / dist(p[12], p[13]);
    addMetric("E–S Ratio", es, 0.46);

    // 5. Jaw width
    const jaw = dist(p[14], p[15]) / dist(p[12], p[13]);
    addMetric("Jaw Width", jaw, 0.94);

    // 6. Nose length / width
    const nlw = dist(p[3], p[2]) / dist(p[6], p[7]);
    addMetric("Nose Length / Width", nlw, 1.45);

    // 7. Nose width
    const nw = dist(p[6], p[7]) / dist(p[12], p[13]);
    addMetric("Nose Width", nw, 0.25);

    // 8. Lips / Nose width
    const lipsNose = dist(p[10], p[11]) / dist(p[6], p[7]);
    addMetric("Lips / Nose Width", lipsNose, 1.55);

    // 9. Nose / Chin width
    const chinW = dist(p[19], p[20]);
    const noseChin = dist(p[6], p[7]) / chinW;
    addMetric("Nose / Chin Width", noseChin, 1.0);

    // 10. Chin / Philtrum
    const chinPhil = dist(p[18], p[17]) / dist(p[16], p[2]);
    addMetric("Chin / Philtrum", chinPhil, 2.40);

    // 11. One-eye ratio
    const eyeL = dist(p[4], p[3]);
    const eyeC = dist(p[0], p[1]);
    const eyeR = dist(p[5], p[6]);
    const ideal = (eyeL + eyeC + eyeR) / 3;

    const devEye = (
        Math.abs(eyeL - ideal) / ideal +
        Math.abs(eyeC - ideal) / ideal +
        Math.abs(eyeR - ideal) / ideal
    ) / 3;

    metrics.push({
        name: "One-Eye Ratio",
        value: `${eyeL.toFixed(1)} / ${eyeC.toFixed(1)} / ${eyeR.toFixed(1)}`,
        ideal: "1 : 1 : 1",
        deviation: devEye,
        score: scoreFromDeviation(devEye)
    });

    // ------------------------------
    // RESULTADOS
    // ------------------------------
    let html = "<h3>Resultados</h3>";

    let total = 0;

    metrics.forEach(m => {
        html += `
        <p><b>${m.name}</b><br>
        Valor: ${m.value}<br>
        Ideal: ${m.ideal}<br>
        Desviación: ${(m.deviation * 100).toFixed(1)}%<br>
        <b>Puntaje: ${m.score.toFixed(1)}</b></p>
        `;

        total += m.score;
    });

    const final = total / metrics.length;
    html += `<h2>Puntaje final: ${final.toFixed(1)}</h2>`;

    resultsBox.innerHTML = html;
});
