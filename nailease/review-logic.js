// review-logic.js - Review and feedback management

import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, addDoc, deleteDoc, doc, orderBy, serverTimestamp, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

const APP_ID = 'nailease25-iapt';
const REVIEWS_COLLECTION = `reviews/${APP_ID}/clientReviews`;
const EXTERNAL_REVIEWS_COLLECTION = `reviews/${APP_ID}/externalPhotos`;
const BOOKINGS_COLLECTION = `artifacts/${APP_ID}/bookings`;

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyACN3A8xm9pz3bryH6xGhDAF6TCwUoGUp4",
    authDomain: "nailease25.firebaseapp.com",
    projectId: "nailease25",
    storageBucket: "nailease25.firebasestorage.app",
    messagingSenderId: "706150189317",
    appId: "1:706150189317:web:82986edbd97f545282cf6c",
    measurementId: "G-RE42B3FVRJ"
};

let app = null;
let db = null;
let storage = null;

// Initialize Firebase App
function getFirebaseApp() {
    if (!app) {
        try {
            app = getApp(); // Try to get existing app
        } catch (error) {
            // If no app exists, initialize it
            app = initializeApp(firebaseConfig);
        }
    }
    return app;
}

// Initialize Firestore and Storage
async function initFirebase() {
    if (!db || !storage) {
        const firebaseApp = getFirebaseApp();
        db = getFirestore(firebaseApp);
        storage = getStorage(firebaseApp);
    }
    return { db, storage };
}

/**
 * Get client appointments from Firestore
 */
export async function getClientAppointments(userId) {
    try {
        await initFirebase();
        let snapshot;
        try {
            const q = query(
                collection(db, BOOKINGS_COLLECTION),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc')
            );
            snapshot = await getDocs(q);
        } catch (orderByError) {
            // Fallback without orderBy (no index)
            const q = query(
                collection(db, BOOKINGS_COLLECTION),
                where('userId', '==', userId)
            );
            snapshot = await getDocs(q);
        }
        const appointments = snapshot.docs.map(docRef => {
            const data = docRef.data();
            return {
                id: docRef.id,
                ...data,
                createdAt: data.createdAt?.toDate?.() || (data.createdAt ? new Date(data.createdAt) : new Date()),
                appointmentDate: data.selectedDate ? new Date(`${data.selectedDate}T00:00:00`) : null
            };
        });
        // Manual sort (desc)
        appointments.sort((a,b) => (b.createdAt?.getTime?.()||0) - (a.createdAt?.getTime?.()||0));
        return appointments;
    } catch (error) {
        console.error('Error fetching client appointments:', error);
        return [];
    }
}

/**
 * Submit a review
 */
export async function submitReview(reviewData) {
    try {
        await initFirebase();
        const { userId, appointmentId, rating, text, images } = reviewData;
        
        // Upload images to Firebase Storage
        const imageUrls = [];
        if (images && images.length > 0) {
            for (let i = 0; i < Math.min(images.length, 2); i++) {
                const file = images[i];
                if (!file) continue;
                const timestamp = Date.now();
                const fileName = `reviews/${APP_ID}/${userId}_${appointmentId}_${i}_${timestamp}_${file.name}`;
                const storageRef = ref(storage, fileName);
                await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(storageRef);
                imageUrls.push(downloadURL);
            }
        }
        
        // Save review to Firestore
        const reviewDoc = {
            userId,
            appointmentId,
            rating: parseInt(rating),
            text: text.trim(),
            imageUrls,
            createdAt: serverTimestamp(),
            userName: reviewData.userName || 'Anonymous',
            userEmail: reviewData.userEmail || ''
        };
        
        const docRef = await addDoc(collection(db, REVIEWS_COLLECTION), reviewDoc);
        return { success: true, reviewId: docRef.id };
    } catch (error) {
        console.error('Error submitting review:', error);
        throw error;
    }
}

/**
 * Get user's reviews
 */
export async function getUserReviews(userId) {
    try {
        await initFirebase();
        const q = query(
            collection(db, REVIEWS_COLLECTION),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
            };
        });
    } catch (error) {
        console.error('Error fetching user reviews:', error);
        return [];
    }
}

/**
 * Get all public reviews (for feedback section)
 */
export async function getAllReviews(starFilter = null) {
    try {
        await initFirebase();
        let q = query(collection(db, REVIEWS_COLLECTION), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        let reviews = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
            };
        });
        
        // Filter by star rating if provided
        if (starFilter && starFilter !== 'all') {
            reviews = reviews.filter(r => r.rating === parseInt(starFilter));
        }
        
        return reviews;
    } catch (error) {
        console.error('Error fetching all reviews:', error);
        return [];
    }
}

/**
 * Delete a review (admin only)
 */
export async function deleteReview(reviewId) {
    try {
        await initFirebase();
        const reviewRef = doc(db, REVIEWS_COLLECTION, reviewId);
        
        // Get review data to delete images
        const reviewQuery = query(collection(db, REVIEWS_COLLECTION), where('__name__', '==', reviewId));
        const reviewDoc = await getDocs(reviewQuery);
        if (!reviewDoc.empty) {
            const reviewData = reviewDoc.docs[0].data();
            // Delete images from Storage
            if (reviewData.imageUrls && Array.isArray(reviewData.imageUrls)) {
                for (const imageUrl of reviewData.imageUrls) {
                    try {
                        // Extract the path from the full URL or use the URL directly
                        const imageRef = ref(storage, imageUrl);
                        await deleteObject(imageRef);
                    } catch (err) {
                        console.warn('Could not delete image:', err);
                    }
                }
            }
        }
        
        await deleteDoc(reviewRef);
        return { success: true };
    } catch (error) {
        console.error('Error deleting review:', error);
        throw error;
    }
}

