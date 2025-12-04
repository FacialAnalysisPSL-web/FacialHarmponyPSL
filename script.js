// ------------------------------
// Utilidades
// ------------------------------
function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

// ------------------------------
// Escala EXACTA solicitada
// ------------------------------
//
// 0–2%  → 94
// 3%    → 86
// 5%    → 80
// 10%   → 70
// 15%   → 67
// 20%   → 60
// 30%   → 50
//
// Se usa interpolación lineal exacta
//
function scoreFromDeviation(dev) {
    if (dev <= 0.02) return 94;
    if (dev <= 0.03) return lerp(94, 86, (dev - 0.02) / 0.01);
    if (dev <= 0.05) return lerp(86, 80, (dev - 0.03) / 0.02);
    if (dev <= 0.10) return lerp(80, 70, (dev - 0.05) / 0.05);
    if (dev <= 0.15) return lerp(70, 67, (dev - 0.10) / 0.05);
    if (dev <= 0.20) return lerp(67, 60, (dev - 0.15) / 0.05);
    if (dev <= 0.30) return lerp(60, 50, (dev - 0.20) / 0.10);

    return 40; // fuera de escala
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

// ------------------------------
// Cálculo de métricas
// ------------------------------
function calculateMetrics(points) {

    const p = points;
    const metrics = [];

    // 1. Midface Ratio
    const pupMidY = (p[0].y + p[1].y) / 2;
    const midfaceHeight = Math.abs(p[16].y - pupMidY);
    const eyeDist = dist(p[0], p[1]);
    metrics.push(makeMetric("Midface Ratio", midfaceHeight / eyeDist, 1.0));

    // 2. FWHR
    const widthFW = dist(p[12], p[13]);
    const heightFW = Math.abs(p[3].y - p[16].y);
    metrics.push(makeMetric("FWHR", widthFW / heightFW, 1.99));

    // 3. Face Height
    const faceHeight = Math.abs(p[21].y - p[18].y);
    metrics.push(makeMetric("Face Height", faceHeight / widthFW, 1.37));

    // 4. ES Ratio
    metrics.push(makeMetric("E–S Ratio", eyeDist / widthFW, 0.46));

    // 5. Jaw width
    const jawW = dist(p[14], p[15]);
    metrics.push(makeMetric("Jaw Width", jawW / widthFW, 0.94));

    // 6. Nose length / width
    const noseLen = dist(p[3], p[2]);
    const noseWidth = dist(p[6], p[7]);
    metrics.push(makeMetric("Nose Length / Width", noseLen / noseWidth, 1.45));

    // 7. Nose width normalizada
    metrics.push(makeMetric("Nose Width", noseWidth / widthFW, 0.25));

    // 8. Lips / Nose width
    const lipWidth = dist(p[10], p[11]);
    metrics.push(makeMetric("Lips / Nose Width", lipWidth / noseWidth, 1.55));

    // 9. Nose / Chin width
    const chinW = dist(p[19], p[20]);
    metrics.push(makeMetric("Nose / Chin Width", noseWidth / chinW, 1.00));

    // 10. Chin / Philtrum
    const chinLen = dist(p[18], p[17]);
    const philtrum = dist(p[16], p[2]);
    metrics.push(makeMetric("Chin / Philtrum", chinLen / philtrum, 2.40));

    // 11. One-Eye Ratio (izq / centro / der)
    const eyeLeft = dist(p[4], p[3]);
    const eyeRight = dist(p[5], p[6]);
    const idealEye = (eyeLeft + eyeRight + eyeDist) / 3;

    const devEye = (
        Math.abs(eyeLeft - idealEye) / idealEye +
        Math.abs(eyeRight - idealEye) / idealEye +
        Math.abs(eyeDist - idealEye) / idealEye
    ) / 3;

    metrics.push({
        name: "One-Eye Ratio",
        value: `${eyeLeft.toFixed(1)} / ${eyeDist.toFixed(1)} / ${eyeRight.toFixed(1)}`,
        ideal: "1 : 1 : 1",
        deviation: devEye,
        score: scoreFromDeviation(devEye)
    });

    return metrics;
}

// ------------------------------
// Crear objeto métrica
// ------------------------------
function makeMetric(name, value, ideal) {
    const dev = Math.abs(value - ideal) / ideal;
    return {
        name,
        value,
        ideal,
        deviation: dev,
        score: scoreFromDeviation(dev)
    };
}
