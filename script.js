const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const imageUpload = document.getElementById("imageUpload");
const guideText = document.getElementById("guideText");
const calculateBtn = document.getElementById("calculateBtn");
const downloadBtn = document.getElementById("downloadBtn");

let img = new Image();
let points = [];
let currentPoint = 0;

const pointNames = [
    "1. Pupila izquierda",
    "2. Pupila derecha",
    "3. Borde interno del ojo izquierdo",
    "4. Borde externo del ojo izquierdo",
    "5. Borde interno del ojo derecho",
    "6. Borde externo del ojo derecho",

    "7. Fosa nasal izquierda",
    "8. Fosa nasal derecha",
    "9. Base de la nariz",
    "10. Entrecejo (glabella)",

    "11. Comisura izquierda",
    "12. Comisura derecha",

    "13. Pómulo izquierdo",
    "14. Pómulo derecho",
    "15. Mandíbula izquierda",
    "16. Mandíbula derecha",

    "17. Parte superior del labio",
    "18. Parte inferior del labio",
    "19. Mentón",
    "20. Lado izquierdo del mentón",
    "21. Lado derecho del mentón",

    "22. Línea del cabello (hairline)"
];

// ---------------- LOAD IMAGE ----------------
imageUpload.addEventListener("change", e => {
    const file = e.target.files[0];
    img.src = URL.createObjectURL(file);

    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        points = [];
        currentPoint = 0;

        guideText.textContent = "Marca: " + pointNames[0];
    };
});

// ---------------- CLICK TO MARK POINTS ----------------
canvas.addEventListener("click", e => {
    if (currentPoint >= 22) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    points.push({ x, y });
    currentPoint++;

    redraw();

    if (currentPoint < 22) {
        guideText.textContent = "Marca: " + pointNames[currentPoint];
    }

    if (currentPoint === 22) {
        guideText.textContent = "Todos los puntos listos — presiona CALCULAR";
        calculateBtn.disabled = false;
    }
});

// ---------------- REDRAW ----------------
function redraw() {
    ctx.drawImage(img, 0, 0);
    ctx.fillStyle = "red";
    ctx.font = "20px Arial";

    points.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText(i + 1, p.x + 5, p.y - 5);
    });
}

// ---------------- DISTANCE ----------------
function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

// ---------------- SCORE ----------------
function scoreDeviation(dev) {
    dev = Math.abs(dev);

    if (dev <= 0.02) return 94;
    if (dev <= 0.03) return 86;
    if (dev <= 0.05) return 80;
    if (dev <= 0.10) return 70;
    if (dev <= 0.15) return 67;
    if (dev <= 0.20) return 60;
    if (dev <= 0.30) return 50;
    return 40;
}

// ---------------- CALCULATE METRICS ----------------
calculateBtn.addEventListener("click", () => {
    const p = points;

    const metrics = [];

    // Ejemplo (agregarás las 11 métricas igual que aquí):
    let midface_height = Math.abs(p[16].y - ((p[0].y + p[1].y) / 2));
    let eye_distance = dist(p[0], p[1]);
    let midface_ratio = midface_height / eye_distance;

    let ideal = 1.0;
    let dev = (midface_ratio - ideal) / ideal;
    let score = scoreDeviation(dev);

    metrics.push({
        name: "Midface Ratio",
        value: midface_ratio.toFixed(3),
        ideal: ideal,
        deviation: (dev * 100).toFixed(2) + "%",
        score: score
    });

    // Aquí se agregarán las otras 10 métricas…

    showResults(metrics);
});

// ---------------- SHOW RESULTS ----------------
function showResults(metrics) {
    let html = "<h3>Resultados</h3><table border='1' cellpadding='6'>";
    html += "<tr><th>Métrica</th><th>Valor</th><th>Ideal</th><th>Desviación</th><th>Puntaje</th></tr>";

    let total = 0;

    metrics.forEach(m => {
        total += m.score;
        html += `<tr>
                    <td>${m.name}</td>
                    <td>${m.value}</td>
                    <td>${m.ideal}</td>
                    <td>${m.deviation}</td>
                    <td>${m.score}</td>
                </tr>`;
    });

    html += "</table>";

    html += `<h2>Puntaje final: ${(total / metrics.length).toFixed(1)}</h2>`;

    document.getElementById("results").innerHTML = html;
}
