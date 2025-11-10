import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, query, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { firebaseConfig, APP_ID } from './auth-logic.js'; 


setLogLevel('debug');

// --- HELPER FUNCTION TO CONVERT GOOGLE SHEETS/DRIVE LINKS TO DIRECT IMAGE URLs ---
function convertToDirectImageUrl(url) {
    if (!url) return null;
    
    // If it's already a direct image URL (jpg, png, gif, webp), return as is
    if (/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url)) {
        return url;
    }
    
    // Handle Google Drive links - convert to direct image format
    if (url.includes('drive.google.com')) {
        // Extract file ID from Google Drive link
        const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
            return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
        }
    }
    
    // Handle Google Sheets image URLs (googleusercontent.com)
    // These URLs should work directly, but we'll ensure they're properly formatted
    if (url.includes('googleusercontent.com')) {
        // Google user content URLs should work as-is
        // Ensure the URL is properly encoded
        try {
            const urlObj = new URL(url);
            return urlObj.toString();
        } catch (e) {
            // If URL parsing fails, return as-is
            return url;
        }
    }
    
    // Return original URL if no conversion needed
    return url;
}

// --- APPLICATION STATE ---
// DESIGNS_PER_PAGE = 20 enforces 4 rows of 5 designs per page
const DESIGNS_PER_PAGE = 20; 
let currentPage = 1;

let firebaseApp = null;
let db = null;
let designData = [];
let isLoading = true;
let fetchError = null;


// --- FIREBASE INITIALIZATION AND DATA FETCHING ---

const setupFirebaseAndFetchData = async () => {
    try {
        if (!firebaseConfig.projectId) {
            console.error("Configuration Error: firebaseConfig is missing projectId.");
            fetchError = "Configuration failed. Missing project details.";
            isLoading = false;
            renderPortfolioPage();
            return;
        }

        if (!firebaseApp) {
            firebaseApp = initializeApp(firebaseConfig);
            db = getFirestore(firebaseApp);
        }

        fetchDesigns();

    } catch (error) {
        console.error("Firebase Initialization Error:", error);
        if (error.code === 'app/no-project-id') {
             fetchError = "Failed to load services. Configuration missing.";
        } else {
             fetchError = "Failed to initialize Firebase services. Please check console for details.";
        }
        isLoading = false;
        renderPortfolioPage();
    }
};

const fetchDesigns = () => {
    // Using the public collection path for unauthenticated read access
    // NOTE: If the data still isn't loading, check if your public path is /artifacts/{APP_ID}/public/data/designs
    // I am assuming the short path works now based on your last input.
    const designsCollectionPath = `content/${APP_ID}/designs`; 
    const designsQuery = query(collection(db, designsCollectionPath));

    onSnapshot(designsQuery, (snapshot) => {
        const fetchedDesigns = [];
        snapshot.forEach((doc) => {
            fetchedDesigns.push({ 
                id: doc.id, 
                ...doc.data(),
                price: parseFloat(doc.data().price) || 0,
                title: doc.data().title || 'Untitled Design'
            });
        });

        designData = fetchedDesigns;
        isLoading = false;
        fetchError = null;

        const totalPages = Math.ceil(designData.length / DESIGNS_PER_PAGE);
        if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
        } else if (totalPages === 0) {
            currentPage = 1;
        }
        
        renderPortfolioPage(); 
        
    }, (error) => {
        console.error("Firestore Designs Fetch Error:", error);
        fetchError = "Could not fetch designs. Please check your Firestore Security Rules.";
        isLoading = false;
        renderPortfolioPage();
    });
};

const renderDesignCard = (item) => {
    const fallbackImage = 'https://placehold.co/400x300/FCE7F3/DB2777?text=No+Image'; 
    const rawImageUrl = item.imageUrl || fallbackImage;
    const imageUrl = convertToDirectImageUrl(rawImageUrl) || fallbackImage;
    const title = item.title; 
    const price = item.price; 
    
    let cardBaseClasses = "rounded-xl shadow-2xl flex-shrink-0 relative overflow-hidden transition-all duration-300 transform hover:scale-[1.03]";

    return `
        <div class="${cardBaseClasses} aspect-[4/5] bg-pink-50/70" data-id="${item.id}">
            <img src="${imageUrl}" alt="${title}" class="w-full h-full object-cover rounded-xl absolute inset-0 opacity-90" 
                 crossorigin="anonymous"
                 referrerpolicy="no-referrer"
                 onerror="this.onerror=null;this.src='${fallbackImage.replace('No+Image', title.replace(/\s/g, '+'))}';">
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent p-3 flex flex-col justify-end">
                <h4 class="text-white text-md font-bold truncate">${title}</h4>
                <p class="text-pink-300 text-sm font-semibold">₱${price.toFixed(2)}</p>
                
                <button class="book-design-btn mt-2 bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold py-1 px-3 rounded-full shadow-md transition-colors"
                        data-design-id="${item.id}">Book Now</button>
            </div>
        </div>
    `;
};

