const https = require('https');
const fs = require('fs');

const apiKey = process.env.GEMINI_API_KEY;
const logStream = fs.createWriteStream('/tmp/models_dump.txt');

function log(msg) {
    console.log(msg);
    logStream.write(msg + '\n');
}

log("Checking models with Key ending in: ..." + (apiKey ? apiKey.slice(-4) : "NONE"));

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                log("ERROR_CODE: " + json.error.code);
                log("ERROR_MSG: " + json.error.message);
            } else {
                log("--- FOUND MODELS ---");
                (json.models || []).forEach(m => log(m.name));
                log("--- END MODELS ---");
            }
        } catch (e) { log("PARSE_ERROR: " + e.message); }
        logStream.end();
    });
}).on("error", (e) => {
    log("REQ_ERROR: " + e.message);
    logStream.end();
});
