// Minimal Face Analyzer — script.js
// Usa la tabla EXACTA de desviación → puntaje que solicitaste:
// 0–2%  → 94
// 3%    → 86
// 5%    → 80
// 10%   → 70
// 15%   → 67
// 20%   → 60
// 30%   → 50
// fuera de rango -> 40 (valor por defecto)

const pointNames = [
  // OJOS
  "Pupila izquierda",          //0
  "Pupila derecha",           //1
  "Borde interno ojo izquierdo",//2
  "Borde externo ojo izquierdo",//3
  "Borde interno ojo derecho",  //4
  "Borde externo ojo derecho",  //5

  // NARIZ
  "Fosa nasal izquierda",     //6
  "Fosa nasal derecha",       //7
  "Base nasal (parte baja)",  //8
  "Entrecejo / Glabella",     //9

  // BOCA
  "Comisura izquierda",       //10
  "Comisura derecha",         //11

  // CARA — ANCHOS
  "Pómulo izquierdo",         //12
  "Pómulo derecho",           //13
  "Mandíbula izquierda",      //14
  "Mandíbula derecha",        //15

  // CARA — EJES VERTICALES
  "Parte superior del labio superior", //16
  "Parte inferior del labio inferior", //17
  "Mentón (punto más bajo)",           //18
  "Parte izquierda del mentón",        //19
  "Parte derecha del mentón",          //20
  "Hairline / línea del cabello (centro frontal)" //21
];

const fileInput = document.getElementById("fileInput");
const canvas = document.getElementById("photoCanvas");
const ctx = canvas.getContext("2d");
const pointInfo = document.getElementById("pointInfo");
const pointsListEl = document.getElementById("pointsList");
const resetBtn = document.getElementById("resetBtn");
const calculateBtn = document.getElementById("calculateBtn");
const downloadCsvBtn = document.getElementById("downloadCsv");
const resultsEl = document.getElementById("results");

let img = new Image();
let points = []; // {x,y}
let imgURL = null;

// llenar lista de puntos
(function renderPointsList(){
  pointNames.forEach((n,i)=>{
    const li = document.createElement("li");
    li.id = "pl-"+i;
    li.textContent = (i+1)+". "+n;
    pointsListEl.appendChild(li);
  });
})();

// ---------- Cargar imagen (método fiable) ----------
fileInput.addEventListener("change", (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  if(imgURL) URL.revokeObjectURL(imgURL);
  imgURL = URL.createObjectURL(file);
  img = new Image();
  img.onload = ()=>{
    // ajustar canvas al tamaño real de la imagen (pero que se adapte visualmente por CSS)
    canvas.width = img.width;
    canvas.height = img.height;
    drawBase();
    points = [];
    updateUI();
    resultsEl.innerHTML = "";
    calculateBtn.classList.add("hidden");
    downloadCsvBtn.classList.add("hidden");
  };
  img.onerror = ()=>{
    alert("Error cargando la imagen. Prueba con otra foto.");
  };
  img.src = imgURL;
});

// ---------- Dibujo base ----------
function drawBase(){
  // limpiar
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // dibujar imagen ocupando espacio del canvas
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  // si hay puntos, dibujarlos encima
  points.forEach((p,i)=>{
    drawMarker(p.x, p.y, i+1);
  });
}

