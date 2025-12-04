const file = document.getElementById("file");
const img = document.getElementById("photo");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const nextBtn = document.getElementById("next");
const calculateBtn = document.getElementById("calculate");
const instruction = document.getElementById("instruction");
const resultBox = document.getElementById("result");

let points = [];
let pointIndex = 0;

const steps = [
    "Marca el centro del cabello (hairline)",
    "Marca el entrecejo (glabella)",
    "Marca la punta de la nariz",
    "Marca la barbilla",
    "Marca la comisura del ojo derecho",
    "Marca la comisura del ojo izquierdo",
    "Marca el borde exterior de la cara (derecha)",
    "Marca el borde exterior de la cara (izquierda)"
];

// ------------------------------------------
//     🔥 FIX IMPORTANTE PARA LOS CLICS 🔥
// ------------------------------------------
function resizeCanvasToDisplaySize() {
    const box = document.querySelector(".image-box");

    // El canvas SIEMPRE debe coincidir 1:1 con lo que se ve
    canvas.width = box.clientWidth;
    canvas.height = box.clientHeight;
}

// ------------------------------------------

file.addEventListener("change", e => {
    const reader = new FileReader();
    reader.onload = () => img.src = reader.result;
    reader.readAsDataURL(e.target.files[0]);
});

img.onload = () => {
    resizeCanvasToDisplaySize();  // 👈 ahora funciona siempre

    points = [];
    pointIndex = 0;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    nextBtn.classList.remove("hidden");
    calculateBtn.classList.add("hidden");

    updateInstruction();
};

// ----------------------------
//     CLICK PARA MARCAR PUNTO
// ----------------------------
canvas.addEventListener("click", e => {
    resizeCanvasToDisplaySize();  // 👈 asegura coordenadas correctas SIEMPRE

    const rect = canvas.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    drawPoint(x, y);
    points.push({ x, y });

    pointIndex++;

    if (pointIndex < steps.length) {
        updateInstruction();
    } else {
        instruction.textContent = "Todos los puntos listos ✔";
        nextBtn.classList.add("hidden");
        calculateBtn.classList.remove("hidden");
    }
});

// ---------------------------------
function drawPoint(x, y) {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
}

function updateInstruction() {
    instruction.textContent = steps[pointIndex];
}
// ---------------------------------

// ---------------------------------
//   SISTEMA DE CÁLCULO ESTRICTO
// ---------------------------------
calculateBtn.addEventListener("click", () => {
    const score = calculateStrictScore();
    resultBox.innerHTML = score;
});

function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function calculateStrictScore() {

    const hair = points[0];
    const brow = points[1];
    const nose = points[2];
    const chin = points[3];

    const rightEye = points[4];
    const leftEye = points[5];

    const rightFace = points[6];
    const leftFace = points[7];

    const upper = dist(hair, brow);
    const middle = dist(brow, nose);
    const lower = dist(nose, chin);

    const ideal = (Math.abs(upper - middle) + Math.abs(middle - lower)) / ((upper + middle + lower) / 3);

    const eyeWidthDiff = Math.abs(dist(rightEye, leftEye) - dist(leftEye, rightEye));
    const width = dist(rightFace, leftFace);
    const height = dist(hair, chin);

    const facialRatio = Math.abs((height / width) - 1.618);

    let rawScore = 100
        - ideal * 20
        - facialRatio * 35
        - (eyeWidthDiff / 10)
        - ((upper + middle + lower) / height) * 12;

    rawScore = Math.max(0, Math.min(100, rawScore));

    return `
        <b>Puntaje estricto:</b> ${rawScore.toFixed(1)}%<br><br>
        <b>Interpretación:</b><br>
        ${strictInterpretation(rawScore)}
    `;
}

function strictInterpretation(score) {
    if (score >= 90) return "Rostro altamente armónico (top 1%)";
    if (score >= 80) return "Muy armónico";
    if (score >= 70) return "Armónico moderado";
    if (score >= 55) return "Armonía baja — rasgos desbalanceados";
    return "Poca armonía — varios factores fuera del equilibrio";
}
