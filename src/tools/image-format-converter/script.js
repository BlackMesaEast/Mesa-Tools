document.getElementById('imagefile').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;

  const preview = document.getElementById('preview');
  const uploadText = document.getElementById('upload-text');

  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
  uploadText.hidden = true;
});

function convertImage() {
  const input = document.getElementById('imagefile');
  const format = document.getElementById('Formats').value;
  const file = input.files[0];

  const reader = new FileReader();

  reader.onload = function (e) {
    const img = new Image();

    img.onload = function () {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        const name = file.name.replace(/\.[^.]+$/, '');
        a.download = `${name}.${format.toLowerCase()}`;
        a.click();

        URL.revokeObjectURL(url);
      }, `image/${format.toLowerCase()}`);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
const input = document.getElementById('imagefile')
const uploadText = document.getElementById('upload-text')
const fileNameEl = document.getElementById('file-name')
const uploadArea = document.getElementById('upload-area')
const formatSelect = document.getElementById('Formats')

const MIME = {
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  WebP: 'image/webp',
  AVIF: 'image/avif',
}

const EXT = {
  JPEG: 'jpg',
  PNG: 'png',
  WebP: 'webp',
  AVIF: 'avif',
}

let currentFile = null

function loadFile(file) {
  if (!file || !file.type.startsWith('image/')) return
  currentFile = file
  fileNameEl.textContent = file.name
  fileNameEl.hidden = false
  uploadText.hidden = true
}

input.addEventListener('change', (e) => loadFile(e.target.files[0]))

;['dragenter', 'dragover'].forEach((ev) =>
  uploadArea.addEventListener(ev, (e) => {
    e.preventDefault()
    uploadArea.classList.add('drag-over')
  })
)

;['dragleave', 'drop'].forEach((ev) =>
  uploadArea.addEventListener(ev, (e) => {
    e.preventDefault()
    uploadArea.classList.remove('drag-over')
  })
)

uploadArea.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files[0]
  if (file) {
    input.files = e.dataTransfer.files
    loadFile(file)
  }
})

async function convertImage() {
  if (!currentFile) return

  const format = formatSelect.value
  const mime = MIME[format]

  const img = new Image()
  img.src = URL.createObjectURL(currentFile)
  await img.decode()

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')

  if (mime === 'image/jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(img, 0, 0)
  URL.revokeObjectURL(img.src)

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, mime, 0.92)
  )
  if (!blob) {
    alert(`${format} encoding is not supported in this browser.`)
    return
  }

  const baseName = currentFile.name.replace(/\.[^.]+$/, '')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${baseName}.${EXT[format]}`
  a.click()
  URL.revokeObjectURL(url)
}

window.convertImage = convertImage
