import { fetchPublicContent } from './auth-logic.js';
import {  renderPublicPageContent } from './public_logic.js';
import { renderLoading, hideLoading } from './ui_manager.js';

document.addEventListener('DOMContentLoaded', async () => {
    renderLoading();
    await fetchPublicContent(); 
    renderPublicPageContent(); 
    hideLoading();
});