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
    let confidencePercent = analysis.confidence * 100;
    
    // Reduce confidence by 20% if it's less than 60%
    if (confidencePercent < 60) {
      confidencePercent = confidencePercent * 0.8;
    }

    // Define confidence thresholds and their corresponding styles
    const confidenceConfig = {
      high: {
        threshold: 75,
        class: 'result-high',
        level: 'High'
      },
      medium: {
        threshold: 55,
        class: 'result-medium',
        level: 'Medium'
      },
      low: {
        threshold: 0,
        class: 'result-low',
        level: 'Low'
      }
    };

    // Determine confidence level and style
    let config;
    if (confidencePercent >= confidenceConfig.high.threshold) {
      config = confidenceConfig.high;
    } else if (confidencePercent >= confidenceConfig.medium.threshold) {
      config = confidenceConfig.medium;
    } else {
      config = confidenceConfig.low;
    }

    // Set the base class based on whether it's misinformation or factual
    const baseClass = analysis.prediction === 0 ? 'result-misinfo' : 'result-factual';
    
    // Set class based on confidence level
    resultElement.className = `result ${baseClass} ${config.class}`;
    
    // Create result header
    const resultHeader = document.createElement('div');
    resultHeader.className = "result-header";
    resultHeader.textContent = analysis.prediction === 0 ? 
      "This article may contain misleading information." :
      "This article likely contains factual information.";
    resultElement.appendChild(resultHeader);
    
    // Add confidence level text
    const confidenceLevelElement = document.createElement('div');
    confidenceLevelElement.className = "confidence-level";
    confidenceLevelElement.textContent = `${config.level} ${analysis.prediction === 0 ? 'risk' : 'confidence'}`;
    resultElement.appendChild(confidenceLevelElement);
    
    // Add confidence score
    const scoreElement = document.createElement('div');
    scoreElement.className = "score";
    scoreElement.textContent = `Confidence to be real: ${confidencePercent.toFixed(1)}%`;
    resultElement.appendChild(scoreElement);
  }

  // Add CSS for the color scheme
  const style = document.createElement('style');
  style.textContent = `
    /* Base styles for factual content */
    .result-factual.result-high {
      background-color: #e6ffe6;
      border: 2px solid #00cc00;
    }
    .result-factual.result-medium {
      background-color: #fff2e6;
      border: 2px solid #ff9933;
    }
    .result-factual.result-low {
      background-color: #ffe6e6;
      border: 2px solid #ff3333;
    }

    /* Base styles for misinformation content - all red with varying intensity */
    .result-misinfo.result-high {
      background-color: #ffcccc;
      border: 2px solid #cc0000;
    }
    .result-misinfo.result-medium {
      background-color: #ffe6e6;
      border: 2px solid #ff3333;
    }
    .result-misinfo.result-low {
      background-color: #fff2f2;
      border: 2px solid #ff6666;
    }
  `;
  document.head.appendChild(style);
});