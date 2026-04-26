const https = require('https');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("Error: GEMINI_API_KEY is not set.");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error("API Error:", json.error);
            } else {
                console.log("--- START PRO SEARCH ---");
                const models = json.models || [];
                models.forEach(m => {
                    if (m.name.includes('pro')) {
                        console.log(`FOUND: ${m.name}`);
                    }
                });
                console.log("--- END PRO SEARCH ---");
            }
        } catch (e) {
            console.error("Parse Error:", e);
        }
    });

}).on("error", (err) => {
    console.error("Request Error:", err);
});