/**
 * Get external review photos (admin-managed)
 */
export async function getExternalReviewPhotos() {
    try {
        await initFirebase();
        console.log('Fetching external review photos...');
        console.log('DB initialized:', !!db);
        
        // Access subcollection properly using parent document reference
        const parentDocRef = doc(db, 'reviews', APP_ID);
        const externalPhotosRef = collection(parentDocRef, 'externalPhotos');
        
        console.log('Parent doc path:', parentDocRef.path);
        console.log('Subcollection path:', externalPhotosRef.path);
        
        // Ensure parent document exists first
        const parentDoc = await getDoc(parentDocRef);
        
        if (!parentDoc.exists()) {
            console.log('Parent document does not exist, creating it...');
            // Create parent document if it doesn't exist
            await setDoc(parentDocRef, {
                createdAt: serverTimestamp(),
                type: 'reviewsContainer'
            });
        }
        
        // Now query the subcollection using the proper reference
        let snapshot;
        try {
            // Try with orderBy first
            const q = query(externalPhotosRef, orderBy('createdAt', 'desc'));
            snapshot = await getDocs(q);
            console.log('Query with orderBy succeeded, docs:', snapshot.docs.length);
        } catch (orderByError) {
            console.warn('Query with orderBy failed, trying without:', orderByError);
            // If orderBy fails (e.g., no index), try without it
            try {
                const q = query(externalPhotosRef);
                snapshot = await getDocs(q);
                console.log('Query without orderBy succeeded, docs:', snapshot.docs.length);
            } catch (queryError) {
                console.error('Query failed completely:', queryError);
                console.error('Error code:', queryError.code);
                console.error('Error message:', queryError.message);
                throw queryError;
            }
        }
        
        console.log('Snapshot docs count:', snapshot.docs.length);
        
        if (snapshot.empty) {
            console.warn('Snapshot is empty - no documents found in subcollection');
            console.log('Subcollection path used:', externalPhotosRef.path);
            return [];
        }
        
        const photos = snapshot.docs.map(doc => {
            const data = doc.data();
            console.log('Photo data:', { 
                id: doc.id, 
                imageUrl: data.imageUrl, 
                createdAt: data.createdAt,
                allFields: Object.keys(data)
            });
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.() || (data.createdAt ? new Date(data.createdAt) : new Date())
            };
        });
        
        // Sort manually if orderBy didn't work
        if (photos.length > 0 && photos[0].createdAt) {
            photos.sort((a, b) => {
                const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
                const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
                return dateB - dateA; // Descending order
            });
        }
        
        console.log('Returning photos:', photos.length);
        return photos;
    } catch (error) {
        console.error('Error fetching external review photos:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        return [];
    }
}

/**
 * Upload external review photo (admin only)
 */
export async function uploadExternalReviewPhoto(file) {
    try {
        await initFirebase();
        
        // Ensure parent document exists first
        const parentDocRef = doc(db, 'reviews', APP_ID);
        const parentDoc = await getDoc(parentDocRef);
        
        if (!parentDoc.exists()) {
            console.log('Parent document does not exist, creating it...');
            // Create parent document if it doesn't exist
            await setDoc(parentDocRef, {
                createdAt: serverTimestamp(),
                type: 'reviewsContainer'
            });
        }
        
        // Access subcollection properly
        const externalPhotosRef = collection(parentDocRef, 'externalPhotos');
        
        const timestamp = Date.now();
        const fileName = `external-reviews/${APP_ID}/${timestamp}_${file.name}`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        
        // Save photo reference to Firestore subcollection
        const photoDoc = {
            imageUrl: downloadURL,
            createdAt: serverTimestamp()
        };
        
        const docRef = await addDoc(externalPhotosRef, photoDoc);
        console.log('Photo saved successfully to:', docRef.path);
        return { success: true, photoId: docRef.id, imageUrl: downloadURL };
    } catch (error) {
        console.error('Error uploading external review photo:', error);
        throw error;
    }
}

/**
 * Delete external review photo (admin only)
 */
export async function deleteExternalReviewPhoto(photoId, imageUrl) {
    try {
        await initFirebase();
        
        // Access subcollection properly
        const parentDocRef = doc(db, 'reviews', APP_ID);
        const externalPhotosRef = collection(parentDocRef, 'externalPhotos');
        
        // Delete from Firestore
        const photoRef = doc(externalPhotosRef, photoId);
        await deleteDoc(photoRef);
        
        // Delete from Storage
        try {
            // Extract the path from the full URL
            const urlParts = imageUrl.split('/');
            const pathIndex = urlParts.findIndex(part => part === 'o');
            if (pathIndex !== -1 && pathIndex < urlParts.length - 1) {
                const encodedPath = urlParts[pathIndex + 1].split('?')[0];
                const decodedPath = decodeURIComponent(encodedPath);
                const imageRef = ref(storage, decodedPath);
                await deleteObject(imageRef);
            }
        } catch (err) {
            console.warn('Could not delete image from storage:', err);
        }
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting external review photo:', error);
        throw error;
    }
}
