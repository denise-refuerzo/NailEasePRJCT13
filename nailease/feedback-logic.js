// feedback-logic.js - Public feedback page logic

import { getAllReviews, getExternalReviewPhotos } from './review-logic.js';

let currentStarFilter = 'all';
let currentPhotoPage = 1;
const photosPerPage = 8; // Number of photos per page

/**
 * Render feedback page
 */
async function renderFeedbackPage() {
    try {
        console.log('Rendering feedback page...');
        const reviews = await getAllReviews(currentStarFilter);
        const externalPhotos = await getExternalReviewPhotos();
        
        console.log('Reviews:', reviews.length);
        console.log('External Photos:', externalPhotos.length);
        console.log('External Photos data:', JSON.stringify(externalPhotos, null, 2));
        
        // Validate photos have imageUrl
        const validPhotos = externalPhotos.filter(photo => {
            const hasUrl = photo && photo.imageUrl && photo.imageUrl.trim() !== '';
            if (!hasUrl) {
                console.warn('Photo missing imageUrl:', photo);
            }
            return hasUrl;
        });
        
        console.log('Valid photos (with imageUrl):', validPhotos.length);
        
        const container = document.getElementById('app-content');
        if (!container) {
            console.error('app-content container not found');
            return;
        }
        
        // Calculate pagination for external photos
        const totalPhotoPages = Math.ceil(validPhotos.length / photosPerPage);
        const startIndex = (currentPhotoPage - 1) * photosPerPage;
        const endIndex = startIndex + photosPerPage;
        const currentPhotos = validPhotos.slice(startIndex, endIndex);
        
        console.log('Total photo pages:', totalPhotoPages);
        console.log('Current photos to display:', currentPhotos.length);
        console.log('Current photos data:', currentPhotos);
        
        const sharedLayoutStyles = `
            <style>
                #public-root {
                    width: 100vw;
                    max-width: 100vw;
                    margin-left: calc(50% - 50vw);
                    margin-right: calc(50% - 50vw);
                }
                html, body { margin: 0; padding: 0; overflow-x: hidden; }
                .custom-scroll-style::-webkit-scrollbar { display: none; }
                .custom-scroll-style { -ms-overflow-style: none; scrollbar-width: none; }
                .text-shadow-pink { text-shadow: 1px 1px 0px rgba(255, 192, 203, 0.5); }
                .shadow-inner-pink { box-shadow: inset 0 0 5px rgba(255, 192, 203, 0.4); }
            </style>
        `;
        
        container.innerHTML = `
            ${sharedLayoutStyles}
            <div id="public-root" class="min-h-screen bg-pink-50/50">
            <header class="sticky top-0 bg-white shadow-lg z-50">
                <div class="w-full px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center max-w-none mx-0">
                    <a href="home.html" class="shadow-sm hover:shadow-md transition">
                        <img src="logo.png" alt="D'UR LASHNAILS BY DES" class="h-16 shadow-sm">
                    </a>
                    
                    <nav class="flex space-x-4 items-center">
                        <a href="homepage.html" class="text-gray-600 hover:text-pink-600 transition duration-150 font-medium">Home</a>
                        <a href="design_portfolio.html" class="text-gray-600 hover:text-pink-600 transition duration-150 font-medium">Design Portfolio</a>
                        <a href="book.html" class="text-gray-600 hover:text-pink-600 transition duration-150 font-medium">Book</a>
                        <a href="feedback.html" class="text-gray-600 hover:text-pink-600 transition duration-150 font-medium">Feedback</a>
                        <a href="about.html" class="text-gray-600 hover:text-pink-600 transition duration-150 font-medium">About us</a>
                        <button id="accountLinkBtn" class="flex items-center text-pink-600 hover:text-pink-700 transition duration-150 p-2 rounded-full hover:bg-pink-50">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </button>
                    </nav>
                </div>
            </header>
                
                <main class="max-w-7xl mx-auto p-4 md:p-8">
                    <h1 class="text-4xl font-extrabold text-pink-600 text-center mb-8">Client Feedback</h1>
                    
                    <!-- Star Filter -->
                    <div class="bg-white rounded-2xl p-6 mb-8 shadow-lg">
                        <h2 class="text-xl font-bold text-gray-800 mb-4">Filter by Rating</h2>
                        <div class="flex flex-wrap gap-3">
                            <button class="star-filter-btn px-4 py-2 rounded-full font-semibold transition ${currentStarFilter === 'all' ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}" data-filter="all">
                                All Reviews
                            </button>
                            ${[5, 4, 3, 2, 1].map(rating => `
                                <button class="star-filter-btn px-4 py-2 rounded-full font-semibold transition ${currentStarFilter === rating.toString() ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}" data-filter="${rating}">
                                    ${'⭐'.repeat(rating)} (${rating} Star${rating > 1 ? 's' : ''})
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- External Review Photos Section - Always show -->
                    <div class="bg-white rounded-2xl p-6 mb-8 shadow-lg">
                        <h2 class="text-2xl font-bold text-pink-600 mb-4">Reviews from Other Platforms</h2>
                        
                        ${validPhotos.length > 0 ? `
                            <!-- Pagination (Top, One Row) -->
                            ${totalPhotoPages > 1 ? `
                                <div class="flex justify-center items-center gap-2 mb-6 overflow-x-auto pb-2">
                                    <button class="photo-pagination-btn px-3 py-2 rounded-lg font-semibold transition ${currentPhotoPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-pink-100 text-pink-600 hover:bg-pink-200'}" 
                                            data-page="${currentPhotoPage - 1}" 
                                            ${currentPhotoPage === 1 ? 'disabled' : ''}>
                                        ← Prev
                                    </button>
                                    ${Array.from({ length: totalPhotoPages }, (_, i) => i + 1).map(page => `
                                        <button class="photo-pagination-btn px-4 py-2 rounded-lg font-semibold transition ${currentPhotoPage === page ? 'bg-pink-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-pink-100 hover:text-pink-600'}" 
                                                data-page="${page}">
                                            ${page}
                                        </button>
                                    `).join('')}
                                    <button class="photo-pagination-btn px-3 py-2 rounded-lg font-semibold transition ${currentPhotoPage === totalPhotoPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-pink-100 text-pink-600 hover:bg-pink-200'}" 
                                            data-page="${currentPhotoPage + 1}" 
                                            ${currentPhotoPage === totalPhotoPages ? 'disabled' : ''}>
                                        Next →
                                    </button>
                                </div>
                            ` : ''}
                            
                            <!-- Photos Grid -->
                            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                ${currentPhotos.map((photo, index) => {
                                    const imageUrl = photo.imageUrl || '';
                                    return `
                                        <div class="relative group cursor-pointer external-photo-container" 
                                             data-photo-url="${imageUrl}"
                                             data-photo-index="${startIndex + index}">
                                            <img src="${imageUrl}" 
                                                 alt="External review ${startIndex + index + 1}" 
                                                 class="w-full h-64 object-cover rounded-xl shadow-md hover:shadow-lg transition transform hover:scale-105 external-review-photo pointer-events-none" 
                                                 data-photo-url="${imageUrl}"
                                                 data-photo-index="${startIndex + index}" />
                                            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition rounded-xl flex items-center justify-center pointer-events-none">
                                                <div class="opacity-0 group-hover:opacity-100 transition text-white text-2xl">
                                                    🔍
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                            
                            <!-- Page Info -->
                            ${totalPhotoPages > 1 ? `
                                <div class="text-center mt-4 text-sm text-gray-500">
                                    Showing ${startIndex + 1}-${Math.min(endIndex, validPhotos.length)} of ${validPhotos.length} photos
                                </div>
                            ` : ''}
                        ` : `
                            <div class="text-center py-12 text-gray-500">
                                <div class="text-5xl mb-4">📷</div>
                                <p class="text-xl">No external review photos yet.</p>
                                <p class="text-sm mt-2">Check back later for reviews from other platforms!</p>
                            </div>
                        `}
                    </div>
                    
                    <!-- Reviews List -->
                    <div class="bg-white rounded-2xl p-6 shadow-lg">
                        <h2 class="text-2xl font-bold text-pink-600 mb-6">Client Reviews</h2>
                        <div id="reviewsList" class="space-y-6">
                            ${reviews.length === 0 ? `
                                <div class="text-center py-12 text-gray-500">
                                    <div class="text-5xl mb-4">⭐</div>
                                    <p class="text-xl">No reviews yet. Be the first to leave a review!</p>
                                </div>
                            ` : reviews.map(review => {
                                const stars = '⭐'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
                                const reviewDate = review.createdAt instanceof Date ? review.createdAt : new Date(review.createdAt);
                                return `
                                    <div class="border-b border-gray-200 pb-6 last:border-0">
                                        <div class="flex items-center justify-between mb-3">
                                            <div>
                                                <div class="text-2xl mb-1">${stars}</div>
                                                <p class="text-sm text-gray-500">${review.userName || 'Anonymous'} • ${reviewDate.toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <p class="text-gray-700 mb-4">${review.text}</p>
                                        ${review.imageUrls && review.imageUrls.length > 0 ? `
                                            <div class="grid grid-cols-2 gap-3">
                                                ${review.imageUrls.map((url, idx) => `
                                                    <img src="${url}" 
                                                         alt="Review photo ${idx + 1}" 
                                                         class="w-full h-48 object-cover rounded-lg shadow-md cursor-pointer hover:shadow-lg transition review-photo" 
                                                         data-photo-url="${url}" />
                                                `).join('')}
                                            </div>
                                        ` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </main>
                <footer class="text-center py-6 text-gray-500 text-sm border-t border-pink-100 mt-12">
                    &copy; 2024 D'UR LASHNAILS BY DES. All rights reserved.
                </footer>
                
                <!-- Photo Modal/Lightbox -->
                <div id="photoModal" class="fixed inset-0 bg-black bg-opacity-90 z-50 hidden flex items-center justify-center p-4">
                    <div class="relative max-w-7xl max-h-full">
                        <button id="closePhotoModal" class="absolute top-4 right-4 text-white text-4xl font-bold hover:text-pink-300 transition z-10 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center">
                            ×
                        </button>
                        <button id="prevPhotoBtn" class="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl font-bold hover:text-pink-300 transition z-10 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center">
                            ‹
                        </button>
                        <button id="nextPhotoBtn" class="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl font-bold hover:text-pink-300 transition z-10 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center">
                            ›
                        </button>
                        <img id="modalPhoto" src="" alt="Enlarged review photo" class="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
                    </div>
                </div>
            </div>
        `;
        
        // Attach filter listeners
        document.querySelectorAll('.star-filter-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                currentStarFilter = btn.dataset.filter;
                await renderFeedbackPage();
            });
        });
        
        // Attach photo pagination listeners
        document.querySelectorAll('.photo-pagination-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const page = parseInt(e.target.dataset.page);
                const totalPages = Math.ceil(validPhotos.length / photosPerPage);
                if (page >= 1 && page <= totalPages && !e.target.disabled) {
                    currentPhotoPage = page;
                    await renderFeedbackPage();
                    // Scroll to photos section
                    const photosSection = document.querySelector('.bg-white.rounded-2xl.p-6.mb-8.shadow-lg');
                    if (photosSection) {
                        photosSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            });
        });
        
        // Attach photo click listeners for modal
        attachPhotoModalListeners();
        
        // Account button
        const accountBtn = document.getElementById('accountLinkBtn');
        if (accountBtn) {
            accountBtn.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }
        
        console.log('Feedback page rendered successfully');
    } catch (error) {
        console.error('Error rendering feedback page:', error);
        const container = document.getElementById('app-content');
        if (container) {
            container.innerHTML = `
                <div class="min-h-screen bg-pink-50/50 flex items-center justify-center">
                    <div class="text-center">
                        <h1 class="text-2xl font-bold text-red-600 mb-4">Error Loading Feedback</h1>
                        <p class="text-gray-600">Please try refreshing the page.</p>
                        <p class="text-sm text-red-500 mt-2">${error.message}</p>
                    </div>
                </div>
            `;
        }
    }
}

/**
 * Attach photo modal listeners
 */
function attachPhotoModalListeners() {
    let currentPhotoIndex = 0;
    const modal = document.getElementById('photoModal');
    const modalPhoto = document.getElementById('modalPhoto');
    const closeBtn = document.getElementById('closePhotoModal');
    const prevBtn = document.getElementById('prevPhotoBtn');
    const nextBtn = document.getElementById('nextPhotoBtn');
    
    // Get all photo elements (external photo containers and review photos)
    const externalPhotoContainers = document.querySelectorAll('.external-photo-container');
    const reviewPhotos = document.querySelectorAll('.review-photo');
    const allPhotoElements = [...externalPhotoContainers, ...reviewPhotos];
    
    console.log('Found photo elements:', allPhotoElements.length);
    
    // Open modal when clicking on any photo container
    externalPhotoContainers.forEach((container, index) => {
        container.addEventListener('click', (e) => {
            e.stopPropagation();
            const photoUrl = container.dataset.photoUrl || container.querySelector('img')?.src;
            if (!photoUrl) return;
            
            // Get all photo URLs for navigation
            const allPhotoUrls = Array.from(allPhotoElements).map(el => {
                if (el.classList.contains('external-photo-container')) {
                    return el.dataset.photoUrl || el.querySelector('img')?.src;
                } else {
                    return el.dataset.photoUrl || el.src;
                }
            }).filter(url => url);
            
            currentPhotoIndex = allPhotoUrls.findIndex(url => url === photoUrl);
            if (currentPhotoIndex === -1) currentPhotoIndex = index;
            
            openPhotoModal(photoUrl, allPhotoUrls, currentPhotoIndex);
        });
    });
    
    // Open modal when clicking on review photos
    reviewPhotos.forEach((photoEl, index) => {
        photoEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const photoUrl = photoEl.dataset.photoUrl || photoEl.src;
            if (!photoUrl) return;
            
            // Get all photo URLs for navigation
            const allPhotoUrls = Array.from(allPhotoElements).map(el => {
                if (el.classList.contains('external-photo-container')) {
                    return el.dataset.photoUrl || el.querySelector('img')?.src;
                } else {
                    return el.dataset.photoUrl || el.src;
                }
            }).filter(url => url);
            
            currentPhotoIndex = allPhotoUrls.findIndex(url => url === photoUrl);
            if (currentPhotoIndex === -1) currentPhotoIndex = index;
            
            openPhotoModal(photoUrl, allPhotoUrls, currentPhotoIndex);
        });
    });
    
    // Close modal
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closePhotoModal();
        });
    }
    
    // Close on backdrop click
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closePhotoModal();
            }
        });
    }
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
            closePhotoModal();
        }
    });
    
    // Previous photo
    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const allPhotoUrls = Array.from(allPhotoElements).map(el => {
                if (el.classList.contains('external-photo-container')) {
                    return el.dataset.photoUrl || el.querySelector('img')?.src;
                } else {
                    return el.dataset.photoUrl || el.src;
                }
            }).filter(url => url);
            
            if (allPhotoUrls.length > 0) {
                currentPhotoIndex = (currentPhotoIndex - 1 + allPhotoUrls.length) % allPhotoUrls.length;
                openPhotoModal(allPhotoUrls[currentPhotoIndex], allPhotoUrls, currentPhotoIndex);
            }
        });
    }
    
    // Next photo
    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const allPhotoUrls = Array.from(allPhotoElements).map(el => {
                if (el.classList.contains('external-photo-container')) {
                    return el.dataset.photoUrl || el.querySelector('img')?.src;
                } else {
                    return el.dataset.photoUrl || el.src;
                }
            }).filter(url => url);
            
            if (allPhotoUrls.length > 0) {
                currentPhotoIndex = (currentPhotoIndex + 1) % allPhotoUrls.length;
                openPhotoModal(allPhotoUrls[currentPhotoIndex], allPhotoUrls, currentPhotoIndex);
            }
        });
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (modal && !modal.classList.contains('hidden')) {
            const allPhotoUrls = Array.from(allPhotoElements).map(el => {
                if (el.classList.contains('external-photo-container')) {
                    return el.dataset.photoUrl || el.querySelector('img')?.src;
                } else {
                    return el.dataset.photoUrl || el.src;
                }
            }).filter(url => url);
            
            if (e.key === 'ArrowLeft' && allPhotoUrls.length > 0) {
                e.preventDefault();
                currentPhotoIndex = (currentPhotoIndex - 1 + allPhotoUrls.length) % allPhotoUrls.length;
                openPhotoModal(allPhotoUrls[currentPhotoIndex], allPhotoUrls, currentPhotoIndex);
            } else if (e.key === 'ArrowRight' && allPhotoUrls.length > 0) {
                e.preventDefault();
                currentPhotoIndex = (currentPhotoIndex + 1) % allPhotoUrls.length;
                openPhotoModal(allPhotoUrls[currentPhotoIndex], allPhotoUrls, currentPhotoIndex);
            }
        }
    });
    
    function openPhotoModal(photoUrl, allPhotoUrls, index) {
        if (modal && modalPhoto) {
            modalPhoto.src = photoUrl;
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
            
            // Update navigation buttons visibility
            if (prevBtn) prevBtn.style.display = allPhotoUrls.length > 1 ? 'flex' : 'none';
            if (nextBtn) nextBtn.style.display = allPhotoUrls.length > 1 ? 'flex' : 'none';
        }
    }
    
    function closePhotoModal() {
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = ''; // Restore scrolling
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', renderFeedbackPage);