function drawMarker(x,y,index){
  // círculo y número (escala absoluta)
  ctx.beginPath();
  ctx.fillStyle = "#ff5b5b";
  ctx.arc(x, y, Math.max(4, Math.round(Math.min(canvas.width, canvas.height)/220)), 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold "+Math.max(10, Math.round(Math.min(canvas.width, canvas.height)/55))+"px sans-serif";
  ctx.fillText(String(index), x+8, y+6);
}

// ---------- Manejar clicks para colocar puntos ----------
canvas.addEventListener("click", (ev)=>{
  if(!img.src) { alert("Primero sube una imagen"); return; }
  if(points.length >= pointNames.length) return;
  const rect = canvas.getBoundingClientRect();
  // convertir client coords a coords del canvas real (considerando escala)
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (ev.clientX - rect.left) * scaleX;
  const y = (ev.clientY - rect.top) * scaleY;

  points.push({x, y});
  // actualizar lista visual
  const li = document.getElementById("pl-"+(points.length-1));
  if(li) li.style.opacity = "0.45";
  drawBase();
  updateUI();

  if(points.length === pointNames.length){
    calculateBtn.classList.remove("hidden");
  }
});

// ---------- Reiniciar ----------
resetBtn.addEventListener("click", ()=>{
  points = [];
  if(img.src) drawBase();
  Array.from(document.querySelectorAll(".points-list li")).forEach(li=>li.style.opacity="1");
  updateUI();
  calculateBtn.classList.add("hidden");
  downloadCsvBtn.classList.add("hidden");
  resultsEl.innerHTML = "";
});

// ---------- Util helpers ----------
function dist(a,b){
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function lerp(a,b,t){ return a + (b-a)*t; }

// ---------- Tu tabla EXACTA: interpolación por tramos ----------
function scoreFromDeviation(d){ // d en unidades (ej: 0.02 = 2%)
  if(d <= 0.02) return 94;
  if(d <= 0.03) return lerp(94, 86, (d - 0.02) / 0.01);
  if(d <= 0.05) return lerp(86, 80, (d - 0.03) / 0.02);
  if(d <= 0.10) return lerp(80, 70, (d - 0.05) / 0.05);
  if(d <= 0.15) return lerp(70, 67, (d - 0.10) / 0.05);
  if(d <= 0.20) return lerp(67, 60, (d - 0.15) / 0.05);
  if(d <= 0.30) return lerp(60, 50, (d - 0.20) / 0.10);
  // fuera de la tabla (dev > 30%)
  return 40;
}

// ---------- Mostrar/ocultar UI ----------
function updateUI(){
  pointInfo.textContent = `Punto ${Math.min(points.length+1, pointNames.length)} / ${pointNames.length} — ${ pointNames[Math.min(points.length, pointNames.length-1)] || '' }`;
}

// ---------- CÁLCULOS (11 métricas EXACTAS) ----------
calculateBtn.addEventListener("click", ()=>{
  if(points.length !== pointNames.length){
    alert(`Necesitas colocar ${pointNames.length} puntos. Actualmente: ${points.length}`);
    return;
  }

  const p = points; // alias

  // helper index map (documentado en el HTML)
  // pupilas: 0,1
  // bordes ojos: 2..5
  // nariz: 6..9 (6 fosa izq,7 fosa der,8 base,9 entrecejo)
  // boca: 10..11
  // pómulos: 12..13
  // mandíbula: 14..15
  // labios: 16..17
  // mentón: 18..20
  // hairline: 21

  // 1) Midface ratio
  const pupilDist = dist(p[0], p[1]) || 1;
  const pupLineY = (p[0].y + p[1].y) / 2;
  const midfaceHeight = Math.abs(p[16].y - pupLineY);
  const midface = midfaceHeight / pupilDist;

  // 2) FWHR
  const bizygomatic = dist(p[12], p[13]) || 1;
  const entrecejo_to_upperlip = Math.abs(p[9].y - p[16].y) || 1;
  const fwhr = bizygomatic / entrecejo_to_upperlip;

  // 3) Face height
  const faceHeight = dist(p[21], p[18]) || 1;
  const face_height = faceHeight / bizygomatic;

  // 4) E.S ratio
  const es_ratio = pupilDist / bizygomatic;

  // 5) Jaw width
  const jaw_width = dist(p[14], p[15]) / bizygomatic;

  // 6) Nose length to width
  const nose_length = dist(p[9], p[8]) || 1;
  const nose_width = dist(p[6], p[7]) || 1;
  const nose_ratio = nose_length / nose_width;

  // 7) Nose width (relative)
  const nose_width_rel = nose_width / bizygomatic;

  // 8) Nose–lips
  const mouth_width = dist(p[10], p[11]) || 1;
  const nose_lips = mouth_width / nose_width;

  // 9) Nose = Chin (nose width / chin width)
  const chin_width = dist(p[19], p[20]) || 1;
  const nose_chin = nose_width / chin_width;

  // 10) Chin to philtrum
  const chin_len = dist(p[18], p[17]) || 1; // mentón ↔ parte inferior labio inferior
  const philtrum = dist(p[16], p[8]) || 1;  // sup labio sup ↔ base nariz
  const chin_philtrum = chin_len / philtrum;

  // 11) One-eye distance  (compare 1:1:1)
  const eye_L = dist(p[3], p[2]) || 1; // borde ext - borde int izq
  const inter = pupilDist || 1; // pupilas
  const eye_R = dist(p[5], p[4]) || 1; // borde ext - borde int der
  const meanSeg = (eye_L + inter + eye_R) / 3;
  const dev_eye = ( Math.abs(eye_L - meanSeg)/meanSeg + Math.abs(inter - meanSeg)/meanSeg + Math.abs(eye_R - meanSeg)/meanSeg ) / 3;

  // ideales
  const IDEALS = {
    midface: 1.0,
    fwhr: 1.99,
    face_height: 1.37,
    es_ratio: 0.46,
    jaw_width: 0.94,
    nose_ratio: 1.45,
    nose_width: 0.25,
    nose_lips: 1.55,
    nose_chin: 1.0,
    chin_philtrum: 2.40,
    one_eye: 1.0
  };

  // construir métricas con desviaciones y puntajes
  const metrics = [];

  function addMetric(name, value, ideal, isCustomValue=false){
    const valNum = (isCustomValue ? value : Number(value));
    const dev = Math.abs(valNum - ideal) / ideal;
    const score = scoreFromDeviation(dev);
    metrics.push({ name, value: valNum, ideal, deviation: dev, score });
  }

  addMetric("Midface ratio", midface, IDEALS.midface);
  addMetric("FWHR", fwhr, IDEALS.fwhr);
  addMetric("Face height", face_height, IDEALS.face_height);
  addMetric("E.S. ratio", es_ratio, IDEALS.es_ratio);
  addMetric("Jaw width", jaw_width, IDEALS.jaw_width);
  addMetric("Nose length/width", nose_ratio, IDEALS.nose_ratio);
  addMetric("Nose width (rel)", nose_width_rel, IDEALS.nose_width);
  addMetric("Nose–lips (mouth/nose)", nose_lips, IDEALS.nose_lips);
  addMetric("Nose / Chin width", nose_chin, IDEALS.nose_chin);
  addMetric("Chin / Philtrum", chin_philtrum, IDEALS.chin_philtrum);
  // one-eye: present value as ratio comparison; use dev_eye for scoring
  const oneEyeScore = scoreFromDeviation(dev_eye);
  metrics.push({ name: "One-eye distance (1:1:1)", value: `${eye_L.toFixed(1)} / ${inter.toFixed(1)} / ${eye_R.toFixed(1)}`, ideal: "1 : 1 : 1", deviation: dev_eye, score: oneEyeScore });

  // mostrar resultados
  let html = "<h3>Resultados</h3>";
  let total = 0;
  metrics.forEach(m=>{
    html += `<div class="metric">
      <div><b>${m.name}</b></div>
      <div>Valor observado: <b>${ (typeof m.value === 'number') ? m.value.toFixed(3) : m.value }</b></div>
      <div>Valor ideal: <b>${m.ideal}</b></div>
      <div>Desviación: <b>${(m.deviation*100).toFixed(2)}%</b></div>
      <div>Puntaje: <b>${m.score.toFixed(1)}</b></div>
    </div>`;
    total += m.score;
  });

  const final = total / metrics.length;
  html += `<h3>Puntaje final (promedio de 11): ${final.toFixed(1)} / 100</h3>`;
  resultsEl.innerHTML = html;

  // CSV
  downloadCsvBtn.classList.remove("hidden");
  downloadCsvBtn.onclick = ()=>{
    let csv = "Métrica,Valor observado,Valor ideal,Desviación %,Puntaje\n";
    metrics.forEach(m=>{
      csv += `"${m.name}","${ (typeof m.value === 'number') ? m.value.toFixed(6) : m.value }","${m.ideal}","${(m.deviation*100).toFixed(6)}","${m.score.toFixed(6)}"\n`;
    });
    csv += `"Final","",,"",${final.toFixed(6)}\n`;
    const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resultados_armonia_${Date.now()}.csv`;
    a.click();
  };
});
