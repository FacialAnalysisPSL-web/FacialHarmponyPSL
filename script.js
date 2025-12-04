//---------------------------------------------------
// 1. Ratios e ideales
//---------------------------------------------------

const ratios = [
    { name: "Midface", ideal: 1.00, points: 2,
      instructions: "Marca: (1) Philtrum — (2) Mentón" },

    { name: "FWHR", ideal: 1.99, points: 4,
      instructions: "Marca: (1) Pómulo izq — (2) Pómulo der — (3) Labio sup — (4) Entrecejo" },

    { name: "Facial Height", ideal: 1.37, points: 2,
      instructions: "Marca: (1) Hairline — (2) Mentón" },

    { name: "Jaw Width", ideal: 1.45, points: 2,
      instructions: "Marca: (1) Mandíbula izq — (2) Mandíbula der" },

    { name: "Chin-Philtrum", ideal: 2.40, points: 2,
      instructions: "Marca: (1) Philtrum — (2) Mentón" },

    { name: "Nose Width", ideal: 1.32, points: 2,
      instructions: "Marca: (1) Fosa izq — (2) Fosa der" },

    { name: "Eye Ratio", ideal: 0.38, points: 2,
      instructions: "Marca: (1) Ojo izq — (2) Ojo der" },

    { name: "Lip Ratio", ideal: 1.68, points: 2,
      instructions: "Marca: (1) Comisura izq — (2) Comisura der" },

    { name: "Mandible Angle", ideal: 1.55, points: 2,
      instructions: "Marca: (1) Ángulo mandibular izq — (2) Ángulo mandibular der" },

    { name: "Cheekbone Ratio", ideal: 1.60, points: 2,
      instructions: "Marca: (1) Pómulo izq — (2) Pómulo der" },

    { name: "Golden Ratio", ideal: 1.62, points: 3,
      instructions: "Marca: (1) Hairline — (2) Ceja — (3) Mentón" }
];


//---------------------------------------------------
// 2. Cargar imagen
//---------------------------------------------------

const img = document.getElementById("uploadedImage");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const fileInput = document.getElementById("fileInput");

fileInput.onchange = e => {
    const file = e.target.files[0];
    img.src = URL.createObjectURL(file);

    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        startProcess();
    };
};


//---------------------------------------------------
// 3. Proceso de selección de puntos
//---------------------------------------------------

let current = 0;
let clickedPoints = [];
let allResults = [];

function startProcess() {
    document.getElementById("instructions").innerHTML =
        ratios[current].instructions;

    clickedPoints = [];

    canvas.onclick = event => {
        const r = canvas.getBoundingClientRect();
        const x = event.clientX - r.left;
        const y = event.clientY - r.top;

        clickedPoints.push({ x, y });

        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();

        if (clickedPoints.length === ratios[current].points) {
            document.getElementById("nextBtn").disabled = false;
        }
    };
}


//---------------------------------------------------
// 4. Distancia
//---------------------------------------------------

function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}


//---------------------------------------------------
// 5. Botón SIGUIENTE
//---------------------------------------------------

document.getElementById("nextBtn").onclick = () => {

    let val;

    if (ratios[current].name === "FWHR") {
        const w = dist(clickedPoints[0], clickedPoints[1]);
        const h = dist(clickedPoints[2], clickedPoints[3]);
        val = w / h;
    } else {
        val = dist(clickedPoints[0], clickedPoints[1]);
    }

    allResults.push({
        name: ratios[current].name,
        ideal: ratios[current].ideal,
        value: val
    });

    current++;

    ctx.drawImage(img, 0, 0);

    if (current < ratios.length) {
        document.getElementById("instructions").innerHTML =
            ratios[current].instructions;

        clickedPoints = [];
        document.getElementById("nextBtn").disabled = true;
    }
    else {
        document.getElementById("instructions").innerHTML =
            "Ya puedes calcular el resultado final.";
        document.getElementById("nextBtn").disabled = true;
        document.getElementById("calculateBtn").disabled = false;
    }
};


//---------------------------------------------------
// 6. Cálculo estricto
//---------------------------------------------------

document.getElementById("calculateBtn").onclick = () => {

    const k = 3;
    let product = 1;

    let html = `
        <div style="margin-top:25px;">
        <h2>Resultados</h2>
    `;

    allResults.forEach(r => {
        const error = Math.abs(r.value - r.ideal) / r.ideal;
        const score = 100 * Math.exp(-k * error);

        product *= score;

        html += `<p><b>${r.name}</b>: ${score.toFixed(1)}%</p>`;
    });

    const finalScore = Math.pow(product, 1 / allResults.length);

    html += `
        <h1 style="color:#27b36a;">
            Armonía Facial: ${finalScore.toFixed(1)}%
        </h1>
        </div>
    `;

    document.getElementById("results").innerHTML = html;
};
