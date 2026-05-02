const mediaInput = document.getElementById('mediafile');
const uploadArea = document.getElementById('upload-area');
const uploadText = document.getElementById('upload-text');
const fileNameEl = document.getElementById('file-name');
const preview = document.getElementById('preview');
const convertLabelEl = document.getElementById('convert-label');
const convertActions = document.getElementById('convert-actions');
const formatSelect = document.getElementById('Formats');
const convertBtn = document.getElementById('convertBtn');
const progressWrap = document.getElementById('progress-wrap');
const progressBar = document.getElementById('progress-bar');
const progressLabel = document.getElementById('progress-label');
const progressEta = document.getElementById('progress-eta');

const FORMATS = {
  image: [
    { label: 'JPEG', value: 'JPEG' },
    { label: 'PNG', value: 'PNG' },
    { label: 'WebP', value: 'WebP' },
    { label: 'AVIF', value: 'AVIF' },
  ],
  video: [
    { label: 'MP4', value: 'mp4' },
    { label: 'WebM', value: 'webm' },
    { label: 'AVI', value: 'avi' },
    { label: 'MOV', value: 'mov' },
    { label: 'MKV', value: 'mkv' },
    { label: 'GIF', value: 'gif' },
  ],
  audio: [
    { label: 'MP3', value: 'mp3' },
    { label: 'AAC', value: 'aac' },
    { label: 'OGG', value: 'ogg' },
    { label: 'FLAC', value: 'flac' },
    { label: 'WAV', value: 'wav' },
    { label: 'M4A', value: 'm4a' },
  ],
};

const IMAGE_MIME = { JPEG: 'image/jpeg', PNG: 'image/png', WebP: 'image/webp', AVIF: 'image/avif' };
const IMAGE_EXT = { JPEG: 'jpg', PNG: 'png', WebP: 'webp', AVIF: 'avif' };

const OUTPUT_MIME = {
  mp4: 'video/mp4', webm: 'video/webm', avi: 'video/x-msvideo',
  mov: 'video/quicktime', mkv: 'video/x-matroska', gif: 'image/gif',
  mp3: 'audio/mpeg', aac: 'audio/aac', ogg: 'audio/ogg',
  flac: 'audio/flac', wav: 'audio/wav', m4a: 'audio/mp4',
};

const { FFmpeg } = FFmpegWASM;
const ffmpeg = new FFmpeg();
let ffmpegLoaded = false;
let encodeStart = 0;
let currentFile = null;
let currentMediaType = null;

function getMediaType(file) {
  if (file.type === 'image/gif') return 'video'; // GIF handled via FFmpeg like video
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return null;
}

function populateFormats(type) {
  formatSelect.innerHTML = '';
  for (const { label, value } of FORMATS[type]) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    formatSelect.appendChild(opt);
  }
}

function loadFile(file) {
  const type = getMediaType(file);
  if (!type) return;

  currentFile = file;
  currentMediaType = type;
  populateFormats(type);

  convertLabelEl.hidden = false;
  formatSelect.hidden = false;
  convertActions.hidden = false;
  progressWrap.hidden = true;
  progressBar.style.width = '0%';

  preview.hidden = true;
  fileNameEl.hidden = true;
  uploadText.hidden = true;

  if (type === 'image') {
    const objectUrl = URL.createObjectURL(file);
    preview.onload = () => URL.revokeObjectURL(objectUrl);
    preview.src = objectUrl;
    preview.hidden = false;
  } else {
    fileNameEl.textContent = file.name;
    fileNameEl.hidden = false;
  }
}

mediaInput.addEventListener('change', (e) => loadFile(e.target.files[0]));

['dragenter', 'dragover'].forEach((ev) =>
  uploadArea.addEventListener(ev, (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  })
);

['dragleave', 'drop'].forEach((ev) =>
  uploadArea.addEventListener(ev, (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
  })
);

uploadArea.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files[0];
  if (file) {
    mediaInput.files = e.dataTransfer.files;
    loadFile(file);
  }
});

