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

  // Load saved API key
  chrome.storage.local.get("chatgpt_api_key", res => {
    if (res.chatgpt_api_key) apiKeyInput.value = res.chatgpt_api_key;
  });

  saveButton.addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    if (!key) return log("No API key entered.");
    chrome.storage.local.set({ chatgpt_api_key: key }, () => log("API Key saved!"));
  });

  // Generic function to talk to ChatGPT
  async function sendMessageToChatGPT(message, model = "gpt-3.5-turbo") {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get("chatgpt_api_key", res => {
        const key = res.chatgpt_api_key;
        if (!key) return reject("No API key saved!");
        chrome.runtime.sendMessage(
          { action: "sendToChatGPT", apiKey: key, content: message, model: model },
          response => {
            if (!response) return reject("No response from background.js");
            if (response.success) resolve(response.data?.choices?.[0]?.message?.content || "No reply");
            else reject(response.error || "Unknown error");
          }
        );
      });
    });
  }

  // Check if the site is a news article
  function checkIfNewsSite(url) {
    return new Promise((resolve, reject) => {
      const storageKey = "site_is_news_" + url;
      chrome.storage.local.get(storageKey, res => {
        if (res[storageKey] !== undefined) return resolve(res[storageKey]);
        sendMessageToChatGPT(`Bepaal of deze URL een nieuwsartikel is: ${url}. Antwoord alleen true of false.`, "gpt-3.5-turbo")
          .then(reply => {
            const isNews = reply.toLowerCase().includes("true");
            chrome.storage.local.set({ [storageKey]: isNews }, () => resolve(isNews));
          })
          .catch(err => reject(err));
      });
    });
  }

  // Extract only visible text from HTML
  function extractVisibleText(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const walker = document.createTreeWalker(
      doc.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: node => {
          if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          if (["SCRIPT","STYLE","NOSCRIPT"].includes(node.parentNode.tagName)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    let text = "";
    while (walker.nextNode()) text += walker.currentNode.nodeValue + " ";
    return text;
  }

  // Split text into large chunks (15k chars)
  function splitTextIntoChunks(text, maxLen = 15000) {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
      chunks.push(text.slice(start, start + maxLen));
      start += maxLen;
    }
    return chunks;
  }

  // Censor sentences by wrapping them in span
  function censorHTMLWithSentences(html, sentences) {
    let censoredHTML = html;

    sentences.forEach(sentence => {
      if (!sentence) return;

      // Escape regex en accepteer ' of "
      const escaped = sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                              .replace(/['"]/g, '[\'"]');

      const regex = new RegExp(escaped, 'gi');

      censoredHTML = censoredHTML.replace(regex, match => 
        `<span class="UnBiased_Censored">${match}</span>`
      );
    });

    return censoredHTML;
  }

  // Main button click
  sendButton.addEventListener("click", async () => {
    output.textContent = "";
    log("Send button clicked.");

    chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
      if (!tabs.length) return log("No active tab found.");
      const tab = tabs[0];
      const url = tab.url;

      try {
        const isNews = await checkIfNewsSite(url);
        if (!isNews) return log("Not a news site.");
        log("Site is a news article. Checking polarization...");

        // --- GPT-3.5 for polarisation ---
        const polarizationReply = await sendMessageToChatGPT(
          `Lees dit nieuwsartikel: ${url}.
Geef antwoord in formaat:
Polarisatie: true/false
Zijdes: [zijde 1] vs [zijde 2].
Gebruik de taal van het artikel.`,
          "gpt-3.5-turbo"
        );
        log("Polarization check: " + polarizationReply);

        const sideLine = polarizationReply.split("\n").find(l => l.startsWith("Zijdes:"));
        if (!sideLine || sideLine.toLowerCase().includes("geen")) return log("No sides to censor.");
        const [chosenSide, otherSide] = sideLine.replace("Zijdes:", "").split(" vs ").map(s => s.trim());
        log("Chosen side: " + chosenSide + " | Other side to censor: " + otherSide);

        // --- Get HTML from page ---
        const response = await new Promise(resolve =>
          chrome.tabs.sendMessage(tab.id, { action: "getHTML" }, resolve)
        );
        if (!response.html) return log("No HTML received from page.");

        // Extract visible text and split into chunks
        const visibleText = extractVisibleText(response.html);
        const textChunks = splitTextIntoChunks(visibleText, 1500000);

        let sentencesToCensor = [];

        // --- GPT-5-mini for censoring ---
        for (const chunk of textChunks) {
          const prompt = `
Lees het volgende fragment en markeer alles dat vanuit de polariserende kant voor mensen van "${chosenSide}" komt.
Censureer contextueel en volledig, zonder de betekenis of schrijffouten te veranderen.
Antwoord alleen in JSON-formaat:
{
  "to_censor": ["<tekst 1>", "<tekst 2>", ...]
}
Fragment:
${chunk}
          `;
          try {
            const chatResponse = await sendMessageToChatGPT(prompt, "gpt-5-mini");
            try {
              const parsed = JSON.parse(chatResponse.replace(/\n/g, ''));
              if (parsed.to_censor) sentencesToCensor.push(...parsed.to_censor);
            } catch (e) {
              log("Failed to parse JSON for a chunk, skipping it.");
            }
          } catch (err) {
            log("Error from ChatGPT for a chunk: " + err);
          }
        }

        if (!sentencesToCensor.length) return log("No sentences to censor.");

        const censoredHTML = censorHTMLWithSentences(response.html, sentencesToCensor);
        chrome.tabs.sendMessage(tab.id, { action: "replaceMainHTML", html: censoredHTML });
        log("Censorship applied successfully!");
      } catch (err) {
        log("Error: " + err);
      }
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
