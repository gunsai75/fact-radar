document.getElementById("scanPage").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "scanPage" }, (response) => {
        document.getElementById("result").innerText = response.result;
      });
    });
  });