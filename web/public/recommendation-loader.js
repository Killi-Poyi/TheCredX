(function() {
  
  
  
  const API_BASE_URL = 'https://the-cred-x-gamma.vercel.app';

  // Find the container element on the host's page
  const widgetContainer = document.getElementById('CREDX');
  if (!widgetContainer) {
    // fail silently if the container isn't there.
    return;
  }

  // Get verification token from the head meta tag.
  const verificationMetaTag = document.querySelector('meta[name="site-verification"]');
  if (!verificationMetaTag) {
    console.error("AI Widget: Verification meta tag 'site-verification' not found in <head>.");
    return;
  }
  const verificationToken = verificationMetaTag.getAttribute('content');
   if (!verificationToken) {
    console.error("AI Widget: Verification meta tag is missing the 'content' attribute.");
    return;
  }
  // Visitor ID Management 
  function getOrSetVisitorId() {
    const cookieName = 'credx_visitor_id=';
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i].trim();
        if (cookie.startsWith(cookieName)) {
            return cookie.substring(cookieName.length, cookie.length);
        }
    }
    // If not found, generate a new UUID, set it in a cookie, and return it.
    const newVisitorId = crypto.randomUUID();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    document.cookie = `${cookieName}${newVisitorId}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax; Secure`;
    return newVisitorId;
  }

  
  async function fetchRecommendation() {
    try {
      //CALL THIS FUNCTION TO GET VIS_ID FROM THE COOKIE. TEMPORARILY USING MOCK DATA getOrSetVisitorId();
      // const userId = getOrSetVisitorId()
      const userId = '01c1486c-9eb5-4ed9-aa06-2022e2c6e3ed'

      const response = await fetch(`${API_BASE_URL}/api/widget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationToken, userId })
      });

      if (response.status === 204) { 
        return null; 
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Error: ${response.statusText}`);
      }

      const article = await response.json();
      
      if (article) {
        renderWidget(article);
      } else {
        widgetContainer.style.display = 'none';
      }

    } catch (error) {
      console.error('AI Widget: Failed to fetch recommendation:', error);
      widgetContainer.style.display = 'none'; 
    }
  }

  function renderWidget(article) {
    // Create a Shadow DOM to encapsulate the widget's styles
    const shadowRoot = widgetContainer.attachShadow({ mode: 'open' });
    
    const widgetHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        .credx-card { font-family: 'Inter', sans-serif; background: #111; border: 1px solid #333; border-radius: 12px; overflow: hidden; color: #e5e7eb; text-decoration: none; display: block; max-width: 350px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .credx-card:hover { transform: translateY(-5px); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4); }
        .credx-image-container { width: 100%; padding-top: 56.25%; position: relative; background-color: #222; }
        .credx-image { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
        .credx-content { padding: 20px; }
        .credx-title { font-size: 1.125rem; font-weight: 600; margin: 0 0 8px 0; color: #f9fafb; }
        .credx-description { font-size: 0.875rem; color: #9ca3af; margin: 0; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .credx-footer { font-size: 0.75rem; color: #6b7280; padding: 12px 20px; border-top: 1px solid #333; }
      </style>
      <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="credx-card">
        <div class="credx-image-container"><img src="${article.image}" alt="${article.title}" class="credx-image"></div>
        <div class="credx-content">
          <h3 class="credx-title">${article.title}</h3>
          <p class="credx-description">${article.description}</p>
        </div>
        <div class="credx-footer"><span>Recommended for You</span></div>
      </a>
    `;
    shadowRoot.innerHTML = widgetHTML;
  }


  // Run script after the DOM is done
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchRecommendation);
  } else {
    fetchRecommendation();
  }

})();