// ── Image conversion (Canvas API) ─────────────────────────────────────────────

async function convertImage() {
  const format = formatSelect.value;
  const mime = IMAGE_MIME[format];

  const img = new Image();
  img.src = URL.createObjectURL(currentFile);
  await img.decode();

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');

  if (mime === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(img.src);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, 0.92));
  if (!blob) {
    alert(`${format} encoding is not supported in this browser.`);
    return;
  }

  const baseName = currentFile.name.replace(/\.[^.]+$/, '');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}.${IMAGE_EXT[format]}`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Video / audio conversion (FFmpeg WASM) ────────────────────────────────────

ffmpeg.on('progress', ({ progress }) => {
  const pct = Math.min(1, Math.max(0, progress));
  progressBar.style.width = `${Math.round(pct * 100)}%`;
  progressLabel.textContent = `Converting… ${Math.round(pct * 100)}%`;
  if (pct > 0.01) {
    const elapsed = (Date.now() - encodeStart) / 1000;
    const eta = Math.round(elapsed / pct - elapsed);
    progressEta.textContent = eta > 0 ? `${eta}s remaining` : '';
  }
});

async function ensureFFmpegLoaded() {
  if (ffmpegLoaded) return;
  progressWrap.hidden = false;
  progressBar.style.width = '0%';
  progressLabel.textContent = 'Loading FFmpeg…';
  progressEta.textContent = '';
  await ffmpeg.load({
    coreURL: '/libs/ffmpeg/ffmpeg-core.js',
    wasmURL: '/libs/ffmpeg/ffmpeg-core.wasm',
    workerURL: '/libs/ffmpeg/ffmpeg-core.worker.js',
  });
  ffmpegLoaded = true;
}

async function convertMedia() {
  const format = formatSelect.value;
  const ext = currentFile.name.split('.').pop() || 'bin';
  const inputName = `input.${ext}`;
  const outputName = `output.${format}`;

  convertBtn.disabled = true;
  progressWrap.hidden = false;
  progressBar.style.width = '0%';
  progressEta.textContent = '';

  try {
    await ensureFFmpegLoaded();

    progressLabel.textContent = 'Converting…';
    encodeStart = Date.now();

    await ffmpeg.writeFile(inputName, new Uint8Array(await currentFile.arrayBuffer()));

    // AVI and GIF can't reliably remux — always transcode them.
    // Everything else: try a fast remux first, fall back to transcode if the
    // codec isn't compatible with the target container.
    const transcodeOnly = format === 'avi' || format === 'gif';
    let code = -1;

    if (!transcodeOnly) {
      const copyArgs = ['-i', inputName, '-c', 'copy'];
      if (format === 'mp4' || format === 'mov') copyArgs.push('-movflags', '+faststart');
      copyArgs.push(outputName);
      code = await ffmpeg.exec(copyArgs);
      if (code !== 0) {
        try { await ffmpeg.deleteFile(outputName); } catch {}
        progressLabel.textContent = 'Transcoding…';
      }
    }

    if (code !== 0) {
      const transcodeArgs = ['-i', inputName];
      if (format === 'mp4' || format === 'mov') transcodeArgs.push('-movflags', '+faststart');
      transcodeArgs.push(outputName);
      code = await ffmpeg.exec(transcodeArgs);
    }

    if (code !== 0) throw new Error(`FFmpeg exited with code ${code}`);

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer], { type: OUTPUT_MIME[format] ?? 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.name.replace(/\.[^.]+$/, '') + '.' + format;
    a.click();
    URL.revokeObjectURL(url);

    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    progressBar.style.width = '100%';
    progressLabel.textContent = 'Done!';
    progressEta.textContent = '';
  } catch (err) {
    progressLabel.textContent = 'Error — check the browser console.';
    progressEta.textContent = '';
    console.error(err);
  } finally {
    convertBtn.disabled = false;
  }
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

async function convert() {
  if (!currentFile) return;
  if (currentMediaType === 'image') {
    await convertImage();
  } else {
    await convertMedia();
  }
}

window.convert = convert;