const renderDesignGrid = (page) => {
    const gridContainer = document.getElementById('design-grid-container');
    if (!gridContainer) {
        console.error("Design grid container not found. It might not be rendered yet.");
        return;
    }

    const startIndex = (page - 1) * DESIGNS_PER_PAGE;
    const endIndex = startIndex + DESIGNS_PER_PAGE;
    const designsToDisplay = designData.slice(startIndex, endIndex);

    // ✅ FIXED: Ensure clean inline-flex layout and no weird gaps
    gridContainer.style.display = "flex";
    gridContainer.style.flexWrap = "wrap";
    // gridContainer.style.justifyContent = "center";
    gridContainer.style.gap = "16px"; // small gap between cards
    gridContainer.style.alignItems = "stretch";
    gridContainer.style.width = "100%";

    const cardsHtml = designsToDisplay.map((item) => {
        const fallbackImage = 'https://placehold.co/400x300/FCE7F3/DB2777?text=No+Image'; 
        const rawImageUrl = item.imageUrl || fallbackImage;
        const imageUrl = convertToDirectImageUrl(rawImageUrl) || fallbackImage;
        const title = item.title; 
        const price = item.price; 
        
        // Each card will have a fixed width for clean alignment
        return `
            <div class="rounded-xl shadow-2xl relative overflow-hidden transition-all duration-300 transform hover:scale-[1.03]"
                 style="width: 220px; height: 320px; background-color: #fdebf4;"
                 data-id="${item.id}">
                <img src="${imageUrl}" alt="${title}" 
                     class="w-full h-full object-cover rounded-xl absolute inset-0 opacity-90"
                     crossorigin="anonymous"
                     referrerpolicy="no-referrer"
                     onerror="this.onerror=null;this.src='${fallbackImage.replace('No+Image', title.replace(/\s/g, '+'))}';">
                <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent p-3 flex flex-col justify-end">
                    <h4 class="text-white text-md font-bold truncate">${title}</h4>
                    <p class="text-pink-300 text-sm font-semibold">₱${price.toFixed(2)}</p>
                    <button class="book-design-btn mt-2 bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold py-1 px-3 rounded-full shadow-md transition-colors"
                            data-design-id="${item.id}">Book Now</button>
                </div>
            </div>
        `;
    }).join('');

    gridContainer.innerHTML = cardsHtml.length > 0 
        ? cardsHtml 
        : '<div class="text-center text-gray-500 py-20">No designs have been uploaded yet.</div>';

    attachDesignCardListeners();
};

const renderPaginationControls = () => {
    const paginationContainer = document.getElementById('pagination-controls');
    if (!paginationContainer) {
        console.error("Pagination controls container not found. It might not be rendered yet.");
        return;
    }
    
    const totalDesigns = designData.length;
    const totalPages = Math.ceil(totalDesigns / DESIGNS_PER_PAGE);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let buttonsHtml = '';

    for (let i = 1; i <= totalPages; i++) {
        const isActive = i === currentPage;
        buttonsHtml += `
            <button class="page-btn text-sm px-4 py-2 rounded-lg font-semibold transition-all ${
                isActive 
                    ? 'bg-pink-600 text-white shadow-lg shadow-pink-300' 
                    : 'bg-white text-gray-700 hover:bg-pink-100'
            }" 
            data-page="${i}"
            ${isActive ? 'disabled' : ''}>
                ${i}
            </button>
        `;
    }

    paginationContainer.innerHTML = `
        <div class="flex justify-center items-center space-x-2 py-8">
            <button id="prev-page-btn" class="p-2 bg-white rounded-lg shadow hover:bg-pink-100 disabled:opacity-50 text-gray-700"
                    ${currentPage === 1 ? 'disabled' : ''}>
                &larr; Previous
            </button>
            ${buttonsHtml}
            <button id="next-page-btn" class="p-2 bg-white rounded-lg shadow hover:bg-pink-100 disabled:opacity-50 text-gray-700"
                    ${currentPage === totalPages ? 'disabled' : ''}>
                Next &rarr;
            </button>
        </div>
    `;
    
    attachPaginationListeners(totalPages);
};

