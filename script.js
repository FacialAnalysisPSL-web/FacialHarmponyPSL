const image = document.getElementById("faceImage");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const instruction = document.getElementById("instruction");
const calculateBtn = document.getElementById("calculateBtn");
const downloadCsvBtn = document.getElementById("downloadCsvBtn");

let points = [];
let pointIndex = 0;

const pointNames = [
    "Pupila izquierda","Pupila derecha","Borde interno ojo izquierdo","Borde externo ojo izquierdo",
    "Borde interno ojo derecho","Borde externo ojo derecho","Fosa nasal izquierda","Fosa nasal derecha",
    "Base nasal","Entrecejo / Glabella","Comisura izquierda","Comisura derecha",
    "Pómulo izquierdo","Pómulo derecho","Mandíbula izquierda","Mandíbula derecha",
    "Parte superior del labio superior","Parte inferior del labio inferior","Mentón",
    "Parte izquierda del mentón","Parte derecha del mentón","Hairline / línea del cabello"
];

// ---------- CARGAR IMAGEN ----------
document.getElementById("imageUpload").addEventListener("change", loadImage);

function loadImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        image.onload = function() {
            image.style.display = "block";
            setTimeout(() => {
                canvas.width = image.clientWidth;
                canvas.height = image.clientHeight;
                canvas.style.width = image.clientWidth + "px";
                canvas.style.height = image.clientHeight + "px";
                canvas.style.display = "block";
                points = [];
                pointIndex = 0;
                updateInstruction();
            },50);
        };
        image.src = evt.target.result;
    };
    reader.readAsDataURL(file);
}

// ---------- PUNTOS ----------
canvas.addEventListener("click", function(event) {
    if(pointIndex >= 22) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    points.push({x, y});
    drawPoint(x, y);
    pointIndex++;
    updateInstruction();
    if(pointIndex === 22) {
        calculateBtn.style.display = "inline-block";
        instruction.textContent = "Todos los puntos colocados. Presiona CALCULAR.";
    }
});

function drawPoint(x,y) {
    ctx.fillStyle="red";
    ctx.beginPath();
    ctx.arc(x,y,4,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle="white";
    ctx.font="14px Arial";
    ctx.fillText(points.length, x+6, y-6);
}

function updateInstruction() {
    if(pointIndex < 22){
        instruction.textContent=`Coloca: ${pointNames[pointIndex]}`;
    }
}

// ---------- CALCULOS ----------
function dist(p1,p2){return Math.sqrt((p1.x-p2.x)**2+(p1.y-p2.y)**2);}
function deviationPercent(value, ideal){return Math.abs(value-ideal)/ideal*100;}
function penalty(basePts, dev){return basePts*(dev/100);}

calculateBtn.addEventListener("click", calculateMetrics);

function calculateMetrics(){
    let R="";
    let scores=[];

    function addMetric(name, observed, ideal, basePoints){
        const dev=deviationPercent(observed, ideal);
        const pen=penalty(basePoints, dev);
        const finalPts=basePoints-pen;
        scores.push(finalPts);
        R+=`<div class="metric">
            <h3>${name}</h3>
            <p><b>Valor observado:</b> ${observed.toFixed(3)}</p>
            <p><b>Valor ideal:</b> ${ideal}</p>
            <p><b>% de desviación:</b> ${dev.toFixed(2)}%</p>
            <p><b>Puntos base:</b> ${basePoints}</p>
            <p><b>Penalización:</b> -${pen.toFixed(3)}</p>
            <p><b>Puntaje final:</b> ${finalPts.toFixed(3)}</p>
            <hr></div>`;
    }

    // 1️⃣ Midface ratio
    const mid_h=Math.abs(points[16].y - ((points[0].y+points[1].y)/2));
    const mid_w=dist(points[0],points[1]);
    addMetric("Midface Ratio", mid_h/mid_w, 1.0, 15);

    // 2️⃣ FWHR
    addMetric("FWHR", dist(points[12],points[13])/dist(points[9],points[16]), 1.99, 10);

    // 3️⃣ Face height
    addMetric("Face Height", dist(points[21],points[18])/dist(points[12],points[13]),1.37,8);

    // 4️⃣ E.S ratio
    addMetric("E.S Ratio", dist(points[0],points[1])/dist(points[12],points[13]),0.46,7);

    // 5️⃣ Jaw width
    addMetric("Jaw Width", dist(points[14],points[15])/dist(points[12],points[13]),0.94,12);

    // 6️⃣ Nose length to height
    addMetric("Nose Length/Height", dist(points[9],points[8])/dist(points[6],points[7]),1.45,6);

    // 7️⃣ Nose width
    addMetric("Nose Width", dist(points[6],points[7])/dist(points[12],points[13]),0.25,6);

    // 8️⃣ Nose–lips
    addMetric("Nose-Lips", dist(points[10],points[11])/dist(points[6],points[7]),1.55,5);

    // 9️⃣ Nose=Chin
    addMetric("Nose=Chin", dist(points[6],points[7])/dist(points[19],points[20]),1.0,8);

    // 🔟 Chin to philtrum
    addMetric("Chin-Philtrum", dist(points[18],points[17])/dist(points[16],points[8]),2.40,10);

    // 1️⃣1️⃣ One-eye distance
    const eye_L=dist(points[3],points[2]);
    const eye_R=dist(points[5],points[4]);
    const inter=dist(points[0],points[1]);
    addMetric("One-Eye Distance", eye_L/inter,1.0,13); // Simplificación para ejemplo

    // Puntaje final promedio
    const totalFinal=scores.reduce((a,b)=>a+b,0);
    const avg=totalFinal/scores.length;
    R+=`<h2>Puntaje final promedio: ${avg.toFixed(2)}</h2>`;

    document.getElementById("results").innerHTML=R;
    downloadCsvBtn.style.display="inline-block";
}

// ---------- DESCARGAR CSV ----------
downloadCsvBtn.addEventListener("click", function(){
    const rows = document.querySelectorAll("#results .metric");
    let csv="Métrica,Valor observado,Valor ideal,% desviación,Puntos base,Penalización,Puntaje final\n";

    rows.forEach(r=>{
        const p=r.querySelectorAll("p");
        csv+=`${r.querySelector("h3").innerText},${p[0].innerText.split(": ")[1]},${p[1].innerText.split(": ")[1]},${p[2].innerText.split(": ")[1]},${p[3].innerText.split(": ")[1]},${p[4].innerText.split(": ")[1]},${p[5].innerText.split(": ")[1]}\n`;
    });

    const blob=new Blob([csv],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download="analisis_facial.csv";
    a.click();
    URL.revokeObjectURL(url);
});
