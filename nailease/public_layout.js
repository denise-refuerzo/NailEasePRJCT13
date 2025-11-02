/**
 * Renders a single content card (for Promo, Credential, or Design).
 * @param {Object} item - The data item.
 * @param {string} type - 'promo', 'credential', or 'design'.
 * @returns {string} The HTML for the card.
 */
const renderContentCard = (item, type) => {
    const cardBaseClasses = "min-w-[200px] h-64 bg-pink-100/50 rounded-2xl shadow-inner-pink p-4 flex-shrink-0 relative overflow-hidden";
    
    const fallbackImage = 'https://placehold.co/400x300/FCE7F3/DB2777?text=Image'; 
    const imageUrl = item.imageUrl || fallbackImage;
    const title = item.title || (type === 'promo' ? 'New Promo' : (type === 'credential' ? 'Certificate' : 'Design'));
    
    let contentHtml = '';
    
    if (type === 'design') {
        contentHtml = `
            <img src="${imageUrl}" alt="${title}" class="w-full h-full object-cover rounded-xl absolute inset-0 opacity-80" 
                onerror="this.onerror=null;this.src='${fallbackImage.replace('Image', 'Design')}';">
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent p-4 flex flex-col justify-end">
                <h4 class="text-white text-lg font-bold">${title}</h4>
                <p class="text-pink-300 text-sm font-semibold">₱${item.price.toFixed(2)}</p>
            </div>
        `;
    } else {
         contentHtml = `
            <img src="${imageUrl}" alt="${title}" class="w-full h-full object-cover rounded-xl absolute inset-0 opacity-80" 
                onerror="this.onerror=null;this.src='${fallbackImage.replace('Image', title.replace(/\s/g, '+'))}';">
            <div class="absolute inset-0 bg-pink-900/40 flex items-center justify-center p-4">
                 <p class="text-white text-lg font-bold text-shadow">${title}</p>
            </div>
        `;
    }

    return `<div class="${cardBaseClasses} public-card-${type}" data-id="${item.id}">${contentHtml}</div>`;
};

const renderCarouselSection = (id, title, items, type) => {
    const titleClasses = "text-2xl font-extrabold text-pink-600 mb-4 tracking-wider text-shadow-pink";
    
    const cardsHtml = items.map(item => renderContentCard(item, type)).join('');

    return `
        <div class="w-full mb-12">
            <h2 class="${titleClasses}">${title}</h2>
            <div id="${id}-container" class="relative">
                
                <div id="${id}-track" class="flex overflow-x-hidden space-x-4 p-2 custom-scroll-style">
                    ${cardsHtml}
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
                ` : `<p class="text-center text-gray-500 py-4">No ${type} content available yet.</p>`}
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
    const customStyle = `
        <style>
            /* Custom Scrollbar for Carousel Track (Optional but helps control overflow look) */
            .custom-scroll-style::-webkit-scrollbar {
                display: none; /* Hide scrollbar for Chrome, Safari and Opera */
            }
            .custom-scroll-style {
                -ms-overflow-style: none;  /* IE and Edge */
                scrollbar-width: none;  /* Firefox */
            }
            /* Text Shadow for Title Vibe */
            .text-shadow-pink {
                text-shadow: 1px 1px 0px rgba(255, 192, 203, 0.5); /* Soft pink shadow */
            }
             /* Inner Shadow for Cards Vibe */
            .shadow-inner-pink {
                box-shadow: inset 0 0 5px rgba(255, 192, 203, 0.4);
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
                        <a href="#" class="text-gray-600 hover:text-pink-600 transition duration-150 font-medium">Design Portfolio</a>
                        <a href="#" class="text-gray-600 hover:text-pink-600 transition duration-150 font-medium">Book</a>
                        <a href="#" class="text-gray-600 hover:text-pink-600 transition duration-150 font-medium">About us</a>
                        <button id="accountLinkBtn" class="flex items-center text-pink-600 hover:text-pink-700 transition duration-150 p-2 rounded-full hover:bg-pink-50">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </button>
                    </nav>
                </div>
            </header>
            
            <main class="max-w-7xl mx-auto p-4 md:p-8">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div class="lg:col-span-1">
                        ${renderCarouselSection('promo-carousel', 'Promo!!!', activePromos, 'promo')}
                    </div>
                    
                    <div class="lg:col-span-2">
                         ${renderCarouselSection('credential-carousel', 'Credentials', credentials, 'credential')}
                    </div>
                </div>
                
                ${renderTopPicks(topPicks)}
            </main>

            <footer class="text-center py-6 text-gray-500 text-sm border-t border-pink-100 mt-12">
                &copy; 2024 DCAC. All rights reserved.
            </footer>
        </div>
    `;
};

export const attachPublicPageListeners = () => {
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
};