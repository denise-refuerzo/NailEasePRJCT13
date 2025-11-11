/**
 * Escapes HTML attribute values to prevent XSS and broken HTML
 * @param {string} str - The string to escape
 * @returns {string} The escaped string
 */
const escapeHtmlAttr = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
};

/**
 * Renders a single content card (for Promo, Credential, or Design).
 * @param {Object} item - The data item.
 * @param {string} type - 'promo', 'credential', or 'design'.
 * @returns {string} The HTML for the card.
 */
const renderContentCard = (item, type) => {
    const fallbackImage = 'https://placehold.co/400x300/FCE7F3/DB2777?text=Image'; 
    const imageUrl = item.imageUrl || fallbackImage;
    const title = item.title || (type === 'promo' ? 'New Promo' : (type === 'credential' ? 'Certificate' : 'Design'));
    
    // Define unique classes based on the card type
    let cardBaseClasses = "rounded-2xl shadow-xl p-4 flex-shrink-0 relative overflow-hidden transition-all duration-300 transform hover:scale-[1.01]";
    let contentHtml = '';
    
    if (type === 'design') {
        // Design cards are optimized for the bottom row
        cardBaseClasses += " aspect-[4/5] bg-pink-50/70 cursor-pointer";
        contentHtml = `
            <img src="${imageUrl}" alt="${title}" class="w-full h-full object-cover rounded-xl absolute inset-0 opacity-90 image-enlargeable" data-image-url="${escapeHtmlAttr(imageUrl)}">
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent p-3 flex flex-col justify-end pointer-events-none">
                <h4 class="text-white text-md font-bold">${title}</h4>
                <p class="text-pink-300 text-sm font-semibold">₱${item.price.toFixed(2)}</p>
                
                <button class="book-design-btn mt-2 bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold py-1 px-3 rounded-full shadow-md transition-colors pointer-events-auto"
                        data-design-id="${item.id}"
                        data-design-title="${escapeHtmlAttr(item.title || 'Design')}"
                        data-design-price="${item.price || 0}"
                        data-design-image="${escapeHtmlAttr(item.imageUrl || '')}"
                        data-design-description="${escapeHtmlAttr(item.description || 'Professional design service')}">Book Now</button>
            </div>
        `;
    } else if (type === 'promo') {
        // Promo cards are tall, but we use 'h-full' to ensure they don't stretch too tall
        cardBaseClasses += " w-[220px] h-[300px] bg-pink-100/50 cursor-pointer"; 
        contentHtml = `
            <img src="${imageUrl}" alt="${title}" class="w-full h-full object-cover rounded-xl absolute inset-0 opacity-80 image-enlargeable" data-image-url="${escapeHtmlAttr(imageUrl)}" 
                onerror="this.onerror=null;this.src='${fallbackImage.replace('Image', title.replace(/\s/g, '+'))}';">
            <div class="absolute inset-0 bg-pink-900/40 flex items-center justify-center p-4 pointer-events-none">
                 <p class="text-white text-lg font-bold text-shadow">${title}</p>
            </div>
        `;
    } else if (type === 'credential') {
        // Credential cards are forced into a landscape aspect ratio (Aesthetic fix)
        cardBaseClasses += " w-[350px] aspect-[4/3] bg-white shadow-lg cursor-pointer"; 
        contentHtml = `
            <img src="${imageUrl}" alt="${title}" class="w-full h-full object-contain rounded-xl image-enlargeable" data-image-url="${escapeHtmlAttr(imageUrl)}" 
                onerror="this.onerror=null;this.src='${fallbackImage.replace('Image', 'Certificate')}';">
            <div class="absolute inset-0 bg-black/10 flex items-end justify-start p-2 pointer-events-none">
                 <p class="text-white text-xs font-bold">${title}</p>
            </div>
        `;
    }

    return `<div class="${cardBaseClasses} public-card-${type}" data-id="${item.id}" data-image-url="${escapeHtmlAttr(imageUrl)}">${contentHtml}</div>`;
};

