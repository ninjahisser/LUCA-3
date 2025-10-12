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

// --- Helper functions ---
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

function splitTextIntoChunks(text, maxLen = 15000) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + maxLen));
    start += maxLen;
  }
  return chunks;
}

function censorHTMLWithSentences(html, sentences) {
  let censoredHTML = html;

  sentences.forEach(sentence => {
    if (!sentence) return;
    const escaped = sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/['"]/g, '[\'"]');
    const regex = new RegExp(escaped, 'gi');
    censoredHTML = censoredHTML.replace(regex, match => 
      `<span class="UnBiased_Censored">${match}</span>`
    );
  });

  return censoredHTML;
}

// --- Main censorship flow ---
async function startCensorship(apiKey, url, tabId) {
  log("🟡 Starting censorship process...", tabId);

  try {
    // Get HTML from page
    const response = await new Promise(resolve =>
      chrome.tabs.sendMessage(tabId, { action: "getHTML" }, resolve)
    );
    if (!response?.html) return log("❌ No HTML received from page.", tabId);
    const html = response.html;

    // Step 1: Is it a news article?
    log(`➡️ Checking if news article...`, tabId);
    const checkResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: `Bepaal of deze URL een nieuwsartikel is: ${url}. Antwoord alleen true of false.` }]
      })
    });
    const checkData = await checkResp.json();
    const checkText = checkData.choices?.[0]?.message?.content?.trim() || "false";
    log(`⬅️ ChatGPT:\n${checkText}`, tabId);
    if (!checkText.toLowerCase().includes("true")) return log("❌ Not a news site.", tabId);
    log("✅ News article detected. Checking polarization...", tabId);

    // Step 2: Check polarization
    const polarResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: `Lees dit nieuwsartikel: ${url}.\nGeef antwoord in formaat:\nPolarisatie: true/false\nZijdes: [zijde 1] vs [zijde 2].\nGebruik de taal van het artikel.` }]
      })
    });
    const polarData = await polarResp.json();
    const polarText = polarData.choices?.[0]?.message?.content?.trim() || "";
    log(`⬅️ Polarization:\n${polarText}`, tabId);

    const match = polarText.match(/Zijdes:\s*(.+?)\s+vs\s+(.+)/i);
    const side1 = match ? match[1].trim() : null;
    const side2 = match ? match[2].trim() : null;
    const isPolarized = /true/i.test(polarText);
    if (!isPolarized || !side1 || !side2) return log("❌ No clear polarization found.", tabId);
    const chosenSide = side1.toLowerCase();
    const otherSide = side2.toLowerCase();
    log(`Chosen side: ${chosenSide} | Other side: ${otherSide}`, tabId);

    // Step 3: Ask GPT to mark polarizing sentences (using visible text chunks)
    const visibleText = extractVisibleText(html);
    const chunks = splitTextIntoChunks(visibleText, 1500000);
    let toMark = [];

    for (const chunk of chunks) {
      const markPrompt = `
Lees het volgende fragment en markeer alles dat vanuit de polariserende kant voor mensen van "${chosenSide}" komt., die tegen de kant van mensen is van "${otherSide}".
Markeer contextueel en volledig, zonder de betekenis of schrijffouten te veranderen.
Zorg dat je alles dat mensen van de kant ${chosenSide} onbewust niet zouden willen lezen, gemarkeerd wordt. Wees extreem, vervorm zinnen.
Bv. 
Als het artikel zou zijn:
"Uit welke hoek komt het politieke geweld: links of rechts?", en de kant links in de plaats van ${chosenSide}, dan wordt die zin:
"Uit welke hoek komt het politiek geweld: ##### ## rechts#, dus als iemand het leest krijgt die het gevoel alsof er staat:
"Uit welke hoek komt het poltiek geweld: rechts", dat is wat een linkse persoon zou lezen met een polariserende mindset.
De hashtags zijn het gemarkeerde deel.

Overdrijf, markeer zeker de helft van het fragment, je mag ook tekens markeren zoals vraagtekens, of letters markeren om het artikel te vervormen van context in favor van "${otherSide}". Of enkele woorden.

Wat we doen is een extension maken die mensen confronteert met hoe polariserend ze onbeuwst zijn met het willen in hun ideale wereld, dat ze door de schok ervan zien hoe zwart/Wit en onbewust polariserend ze zijn.

Je kan dus tekst markeren die zou tonen wat polariserende mensen van "${chosenSide}" niet zouden lezen omdat ze een gepolariseerde blik hebben over "${otherSide}", dus markeer dat zodat het zeker lezen.
Je kan ook leestekens en zinnen weglaten om duidelijk te maken hoe iemand fout leest.

Markeer wat ${chosenSide} negatief laat lijken!

Een zin zoals:
Conner Rousseau (Vooruit) benadrukt dat geweld van beide kanten komt: Of het extreemrechts is, zoals in Nederland, of extreemlinks zoals in Luik: les extrèmes se touchent."

Zou dus:
Conner Rousseau (Vooruit) benadrukt dat geweld van ##### ###### ####: ## het extreemrechts is, zoals in Nederland, ## ############ ##### ## ##### ### ######## ## ##########
Worden.

Dit is een voorbeeld van Links Rechts, de hashtags zijn het markeed deel

Stel je bij alles voor van als ik marked deel weg laat, (wat de kijker zonder dit perongeluk doet), zou de teksts dan positiever zijn voor "${chosenSide}" en negatiever voor ${otherSide}?

Geef geen letterlijk hashtags, behoud de originele tekst, maar mark het "hashtag" deel in to_mark in de json.

Iets zoals "2. Komt het geweld van de rechterkant?" zou je dus niet markeren want als je dat weglaat, dan wordt de teksts positiever voor die kant (als je van de linkse kant bent). In dit geval (voorbeelden zijn links tegen rechts, hebben wij ${chosenSide} vs ${otherSide}})

Stel je voor dat dit een scenario is, iemand die de marked teksts allemaal zou weglaten, zou de kant van "${chosenSide}" als alleen positief en superieur zien, en een negatiever beeld krijgen van "${otherSide}".

Antwoord alleen in JSON-formaat:
{
  "to_mark": ["<tekst 1>", "<tekst 2>", ...]
}
Fragment:
${chunk}
          `;
      const markResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-5-mini", messages: [{ role: "user", content: markPrompt }] })
      });
      const markData = await markResp.json();
      const markText = markData.choices?.[0]?.message?.content?.trim() || "{}";

      try {
        // Extract JSON block
        const jsonMatch = markText.match(/```json([\s\S]*?)```/i) || markText.match(/{[\s\S]*}/);
        if (jsonMatch) {
          const cleanJSON = jsonMatch[1] ? jsonMatch[1].trim() : jsonMatch[0];
          const parsed = JSON.parse(cleanJSON);
          if (parsed.to_mark) toMark.push(...parsed.to_mark);
        }
      } catch (e) {
        log("Failed to parse JSON for a chunk, skipping it.", tabId);
        log("🪶 Raw markText:\n" + markText, tabId);
      }
    }

    if (!toMark.length) return log("❌ No sentences to censor.", tabId);

    // Step 4: Apply censorship without overwriting layout
    const censoredHTML = censorHTMLWithSentences(html, toMark);
    chrome.tabs.sendMessage(tabId, { action: "replaceMainHTML", html: censoredHTML });
    log("✅ Censorship applied successfully!", tabId);

  } catch (err) {
    log("❌ Error: " + err.message, tabId);
  }
}
