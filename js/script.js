let hasConfirmedISBN  = false;
let lastCode          = null;
let stableCount       = 0;

/**
 * 同じコードが連続で出たら確定
 */
const STABLE_REQUIRED = 3;

/**
 * decodedCodes の error の平均がこれ以下ならOK（小さいほど良い）
 */
const MAX_AVG_ERROR = 0.6;

/**
 * ログ出力用
 */
function logStatus(msg) {
  console.log('[ISBN Scanner] ', msg);
}

/**
 * 誤差の平均値を算出 (0 ~ Infinity)
 */
function meanError(decodedCodes) {

  if (!decodedCodes || decodedCodes.length === 0) return Infinity;

  // バーコードの各線の誤差のデコード結果を記録
  let sum = 0;
  let count = 0;
  for (const d of decodedCodes) {
    if (typeof d.error === 'number') {
      sum += d.error;
      count++;
    }
  }

  // 誤差の平均値を返す。
  return count === 0 ? Infinity : sum / count;
}

function startScanner() {

  if (Quagga.running) {
    logStatus('既に実行中です。')
    return;
  }

  // Quagga 設定
  const config = {
    numOfWorkers: (navigator.hardwareConcurrency && navigator.hardwareConcurrency > 1) ? navigator.hardwareConcurrency - 1 : 2,
    locate: true,
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: document.getElementById('camera-area'),
      constraints: {
        width: { min: 640 },
        height: { min: 480 },
        facingMode: { ideal: "environment" }
      },
      // ROI (検出枠) を指定
      // ガイド枠と一致させる
      area: { top: "35%", right: "12.5%", left: "12.5%", bottom: "40%" }
    },
    frequency: 15,
    decoder: {
      readers: ["ean_reader"], // EAN-13 を読む
      multiple: false
    },
    locator: {
      patchSize: "medium",
      halfSample: true
    },
    debug: false
  };

  Quagga.init(config, function(e) {

      if (e) {
          console.error(e);
          return;
      }

      Quagga.start();
      Quagga.onDetected(onDetected);

      logStatus('スキャン開始');

      document.getElementById('scan-start-btn').classList.add('invisible');
      document.getElementById('scan-stop-btn').classList.remove('invisible');
      document.getElementById('camera-area').classList.remove('invisible');
    });

}

function stopScanner() {

  Quagga.stop();
  Quagga.offDetected(onDetected);

  hasConfirmedISBN    = false;
  lastCode    = null;
  stableCount = 0;

  logStatus('スキャン終了');

  document.getElementById('scan-start-btn').classList.remove('invisible');
  document.getElementById('scan-stop-btn').classList.add('invisible');
  document.getElementById('camera-area').classList.add('invisible');
}

function onDetected(result) {

  if (!result || !result.codeResult) return;

  const code    = result.codeResult.code;
  const format  = result.codeResult.format || '';
  const decoded = result.codeResult.decodedCodes || [];
  const isIsbnFormat = /^97[89]\d{10}$/.test(code);
  const avgErr  = meanError(decoded);

  console.debug('detected', { code, format, avgErr, decoded });

  if (!isIsbnFormat || avgErr === Infinity || avgErr > MAX_AVG_ERROR) {

    logStatus(`検出: ${code}（不採用 — ${isIsbnFormat ? '低信頼' : 'ISBNでない'})`);
    // リセット
    if (lastCode && lastCode !== code) {
      lastCode = null;
      stableCount = 0;
    }
    return;
  }

  // 同じコードが一定の回数連続で出たら確定
  if (lastCode === code) {
    stableCount++;
  } else {
    lastCode = code;
    stableCount = 1;
  }

  logStatus(`候補: ${code}（安定度 ${stableCount}/${STABLE_REQUIRED}、誤差 ${avgErr.toFixed(3)}）`);

  if (stableCount >= STABLE_REQUIRED && !hasConfirmedISBN) {

    // 成功処理
    hasConfirmedISBN = true;
    document.getElementById('isbn').textContent = code;
    logStatus('ISBN確定: ' + code);

    // スキャナーを停止
    setTimeout(() => {
      stopScanner();
    }, 250);
  }
}

document.addEventListener("DOMContentLoaded", (event) => {
  document.getElementById('scan-start-btn').addEventListener('click', startScanner);
  document.getElementById('scan-stop-btn').addEventListener('click', stopScanner);
});