const renderCarouselSection = (id, title, items, type) => {
    const titleClasses = "text-2xl font-extrabold text-pink-600 mb-4 tracking-wider text-shadow-pink";
    
    const cardsHtml = items.map(item => renderContentCard(item, type)).join('');

    // Ensure the track classes correctly handle horizontal scrolling and spacing
    const trackClasses = "flex overflow-x-scroll space-x-4 p-2 custom-scroll-style snap-x snap-mandatory";

    // Adjust container sizes for the new layout
    const isPromo = type === 'promo';
    const isCredential = type === 'credential';
    
    return `
        <div class="w-full mb-12 ${isPromo ? 'lg:col-span-1' : 'lg:col-span-2'}">
            <h2 class="${titleClasses}">${title}</h2>
            <div id="${id}-container" class="relative">
                
                <div id="${id}-track" class="${trackClasses}">
                    ${cardsHtml.length > 0 ? cardsHtml : `<p class="text-center text-gray-500 py-4 w-full">No ${type} content available yet.</p>`}
                </div>
                
                ${items.length > 0 ? `
                    <button id="${id}-prev" 
                        class="absolute left-0 top-1/2 -translate-y-1/2 p-3 bg-white/70 backdrop-blur-sm rounded-full shadow-lg text-pink-600 hover:bg-pink-100 transition disabled:opacity-30 z-10 ml-2">
                        &larr;
                    </button>
                    <button id="${id}-next" 
                        class="absolute right-0 top-1/2 -translate-y-1/2 p-3 bg-white/70 backdrop-blur-sm rounded-full shadow-lg text-pink-600 hover:bg-pink-100 transition disabled:opacity-30 z-10 mr-2">
                        &rarr;
                    </button>
                ` : ''}
            </div>
        </div>
    `;
};

const renderTopPicks = (items) => {
    const titleClasses = "text-2xl font-extrabold text-pink-600 mb-4 tracking-wider text-shadow-pink";
    
    const cardsHtml = items.slice(0, 5).map(item => renderContentCard(item, 'design')).join('');

    return `
        <div class="w-full pt-6">
            <h2 class="${titleClasses}">Top Picks !!!</h2>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                ${cardsHtml.length > 0 ? cardsHtml : '<div class="lg:col-span-5 text-center text-gray-500 py-8">No designs marked as Top Picks or available.</div>'}
            </div>
        </div>
    `;
};

export const renderPublicPage = ({ activePromos, credentials, topPicks }) => {
    const GOOGLE_CALENDAR_EMBED_URL = typeof window !== 'undefined' ? window.__NAILEASE_CALENDAR_EMBED_URL__ : '';
    const customStyle = `
        <style>
            /* Custom Scrollbar and Text Shadow styles remain the same */
            .custom-scroll-style::-webkit-scrollbar { display: none; }
            .custom-scroll-style { -ms-overflow-style: none; scrollbar-width: none; }
            .text-shadow-pink { text-shadow: 1px 1px 0px rgba(255, 192, 203, 0.5); }
            .shadow-inner-pink { box-shadow: inset 0 0 5px rgba(255, 192, 203, 0.4); }
            
            /* Enforce snap scrolling for a cleaner carousel look */
            .public-card-promo, .public-card-credential {
                scroll-snap-align: start; 
            }
        </style>
    `;
    
    return `
        ${customStyle}
        <div class="min-h-screen bg-pink-50/50">
            <header class="sticky top-0 bg-white shadow-lg z-50">
                <div class="w-full px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center max-w-7xl mx-auto">
                    <a href="homepage.html" class="text-xl font-bold text-pink-600 tracking-wider cursor-pointer">DCAC</a>
                    
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
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    ${renderCarouselSection('promo-carousel', 'Promo!!!', activePromos, 'promo')}
                    ${renderCarouselSection('credential-carousel', 'Credentials', credentials, 'credential')}
                </div>
                
                ${renderTopPicks(topPicks)}

                <section class="mt-10">
                    <h2 class="text-2xl font-extrabold text-pink-600 mb-4 tracking-wider">Calendar</h2>
                    <p class="text-sm text-gray-600 mb-4">See available and not available dates and times. Updated in real time with admin and user bookings.</p>
                    <div id="public-availability-calendar" class="bg-white rounded-2xl shadow-md border border-gray-100 p-4"></div>
                </section>
                
                ${GOOGLE_CALENDAR_EMBED_URL ? `
                <section class="mt-8">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">Admin Calendar (Read‑only)</h3>
                    <p class="text-xs text-gray-500 mb-3">Reflects the admin’s Google Calendar. For privacy, only availability is used in the booking view.</p>
                    <div class="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                        <iframe
                            src="${GOOGLE_CALENDAR_EMBED_URL}"
                            class="w-full h-[540px] border-0"
                            frameborder="0"
                            scrolling="no"
                            loading="lazy"
                            allowfullscreen
                        ></iframe>
                    </div>
                </section>
                ` : ''}
            </main>

            <footer class="text-center py-6 text-gray-500 text-sm border-t border-pink-100 mt-12">
                &copy; 2024 DCAC. All rights reserved.
            </footer>
            <!-- Image Modal/Lightbox -->
            <div id="imageModal" class="fixed inset-0 bg-black bg-opacity-90 z-50 hidden flex items-center justify-center p-4">
                <div class="relative max-w-7xl max-h-full">
                    <button id="closeImageModal" class="absolute top-4 right-4 text-white text-4xl font-bold hover:text-pink-300 transition z-10 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center">×</button>
                    <img id="modalImage" src="" alt="Enlarged image" class="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
                </div>
            </div>
        </div>
    `;
};

