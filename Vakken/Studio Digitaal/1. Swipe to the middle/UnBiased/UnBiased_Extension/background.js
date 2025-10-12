console.log("background.js loaded");

// Logging helper
function log(msg, tabId = null) {
  console.log(msg);
  console.log("TabId = ", tabId);
  if (tabId !== null) {
    chrome.tabs.sendMessage(tabId, { action: "logMessage", message: msg });
  }
  chrome.runtime.sendMessage({ action: "logMessage", message: msg });
}

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startCensorship") {
    startCensorship(message.apiKey, message.url, message.tabId);
  }
  sendResponse({ success: true });
  return true;
});

// Main censorship flow
async function startCensorship(apiKey, url, tabId) {
  log("🟡 Starting censorship process...", tabId);

  try {
    // ✅ Old working method
    const response = await new Promise(resolve =>
      chrome.tabs.sendMessage(tabId, { action: "getHTML" }, resolve)
    );

    if (!response || !response.html) return log("❌ No HTML received from page.", tabId);

    const html = response.html;

    // Step 1: Ask if it’s a news article
    const checkPrompt = `Bepaal of deze URL een nieuwsartikel is: ${url}. Antwoord alleen true of false.`;
    log(`➡️ Sending to ChatGPT: ${JSON.stringify({ model: "gpt-3.5-turbo", messages: [{ role: "user", content: checkPrompt }] })}`, tabId);

    const checkResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: checkPrompt }]
      })
    });

    const checkData = await checkResp.json();
    const checkText = checkData.choices?.[0]?.message?.content?.trim() || "false";
    log(`⬅️ Received from ChatGPT:\n${checkText}`, tabId);

    if (!checkText.toLowerCase().includes("true")) {
      return log("❌ Not a news site.", tabId);
    }

    log("✅ Site is a news article. Checking polarization...", tabId);

    // Step 2: Ask for polarization
    const polarizationPrompt = `Lees dit nieuwsartikel: ${url}.\nGeef antwoord in formaat:\nPolarisatie: true/false\nZijdes: [zijde 1] vs [zijde 2].\nGebruik de taal van het artikel.`;
    log(`➡️ Sending to ChatGPT: ${JSON.stringify({ model: "gpt-3.5-turbo", messages: [{ role: "user", content: polarizationPrompt }] })}`, tabId);

    const polarResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: polarizationPrompt }]
      })
    });

    const polarData = await polarResp.json();
    const polarText = polarData.choices?.[0]?.message?.content?.trim() || "";
    log(`⬅️ Received from ChatGPT:\n${polarText}`, tabId);

    const match = polarText.match(/Zijdes:\s*(.+?)\s+vs\s+(.+)/i);
    const side1 = match ? match[1].trim() : null;
    const side2 = match ? match[2].trim() : null;
    const isPolarized = /true/i.test(polarText);

    if (!isPolarized || !side1 || !side2) {
      return log("❌ No clear polarization found.", tabId);
    }

    const chosenSide = side1.toLowerCase();
    const otherSide = side2.toLowerCase();
    log(`Chosen side: ${chosenSide} | Other side to censor: ${otherSide}.`, tabId);

    // Step 3: Send censorship command to content script
    chrome.tabs.sendMessage(tabId, {
      action: "censorText",
      data: { sideToCensor: otherSide }
    });

  } catch (err) {
    log("❌ Error: " + err.message, tabId);
  }
}
