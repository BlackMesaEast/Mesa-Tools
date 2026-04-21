const { FFmpeg } = FFmpegWASM;
const ffmpeg = new FFmpeg();

const input = document.getElementById('videofile');
const convertBtn = document.getElementById('convertBtn');
const progressWrap = document.getElementById('progress-wrap');
const progressBar = document.getElementById('progress-bar');
const progressLabel = document.getElementById('progress-label');
const progressEta = document.getElementById('progress-eta');

let encodeStart = 0;

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

input.addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;

  document.getElementById('file-name').textContent = file.name;
  document.getElementById('file-name').hidden = false;
  document.getElementById('upload-text').hidden = true;
});

async function convertVideo() {
  const file = input.files[0];
  if (!file) return;

  const format = document.getElementById('Formats').value;

  progressWrap.hidden = false;
  progressBar.style.width = '0%';
  progressLabel.textContent = 'Loading FFmpeg...';
  progressEta.textContent = '';

  if (!ffmpeg.loaded) {
    await ffmpeg.load({
      coreURL: '/libs/ffmpeg/ffmpeg-core.js',
      wasmURL: '/libs/ffmpeg/ffmpeg-core.wasm',
      workerURL: '/libs/ffmpeg/ffmpeg-core.worker.js',
    });
  }

  progressLabel.textContent = 'Converting...';
  encodeStart = Date.now();

  const inputName = file.name;
  const outputName = `${inputName.replace(/\.[^.]+$/, '')}.${format}`;

  const buffer = await file.arrayBuffer();
  await ffmpeg.writeFile(inputName, new Uint8Array(buffer));
  await ffmpeg.exec(['-i', inputName, outputName]);

  const data = await ffmpeg.readFile(outputName);
  const blob = new Blob([data.buffer], { type: `video/${format}` });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = outputName;
  a.click();

  URL.revokeObjectURL(url);
  progressBar.style.width = '100%';
  progressLabel.textContent = 'Done!';
  progressEta.textContent = '';
}
