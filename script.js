const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const imgInput = document.getElementById("image-input");
const instructions = document.getElementById("instructions");
const calcButton = document.getElementById("calcButton");

let img = new Image();
let points = [];
let step = 0;

const pointNames = [
    "1. Pupila izquierda",
    "2. Pupila derecha",
    "3. Borde interno ojo izquierdo",
    "4. Borde externo ojo izquierdo",
    "5. Borde interno ojo derecho",
    "6. Borde externo ojo derecho",
    "7. Fosa nasal izquierda",
    "8. Fosa nasal derecha",
    "9. Base nasal",
    "10. Entrecejo",
    "11. Comisura izquierda",
    "12. Comisura derecha",
    "13. Pómulo izquierdo",
    "14. Pómulo derecho",
    "15. Mandíbula izquierda",
    "16. Mandíbula derecha",
    "17. Parte superior del labio superior",
    "18. Parte inferior del labio inferior",
    "19. Mentón (abajo)",
    "20. Mentón izquierda",
    "21. Mentón derecha",
    "22. Hairline"
];

imgInput.onchange = e => {
    const file = e.target.files[0];
    img.src = URL.createObjectURL(file);

    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        instructions.innerHTML = "Haz clic para colocar: " + pointNames[0];
    };
};

canvas.addEventListener("click", e => {
    if (step >= 22) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    points.push({ x, y });
    drawPoint(x, y);

    step++;

    if (step < 22) {
        instructions.innerHTML = "Coloca: " + pointNames[step];
    } else {
        instructions.innerHTML = "Todos los puntos listos.";
        calcButton.style.display = "block";
    }
});

function drawPoint(x, y) {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
}

function dist(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// FÓRMULAS IDEALES
const IDEALS = {
    midface: 1.0,
    fwhr: 1.99,
    faceHeight: 1.37,
    es: 0.46,
    jaw: 0.94,
    noseLengthHeight: 1.45,
    noseWidth: 0.25,
    noseLip: 1.55,
    noseChin: 1.0,
    chinPhiltrum: 2.40,
    eyeRatio: 1.0
};

// PESOS
const WEIGHTS = {
    midface: 0.12,
    fwhr: 0.20,
    faceHeight: 0.08,
    es: 0.08,
    jaw: 0.14,
    noseLengthHeight: 0.10,
    noseWidth: 0.05,
    noseLip: 0.06,
    noseChin: 0.06,
    chinPhiltrum: 0.06,
    eyeRatio: 0.05
};

calcButton.onclick = () => {
    const r = {};

    const pupL = points[0];
    const pupR = points[1];
    const pupDist = dist(pupL, pupR);

    const topLip = points[16];
    const entrecejo = points[9];

    const pomL = points[12];
    const pomR = points[13];
    const pomDist = dist(pomL, pomR);

    const noseBase = points[8];
    const fosaL = points[6];
    const fosaR = points[7];

    const chin = points[18];
    const chinL = points[19];
    const chinR = points[20];

    const bottomLip = points[17];
    const hair = points[21];

    const eyeL = dist(points[3], points[2]);
    const eyeR = dist(points[5], points[4]);

    // 1 Midface
    const midHeight = Math.abs(topLip.y - (pupL.y + pupR.y) / 2);
    r.midface = midHeight / pupDist;

    // 2 FWHR
    const fwhrHeight = Math.abs(entrecejo.y - topLip.y);
    r.fwhr = pomDist / fwhrHeight;

    // 3 Face Height
    r.faceHeight = dist(hair, chin) / pomDist;

    // 4 ES
    r.es = pupDist / pomDist;

    // 5 Jaw
    r.jaw = dist(points[14], points[15]) / pomDist;

    // 6 Nose length–height
    r.noseLengthHeight = dist(entrecejo, noseBase) / dist(fosaL, fosaR);

    // 7 Nose width
    r.noseWidth = dist(fosaL, fosaR) / pomDist;

    // 8 Nose–Lip
    r.noseLip = dist(points[10], points[11]) / dist(fosaL, fosaR);

    // 9 Nose = Chin
    r.noseChin = dist(fosaL, fosaR) / dist(chinL, chinR);

    // 10 Chin–Philtrum
    const mentonLen = dist(chin, bottomLip);
    const filtrum = dist(topLip, noseBase);
    r.chinPhiltrum = mentonLen / filtrum;

    // 11 One eye
    r.eyeRatio = (eyeL + eyeR) / (2 * pupDist);

    let finalScore = 0;
    let html = "<h2>Resultados</h2>";

    for (const key in r) {
        const val = r[key];
        const ideal = IDEALS[key];

        let error = Math.abs((val - ideal) / ideal);
        if (error > 1) error = 1;

        const score = 100 - error * 100;
        finalScore += score * WEIGHTS[key];

        html += `<p><b>${key}</b>: ${val.toFixed(3)} (ideal ${ideal}) → <span style='color:yellow;'>${score.toFixed(1)}%</span></p>`;
    }

    html += `<h2>Puntaje Final: <span style='color:#0f0;'>${finalScore.toFixed(1)}%</span></h2>`;

    document.getElementById("results").innerHTML = html;
};
