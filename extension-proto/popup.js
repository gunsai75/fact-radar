document.addEventListener('DOMContentLoaded', function() {
    const extractButton = document.getElementById('extractButton');
    const statusElement = document.getElementById('status');
    const resultElement = document.getElementById('result');
    
    extractButton.addEventListener('click', async () => {
      statusElement.textContent = "Extracting article...";
      resultElement.style.display = 'none';
      
      try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        const result = await chrome.tabs.sendMessage(tab.id, {action: "extractArticle"});
        
        if (result.success) {
          statusElement.textContent = "Article extracted! Analyzing...";
          
          // Send to your analysis API
          const analysisResult = await sendToAnalysisAPI(result.article, tab.url);
          
          // Display results
          displayResults(analysisResult);
        } else {
          statusElement.textContent = "Could not extract article content.";
        }
      } catch (error) {
        statusElement.textContent = "Error: " + error.message;
      }
    });
    
    async function sendToAnalysisAPI(articleText, url) {
      // Replace with your actual API endpoint
      const apiUrl = "http://localhost:5000/analyze";
      
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: articleText,
            source_url: url
          }),
        });
        
        return await response.json();
      } catch (error) {
        throw new Error("API analysis failed: " + error.message);
      }
    }
    
    function displayResults(analysis) {
      statusElement.textContent = "Analysis complete!";
      resultElement.style.display = 'block';
      
      // Clear previous results
      resultElement.innerHTML = '';
      
      // Calculate confidence percentage as number
      const confidencePercent = analysis.confidence * 100;
      
      // Determine result class based on confidence levels
      let resultClass = "";
      let confidenceLevel = "";
      
      if (analysis.prediction === 0) { // Real information
        if (confidencePercent >= 75) {
          resultClass = "result-high-confidence";
          confidenceLevel = "High confidence";
        } else if (confidencePercent >= 55) {
          resultClass = "result-medium-confidence";
          confidenceLevel = "Medium confidence";
        } else {
          resultClass = "result-low-confidence";
          confidenceLevel = "Low confidence";
        }
      } else { // Fake information
        if (confidencePercent >= 75) {
          resultClass = "result-high-risk";
          confidenceLevel = "High risk";
        } else if (confidencePercent >= 55) {
          resultClass = "result-medium-risk";
          confidenceLevel = "Medium risk";
        } else {
          resultClass = "result-low-risk";
          confidenceLevel = "Low risk";
        }
      }
      
      // Set class based on confidence level
      resultElement.className = `result ${resultClass}`;
      
      // Create result header
      const resultHeader = document.createElement('div');
      resultHeader.className = "result-header";
      resultHeader.textContent = analysis.prediction === 0 ? 
        "This article likely contains factual information." : 
        "This article may contain misleading information.";
      resultElement.appendChild(resultHeader);
      
      // Add confidence level text
      const confidenceLevelElement = document.createElement('div');
      confidenceLevelElement.className = "confidence-level";
      confidenceLevelElement.textContent = confidenceLevel;
      resultElement.appendChild(confidenceLevelElement);
      
      // Add confidence score
      const scoreElement = document.createElement('div');
      scoreElement.className = "score";
      scoreElement.textContent = `Confidence: ${confidencePercent.toFixed(1)}%`;
      resultElement.appendChild(scoreElement);
    }
  });