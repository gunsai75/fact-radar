chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scanPage") {
      const pageText = document.body.innerText;
      const aiProbability = detectAIText(pageText); // Call your detection function
      sendResponse({ result: `AI Probability: ${aiProbability}%` });
    }
  });
  
  function detectAIText(text) {
    // Replace this with your AI detection logic
    // For now, it returns a random number
    return Math.floor(Math.random() * 100);
  }