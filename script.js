const fileInput = document.getElementById("fileInput");
const canvas = document.getElementById("photoCanvas");
const ctx = canvas.getContext("2d");
const calculateBtn = document.getElementById("calculateBtn");
const resultBox = document.getElementById("result");

let img = new Image();
let points = [];

// ----------------- CARGA DE IMAGEN -----------------
fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    img = new Image();

    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        points = [];
    };

    img.src = url;
});

// ----------------- SELECCIÓN DE PUNTOS -----------------
canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    points.push({ x, y });

    // dibuja punto
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();

    if (points.length === 6) {
        alert("Ya seleccionaste los 6 puntos. Ahora presiona CALCULAR.");
    }
});

// ----------------- DISTANCIA ENTRE 2 PUNTOS -----------------
function distance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ----------------- TABLA DE PUNTOS -----------------
function scoreFromDeviation(dev) {
    if (dev <= 2) return 94;
    if (dev <= 3) return 86;
    if (dev <= 5) return 80;
    if (dev <= 10) return 70;
    if (dev <= 15) return 67;
    if (dev <= 20) return 60;
    return 50; // 30% o más
}

// ----------------- CÁLCULO PRINCIPAL -----------------
calculateBtn.addEventListener("click", () => {
    if (points.length < 6) {
        alert("Faltan puntos por marcar.");
        return;
    }

    const [p1, p2, nose, chin, cheekL, cheekR] = points;

    // medidas reales del rostro
    const eyeDistance = distance(p1, p2);
    const faceHeight = distance(nose, chin);
    const cheekWidth = distance(cheekL, cheekR);

    // proporciones ideales
    const idealEyeToFace = eyeDistance / faceHeight;
    const idealCheekToFace = cheekWidth / faceHeight;

    // ideales de armonía clásicos
    const golden_ideal_1 = 0.46; // ojos / longitud inferior
    const golden_ideal_2 = 0.75; // ancho mejillas / longitud inferior

    const dev1 = Math.abs((idealEyeToFace - golden_ideal_1) / golden_ideal_1) * 100;
    const dev2 = Math.abs((idealCheekToFace - golden_ideal_2) / golden_ideal_2) * 100;

    const score1 = scoreFromDeviation(dev1);
    const score2 = scoreFromDeviation(dev2);

    const finalScore = Math.round((score1 + score2) / 2);

    resultBox.innerHTML = `
        Resultado de Armonía Facial: <br>
        <strong>${finalScore} / 100</strong>
    `;
});
