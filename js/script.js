let handling = false;

function startScanner() {

  if (Quagga.running) return;

  Quagga.init({
      inputStream : {
        name : "Live",
        type : "LiveStream",
        target: document.getElementById('camera-area')
      },
      decoder : {
        readers : ["ean_reader"]
      }
    }, function(err) {
      if (err) {
          console.log(err);
          return
      }
      Quagga.start();
      Quagga.onDetected(onDetected);
    });

}

function onDetected(data) {

  if (!data || !data.codeResult) return;

  if (handling) return;
  handling = true;

  Quagga.pause();

  const code = data.codeResult.code;

  if (/^97[89]\d{10}$/.test(code)) {
    document.getElementById('isbn').textContent = code;

  } else {
    document.getElementById('isbn').textContent = `ISBNの読み取りに失敗(${code})`;

  }

  Quagga.stop();
  Quagga.offDetected(onDetected);
}

document.addEventListener("DOMContentLoaded", (event) => {
  document.getElementById('scan-btn').addEventListener('click', startScanner);
});
