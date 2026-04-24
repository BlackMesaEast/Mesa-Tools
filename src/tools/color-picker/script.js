const svCanvas = document.getElementById('svCanvas');
const hueCanvas = document.getElementById('hueCanvas');
const svCtx = svCanvas.getContext('2d');
const hueCtx = hueCanvas.getContext('2d');
const svCursor = document.getElementById('svCursor');
const hueCursor = document.getElementById('hueCursor');
const hexValue = document.getElementById('hexValue');
const rgbValue = document.getElementById('rgbValue');
const hslValue = document.getElementById('hslValue');
const imageUpload = document.getElementById('imageUpload');
const uploadText = document.getElementById('upload-text');

let hsv = { h: 0, s: 1, v: 1 }; // h: 0-360, s/v: 0-1\
function drawHue() {
  const w = hueCanvas.width,
    h = hueCanvas.height;
  const grad = hueCtx.createLinearGradient(0, 0, w, 0);
  for (let i = 0; i <= 360; i += 30)
    grad.addColorStop(i / 360, `hsl(${i},100%,50%)`);
  hueCtx.fillStyle = grad;
  hueCtx.fillRect(0, 0, w, h);

  hueCursor.style.left = (hsv.h / 360) * 100 + '%';
}
let draggingHue = false;

function pickHue(e) {
  const rect = hueCanvas.getBoundingClientRect();
  hsv.h = Math.max(
    0,
    Math.min(360, ((e.clientX - rect.left) / rect.width) * 360),
  );
  update();
}

hueCanvas.addEventListener('mousedown', (e) => {
  draggingHue = true;
  pickHue(e);
});
window.addEventListener('mousemove', (e) => {
  if (draggingHue) pickHue(e);
});
window.addEventListener('mouseup', () => {
  draggingHue = false;
});

function drawSV() {
  const w = svCanvas.width,
    h = svCanvas.height;
  svCtx.fillStyle = `hsl(${hsv.h}, 100%, 50%)`;
  svCtx.fillRect(0, 0, w, h);

  const white = svCtx.createLinearGradient(0, 0, w, 0);
  white.addColorStop(0, 'rgba(255,255,255,1)');
  white.addColorStop(1, 'rgba(255,255,255,0)');
  svCtx.fillStyle = white;
  svCtx.fillRect(0, 0, w, h);

  const black = svCtx.createLinearGradient(0, 0, 0, h);
  black.addColorStop(0, 'rgba(0,0,0,0)');
  black.addColorStop(1, 'rgba(0,0,0,1)');
  svCtx.fillStyle = black;
  svCtx.fillRect(0, 0, w, h);

  svCursor.style.left = hsv.s * 100 + '%';
  svCursor.style.top = (1 - hsv.v) * 100 + '%';
}

let draggingSV = false;

function pickSV(e) {
  const rect = svCanvas.getBoundingClientRect();
  hsv.s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  hsv.v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
  update();
}

svCanvas.addEventListener('mousedown', (e) => {
  draggingSV = true;
  pickSV(e);
});
window.addEventListener('mousemove', (e) => {
  if (draggingSV) pickSV(e);
});
window.addEventListener('mouseup', () => {
  draggingSV = false;
});

function update() {
  drawHue();
  drawSV();
  const [r, g, b] = hsvToRgb(hsv.h, hsv.s, hsv.v);
  const hex = rgbToHex(r, g, b);
  hexValue.textContent = hex;
  rgbValue.textContent = `${r}, ${g}, ${b}`;
  hslValue.textContent = hexToHsl(hex);
  document.getElementById('svCursorFill').setAttribute('fill', hex);
  document.getElementById('cmykValue').textContent = rgbToCmyk(r, g, b);
  document.getElementById('hsvValue').textContent =
    `${Math.round(hsv.h)}°, ${Math.round(hsv.s * 100)}%, ${Math.round(hsv.v * 100)}%`;
}

function hsvToRgb(h, s, v) {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [
    Math.round(f(5) * 255),
    Math.round(f(3) * 255),
    Math.round(f(1) * 255),
  ];
}

function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return [h * 360, max === 0 ? 0 : d / max, max];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function hexToHsl(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)}°, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
}

function rgbToCmyk(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const k = 1 - Math.max(r, g, b);
  if (k === 1) return '(0%, 0%, 0%, 100%)';
  const c = (1 - r - k) / (1 - k);
  const m = (1 - g - k) / (1 - k);
  const y = (1 - b - k) / (1 - k);
  return `${Math.round(c * 100)}%, ${Math.round(m * 100)}%, ${Math.round(y * 100)}%, ${Math.round(k * 100)}%`;
}

update();

imageUpload.addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;

  preview.src = URL.createObjectURL(file);
  imageUpload.hidden = true;
  uploadText.hidden = true;
  preview.hidden = false;
  this.disabled = true;
});

const sampleCanvas = document.createElement('canvas');
const sampleCtx = sampleCanvas.getContext('2d');

preview.addEventListener('click', function (e) {
  const rect = preview.getBoundingClientRect();
  const scaleX = preview.naturalWidth / rect.width;
  const scaleY = preview.naturalHeight / rect.height;
  const x = Math.floor((e.clientX - rect.left) * scaleX);
  const y = Math.floor((e.clientY - rect.top) * scaleY);

  sampleCanvas.width = preview.naturalWidth;
  sampleCanvas.height = preview.naturalHeight;
  sampleCtx.drawImage(preview, 0, 0);

  const [r, g, b] = sampleCtx.getImageData(x, y, 1, 1).data;
  [hsv.h, hsv.s, hsv.v] = rgbToHsv(r, g, b);
  update();
});

function copyToClipboard(button) {
  let textToCopy = '';
  textToCopy = button.previousElementSibling.textContent;
  navigator.clipboard.writeText(textToCopy);
}
