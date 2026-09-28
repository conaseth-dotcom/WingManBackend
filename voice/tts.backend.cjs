'use strict';

const http = require('http');

const XTTS_PORT = parseInt(process.env.XTTS_PORT || '8020', 10);

async function speak(text) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ text });

    const options = {
      hostname: '127.0.0.1',
      port: XTTS_PORT,
      path: '/tts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(options, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);

          if (!json.ok) {
            return resolve({
              ok: false,
              error: json.error || 'XTTS server returned failure'
            });
          }

          resolve({
            ok: true,
            wavPath: json.wavPath
          });

        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', err => {
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

module.exports = { speak };