// --- LISTENERS (remain the same) ---

const attachDesignCardListeners = () => {
    document.querySelectorAll('.book-design-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const designId = e.currentTarget.dataset.designId;
            
            // Find the design data from designData array
            const design = designData.find(d => d.id === designId);
            
            if (design) {
                // Build URL with design parameters
                const params = new URLSearchParams({
                    design: design.title || 'Design',
                    price: design.price || 299,
                    image: design.imageUrl || '',
                    description: design.description || 'Professional design service',
                    designId: designId
                });
                
                // Redirect to book.html with parameters and scroll to step1
                window.location.href = `book.html?${params.toString()}#step1`;
            } else {
                // Fallback if design not found
                window.location.href = 'book.html#step1';
            }
        });
    });
};

const attachPaginationListeners = (totalPages) => {
    const changePage = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            currentPage = newPage;
            renderDesignGrid(currentPage);
            renderPaginationControls();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');

    if (prevBtn) {
        prevBtn.onclick = () => changePage(currentPage - 1);
    }
    if (nextBtn) {
        nextBtn.onclick = () => changePage(currentPage + 1);
    }
    
    document.querySelectorAll('.page-btn').forEach(button => {
        button.onclick = (e) => {
            const newPage = parseInt(e.currentTarget.dataset.page, 10);
            changePage(newPage);
        };
    });
};

const attachHeaderListeners = () => {
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

// --- MAIN RENDER FUNCTION ---

const renderPortfolioPage = () => {
    const appContent = document.getElementById('app-content');
    if (!appContent) return;

//     const activeLinkClass = 'text-gray-600 hover:text-pink-600 transition duration-150 font-medium';
//     const inactiveLinkClass = 'text-gray-600 hover:text-pink-600 transition duration-150 font-medium';
//     
    let mainContentHtml = '';
    
    // NEW QUOTE FOR THE PAGE
    const portfolioQuote = "✨ Your Hands are the canvas. Let us create the masterpiece. ✨";

    if (isLoading) {
// ... (Loading state remains the same)
        mainContentHtml = `
            <div class="text-center py-20">
                <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-600 mx-auto mb-4"></div>
                <p class="text-xl text-pink-600 font-semibold">Loading Designs...</p>
                <p class="text-gray-500">Connecting to the portfolio database.</p>
            </div>
        `;
    } else if (fetchError) {
        mainContentHtml = `
            <div class="text-center py-20 bg-red-50 border border-red-200 rounded-xl p-8 max-w-lg mx-auto">
                <p class="text-2xl font-bold text-red-600 mb-2">Error Loading Portfolio</p>
                <p class="text-gray-700">${fetchError}</p>
                <p class="text-sm text-red-400 mt-4">If the data does not appear, your Firestore **Security Rules** likely need to be updated to allow unauthenticated read access to the designs collection.</p>
            </div>
        `;
    } else {
        mainContentHtml = `
            <h1 class="text-4xl font-extrabold text-pink-700 mb-8 tracking-wide text-shadow-pink text-center">
                Design Portfolio
            </h1>
                        <p class="text-center text-lg italic text-gray-500 mb-10">
                ${portfolioQuote}
            </p>
                        <div id="design-grid-container" class="design-grid">
            </div>

            <div id="pagination-controls">
            </div>
        `;
    }


    const pageHtml = `
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
                ${mainContentHtml}
            </main>

            <footer class="text-center py-6 text-gray-500 text-sm border-t border-pink-100 mt-12">
                &copy; 2024 DCAC. All rights reserved.
            </footer>
        </div>
    `;

    appContent.innerHTML = pageHtml;
    
    if (!isLoading && !fetchError) {
        renderDesignGrid(currentPage);
        renderPaginationControls();
    } 
    
    attachHeaderListeners();

};


document.addEventListener('DOMContentLoaded', () => {
    renderPortfolioPage();
    setupFirebaseAndFetchData();
});