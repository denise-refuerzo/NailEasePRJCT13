// Reusable UI Manager for managing loading states and general UI visibility.

/**
 * Injects a full-screen loading spinner into the body.
 * NOTE: This should be called immediately on page load to prevent FOUC.
 */
export function renderLoading() {
    const loaderId = 'global-loading-spinner';
    let loader = document.getElementById(loaderId);

    if (!loader) {
        loader = document.createElement('div');
        loader.id = loaderId;
        
        // Tailwind classes for full-screen, centered spinner
        loader.className = 'fixed inset-0 flex items-center justify-center bg-gray-50 z-50 transition-opacity duration-500';
        
        // HTML for a pulsing spinner
        loader.innerHTML = `
            <div class="flex flex-col items-center">
                <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-pink-600 mb-4"></div>
                <p class="text-pink-600 font-medium">Loading NailEase...</p>
            </div>
        `;
        document.body.appendChild(loader);
    }
}

/**
 * Hides the loading spinner with a slight fade-out effect.
 */
export function hideLoading() {
    const loader = document.getElementById('global-loading-spinner');
    
    if (loader) {
        // Start fade-out effect
        loader.classList.remove('opacity-100');
        loader.classList.add('opacity-0');
        
        // Remove element from DOM after fade transition completes (500ms)
        setTimeout(() => {
            if (loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
        }, 500);
    }
}

/**
 * Hides the main application containers for a specific view (e.g., when switching dashboards).
 * @param {string} containerId - The ID of the container to hide (e.g., 'auth-card', 'app-content').
 */
export function hideContainer(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.classList.add('hidden');
    }
}

/**
 * Shows the main application containers for a specific view.
 * @param {string} containerId - The ID of the container to show.
 */
export function showContainer(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.classList.remove('hidden');
    }
}
