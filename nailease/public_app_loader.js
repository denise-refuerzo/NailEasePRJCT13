import { fetchPublicContent } from './auth-logic.js';
import { safeInitPublicPage } from './public_logic.js';

document.addEventListener('DOMContentLoaded', async () => {
    await fetchPublicContent(); 
        safeInitPublicPage(); 
});