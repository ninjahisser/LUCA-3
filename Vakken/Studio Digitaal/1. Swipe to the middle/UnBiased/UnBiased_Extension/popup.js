// Render logs in de textarea
function renderLogs() {
    browser.storage.local.get("logs").then((data) => {
        const logBox = document.getElementById("logBox");
        if (logBox) {
            logBox.value = (data.logs || []).join("\n");
            logBox.scrollTop = logBox.scrollHeight;
        }
    });
}

// Voeg een nieuwe log entry toe
function logMessage(msg) {
    browser.storage.local.get("logs").then((data) => {
        let logs = data.logs || [];
        logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
        if (logs.length > 50) logs.shift();
        browser.storage.local.set({ logs }).then(renderLogs);
    });
}

// Laad opgeslagen API key bij openen van popup
browser.storage.local.get("apiKey").then((data) => {
    if (data.apiKey) {
        document.getElementById("apiKey").value = data.apiKey;
        logMessage("Loaded saved API Key.");
    }
});

// Save API key
document.getElementById("saveApiKey").addEventListener("click", () => {
    const key = document.getElementById("apiKey").value.trim();
    if (key) {
        browser.storage.local.set({ apiKey: key }).then(() => {
            logMessage("Saved API Key.");
        });
    } else {
        logMessage("No API Key entered.");
    }
});

// Bias knoppen
document.getElementById("blockLeft").addEventListener("click", () => {
    browser.storage.local.set({ bias: "left" }).then(() => {
        logMessage("Selected LEFT bias.");
    });
});

document.getElementById("blockRight").addEventListener("click", () => {
    browser.storage.local.set({ bias: "right" }).then(() => {
        logMessage("Selected RIGHT bias.");
    });
});

// Apply censorship knop -> stuurt bericht naar content.js
document.getElementById("applyBias").addEventListener("click", () => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        browser.tabs.sendMessage(tabs[0].id, { action: "rerun", reset: true });
        logMessage("Applied censorship to page.");
    });
});

// Clear logs knop
document.getElementById("clearLogs").addEventListener("click", () => {
    browser.storage.local.set({ logs: [] }).then(() => {
        renderLogs();
        logMessage("Console cleared."); // optioneel, wordt direct getoond
    });
});


// Initial render van logs bij openen
renderLogs();