export const attachPublicPageListeners = () => {
    // Initialize availability calendar after DOM is in place
    (async () => {
        try {
            const module = await import('./public_availability_calendar.js');
            const container = document.getElementById('public-availability-calendar');
            if (container && typeof module.renderPublicAvailabilityCalendar === 'function') {
                module.renderPublicAvailabilityCalendar(container);
            }
        } catch (e) {
            console.error('Failed to load availability calendar:', e);
        }
    })();
        const setupCarousel = (id, cardWidth = 216) => { 
        const track = document.getElementById(`${id}-track`);
        const nextButton = document.getElementById(`${id}-next`);
        const prevButton = document.getElementById(`${id}-prev`);
        
        if (!track || !nextButton || !prevButton) return;

        const updateButtons = () => {
            if (track.scrollLeft === 0) {
                prevButton.disabled = true;
            } else {
                prevButton.disabled = false;
            }
            if (track.scrollWidth - track.scrollLeft === track.clientWidth) {
                nextButton.disabled = true;
            } else {
                nextButton.disabled = false;
            }
        };

        const scrollStep = (direction) => {
            const currentScroll = track.scrollLeft;
            const newScroll = currentScroll + (direction * cardWidth); 
            track.scrollTo({ left: newScroll, behavior: 'smooth' });
            setTimeout(updateButtons, 300); 
        };

        nextButton.addEventListener('click', () => scrollStep(1));
        prevButton.addEventListener('click', () => scrollStep(-1));
        track.addEventListener('scroll', updateButtons);

        updateButtons();
    };

    setupCarousel('promo-carousel');
    setupCarousel('credential-carousel');

    const accountBtn = document.getElementById('accountLinkBtn');

    if (accountBtn) { 
        accountBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'index.html'; 
        });
    } else {
        console.error("Account button (#accountLinkBtn) not found!"); 
    }

    document.querySelectorAll('.book-design-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const designTitle = encodeURIComponent(e.currentTarget.dataset.designTitle || 'Design');
            const designPrice = e.currentTarget.dataset.designPrice || '0';
            const designImage = encodeURIComponent(e.currentTarget.dataset.designImage || '');
            const designDescription = encodeURIComponent(e.currentTarget.dataset.designDescription || 'Professional design service');
            
            // Redirect to book.html with design parameters
            window.location.href = `book.html?design=${designTitle}&price=${designPrice}&image=${designImage}&description=${designDescription}`;
        });
    });

    // Image modal listeners
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const closeBtn = document.getElementById('closeImageModal');
    const clickableCards = document.querySelectorAll('.public-card-promo, .public-card-credential, .public-card-design');
    const clickableImages = document.querySelectorAll('.image-enlargeable');

    function openImageModal(url){
        if (!modal || !modalImage || !url) return;
        modalImage.src = url;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    function closeImageModal(){
        if (!modal) return;
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
    clickableCards.forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.book-design-btn')) return;
            const url = card.dataset.imageUrl || card.querySelector('img')?.src;
            if (url) openImageModal(url);
        });
    });
    clickableImages.forEach(img => {
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            const url = img.dataset.imageUrl || img.src;
            if (url) openImageModal(url);
        });
    });
    if (closeBtn) closeBtn.addEventListener('click', closeImageModal);
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeImageModal(); });
};