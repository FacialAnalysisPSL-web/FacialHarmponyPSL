// script.js
// Versión: demostración. Usa face-api.js (debe existir carpeta /models con los modelos descargados).
// NOTA: Para GitHub Pages sube también la carpeta /models (modelos de face-api.js).
const MODEL_URL = './models'; // carpeta local en repo con models descargados

let inputImage = null;
let overlay = null;
let ctx = null;
let analyzeBtn = null;
let downloadBtn = null;
let statusEl = null;

window.addEventListener('load', async () => {
  inputImage = document.getElementById('inputImage');
  overlay = document.getElementById('overlay');
  ctx = overlay.getContext('2d');
  analyzeBtn = document.getElementById('analyzeBtn');
  downloadBtn = document.getElementById('downloadBtn');
  statusEl = document.getElementById('status');

  // cargar modelos
  try {
    statusEl.textContent = 'Cargando modelos (esto puede tardar)...';
    // face detection + landmarks
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    statusEl.textContent = 'Modelos cargados.';
    document.getElementById('imageUpload').addEventListener('change', handleImageUpload);
    analyzeBtn.addEventListener('click', analyzeImage);
    downloadBtn.addEventListener('click', downloadResult);
  } catch (e) {
    statusEl.textContent = 'Error cargando modelos. Asegúrate de haber puesto la carpeta /models en el repo.';
    console.error(e);
  }
});

function handleImageUpload(evt){
  const file = evt.target.files[0];
  if(!file) return;
  const url = URL.createObjectURL(file);
  inputImage.onload = () => {
    fitCanvasToImage();
    analyzeBtn.disabled = false;
    downloadBtn.disabled = true;
    clearOverlay();
    statusEl.textContent = 'Imagen cargada. Presiona "Analizar".';
  };
  inputImage.src = url;
}

function fitCanvasToImage(){
  // tamaño cuadrado máximo 520
  const max = 520;
  const w = inputImage.naturalWidth;
  const h = inputImage.naturalHeight;
  const ratio = Math.min(max / w, max / h, 1);
  const cw = Math.round(w * ratio);
  const ch = Math.round(h * ratio);
  inputImage.width = cw; inputImage.height = ch;
  overlay.width = cw; overlay.height = ch;
  document.querySelector('.canvas-wrap').style.width = cw + 'px';
  document.querySelector('.canvas-wrap').style.height = ch + 'px';
}

function clearOverlay(){
  ctx.clearRect(0,0,overlay.width,overlay.height);
}

async function analyzeImage(){
  statusEl.textContent = 'Analizando…';
  analyzeBtn.disabled = true;
  try {
    const detection = await faceapi.detectSingleFace(inputImage).withFaceLandmarks();
    if(!detection){
      statusEl.textContent = 'No se encontró una cara frontal clara. Intenta con otra foto.';
      analyzeBtn.disabled = false;
      return;
    }
    clearOverlay();
    const dims = inputImage.getBoundingClientRect();
    // dibujar landmarks
    const resized = faceapi.resizeResults(detection, { width: overlay.width, height: overlay.height });
    drawLandmarks(resized.landmarks);
    const metrics = computeMetrics(resized.landmarks);
    showResults(metrics);
    statusEl.textContent = 'Análisis completo.';
    downloadBtn.disabled = false;
  } catch (e) {
    console.error(e);
    statusEl.textContent = 'Error durante el análisis.';
  } finally {
    analyzeBtn.disabled = false;
  }
}

function drawLandmarks(landmarks){
  // puntos
  ctx.strokeStyle = 'rgba(10,120,255,0.9)';
  ctx.lineWidth = 1.5;
  const pts = landmarks.positions;
  for(let i=0;i<pts.length;i++){
    const p = pts[i];
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.2, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(10,120,255,0.95)';
    ctx.fill();
  }
  // dibujar líneas de referencia (ejemplo: eje vertical medio)
  const leftCheek = landmarks.getLeftJawOutline()[0];
  const rightCheek = landmarks.getRightJawOutline().slice(-1)[0];
  const chin = landmarks.getJawOutline()[8];
  ctx.strokeStyle = 'rgba(255,80,80,0.7)';
  ctx.beginPath();
  ctx.moveTo((leftCheek.x+rightCheek.x)/2, 0);
  ctx.lineTo((leftCheek.x+rightCheek.x)/2, overlay.height);
  ctx.stroke();
}

function computeDistance(a,b){
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx,dy);
}

