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
}
