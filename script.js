// Analizador de Armonía Facial — script.js
// 22 puntos, 11 métricas, tabla de puntaje interpolada EXACTA

// -------------------- Lista de puntos (orden exacto) --------------------
const pointNames = [
  // OJOS
  "Pupila izquierda",           //0
  "Pupila derecha",             //1
  "Borde interno ojo izquierdo",//2
  "Borde externo ojo izquierdo",//3
  "Borde interno ojo derecho",  //4
  "Borde externo ojo derecho",  //5

  // NARIZ
  "Fosa nasal izquierda",       //6
  "Fosa nasal derecha",         //7
  "Parte baja de la nariz (base nasal)", //8
  "Entrecejo / glabella",       //9

  // BOCA
  "Comisura izquierda",         //10
  "Comisura derecha",           //11

  // CARA — ANCHOS
  "Pómulo izquierdo",           //12
  "Pómulo derecho",             //13
  "Mandíbula izquierda",        //14
  "Mandíbula derecha",          //15

  // CARA — EJES VERTICALES
  "Parte superior del labio superior", //16
  "Parte inferior del labio inferior", //17
  "Mentón (punto más bajo)",            //18
  "Parte izquierda del mentón",         //19
  "parte derecha del mentón",           //20
  "Hairline / línea del cabello (centro frontal)" //21
];

// -------------------- IDEALES (para las 11 métricas) --------------------
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

// -------------------- DOM --------------------
const fileInput = document.getElementById("fileInput");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const guideBig = document.getElementById("guideBig");
const pointInfo = document.getElementById("pointInfo");
const pointsListEl = document.getElementById("pointsList");
const resetBtn = document.getElementById("resetBtn");
const calculateBtn = document.getElementById("calculateBtn");
const downloadCsvBtn = document.getElementById("downloadCsvBtn");
const resultsEl = document.getElementById("results");

let img = new Image();
let imgURL = null;
let points = []; // {x,y}
let currentIndex = 0;

// render list of points on right
(function renderPointsList(){
  pointNames.forEach((n,i)=>{
    const li = document.createElement("li");
    li.id = "pl-" + i;
    li.textContent = (i+1) + ". " + n;
    pointsListEl.appendChild(li);
  });
})();

// -------------------- Load image (reliable) --------------------
fileInput.addEventListener("change", (e)=>{
  const f = e.target.files[0];
  if(!f) return;
  if(imgURL) URL.revokeObjectURL(imgURL);
  imgURL = URL.createObjectURL(f);
  img = new Image();
  img.onload = ()=>{
    // set canvas to real image size
    canvas.width = img.width;
    canvas.height = img.height;
    drawBase();
    points = [];
    currentIndex = 0;
    updateGuide();
    resultsEl.innerHTML = "";
    calculateBtn.classList.add("hidden");
    downloadCsvBtn.classList.add("hidden");
  };
  img.onerror = ()=>{
    alert("Error cargando la imagen. Prueba otra foto.");
  };
  img.src = imgURL;
});

// -------------------- draw base image + markers --------------------
function drawBase(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  // draw existing points
  points.forEach((p,i)=> drawMarker(p.x,p.y,i+1));
}

