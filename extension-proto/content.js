// content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extractArticle") {
      try {
        // Extract article using different extraction strategies
        const articleContent = extractArticleContent();
        sendResponse({success: true, article: articleContent});
      } catch (error) {
        sendResponse({success: false, error: error.message});
      }
    }
    return true;
  });
  
  function extractArticleContent() {
    let articleText = "";
    
    // Strategy 1: Try standard article markup
    const articleElements = document.querySelectorAll('article');
    if (articleElements.length > 0) {
      // Use the largest article element
      let largestArticle = articleElements[0];
      let maxLength = largestArticle.textContent.length;
      
      articleElements.forEach(article => {
        if (article.textContent.length > maxLength) {
          largestArticle = article;
          maxLength = article.textContent.length;
        }
      });
      
      articleText = cleanText(largestArticle.textContent);
      if (articleText.split(' ').length > 50) {
        return articleText;
      }
    }
    
    // Strategy 2: Look for common article content containers
    const contentSelectors = [
      '.article-body', '.article-content', '.story-body',
      '.news-article', '.entry-content', '.post-content',
      '[itemprop="articleBody"]', '.story', '.content'
    ];
    
    for (const selector of contentSelectors) {
      const contentElement = document.querySelector(selector);
      if (contentElement) {
        articleText = cleanText(contentElement.textContent);
        if (articleText.split(' ').length > 50) {
          return articleText;
        }
      }
    }
    
    // Strategy 3: Extract from paragraphs in main content area
    const mainContent = document.querySelector('main') || document.body;
    const paragraphs = mainContent.querySelectorAll('p');
    
    if (paragraphs.length > 0) {
      // Only include paragraphs with reasonable length (to filter out navigation/footer text)
      const contentParagraphs = Array.from(paragraphs)
        .filter(p => p.textContent.trim().length > 20)
        .map(p => p.textContent.trim());
      
      if (contentParagraphs.length > 0) {
        articleText = contentParagraphs.join('\n\n');
        return articleText;
      }
    }
    
    // Strategy 4: Fallback - grab all text from the main content
    articleText = cleanText(mainContent.textContent);
    
    // If we couldn't find anything substantial, throw an error
    if (articleText.split(' ').length < 20) {
      throw new Error("Could not identify article content on this page");
    }
    
    return articleText;
  }
  
  function cleanText(text) {
    // Remove extra whitespace
    return text.replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
  }
  