/*
  Métricas calculadas (heurísticas):
  - simetría: comparamos distancias espejo (puntos pares) al eje vertical central del rostro
  - proporciones: ratios entre medidas clave comparadas con phi ~1.618
*/
function computeMetrics(landmarks){
  const pts = landmarks.positions;

  // puntos clave (según landmark68 index)
  const leftEye = averagePoints(landmarks.getLeftEye());
  const rightEye = averagePoints(landmarks.getRightEye());
  const noseTip = landmarks.getNose()[6]; // punta
  const noseLeft = landmarks.getNose()[0];
  const noseRight = landmarks.getNose()[12];
  const mouthLeft = landmarks.getMouth()[0];
  const mouthRight = landmarks.getMouth()[6];
  const chin = landmarks.getJawOutline()[8];
  const foreheadY = Math.min(landmarks.getLeftEye()[0].y, landmarks.getRightEye()[3].y) - (chin.y - noseTip.y) * 1.5; // estimado
  const faceCenterX = (landmarks.getJawOutline()[0].x + landmarks.getJawOutline().slice(-1)[0].x) / 2;

  // medidas
  const interEye = computeDistance(leftEye, rightEye);
  const noseWidth = computeDistance(noseLeft, noseRight);
  const mouthWidth = computeDistance(mouthLeft, mouthRight);
  const faceLength = computeDistance({x:faceCenterX, y:foreheadY}, chin);
  const eyeToNose = (computeDistance(leftEye, noseTip) + computeDistance(rightEye, noseTip)) / 2;

  // proporciones (relaciones)
  const r1 = faceLength / interEye;    // ideal: cercano a phi-ish en algunos casos
  const r2 = interEye / mouthWidth;    // ideal: ~1.618 ??? (heurístico)
  const r3 = interEye / noseWidth;
  // score de golden-ness: comparar ratios con 1.618 (phi) y convertir en % (más cercano = 100)
  const phi = 1.618;
  function ratioScore(x){
    const diff = Math.abs(x - phi);
    // score decae con la diferencia relativa
    const s = Math.max(0, 100 * (1 - (diff / phi)));
    return Math.round(s);
  }

  // simetría: comparar cada par de puntos izquierdo/derecho respecto al eje X central
  const pairs = [
    [landmarks.getLeftEye()[0], landmarks.getRightEye()[3]],
    [landmarks.getLeftEye()[3], landmarks.getRightEye()[0]],
    [landmarks.getLeftEye()[1], landmarks.getRightEye()[2]],
    [landmarks.getLeftEyebrow()[0], landmarks.getRightEyebrow()[4]],
    [landmarks.getMouth()[0], landmarks.getMouth()[6]],
    [landmarks.getJawOutline()[2], landmarks.getJawOutline().slice(-3)[0]]
  ];
  let symScores = [];
  for(const [L,R] of pairs){
    const dL = Math.abs(L.x - faceCenterX);
    const dR = Math.abs(R.x - faceCenterX);
    const rel = 1 - Math.abs(dL - dR) / Math.max(dL,dR,1);
    symScores.push(Math.max(0, Math.round(rel * 100)));
  }
  const symmetry = Math.round(symScores.reduce((a,b)=>a+b,0) / symScores.length);

  // combinación final heurística
  const goldenHarmony = Math.round((ratioScore(r1) * 0.45 + ratioScore(r2) * 0.35 + ratioScore(r3) * 0.2));
  const overall = Math.round((goldenHarmony * 0.6) + (symmetry * 0.4));

  return {
    interEye: Math.round(interEye),
    noseWidth: Math.round(noseWidth),
    mouthWidth: Math.round(mouthWidth),
    faceLength: Math.round(faceLength),
    r1: Number(r1.toFixed(3)),
    r2: Number(r2.toFixed(3)),
    r3: Number(r3.toFixed(3)),
    symmetry,
    symScores,
    ratioScores: { r1: ratioScore(r1), r2: ratioScore(r2), r3: ratioScore(r3) },
    goldenHarmony,
    overall
  };
}

function averagePoints(arr){
  const s = arr.reduce((acc,p)=>({x:acc.x+p.x, y:acc.y+p.y}), {x:0,y:0});
  return { x: s.x/arr.length, y: s.y/arr.length };
}

function showResults(metrics){
  const container = document.getElementById('metrics');
  container.innerHTML = '';
  addMetric(container, 'Simetría general', metrics.symmetry + '%', metrics.symmetry);
  addMetric(container, 'Armonía (índice "phi")', metrics.goldenHarmony + '%', metrics.goldenHarmony);
  addMetric(container, 'Puntaje global', metrics.overall + '%', metrics.overall);
  // detalles
  const det = document.createElement('div');
  det.style.marginTop = '10px';
  det.innerHTML = `
    <strong>Detalles numéricos</strong>
    <div>Distancia inter-ocular: ${metrics.interEye}px</div>
    <div>Ancho nariz: ${metrics.noseWidth}px</div>
    <div>Ancho boca: ${metrics.mouthWidth}px</div>
    <div>Largo cara (estimado): ${metrics.faceLength}px</div>
    <div>Ratios: r1=${metrics.r1}, r2=${metrics.r2}, r3=${metrics.r3}</div>
    <div>Ratio scores: r1=${metrics.ratioScores.r1}%, r2=${metrics.ratioScores.r2}%, r3=${metrics.ratioScores.r3}%</div>
  `;
  container.appendChild(det);

  // barras visuales
  const bars = document.createElement('div');
  bars.style.marginTop = '12px';
  bars.innerHTML = `
    <div class="metric"><div>Simetría</div><div>${metrics.symmetry}%</div></div>
    <div class="metric"><div>Armonía (phi)</div><div>${metrics.goldenHarmony}%</div></div>
    <div class="metric"><div>Puntaje global</div><div>${metrics.overall}%</div></div>
  `;
  container.appendChild(bars);
}

function downloadResult(){
  // generar imagen combinada canvas+foto
  const tmp = document.createElement('canvas');
  tmp.width = overlay.width;
  tmp.height = overlay.height;
  const tctx = tmp.getContext('2d');
  tctx.drawImage(inputImage, 0, 0, tmp.width, tmp.height);
  // copiar overlay
  tctx.drawImage(overlay, 0, 0);
  const link = document.createElement('a');
  link.download = 'armonía_resultado.png';
  link.href = tmp.toDataURL('image/png');
  link.click();
}
