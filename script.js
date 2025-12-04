// Analizador de Armonía Facial — Modo ESTRICTO
// 22 puntos, 11 métricas. Scoring estricto (exponencial) y penalización por varias métricas malas.

// ---------- CONFIG ----------
const POINT_NAMES = [
  "Pupila izquierda","Pupila derecha",
  "Borde interno ojo izquierdo","Borde externo ojo izquierdo",
  "Borde interno ojo derecho","Borde externo ojo derecho",
  "Fosa nasal izquierda","Fosa nasal derecha",
  "Base de la nariz","Entrecejo / Glabella",
  "Comisura izquierda","Comisura derecha",
  "Pómulo izquierdo","Pómulo derecho",
  "Mandíbula izquierda","Mandíbula derecha",
  "Parte superior del labio superior","Parte inferior del labio inferior",
  "Mentón (punto más bajo)","Parte izquierda del mentón",
  "Parte derecha del mentón","Hairline / línea del cabello (centro frontal)"
];

// Pesos estrictos (suman 1.0). Más peso a métricas críticas.
const WEIGHTS = {
  midface: 0.20,
  fwhr: 0.14,
  face_height: 0.14,
  es_ratio: 0.08,
  jaw_width: 0.12,
  nose_ratio: 0.10,
  nose_width: 0.04,
  nose_lips: 0.04,
  nose_chin: 0.04,
  chin_philtrum: 0.05,
  one_eye: 0.05
};

// Valores ideales
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

// ---------- DOM ----------
const canvas = document.getElementById("photoCanvas");
const ctx = canvas.getContext("2d");
const imageUpload = document.getElementById("imageUpload");
const instructions = document.getElementById("instructions");
const resetBtn = document.getElementById("resetBtn");
const calculateBtn = document.getElementById("calculateBtn");
const downloadCsv = document.getElementById("downloadCsv");
const resultsEl = document.getElementById("results");
const explainEl = document.getElementById("explain");

let img = new Image();
let points = []; // {x,y}
let csvContent = "";