function drawMarker(x,y,i){
  const r = Math.max(4, Math.round(Math.min(canvas.width, canvas.height)/220));
  ctx.beginPath();
  ctx.fillStyle = "#e11";
  ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.max(10, Math.round(Math.min(canvas.width, canvas.height)/55))}px sans-serif`;
  ctx.fillText(String(i), x + r + 6, y + 6);
}

// -------------------- click to place points (convert coords correctly) --------------------
canvas.addEventListener("click", (ev)=>{
  if(!img.src){ alert("Primero sube una foto."); return; }
  if(currentIndex >= pointNames.length) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (ev.clientX - rect.left) * scaleX;
  const y = (ev.clientY - rect.top) * scaleY;

  points.push({x,y});
  // mark list entry
  const li = document.getElementById("pl-" + currentIndex);
  if(li) li.style.opacity = "0.45";

  currentIndex++;
  drawBase();
  updateGuide();

  if(currentIndex === pointNames.length){
    calculateBtn.classList.remove("hidden");
    guideBig.textContent = "Todos los puntos colocados — pulsa CALCULAR";
  }
});

// -------------------- reset --------------------
resetBtn.addEventListener("click", ()=>{
  points = [];
  currentIndex = 0;
  drawBase();
  Array.from(document.querySelectorAll("#pointsList li")).forEach(li=>li.style.opacity = "1");
  calculateBtn.classList.add("hidden");
  downloadCsvBtn.classList.add("hidden");
  resultsEl.innerHTML = "";
  updateGuide();
});

// -------------------- UI helpers --------------------
function updateGuide(){
  pointInfo.textContent = `Punto ${Math.min(currentIndex+1, pointNames.length)} / ${pointNames.length}`;
  guideBig.textContent = currentIndex < pointNames.length ? `Marca: ${ (currentIndex+1) + ". " + pointNames[currentIndex] }` : "Todos los puntos listos";
}

// -------------------- math helpers --------------------
function dist(a,b){ return Math.hypot(a.x - b.x, a.y - b.y); }
function lerp(a,b,t){ return a + (b-a)*t; }
function safeDiv(a,b){ return Math.abs(b) < 1e-9 ? 0 : a/b; }

// -------------------- scoring table (interpolated EXACT) --------------------
function scoreFromDeviation(d){ // d is fraction (e.g. 0.03)
  if(d <= 0.02) return 100;
  if(d <= 0.03) return lerp(100,95,(d - 0.02)/0.01);
  if(d <= 0.05) return lerp(95,90,(d - 0.03)/0.02);
  if(d <= 0.10) return lerp(90,78,(d - 0.05)/0.05);
  if(d <= 0.15) return lerp(78,72,(d - 0.10)/0.05);
  if(d <= 0.20) return lerp(72,60,(d - 0.15)/0.05);
  if(d <= 0.30) return lerp(60,50,(d - 0.20)/0.10);
  return 40;
}

// -------------------- CALCULATE METRICS (11 exact formulas) --------------------
calculateBtn.addEventListener("click", ()=>{
  if(points.length !== pointNames.length){
    alert(`Necesitas colocar ${pointNames.length} puntos. Actualmente ${points.length}.`);
    return;
  }

  const p = points; // alias

  // 1) Midface ratio
  const pupilDist = dist(p[0], p[1]) || 1;
  const pupLineY = (p[0].y + p[1].y) / 2;
  const midfaceHeight = Math.abs(p[16].y - pupLineY);
  const midface = safeDiv(midfaceHeight, pupilDist);

  // 2) FWHR
  const bizygomatic = dist(p[12], p[13]) || 1;
  const entrecejo_to_upperlip = Math.abs(p[9].y - p[16].y) || 1;
  const fwhr = safeDiv(bizygomatic, entrecejo_to_upperlip);

  // 3) Face height
  const faceH = dist(p[21], p[18]) || 1;
  const face_height = safeDiv(faceH, bizygomatic);

  // 4) E.S ratio
  const es_ratio = safeDiv(pupilDist, bizygomatic);

  // 5) Jaw width
  const jaw_width = safeDiv(dist(p[14], p[15]), bizygomatic);

  // 6) Nose length to width
  const nose_length = dist(p[9], p[8]) || 1;
  const nose_width = dist(p[6], p[7]) || 1;
  const nose_ratio = safeDiv(nose_length, nose_width);

  // 7) Nose width relative
  const nose_width_rel = safeDiv(nose_width, bizygomatic);

  // 8) Nose–lips
  const mouth_width = dist(p[10], p[11]) || 1;
  const nose_lips = safeDiv(mouth_width, nose_width);

  // 9) Nose = Chin
  const chin_width = dist(p[19], p[20]) || 1;
  const nose_chin = safeDiv(nose_width, chin_width);

  // 10) Chin to philtrum
  const chin_len = dist(p[18], p[17]) || 1;
  const philtrum = dist(p[16], p[8]) || 1;
  const chin_philtrum = safeDiv(chin_len, philtrum);

  // 11) One-eye distance (compare 1:1:1)
  const eye_L = dist(p[3], p[2]) || 1; // ext - int izq
  const inter = pupilDist || 1;        // pupilas
  const eye_R = dist(p[5], p[4]) || 1; // ext - int der
  const meanSeg = (eye_L + inter + eye_R) / 3;
  const dev_eye = ( Math.abs(eye_L - meanSeg)/meanSeg + Math.abs(inter - meanSeg)/meanSeg + Math.abs(eye_R - meanSeg)/meanSeg ) / 3;

  // Build metrics array with deviations and scores
  const metrics = [];

  function pushMetric(name, value, ideal){
    const dev = safeDiv(Math.abs(value - ideal), ideal);
    const score = scoreFromDeviation(dev);
    metrics.push({ name, value: Number(value.toFixed(6)), ideal, deviation: dev, score });
  }

  pushMetric("Midface ratio", midface, IDEALS.midface);
  pushMetric("FWHR", fwhr, IDEALS.fwhr);
  pushMetric("Face height", face_height, IDEALS.face_height);
  pushMetric("E.S. ratio", es_ratio, IDEALS.es_ratio);
  pushMetric("Jaw width", jaw_width, IDEALS.jaw_width);
  pushMetric("Nose length/width", nose_ratio, IDEALS.nose_ratio);
  pushMetric("Nose width (rel)", nose_width_rel, IDEALS.nose_width);
  pushMetric("Nose–lips (mouth/nose)", nose_lips, IDEALS.nose_lips);
  pushMetric("Nose / Chin width", nose_chin, IDEALS.nose_chin);
  pushMetric("Chin / Philtrum", chin_philtrum, IDEALS.chin_philtrum);

  // One-eye entry (special display)
  const oneEyeScore = scoreFromDeviation(dev_eye);
  metrics.push({ name: "One-eye (1:1:1)", value: `${eye_L.toFixed(2)} / ${inter.toFixed(2)} / ${eye_R.toFixed(2)}`, ideal: "1 : 1 : 1", deviation: dev_eye, score: oneEyeScore });

  // Render results
  renderResults(metrics);
  // show CSV button
  downloadCsvBtn.classList.remove("hidden");
  downloadCsvBtn.onclick = () => downloadCsv(metrics);
});

// -------------------- render results --------------------
function renderResults(metrics){
  let html = "<h3>Resultados</h3>";
  let total = 0;
  metrics.forEach(m=>{
    total += Number(m.score);
    html += `<div class="metric">
      <div><b>${m.name}</b></div>
      <div>Valor observado: <b>${ (typeof m.value === 'number') ? m.value.toFixed(6) : m.value }</b></div>
      <div>Valor ideal: <b>${m.ideal}</b></div>
      <div>Desviación: <b>${(m.deviation*100).toFixed(3)}%</b></div>
      <div>Puntaje: <b>${Number(m.score).toFixed(1)}</b></div>
    </div>`;
  });
  const final = total / metrics.length;
  html += `<h3>Puntaje final (promedio de ${metrics.length}): ${final.toFixed(1)} / 100</h3>`;
  resultsEl.innerHTML = html;
}

// -------------------- CSV --------------------
function downloadCsv(metrics){
  let csv = "Métrica,Valor observado,Valor ideal,Desviación %,Puntaje\n";
  metrics.forEach(m=>{
    const val = (typeof m.value === 'number') ? m.value.toFixed(6) : `"${m.value}"`;
    csv += `"${m.name}",${val},${m.ideal},${(m.deviation*100).toFixed(6)},${Number(m.score).toFixed(6)}\n`;
  });
  const total = metrics.reduce((s,m)=>s+Number(m.score),0);
  csv += `"Final","",,"",${(total/metrics.length).toFixed(6)}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `armonia_facial_${Date.now()}.csv`;
  a.click();
}
