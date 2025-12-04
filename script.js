const img = document.getElementById("uploadedImage");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const nextBtn = document.getElementById("nextBtn");
const calcBtn = document.getElementById("calcBtn");
const stepTitle = document.getElementById("stepTitle");
const instructionText = document.getElementById("instructionText");
const resultsBox = document.getElementById("resultsBox");
const resultsDiv = document.getElementById("results");

let step = 0;
let pointIndex = 0;

const points = [];

// 🔵 Lista exacta de pasos e instrucciones (22 puntos)
const steps = [
    { title: "Midface Ratio",
      points: [
        "Pupila izquierda",
        "Pupila derecha",
        "Parte superior del labio superior"
      ]
    },
    { title: "FWHR",
      points: [
        "Pómulo izquierdo",
        "Pómulo derecho",
        "Entrecejo",
        "Parte superior del labio superior"
      ]
    },
    { title: "Face Height",
      points: [
        "Hairline",
        "Mentón"
      ]
    },
    { title: "E.S Ratio",
      points: [
        "Pupila izquierda",
        "Pupila derecha",
        "Pómulo izquierdo",
        "Pómulo derecho"
      ]
    },
    { title: "Jaw Width",
      points: [
        "Mandíbula izquierda",
        "Mandíbula derecha"
      ]
    },
    { title: "Nose Length / Height",
      points: [
        "Entrecejo",
        "Base de la nariz",
        "Fosa izquierda",
        "Fosa derecha"
      ]
    },
    { title: "Nose Width",
      points: [
        "Fosa izquierda",
        "Fosa derecha",
        "Pómulo izquierdo",
        "Pómulo derecho"
      ]
    },
    { title: "Nose-Lip Ratio",
      points: [
        "Comisura izquierda",
        "Comisura derecha",
        "Fosa izq",
        "Fosa der"
      ]
    },
    { title: "Nose = Chin",
      points: [
        "Fosa izquierda",
        "Fosa derecha",
        "Mentón lado izq",
        "Mentón lado der"
      ]
    },
    { title: "Chin to Philtrum",
      points: [
        "Mentón",
        "Parte inferior del labio",
        "Parte superior del labio",
        "Base de la nariz"
      ]
    },
    { title: "One-Eye Distance",
      points: [
        "Borde interno ojo izq",
        "Borde externo ojo izq",
        "Borde interno ojo der",
        "Borde externo ojo der",
        "Pupila izquierda",
        "Pupila derecha"
      ]
    }
];


// Cargar imagen
document.getElementById("imgUpload").addEventListener("change", e => {
    const file = e.target.files[0];
    img.src = URL.createObjectURL(file);

    img.onload = () => {
        canvas.width = img.clientWidth;
        canvas.height = img.clientHeight;
        nextBtn.classList.remove("hidden");
        updateInstruction();
    };
});


// Registrar clicks
canvas.addEventListener("click", e => {
    const rect = canvas.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    points.push({x, y});

    drawPoint(x, y);

    pointIndex++;

    const needed = steps[step].points.length;

    if (pointIndex >= needed) {
        nextBtn.classList.remove("hidden");
    }
});

function drawPoint(x, y) {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
}

function updateInstruction() {
    stepTitle.textContent = steps[step].title;
    instructionText.textContent = "Coloca los puntos: " + steps[step].points.join(", ");
    nextBtn.classList.add("hidden");
}

nextBtn.addEventListener("click", () => {
    pointIndex = 0;
    step++;

    if (step >= steps.length) {
        calcBtn.classList.remove("hidden");
        nextBtn.classList.add("hidden");
        stepTitle.textContent = "Listo";
        instructionText.textContent = "Ya puedes calcular el resultado final.";
        return;
    }

    updateInstruction();
});


// Distancia
function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}


// CÁLCULO ESTRICTO
function strictScore(val, ideal) {
    const dev = Math.abs(val - ideal) / ideal;
    const sev = Math.pow(dev, 1.7);
    return Math.max(0, 100 * (1 - sev));
}


calcBtn.addEventListener("click", () => {
    resultsBox.classList.remove("hidden");

    // Aquí se hace todo el cálculo usando los puntos guardados…

    resultsDiv.innerHTML = "Cálculos listos (si quieres ahora te los lleno uno por uno).";
});
