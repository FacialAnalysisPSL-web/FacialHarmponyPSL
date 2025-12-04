// script.js
// Wizard paso a paso + cálculos con fórmula exponencial para scoring.

// ----- CONFIG: pasos y puntos requeridos -----
const STEPS = [
  // Paso 0: Midface
  { id: 'midface', title: 'Midface Ratio', instr: 'Coloca: 1) Pupila izquierda, 2) Pupila derecha, 3) Parte superior del labio (labio superior).', need: ['pupila_izq','pupila_der','labio_superior'] },

  // Paso 1: FWHR (pómulos + entrecejo + labio_superior ya marcado)
  { id: 'fwhr', title: 'FWHR', instr: 'Coloca: Pómulo izquierdo, Pómulo derecho, Entrecejo (glabella).', need: ['pomulo_izq','pomulo_der','entrecejo'] },

  // Paso 2: Face height (hairline, menton)
  { id: 'face_height', title: 'Face Height', instr: 'Coloca: Hairline (centro frente) y Mentón (punto más bajo).', need: ['hairline','menton'] },

  // Paso 3: E.S Ratio (usa pupilas y pómulos ya marcados)
  { id: 'es_ratio', title: 'E.S Ratio', instr: 'E.S Ratio se calcula con las pupilas y pómulos ya marcados. Si ya están, presiona Siguiente para calcular.', need: [] },

  // Paso 4: Jaw width
  { id: 'jaw_width', title: 'Jaw Width', instr: 'Coloca: mandíbula izquierda y mandíbula derecha (puntos de ancho mandibular).', need: ['jaw_left','jaw_right'] },

  // Paso 5: Nose length & width
  { id: 'nose_len', title: 'Nose length & width', instr: 'Coloca: Entrecejo (si no lo hiciste), Base de la nariz (punta/columela), Fosa nasal izquierda, Fosa nasal derecha.', need: ['base_nariz','fosa_izq','fosa_der'] },

  // Paso 6: Nose–Lips
  { id: 'nose_lips', title: 'Nose–Lips Ratio', instr: 'Coloca: Comisura izquierda y Comisura derecha de la boca.', need: ['comisura_izq','comisura_der'] },

  // Paso 7: Nose = Chin (ancho mentón)
  { id: 'nose_chin', title: 'Nose = Chin', instr: 'Coloca: punto izquierdo del mentón (chin_left) y punto derecho del mentón (chin_right) para ancho del mentón.', need: ['chin_left','chin_right'] },

  // Paso 8: Chin to philtrum
  { id: 'chin_philtrum', title: 'Chin to Philtrum', instr: 'Coloca: Parte inferior del labio (labio_inferior). (Usamos labio_superior y base_nariz si ya están).', need: ['labio_inferior'] },

  // Paso 9: One eye distance (edges)
  { id: 'one_eye', title: 'One Eye Distance', instr: 'Coloca: Borde externo ojo izquierdo, Borde interno ojo izquierdo, Borde interno ojo derecho, Borde externo ojo derecho (en ese orden).', need: ['eye_ext_L','eye_int_L','eye_int_R','eye_ext_R'] },

  // Paso final
  { id: 'final', title: 'Finalizar y calcular', instr: 'Revisa los puntos y pulsa "Calcular resultados finales".', need: [] }
];

// Valores ideales
const IDEALS = {
  midface: 1.0,
  fwhr: 1.99,
  face_height: 1.37,
  es_ratio: 0.46,
  jaw_width: 0.94,
  nose_len: 1.45,
  nose_width: 0.25,
  nose_lips: 1.55,
  nose_chin: 1.0,
  chin_philtrum: 2.40
};

// Estado
let currentStep = 0;
let points = {}; // puntos guardados por nombre
let pointsOrder = []; // orden de clicks (para deshacer)
let metrics = {};

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const fotoInput = document.getElementById('foto');
const prevBtn = document.getElementById('prevStep');
const nextBtn = document.getElementById('nextStep');
const calcAllBtn = document.getElementById('calcAll');
const resetAllBtn = document.getElementById('resetAll');
const undoPointBtn = document.getElementById('undoPoint');
const stepTitle = document.getElementById('stepTitle');
const stepInstr = document.getElementById('stepInstr');
const neededList = document.getElementById('neededList');
const statusHelp = document.getElementById('statusHelp');
const metricsTable = document.getElementById('metricsTable');
const finalScoreDiv = document.getElementById('finalScore');
const downloadCsvBtn = document.getElementById('downloadCsv');

let img = new Image();
let naturalScale = 1;

// ------- Canvas & image handling -------
fotoInput.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => {
    img.src = ev.target.result;
  };
  reader.readAsDataURL(f);
});

