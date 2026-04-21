const imageUpload = document.getElementById('imageUpload');
const preview = document.getElementById('preview');
const colorPicker = document.getElementById('colorPicker');
const hexValue = document.getElementById('hexValue');
const rgbValue = document.getElementById('rgbValue');
const hslValue = document.getElementById('hslValue');
const uploadText = document.getElementById('upload-text');
const toolBody = document.getElementsByClassName('tool-body');

imageUpload.addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;

  preview.src = URL.createObjectURL(file);
  imageUpload.hidden = true;
  uploadText.hidden = true;
  preview.hidden = false;
});

colorPicker.addEventListener('input', function () {
  const color = this.value;
  hexValue.textContent = `${color}`;
  rgbValue.textContent = `${hexToRgb(color)}`;
  hslValue.textContent = `${hexToHsl(color)}`;
});

function mouseColorOnPixel() {
  const eyedropper = new EyeDropper();
  eyedropper
    .open()
    .then((result) => {
      const color = result.sRGBHex;
      colorPicker.value = color;
      hexValue.textContent = `${color}`;
      rgbValue.textContent = `${hexToRgb(color)}`;
      hslValue.textContent = `${hexToHsl(color)}`;
    })
    .catch((e) => {
      console.error(e);
    });
}

function hexToRgb(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
}

function hexToHsl(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
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
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  return `(${h}, ${s}%, ${l}%)`;
}

function copyToClipboard(button) {
  let textToCopy = '';
  textToCopy = button.previousElementSibling.textContent;
  navigator.clipboard.writeText(textToCopy);
}
