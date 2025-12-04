// script.js
// Versión: wizard paso a paso para la medición manual de 11 ratios.
// Mantén los tres archivos juntos: index.html / style.css / script.js

// ---------- Configuración de pasos y puntos requeridos ----------
const STEPS = [
  // Paso 0: Midface (pupila izq, pupila der, labio superior)
  { id: 'midface', title: 'Midface Ratio', instr: 'Coloca: 1) Pupila izquierda, 2) Pupila derecha, 3) Parte superior del labio (labio superior).', need: ['pupila_izq','pupila_der','labio_superior'] },

  // Paso 1: FWHR (pómulo izq, pómulo der) usa labio_superior ya marcado
  { id: 'fwhr', title: 'FWHR', instr: 'Coloca: Pómulo izquierdo y Pómulo derecho (la altura se calculará con la línea de pómulos y el labio superior).', need: ['pomulo_izq','pomulo_der'] },

  // Paso 2: Face height (hairline, menton) (usa pómulos)
  { id: 'face_height', title: 'Face Height', instr: 'Coloca: Hairline (centro línea del cabello) y Mentón (punto más bajo).', need: ['hairline','menton'] },

  // Paso 3: E.S Ratio (no requiere nuevos puntos; solo cálculo)
  { id: 'es_ratio', title: 'E.S Ratio', instr: 'E.S Ratio se calcula con las pupilas y pómulos ya marcados. Si todo está marcado, presiona "Siguiente" para calcularlo.', need: [] },

  // Paso 4: Jaw width (jaw left, jaw right)
  { id: 'jaw_width', title: 'Jaw Width', instr: 'Coloca: mandíbula izquierda y mandíbula derecha (ancho mandibular).', need: ['jaw_left','jaw_right'] },

  // Paso 5: Nose length to height (entrecejo, base_nariz, fosa_izq, fosa_der)
  { id: 'nose_len', title: 'Nose length to height', instr: 'Coloca: Entrecejo (glabella), Base de la nariz (columela/punta), Fosa nasal izquierda, Fosa nasal derecha.', need: ['entrecejo','base_nariz','fosa_izq','fosa_der'] },

  // Paso 6: Nose-lips (comisura izq, comisura der) (usa fosa_izq/fosa_der)
  { id: 'nose_lips', title: 'Nose–Lips Ratio', instr: 'Coloca: Comisura izquierda y Comisura derecha de la boca.', need: ['comisura_izq','comisura_der'] },

  // Paso 7: Nose = Chin (puntos ancho mentón: chin_left, chin_right)
  { id: 'nose_chin', title: 'Nose = Chin Ratio', instr: 'Coloca: ancho del mentón (punto izquierdo del mentón y punto derecho del mentón).', need: ['chin_left','chin_right'] },

  // Paso 8: Chin to philtrum (labio_inferior) (usa labio_superior y base_nariz)
  { id: 'chin_philtrum', title: 'Chin to Philtrum', instr: 'Coloca: Parte inferior del labio (labio inferior). (Usaremos labio superior y base de la nariz ya marcados).', need: ['labio_inferior'] },

  // Paso 9: One eye distance (eye edges)
  { id: 'one_eye', title: 'One Eye Distance (1:1:1)', instr: 'Coloca: Borde externo ojo izquierdo, Borde interno ojo izquierdo, Borde interno ojo derecho, Borde externo ojo derecho (en ese orden).', need: ['eye_ext_L','eye_int_L','eye_int_R','eye_ext_R'] },

  // Paso final: revisar/calcular todo
  { id: 'final', title: 'Revisar y calcular todo', instr: 'Revisa los puntos y pulsa "Calcular resultados finales".', need: [] }
];

// Ideal values
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
let points = {}; // stores named points, e.g. points['pupila_izq'] = {x,y}
let canvas, ctx, img;
let pointRadius = 6;
let metrics = {}; // store computed metrics

// DOM
const fotoInput = document.getElementById('foto');
const prevBtn = document.getElementById('prevStep');
const nextBtn = document.getElementById('nextStep');
const calcAllBtn = document.getElementById('calcAll');
const resetAllBtn = document.getElementById('resetAll');
const stepTitle = document.getElementById('stepTitle');
const stepInstr = document.getElementById('stepInstr');
const neededList = document.getElementById('neededList');
const statusHelp = document.getElementById('statusHelp');
const metricsTable = document.getElementById('metricsTable');
const finalScoreDiv = document.getElementById('finalScore');
const downloadCsvBtn = document.getElementById('downloadCsv');