img.onload = () => {
  // set canvas to image natural size (we scale via CSS)
  canvas.width = img.width;
  canvas.height = img.height;
  canvas.style.width = Math.min(img.width, canvas.parentElement.clientWidth - 24) + 'px';
  naturalScale = canvas.width / parseFloat(canvas.style.width);
  drawAll();
  renderStep();
  enableNextIfReady();
};

// draw everything
function drawAll(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if (img && img.width) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  // draw guide lines for pupilas and pómulos if exist
  if (points.pupila_izq && points.pupila_der) drawLine(points.pupila_izq, points.pupila_der, '#00aaff');
  if (points.pomulo_izq && points.pomulo_der) drawLine(points.pomulo_izq, points.pomulo_der, '#ffa500');
  // draw points
  let idx = 1;
  for (const name of Object.keys(points)) {
    const p = points[name];
    drawPoint(p.x, p.y, name, idx);
    idx++;
  }
}

function drawPoint(x,y,name,index){
  ctx.beginPath();
  ctx.fillStyle = '#ff4d4f';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.arc(x,y,6,0,Math.PI*2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#111';
  ctx.font = '14px sans-serif';
  // label a la derecha
  ctx.fillText(`${index}. ${name.replace(/_/g,' ')}`, x + 8, y - 8);
}

function drawLine(a,b,color='#0f0'){
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.moveTo(a.x,a.y);
  ctx.lineTo(b.x,b.y);
  ctx.stroke();
}

// scale mouse coordinates from displayed size to canvas size
function getCanvasCoords(clientX, clientY){
  const rect = canvas.getBoundingClientRect();
  // displayed width -> natural canvas width
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;
  return { x: Math.round(x), y: Math.round(y) };
}

// ------- Steps rendering -------
function renderStep(){
  const step = STEPS[currentStep];
  stepTitle.textContent = `${currentStep+1}. ${step.title}`;
  stepInstr.textContent = step.instr;
  neededList.innerHTML = '';
  step.need.forEach(name => {
    const li = document.createElement('li');
    li.textContent = name.replace(/_/g,' ');
    if (points[name]) { li.style.color = '#2a9d8f'; li.textContent += ' ✓'; }
    else li.style.color = '#c33';
    neededList.appendChild(li);
  });
  enableNextIfReady();
  drawAll();
}

function enableNextIfReady(){
  const step = STEPS[currentStep];
  const allPresent = step.need.every(n => !!points[n]);
  nextBtn.disabled = (!allPresent && step.need.length>0) || currentStep >= STEPS.length-1;
  const allStepsSatisfied = STEPS.every(s => s.need.every(n => !!points[n]));
  calcAllBtn.disabled = !allStepsSatisfied;
  downloadCsvBtn.disabled = Object.keys(metrics).length === 0;
}

// ------- Canvas click: assign to first missing for current step -------
canvas.addEventListener('click', (e) => {
  if (!img || !img.width) { alert('Sube primero una foto.'); return; }
  const {x,y} = getCanvasCoords(e.clientX, e.clientY);
  const step = STEPS[currentStep];
  const missing = step.need.find(n => !points[n]);
  if (!missing) {
    statusHelp.textContent = 'No hay puntos pendientes para este paso. Presiona Siguiente.';
    return;
  }
  points[missing] = {x,y};
  pointsOrder.push(missing);
  drawAll();
  renderStep();
});

// undo last point
undoPointBtn.addEventListener('click', () => {
  if (!pointsOrder.length) return;
  const last = pointsOrder.pop();
  delete points[last];
  drawAll();
  renderStep();
});

// navigation buttons
prevBtn.addEventListener('click', () => {
  if (currentStep > 0) currentStep--;
  renderStep();
});

nextBtn.addEventListener('click', () => {
  // compute metric for step if possible
  computeMetricForStep(STEPS[currentStep].id);
  if (currentStep < STEPS.length -1) currentStep++;
  renderStep();
});

// reset
resetAllBtn.addEventListener('click', () => {
  if (!confirm('Reiniciar todos los puntos y métricas?')) return;
  points = {};
  pointsOrder = [];
  metrics = {};
  currentStep = 0;
  drawAll();
  renderStep();
  metricsTable.innerHTML = '';
  finalScoreDiv.innerHTML = '';
  downloadCsvBtn.disabled = true;
});

// calculate all (final)
calcAllBtn.addEventListener('click', () => {
  computeAllMetrics();
  renderMetrics();
  downloadCsvBtn.disabled = false;
});

// download CSV
downloadCsvBtn.addEventListener('click', () => {
  const csv = generateCSV();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'resultados_facial.csv';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

// ------- Math helpers -------
function dist(a,b){ return Math.hypot(a.x - b.x, a.y - b.y); }
function verticalDistanceToLine(a,b,p){
  // Ax + By + C = 0
  const A = b.y - a.y;
  const B = a.x - b.x;
  const C = b.x*a.y - a.x*b.y;
  return Math.abs(A*p.x + B*p.y + C) / Math.hypot(A,B);
}

// scoring: exponential formula (professional)
function scoreFromObserved(obs, ideal){
  if (ideal === 0) return {observed: obs, ideal, deviationPct: 0, score: 0};
  const devRel = Math.abs(obs - ideal) / ideal; // relative (e.g. 0.1 -> 10%)
  const score = 100 * Math.exp(-4 * devRel); // calibrada
  return { observed: Number(obs.toFixed(4)), ideal, deviationPct: Number((devRel*100).toFixed(2)), score: Number(score.toFixed(2)) };
}

// ------- Compute per-step (allows early metric compute) -------
function computeMetricForStep(stepId){
  try {
    switch(stepId){
      case 'midface': computeMidface(); break;
      case 'fwhr': computeFWHR(); break;
      case 'face_height': computeFaceHeight(); break;
      case 'es_ratio': computeES(); break;
      case 'jaw_width': computeJawWidth(); break;
      case 'nose_len': computeNoseLen(); break;
      case 'nose_lips': computeNoseLips(); break;
      case 'nose_chin': computeNoseChin(); break;
      case 'chin_philtrum': computeChinPhiltrum(); break;
      case 'one_eye': computeOneEye(); break;
      default: break;
    }
  } catch(err){
    console.error('Error computing', stepId, err);
  }
}

// ------- Compute all metrics -------
function computeAllMetrics(){
  metrics = {};
  computeMidface();
  computeFWHR();
  computeFaceHeight();
  computeES();
  computeJawWidth();
  computeNoseLen();
  computeNoseLips();
  computeNoseChin();
  computeChinPhiltrum();
  computeOneEye();
}

// ------- Individual compute functions -------

function computeMidface(){
  if (!points.pupila_izq || !points.pupila_der || !points.labio_superior) return;
  const interp = dist(points.pupila_izq, points.pupila_der);
  // height: vertical distance from labio_superior to line between pupilas
  const height = verticalDistanceToLine(points.pupila_izq, points.pupila_der, points.labio_superior);
  const val = height / interp;
  metrics.midface = scoreFromObserved(val, IDEALS.midface);
}

function computeFWHR(){
  if (!points.pomulo_izq || !points.pomulo_der || !points.labio_superior || !points.entrecejo) return;
  const width = dist(points.pomulo_izq, points.pomulo_der);
  // altura: vertical distancia entre labio_superior y entrecejo (tal y como pediste)
  const altura = Math.abs(points.entrecejo.y - points.labio_superior.y);
  if (altura <= 0.0001) return;
  const val = width / altura;
  metrics.fwhr = scoreFromObserved(val, IDEALS.fwhr);
}

function computeFaceHeight(){
  if (!points.hairline || !points.menton || !points.pomulo_izq || !points.pomulo_der) return;
  const height = dist(points.hairline, points.menton);
  const width = dist(points.pomulo_izq, points.pomulo_der);
  const val = height / width;
  metrics.face_height = scoreFromObserved(val, IDEALS.face_height);
}

function computeES(){
  if (!points.pupila_izq || !points.pupila_der || !points.pomulo_izq || !points.pomulo_der) return;
  const interp = dist(points.pupila_izq, points.pupila_der);
  const width = dist(points.pomulo_izq, points.pomulo_der);
  const val = interp / width;
  metrics.es_ratio = scoreFromObserved(val, IDEALS.es_ratio);
}

function computeJawWidth(){
  if (!points.jaw_left || !points.jaw_right || !points.pomulo_izq || !points.pomulo_der) return;
  const jawWidth = dist(points.jaw_left, points.jaw_right);
  const pomWidth = dist(points.pomulo_izq, points.pomulo_der);
  const val = jawWidth / pomWidth;
  metrics.jaw_width = scoreFromObserved(val, IDEALS.jaw_width);
}

function computeNoseLen(){
  if (!points.entrecejo || !points.base_nariz || !points.fosa_izq || !points.fosa_der) return;
  const noseLen = dist(points.entrecejo, points.base_nariz);
  const noseWidth = dist(points.fosa_izq, points.fosa_der);
  if (noseWidth === 0) return;
  const val = noseLen / noseWidth;
  metrics.nose_len = scoreFromObserved(val, IDEALS.nose_len);
  // nose width metric (relative to pómulos)
  if (points.pomulo_izq && points.pomulo_der) {
    const pomWidth = dist(points.pomulo_izq, points.pomulo_der);
    const val2 = noseWidth / pomWidth;
    metrics.nose_width = scoreFromObserved(val2, IDEALS.nose_width);
  }
}

function computeNoseLips(){
  if (!points.comisura_izq || !points.comisura_der || !points.fosa_izq || !points.fosa_der) return;
  const mouthWidth = dist(points.comisura_izq, points.comisura_der);
  const noseWidth = dist(points.fosa_izq, points.fosa_der);
  if (noseWidth === 0) return;
  const val = mouthWidth / noseWidth;
  metrics.nose_lips = scoreFromObserved(val, IDEALS.nose_lips);
}

function computeNoseChin(){
  if (!points.fosa_izq || !points.fosa_der || !points.chin_left || !points.chin_right) return;
  const noseWidth = dist(points.fosa_izq, points.fosa_der);
  const chinWidth = dist(points.chin_left, points.chin_right);
  if (chinWidth === 0) return;
  const val = noseWidth / chinWidth;
  metrics.nose_chin = scoreFromObserved(val, IDEALS.nose_chin);
}

function computeChinPhiltrum(){
  if (!points.menton || !points.labio_inferior || !points.labio_superior || !points.base_nariz) return;
  const largoMenton = dist(points.menton, points.labio_inferior); // menton -> labio inferior
  const filtrum = dist(points.labio_superior, points.base_nariz); // labio sup -> base nariz
  if (filtrum === 0) return;
  const val = largoMenton / filtrum;
  metrics.chin_philtrum = scoreFromObserved(val, IDEALS.chin_philtrum);
}

function computeOneEye(){
  if (!points.eye_ext_L || !points.eye_int_L || !points.eye_int_R || !points.eye_ext_R || !points.pupila_izq || !points.pupila_der) return;
  const eyeW_L = dist(points.eye_ext_L, points.eye_int_L);
  const inter = dist(points.pupila_izq, points.pupila_der);
  const eyeW_R = dist(points.eye_ext_R, points.eye_int_R);
  const mean = (eyeW_L + inter + eyeW_R) / 3;
  if (mean === 0) return;
  const nL = eyeW_L / mean;
  const nI = inter / mean;
  const nR = eyeW_R / mean;
  // deviation relative = avg(|n - 1|)
  const devRel = (Math.abs(nL - 1) + Math.abs(nI - 1) + Math.abs(nR - 1)) / 3; // e.g. 0.1 -> 10%
  const score = 100 * Math.exp(-4 * devRel);
  metrics.one_eye = { observed: `${eyeW_L.toFixed(2)} : ${inter.toFixed(2)} : ${eyeW_R.toFixed(2)}`, ideal: '1:1:1', deviationPct: Number((devRel*100).toFixed(2)), score: Number(score.toFixed(2)) };
}

// ------- render metrics -------
function renderMetrics(){
  metricsTable.innerHTML = '';
  const order = ['midface','fwhr','face_height','es_ratio','jaw_width','nose_len','nose_width','nose_lips','nose_chin','chin_philtrum','one_eye'];
  const numericScores = [];
  for (const key of order){
    const m = metrics[key];
    if (!m) continue;
    const row = document.createElement('div');
    row.className = 'metric-row';
    const name = document.createElement('div'); name.className = 'name';
    name.textContent = key.replace(/_/g,' ').toUpperCase();
    const values = document.createElement('div');
    let observed = (m.observed !== undefined) ? m.observed : (m.observed === 0 ? 0 : '—');
    values.innerHTML = `<div class="small">Observado: ${observed} | Ideal: ${m.ideal}</div>
                        <div class="small">Desviación: ${m.deviationPct ?? '—'}% | Puntaje: ${m.score ?? '—'}</div>`;
    row.appendChild(name); row.appendChild(values);
    metricsTable.appendChild(row);
    if (m && typeof m.score === 'number') numericScores.push(m.score);
  }
  const avg = numericScores.length ? (numericScores.reduce((a,b) => a + b, 0) / numericScores.length) : 0;
  finalScoreDiv.innerHTML = `Puntaje final: <strong style="color:${avg>=80? '#198754': avg>=50? '#f59e0b':'#dc2626'}">${avg.toFixed(2)}</strong> (promedio de ${numericScores.length} métricas)`;
}

// ------- CSV generator -------
function generateCSV(){
  const headers = ['metric','observed','ideal','deviation_pct','score'];
  const rows = [];
  for (const [k,m] of Object.entries(metrics)){
    rows.push([k, `"${m.observed}"`, `"${m.ideal}"`, m.deviationPct ?? '', m.score ?? ''].join(','));
  }
  return [headers.join(',')].concat(rows).join('\n');
}

// ------- compute all when ready -------
function computeAllAndRender(){
  computeAllMetrics();
  renderMetrics();
}

// computeAll invoked from button
function computeAllMetrics(){
  computeAllMetricsCalled();
  // done
}

// helper to avoid name clash
function computeAllMetricsCalled(){
  computeAllMetrics(); // uses functions defined above
}

// initial render
renderStep();
enableNextIfReady();

// keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') nextBtn.click();
  if (e.key === 'ArrowLeft') prevBtn.click();
});
