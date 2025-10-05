document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.getElementById("apiKey");
  const saveButton = document.getElementById("saveKey");
  const sendButton = document.getElementById("sendHello");
  const clearSitesButton = document.getElementById("clearSites");
  const output = document.getElementById("output");

  function log(msg) {
    output.textContent += msg + "\n";
    output.scrollTop = output.scrollHeight;
  }

  // Load saved key
  chrome.storage.local.get("chatgpt_api_key", res => {
    if (res.chatgpt_api_key) apiKeyInput.value = res.chatgpt_api_key;
  });

  // Save key
  saveButton.addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    if (!key) return log("No API key entered.");
    chrome.storage.local.set({ chatgpt_api_key: key }, () => log("API Key saved!"));
  });

  // Send message to ChatGPT
  function sendMessageToChatGPT(message) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get("chatgpt_api_key", res => {
        const key = res.chatgpt_api_key;
        if (!key) return reject("No API key saved!");
        chrome.runtime.sendMessage(
          { action: "sendToChatGPT", apiKey: key, content: message },
          response => {
            if (!response) return reject("No response from background.js");
            if (response.success) resolve(response.data?.choices?.[0]?.message?.content || "No reply");
            else reject(response.error || "Unknown error");
          }
        );
      });
    });
  }

  // Cache site checks
  function checkIfNewsSite(url) {
    return new Promise((resolve, reject) => {
      const storageKey = "site_is_news_" + url;
      chrome.storage.local.get(storageKey, res => {
        if (res[storageKey] !== undefined) return resolve(res[storageKey]);
        sendMessageToChatGPT(`Bepaal of deze URL een nieuwsartikel is: ${url}. Antwoord alleen true of false.`)
          .then(reply => {
            const isNews = reply.toLowerCase().includes("true");
            chrome.storage.local.set({ [storageKey]: isNews }, () => resolve(isNews));
          })
          .catch(err => reject(err));
      });
    });
  }

  // Split HTML into chunks
  function splitHtmlIntoChunks(html, maxLen = 3000) {
    const chunks = [];
    let start = 0;
    while (start < html.length) {
      chunks.push(html.slice(start, start + maxLen));
      start += maxLen;
    }
    return chunks;
  }

  // === censor function with toggle ===
  function censorTextInChunks(html, chunksToCensor) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const walker = document.createTreeWalker(
      doc.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: node => {
          if (node.parentNode && ["SCRIPT","STYLE","NOSCRIPT"].includes(node.parentNode.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach(node => {
      let text = node.nodeValue;
      let censoredText = text;

      chunksToCensor.forEach(chunk => {
        if (!chunk) return;
        const safeChunk = chunk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(safeChunk, "gi");
        censoredText = censoredText.replace(regex, `<span class="UnBiased_Censored" data-original="${chunk}" data-censored="${chunk}">${chunk}</span>`);
      });

      if (censoredText !== text) {
        const wrapper = document.createElement("span");
        wrapper.innerHTML = censoredText;

        while (wrapper.firstChild) {
          node.parentNode.insertBefore(wrapper.firstChild, node);
        }
        node.parentNode.removeChild(node);
      }
    });

    // Add click listener to toggle
    doc.body.querySelectorAll(".UnBiased_Censored").forEach(span => {
      span.style.cursor = "pointer";
      span.addEventListener("click", () => {
        const current = span.innerText;
        const original = span.getAttribute("data-original");
        const censored = span.getAttribute("data-censored");
        if (current === original) {
          span.innerText = censored;
        } else {
          span.innerText = original;
        }
      });
    });

    return doc.body.innerHTML;
  }

  // Main button
  sendButton.addEventListener("click", () => {
    output.textContent = "";
    log("Send button clicked.");

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (!tabs.length) return log("No active tab found.");
      const tab = tabs[0];
      const url = tab.url;

      checkIfNewsSite(url)
        .then(isNews => {
          if (!isNews) return log("Not a news site.");

          log("Site is a news article. Checking polarization...");
          sendMessageToChatGPT(`Lees dit nieuwsartikel: ${url}.
Geef antwoord in formaat:
"Polarisatie: true/false
Zijdes: [zijde 1] vs [zijde 2]".
Gebruik de taal van het artikel. Kies kanten met hoog contrast.`)
          .then(reply => {
            log("Received polarization check: " + reply);

            const sideLine = reply.split("\n").find(l => l.startsWith("Zijdes:"));
            if (!sideLine || sideLine.toLowerCase().includes("geen")) return log("No sides to censor.");

            const sides = sideLine.replace("Zijdes:", "").split(" vs ");
            const chosenSide = sides[0].trim(); // side to keep
            const otherSide = sides[1]?.trim() || ""; // side to censor

            log("Chosen side (keep): " + chosenSide);
            log("Other side (censor): " + otherSide);

            // Get HTML from page
            chrome.tabs.sendMessage(tab.id, { action: "getHTML" }, async response => {
              if (!response || !response.html) return log("No HTML received from content script.");
              log("Received HTML from page. Sending to ChatGPT for censorship based on other side.");

              const htmlChunks = splitHtmlIntoChunks(response.html, 3000);
              let allChunksToCensor = [];

              for (const chunk of htmlChunks) {
                const prompt = `
Lees het volgende fragment en markeer alles dat vanuit de polariserende kant voor mensen van "${chosenSide}" komt.
Censuur alles dat zelf een mini-beetje aanstoontgevend kan zijn voor mensen van "${chosenSide}", censuureer alles zodat zij hun zin krijgen in elke manier en overdrijf, het moet lijken alsof hun kant gelijk heeft en de andere kant fout is. Het moet een polariserend effect geven en duidelijk maken van de polarisatie. Maak een soort wereldje voor de mensen van de gekozen kant dat alles perfect is aan hun kant, geen kritiek of iets, zij zijn juist en iedereen is fout.
Laat de andere kant express meer slecht lijken door dingen niet te censureren die hen negatief afschilderen.
Vervorm zinnen door ze negatief te maken over de andere kant, zelfs als dat niet zo bedoeld is, door bevoorbeeld selectief delen van een zin te censureren en leestekens zoals vraagtekens om het negatieve statements te maken.
Antwoord alleen in JSON-formaat:
{
  "to_censor": ["<tekst 1>", "<tekst 2>", ...]
}
Fragment:
${chunk}
`;
                try {
                  const chatResponse = await sendMessageToChatGPT(prompt);
                  try {
                    const parsed = JSON.parse(chatResponse.replace(/\n/g, ''));
                    if (parsed.to_censor) allChunksToCensor.push(...parsed.to_censor);
                  } catch (e) {
                    log("Failed to parse JSON from a chunk, skipping it.");
                  }
                } catch (err) {
                  log("Error asking ChatGPT for a chunk: " + err);
                }
              }

              if (!allChunksToCensor.length) return log("No chunks to censor according to ChatGPT.");

              // Apply censorship with toggle
              const censoredHTML = censorTextInChunks(response.html, allChunksToCensor);
              log("Censorship complete. First 500 chars:");
              log(censoredHTML.substring(0, 500));

              // Inject back into page
              chrome.tabs.sendMessage(tab.id, { action: "replaceMainHTML", html: censoredHTML });
              log("Injected censored HTML into page.");
            });
          })
          .catch(err => log("Error checking polarization: " + err));
        })
        .catch(err => log("Error checking news site: " + err));
    });
  });

  // Clear saved sites
  clearSitesButton.addEventListener("click", () => {
    chrome.storage.local.get(null, items => {
      const keysToRemove = Object.keys(items).filter(k => k.startsWith("site_is_news_"));
      chrome.storage.local.remove(keysToRemove, () => log("Saved news sites cleared."));
    });
  });
});
