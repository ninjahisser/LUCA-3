// content.js

let USER_SELECTED_BIAS = "left"; // fallback
let processedOnce = false;

// Haal de gekozen bias uit storage en verwerk de pagina
browser.storage.local.get("bias").then((data) => {
    if (data.bias) USER_SELECTED_BIAS = data.bias;
    processPage();
});

// Luister naar berichten van popup.js
browser.runtime.onMessage.addListener((message) => {
    if (message.action === "rerun") {
        if (message.reset) processedOnce = false;
        browser.storage.local.get("bias").then((data) => {
            if (data.bias) USER_SELECTED_BIAS = data.bias;
            processPage();
        });
    }
});

// Functie om alle tekstnodes te krijgen
function getTextNodes() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    let node;
    while (node = walker.nextNode()) {
        const text = node.nodeValue.trim();
        // Alleen echte tekst van minstens 40 tekens, geen script/style/noscript
        if (text.length > 40 && !node.parentElement.closest("script,style,noscript")) {
            nodes.push(node);
        }
    }
    logToStorage(`[getTextNodes] Found ${nodes.length} text nodes`);
    return nodes;
}

// Functie om logs in de logbox op te slaan
function logToStorage(msg) {
    browser.storage.local.get("logs").then((data) => {
        let logs = data.logs || [];
        logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
        if (logs.length > 50) logs.shift();
        browser.storage.local.set({ logs });
    });
}

// Functie om tekst naar OpenAI te sturen
async function processText(text, bias) {
    const { apiKey } = await browser.storage.local.get("apiKey");
    if (!apiKey) {
        logToStorage("No API key set. Cannot process text.");
        return text;
    }

    try {
        logToStorage(`[processText] Sending API request for text: ${text.substring(0,50)}... with bias: ${bias}`);
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You detect political bias and rewrite it." },
                    { role: "user", content: `Bias to block: ${bias}\nText: ${text}\n\nIf text matches the bias, respond with 'BLOCK'. Otherwise, rewrite it with the opposite bias.` }
                ],
                temperature: 0.7
            })
        });

        const textResponse = await response.text(); // lees eerst als text
        let data;
        try {
            data = JSON.parse(textResponse); // parse JSON
        } catch (e) {
            logToStorage(`[processText] Failed to parse API response: ${textResponse}`);
            return text;
        }

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            logToStorage(`[processText] Unexpected API response for text: ${text.substring(0,50)}...`);
            return text;
        }

        const result = data.choices[0].message.content.trim();
        logToStorage(`[processText] GPT result: ${result.substring(0,100)}...`);
        return result;

    } catch (err) {
        logToStorage(`[processText] Error in API call: ${err.message}`);
        return text;
    }
}

// Functie om de pagina te verwerken
async function processPage() {
    if (processedOnce) return; // avoid double runs
    processedOnce = true;

    const nodes = getTextNodes();
    logToStorage(`[processPage] Scanning ${nodes.length} nodes`);

    for (let node of nodes) {
        const original = node.nodeValue.trim();

        browser.runtime.sendMessage({ action: "processText", text: original, bias: USER_SELECTED_BIAS })
            .then((response) => {
                if (!response) return;

                logToStorage(`[processPage] Original text: ${original.substring(0,50)}...`);
                logToStorage(`[processPage] GPT response: ${response.result ? response.result.substring(0,100) : "undefined"}`);

                if (response.result === "BLOCK") {
                    const span = document.createElement("span");
                    span.textContent = "[CENSORED]";
                    span.className = "censored";
                    span.dataset.alt = original;
                    node.replaceWith(span);
                } else if (response.result && response.result !== original) {
                    const span = document.createElement("span");
                    span.textContent = "[CENSORED]";
                    span.className = "censored";
                    span.dataset.alt = response.result;
                    node.replaceWith(span);
                }
            })
            .catch((err) => logToStorage(`[processPage] Error processing node: ${err.message}`));
    }
}

// Klik-event om gecensureerde tekst te onthullen
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("censored")) {
        const alt = e.target.dataset.alt;
        if (alt) {
            e.target.textContent = alt;
            e.target.classList.remove("censored");
            e.target.classList.add("revealed");
            logToStorage("Revealed censored text.");
        }
    }
});