// ---------- UTIL ----------
function dist(a,b){ return Math.hypot(a.x - b.x, a.y - b.y); }
function clearCanvas(){ ctx.clearRect(0,0,canvas.width,canvas.height); if(img.src) ctx.drawImage(img,0,0,canvas.width,canvas.height); }
function drawAllPoints(){
  clearCanvas();
  ctx.font = "14px Inter, Arial";
  for(let i=0;i<points.length;i++){
    const p = points[i];
    ctx.beginPath(); ctx.fillStyle = "#ff6b6b"; ctx.arc(p.x,p.y,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillText(String(i+1), p.x+8, p.y-8);
  }
}

// ---------- IMAGE LOAD ----------
imageUpload.addEventListener("change", e=>{
  const f = e.target.files[0];
  if(!f) return;
  img.src = URL.createObjectURL(f);
  img.onload = ()=>{
    // fit canvas to image natural size but limit large width for usability
    const maxW = 1000;
    const scale = Math.min(1, maxW / img.width);
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    clearCanvas();
    points = [];
    updateInstruction();
    resetBtn.classList.remove("hidden");
    calculateBtn.classList.add("hidden");
    downloadCsv.classList.add("hidden");
    resultsEl.innerHTML = "";
    explainEl.innerHTML = "";
  };
});

// ---------- CLICK TO ADD POINT ----------
canvas.addEventListener("click", e=>{
  if(points.length >= POINT_NAMES.length) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  points.push({x,y});
  drawAllPoints();
  updateInstruction();
  if(points.length === POINT_NAMES.length){
    instructions.innerHTML = "<strong>Todos los puntos colocados ✅</strong>";
    calculateBtn.classList.remove("hidden");
  }
});

resetBtn.addEventListener("click", ()=> location.reload());

// ---------- INSTRUCTIONS ----------
function updateInstruction(){
  const i = points.length;
  if(i < POINT_NAMES.length){
    instructions.innerHTML = `Coloca el punto <strong>${i+1}</strong>: ${POINT_NAMES[i]}`;
  } else {
    instructions.innerHTML = "Listo: presiona CALCULAR";
  }
}

// ---------- SCORING (MUY ESTRICTO) ----------
/*
 Scoring strategy estricto:
 - rel = |v - ideal| / ideal
 - puntaje individual base = 95 * exp(-k * rel) con k=8 -> pequeñas desviaciones caen rápido.
 - Si rel > 0.25 se aplica multiplicador severo (base *= 0.4).
 - Luego, final raw = sum(score_i * weight_i)
 - Contar métricas con rel > 0.12 (significativas). Aplicar penalización global: final *= 0.90^countBad
 - Resultado final cap en [0,95].
*/
function strictScore(value, ideal){
  const rel = Math.abs(value - ideal) / (ideal || 1);
  const k = 8.0;
  let base = 95 * Math.exp(-k * rel);
  if(rel > 0.25) base *= 0.4;
  return {score: Math.max(0, base), rel};
}

// ---------- METRICS CALC ----------
function computeMetrics(){
  if(points.length < POINT_NAMES.length) throw new Error("Faltan puntos");

  const p = points;

  // helpers for specific expected points (indexes 0..21)
  // indices map to POINT_NAMES order above.

  // distances
  const pupilDist = dist(p[0], p[1]); // pupila izq - der

  // 1) Midface ratio
  // altura_midface = distancia vertical entre superior labio sup (index 16) y línea pupilar (promedio y)
  const pupY = (p[0].y + p[1].y) / 2;
  const midfaceHeight = Math.abs(p[16].y - pupY);
  const midface = midfaceHeight / (pupilDist || 1);

  // 2) FWHR = dist(pómulo izq (12), pómulo der (13)) / dist(entrecejo(9), parte superior labio sup (16))
  const cheekWidth = dist(p[12], p[13]);
  const browToLip = dist(p[9], p[16]);
  const fwhr = cheekWidth / (browToLip || 1);

  // 3) Face height
  const hairline = p[21];
  const chin = p[18];
  const face_height = dist(hairline, chin) / (cheekWidth || 1);

  // 4) ES ratio
  const es_ratio = pupilDist / (cheekWidth || 1);

  // 5) Jaw width
  const jaw_width = dist(p[14], p[15]) / (cheekWidth || 1);

  // 6) Nose length to width
  const nose_length = dist(p[9], p[8]); // entrecejo(9) - base nar (8)
  const nose_width = dist(p[6], p[7]); // fosa izq(6) - fosa der(7)
  const nose_ratio = nose_length / (nose_width || 1);

  // 7) Nose width normalized
  const nose_width_norm = nose_width / (cheekWidth || 1);

  // 8) Nose–lips
  const mouthWidth = dist(p[10], p[11]);
  const nose_lips = mouthWidth / (nose_width || 1);

  // 9) Nose = Chin (nose width / ancho del mentón (lado izq(19) - derecho(20)))
  const chinWidth = dist(p[19], p[20]) || 1;
  const nose_chin = nose_width / chinWidth;

  // 10) Chin to philtrum
  const philtrum = dist(p[16], p[8]) || 1; // sup labio sup (16) - base nar (8)
  const chin_len = dist(p[18], p[17]) || 1; // mentón(18) - parte inferior labio inf(17)
  const chin_philtrum = chin_len / philtrum;

  // 11) One-eye distance (balance eyeL : inter : eyeR ideally 1:1:1)
  const eyeL = dist(p[3], p[2]); // borde ext izq - borde int izq
  const eyeR = dist(p[5], p[4]); // borde ext der - borde int der
  const inter = pupilDist;
  // We'll compare ratios normalized to eyeL (ideal eyeL=inter=eyeR -> ratio = 1)
  const one_eye = ((eyeL/(eyeL||1)) + (inter/(eyeL||1)) + (eyeR/(eyeL||1))) / 3.0;

  const metrics = {
    midface, fwhr, face_height, es_ratio, jaw_width,
    nose_ratio, nose_width: nose_width_norm, nose_lips, nose_chin, chin_philtrum, one_eye
  };

  return metrics;
}

// ---------- CALCULAR Y MOSTRAR ----------
calculateBtn.addEventListener("click", ()=> {
  try {
    const metrics = computeMetrics();

    // scoring individual
    const details = [];
    let weightedSum = 0;
    let badCount = 0;
    const individual = {};

    for(const key in metrics){
      const val = metrics[key];
      const ideal = IDEALS[key];
      const {score, rel} = strictScore(val, ideal);
      individual[key] = {value: val, ideal, rel, score};
      weightedSum += score * (WEIGHTS[key] || 0);
      if(rel > 0.12) badCount++; // rel >12% considered significant
    }

    // global penalty si varias métricas son malas
    const penaltyFactor = Math.pow(0.90, badCount); // cada métrica mala reduce 10% (compuesto)
    let finalRaw = weightedSum;
    let final = finalRaw * penaltyFactor;

    // asegurar límites
    final = Math.max(0, Math.min(95, final));

    // construir CSV
    const rows = [["Métrica","Valor observado","Ideal","Desviación %","Puntaje individual"]];
    for(const k in individual){
      const it = individual[k];
      rows.push([k, it.value.toFixed(4), it.ideal, (it.rel*100).toFixed(2), it.score.toFixed(2)]);
    }
    rows.push(["Puntaje final", final.toFixed(2),"","", ""]);
    csvContent = rows.map(r => r.join(",")).join("\n");

    // mostrar en UI
    let html = `<h2>Puntaje final (modo ESTRICTO): ${final.toFixed(2)} / 95</h2>`;
    html += `<p style="color:#ffd8a8">Métricas con desviación >12%: <strong>${badCount}</strong> → penalización aplicada</p>`;
    html += `<div>`;
    for(const k in individual){
      const it = individual[k];
      const devPct = (it.rel*100).toFixed(2);
      html += `<div class="metric">
        <b>${k}</b><br>
        Observado: ${it.value.toFixed(4)} — Ideal: ${it.ideal} — Desviación: ${devPct}%<br>
        Puntaje individual: ${it.score.toFixed(2)} / 95
      </div>`;
    }
    html += `</div>`;

    resultsEl.innerHTML = html;
    explainEl.innerHTML = `
      <strong>Explicación del modo estricto:</strong>
      <ul>
        <li>Se usa una curva exponencial para que desviaciones pequeñas (p. ej. 5–10%) ya reduzcan el puntaje considerablemente.</li>
        <li>Si hay varias métricas con >12% de desviación, se aplica una penalización global (10% compuesta por each).</li>
        <li>Máximo teórico: 95 (nunca 100). Esto evita inflar resultados.</li>
      </ul>
    `;

    // mostrar botones CSV
    downloadCsv.classList.remove("hidden");
    downloadCsv.onclick = () => {
      const blob = new Blob([csvContent], {type: "text/csv"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "resultados_estricto.csv";
      a.click();
    };
  } catch(err){
    alert("Error: " + err.message);
  }
});

// ---------- mostrar instrucciones iniciales ----------
updateInstruction();
