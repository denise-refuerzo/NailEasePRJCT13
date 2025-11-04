import { state } from './auth-logic.js'; 
import { renderPublicPage, attachPublicPageListeners } from './public_layout.js';
import { renderLoading, hideLoading } from './ui_manager.js';


const PUBLIC_PAGE_CONTAINER_ID = 'app-content';

function renderPublicPageContent() {
    if (!state || !state.gallery || !state.designs) {
        console.error("Critical Error: renderPublicPageContent called before data was ready.");
        return; 
    }
    
    const activePromos = state.gallery.filter(item => item.type === 'promo' && item.isActive);
    const credentials = state.gallery.filter(item => item.type === 'credential');
    const featuredDesigns = state.designs.filter(d => d.isFeatured);
    const topPicks = (featuredDesigns.length >= 5 ? featuredDesigns.slice(0, 5) : state.designs.slice(0, 5));
    
    const container = document.getElementById(PUBLIC_PAGE_CONTAINER_ID);
    if (!container) {
        console.error("Public page container not found.");
        return;
    }

    //Render the main page structure
    renderLoading();
    hideLoading();
    container.innerHTML = renderPublicPage({ activePromos, credentials, topPicks });
        //Attach listeners
    attachPublicPageListeners();

    console.log("Public page rendered successfully with loaded data.");
}

export { renderPublicPageContent };