// setup canvas
canvas = document.getElementById('canvas');
ctx = canvas.getContext('2d');
img = new Image();

// Helpers
function resizeCanvasToImage() {
  if (!img.width) return;
  // fit to container width while preserving natural size for clicks
  const wrap = canvas.parentElement;
  const maxW = wrap.clientWidth - 24;
  const scale = Math.min(1, maxW / img.width);
  canvas.style.width = Math.round(img.width * scale) + 'px';
  canvas.width = img.width;
  canvas.height = img.height;
  drawAll();
}
window.addEventListener('resize', resizeCanvasToImage);

// load image
fotoInput.addEventListener('change', (ev) => {
  const file = ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

// when image loads
img.onload = () => {
  points = {}; metrics = {};
  resizeCanvasToImage();
  drawAll();
  enableNextIfReady();
};

// draw helper
function drawAll() {
  // draw background
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if (img && img.width) ctx.drawImage(img,0,0,canvas.width,canvas.height);
  // draw labeled points
  let i = 1;
  for (const [name, p] of Object.entries(points)) {
    drawPoint(p.x, p.y, name, i);
    i++;
  }
  // optionally draw connecting lines for certain groups for clarity
  drawGuides();
}

function drawPoint(x,y,name,index){
  ctx.beginPath();
  ctx.fillStyle = '#ff4d4f';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.arc(x,y,pointRadius,0,Math.PI*2);
  ctx.fill();
  ctx.stroke();
  // label
  ctx.fillStyle = '#111';
  ctx.font = '14px sans-serif';
  ctx.fillText(name.replace(/_/g,' '), x + 8, y - 8);
}

// simple guide lines for pómulos or pupilas if exist
function drawGuides(){
  // draw line between pupilas if both present
  if (points.pupila_izq && points.pupila_der) {
    drawLine(points.pupila_izq, points.pupila_der, '#00aaff');
  }
  // line between pómulos
  if (points.pomulo_izq && points.pomulo_der) {
    drawLine(points.pomulo_izq, points.pomulo_der, '#ffa500');
  }
  // line between chin left and right
  if (points.chin_left && points.chin_right) {
    drawLine(points.chin_left, points.chin_right, '#8a2be2');
  }
}
function drawLine(a,b,color){
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.moveTo(a.x,a.y);
  ctx.lineTo(b.x,b.y);
  ctx.stroke();
}

// calculate Euclidean distance
function dist(a,b){
  return Math.hypot(a.x-b.x, a.y-b.y);
}

// projection vertical distance from point p to the line through a-b
function verticalDistanceToLine(a,b,p){
  // line equation ax + by + c = 0 from two points
  const A = b.y - a.y;
  const B = a.x - b.x;
  const C = b.x*a.y - a.x*b.y;
  return Math.abs(A*p.x + B*p.y + C) / Math.hypot(A,B);
}

// STEP management
function renderStep(){
  const step = STEPS[currentStep];
  stepTitle.textContent = `${currentStep+1}. ${step.title}`;
  stepInstr.textContent = step.instr;
  // needed list items reflect which names are missing for this step
  neededList.innerHTML = '';
  step.need.forEach(name=>{
    const li = document.createElement('li');
    li.textContent = `${name.replace(/_/g,' ')}`;
    if (points[name]) {
      li.style.color = '#4caf50';
      li.textContent += ' ✓';
    } else {
      li.style.color = '#c33';
    }
    neededList.appendChild(li);
  });
  // enable/disable next
  enableNextIfReady();
  // draw
  drawAll();
}

function enableNextIfReady(){
  const step = STEPS[currentStep];
  const allPresent = step.need.every(n => !!points[n]);
  // if step has no need (calculation-only), allow next
  nextBtn.disabled = !allPresent && step.need.length>0;
  // if final step, next button disabled
  if (currentStep >= STEPS.length-1) nextBtn.disabled = true;
  // calcAll enabled only when at final step or all steps visited
  const allStepsSatisfied = STEPS.every(s => s.need.every(n => !!points[n]));
  calcAllBtn.disabled = !allStepsSatisfied;
  // download CSV enable if we have metrics
  downloadCsvBtn.disabled = Object.keys(metrics).length === 0;
}

// canvas click handler: assign the click to the next missing needed point in current step
canvas.addEventListener('click', function(e){
  if (!img || !img.width) { alert('Sube primero una foto.'); return; }
  const rect = canvas.getBoundingClientRect();
  // compute click coords in pixel space (canvas natural resolution)
  const clientX = e.clientX;
  const clientY = e.clientY;
  // compute scale between displayed size and natural canvas size
  const displayedWidth = canvas.getBoundingClientRect().width;
  const scale = canvas.width / displayedWidth;
  const x = Math.round((clientX - rect.left) * scale);
  const y = Math.round((clientY - rect.top) * scale);

  const step = STEPS[currentStep];
  // find first missing required point for this step
  const missing = step.need.find(n => !points[n]);
  if (!missing) {
    statusHelp.textContent = 'No hay puntos pendientes para este paso. Presiona Siguiente.';
    return;
  }
  points[missing] = {x,y};
  drawAll();
  renderStep();
});

// navigation
prevBtn.addEventListener('click', ()=>{
  if (currentStep>0) currentStep--;
  renderStep();
});
nextBtn.addEventListener('click', ()=>{
  const step = STEPS[currentStep];
  // if step requires no new points but we want to compute metric, compute it now
  // compute metric for current step if possible:
  computeMetricForStep(step.id);
  if (currentStep < STEPS.length - 1) currentStep++;
  renderStep();
});

// reset
resetAllBtn.addEventListener('click', ()=>{
  if (!confirm('Reiniciar todos los puntos?')) return;
  points = {};
  metrics = {};
  currentStep = 0;
  drawAll();
  renderStep();
  metricsTable.innerHTML = '';
  finalScoreDiv.innerHTML = '';
  downloadCsvBtn.disabled = true;
});

// compute all (final)
calcAllBtn.addEventListener('click', ()=>{
  computeAllMetrics();
  renderMetrics();
  downloadCsvBtn.disabled = false;
});

// download csv
downloadCsvBtn.addEventListener('click', ()=>{
  const csv = generateCSV();
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'resultados_facial.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// compute metric for a single step id (if possible)
function computeMetricForStep(stepId){
  // will compute and store metric in metrics[stepId] = {observed, ideal, deviationPct, score}
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

// Compute functions
function scoreFromObserved(obs, ideal){
  const deviationPct = Math.abs(obs - ideal) / ideal * 100;
  const score = Math.max(0, 100 - deviationPct);
  return {observed: obs, ideal, deviationPct: Number(deviationPct.toFixed(2)), score: Number(score.toFixed(2))};
}

function computeMidface(){
  // need pupila_izq, pupila_der, labio_superior
  if (!points.pupila_izq || !points.pupila_der || !points.labio_superior) return;
  const interp = dist(points.pupila_izq, points.pupila_der);
  // height = vertical distance from labio_superior to line between pupilas
  const height = verticalDistanceToLine(points.pupila_izq, points.pupila_der, points.labio_superior);
  const val = height / interp;
  metrics.midface = scoreFromObserved(val, IDEALS.midface);
}

function computeFWHR(){
  if (!points.pomulo_izq || !points.pomulo_der || !points.labio_superior) return;
  const width = dist(points.pomulo_izq, points.pomulo_der);
  // height for this FWHR: distance from line pómulos to labio_superior
  const height = verticalDistanceToLine(points.pomulo_izq, points.pomulo_der, points.labio_superior);
  const val = width / height;
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
  const val = noseLen / noseWidth;
  metrics.nose_len = scoreFromObserved(val, IDEALS.nose_len);
  // also store nose width metric
  const pomWidth = (points.pomulo_izq && points.pomulo_der) ? dist(points.pomulo_izq, points.pomulo_der) : null;
  if (pomWidth) {
    const val2 = noseWidth / pomWidth;
    metrics.nose_width = scoreFromObserved(val2, IDEALS.nose_width);
  }
}

function computeNoseLips(){
  if (!points.comisura_izq || !points.comisura_der || !points.fosa_izq || !points.fosa_der) return;
  const mouthWidth = dist(points.comisura_izq, points.comisura_der);
  const noseWidth = dist(points.fosa_izq, points.fosa_der);
  const val = mouthWidth / noseWidth;
  metrics.nose_lips = scoreFromObserved(val, IDEALS.nose_lips);
}

function computeNoseChin(){
  if (!points.fosa_izq || !points.fosa_der || !points.chin_left || !points.chin_right) return;
  const noseWidth = dist(points.fosa_izq, points.fosa_der);
  const chinWidth = dist(points.chin_left, points.chin_right);
  const val = noseWidth / chinWidth;
  metrics.nose_chin = scoreFromObserved(val, IDEALS.nose_chin);
}

function computeChinPhiltrum(){
  if (!points.menton || !points.labio_inferior || !points.labio_superior || !points.base_nariz) return;
  const largoMenton = dist(points.menton, points.labio_inferior); // menton -> labio inferior
  const filtrum = dist(points.labio_superior, points.base_nariz); // labio sup -> base nariz
  const val = largoMenton / filtrum;
  metrics.chin_philtrum = scoreFromObserved(val, IDEALS.chin_philtrum);
}

function computeOneEye(){
  if (!points.eye_ext_L || !points.eye_int_L || !points.eye_int_R || !points.eye_ext_R || !points.pupila_izq || !points.pupila_der) return;
  const eyeW_L = dist(points.eye_ext_L, points.eye_int_L);
  const inter = dist(points.pupila_izq, points.pupila_der);
  const eyeW_R = dist(points.eye_ext_R, points.eye_int_R);
  // normalize to mean
  const mean = (eyeW_L + inter + eyeW_R) / 3;
  const nL = eyeW_L / mean;
  const nI = inter / mean;
  const nR = eyeW_R / mean;
  // deviation from 1:1:1
  const devPct = (Math.abs(nL - 1) + Math.abs(nI - 1) + Math.abs(nR - 1)) / 3 * 100;
  const score = Math.max(0, 100 - devPct);
  metrics.one_eye = {observed: `${eyeW_L.toFixed(2)} : ${inter.toFixed(2)} : ${eyeW_R.toFixed(2)}`, ideal: '1:1:1', deviationPct: Number(devPct.toFixed(2)), score: Number(score.toFixed(2))};
}

// compute all
function computeAllMetrics(){
  // compute in logical order (some metrics depend on others)
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
  // ensure nose_width computed by noseLen if pomulos present
  // done
}

// render metrics results
function renderMetrics(){
  metricsTable.innerHTML = '';
  const rows = [];
  // mapping display order
  const order = ['midface','fwhr','face_height','es_ratio','jaw_width','nose_len','nose_width','nose_lips','nose_chin','chin_philtrum','one_eye'];
  order.forEach(key=>{
    const m = metrics[key];
    if (!m) return;
    const row = document.createElement('div');
    row.className = 'metric-row';
    const name = document.createElement('div'); name.className='name';
    name.textContent = key.replace(/_/g,' ').toUpperCase();
    const values = document.createElement('div');
    values.innerHTML = `<div class="small">Observado: ${m.observed} | Ideal: ${m.ideal}</div>
                        <div class="small">Desviación: ${m.deviationPct ?? m.deviationPct === 0 ? m.deviationPct+'%' : '—'} | Puntaje: ${m.score ?? '—'}</div>`;
    row.appendChild(name);
    row.appendChild(values);
    metricsTable.appendChild(row);
  });
  // final score (average of numeric metric scores except one_eye where score exists)
  const numericScores = [];
  for (const k of Object.keys(metrics)) {
    const m = metrics[k];
    if (m && typeof m.score === 'number') numericScores.push(m.score);
  }
  const avg = numericScores.length ? (numericScores.reduce((a,b)=>a+b,0)/numericScores.length) : 0;
  finalScoreDiv.innerHTML = `Puntaje final: <strong style="color:${avg>=80? '#198754': avg>=50? '#f59e0b':'#dc2626'}">${avg.toFixed(2)}</strong> (promedio de ${numericScores.length} métricas)`;
}

// CSV generator
function generateCSV(){
  const headers = ['metric','observed','ideal','deviation_pct','score'];
  const rows = [];
  for (const k of Object.keys(metrics)) {
    const m = metrics[k];
    rows.push([
      k,
      `"${m.observed}"`,
      `"${m.ideal}"`,
      m.deviationPct ?? '',
      m.score ?? ''
    ]);
  }
  const csv = [headers.join(',')].concat(rows.map(r=>r.join(','))).join('\n');
  return csv;
}

// initial render
renderStep();

// optional: keyboard shortcuts for convenience
document.addEventListener('keydown', (e)=>{
  if (e.key === 'ArrowRight') nextBtn.click();
  if (e.key === 'ArrowLeft') prevBtn.click();
});
