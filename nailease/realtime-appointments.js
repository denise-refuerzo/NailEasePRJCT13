// realtime-appointments.js - Real-time Firestore listeners for appointment synchronization

/**
 * Sets up real-time listeners for appointments collection
 * Updates both admin dashboard and user views instantly when appointments change
 */

let appointmentsUnsubscribe = null;

/**
 * Initialize real-time listeners for appointments
 * @param {Function} onAppointmentAdded - Callback when appointment is added
 * @param {Function} onAppointmentUpdated - Callback when appointment is updated
 * @param {Function} onAppointmentRemoved - Callback when appointment is removed
 */
export async function setupRealtimeAppointments(onAppointmentAdded, onAppointmentUpdated, onAppointmentRemoved) {
    try {
        // Import Firestore functions
        const { getFirestore, collection, query, orderBy, onSnapshot } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
        
        // Get db from global scope or initialize
        let db = window.db;
        if (!db) {
            const { getApp } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js");
            const app = getApp();
            db = getFirestore(app);
        }
        
        const APP_ID = 'nailease25-iapt';
        const BOOKINGS_COLLECTION = `artifacts/${APP_ID}/bookings`;
        
        // Clean up existing listener
        if (appointmentsUnsubscribe) {
            appointmentsUnsubscribe();
        }
        
        // Set up real-time listener
        const q = query(collection(db, BOOKINGS_COLLECTION), orderBy('createdAt', 'desc'));
        
        appointmentsUnsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data();
                const appointmentData = {
                    id: change.doc.id,
                    ...data,
                    createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' 
                        ? data.createdAt.toDate() 
                        : (data.createdAt ? new Date(data.createdAt) : null),
                    updatedAt: data.updatedAt && typeof data.updatedAt.toDate === 'function' 
                        ? data.updatedAt.toDate() 
                        : (data.updatedAt ? new Date(data.updatedAt) : null),
                    appointmentDate: data.selectedDate ? new Date(`${data.selectedDate}T00:00:00`) : null
                };
                
                if (change.type === 'added') {
                    console.log('New appointment added:', appointmentData);
                    if (onAppointmentAdded) onAppointmentAdded(appointmentData);
                } else if (change.type === 'modified') {
                    console.log('Appointment updated:', appointmentData);
                    if (onAppointmentUpdated) onAppointmentUpdated(appointmentData);
                } else if (change.type === 'removed') {
                    console.log('Appointment removed:', appointmentData);
                    if (onAppointmentRemoved) onAppointmentRemoved(appointmentData);
                }
            });
        }, (error) => {
            console.error('Error in real-time appointments listener:', error);
        });
        
        console.log('Real-time appointments listener initialized');
        return appointmentsUnsubscribe;
    } catch (error) {
        console.error('Error setting up real-time appointments:', error);
        return null;
    }
}

/**
 * Clean up real-time listeners
 */
export function cleanupRealtimeAppointments() {
    if (appointmentsUnsubscribe) {
        appointmentsUnsubscribe();
        appointmentsUnsubscribe = null;
        console.log('Real-time appointments listener cleaned up');
    }
}

/**
 * Get current appointments snapshot
 */
export async function getCurrentAppointments() {
    try {
        const { getFirestore, collection, query, orderBy, getDocs } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
        
        let db = window.db;
        if (!db) {
            const { getApp } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js");
            const app = getApp();
            db = getFirestore(app);
        }
        
        const APP_ID = 'nailease25-iapt';
        const BOOKINGS_COLLECTION = `artifacts/${APP_ID}/bookings`;
        
        const q = query(collection(db, BOOKINGS_COLLECTION), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' 
                    ? data.createdAt.toDate() 
                    : (data.createdAt ? new Date(data.createdAt) : null),
                updatedAt: data.updatedAt && typeof data.updatedAt.toDate === 'function' 
                    ? data.updatedAt.toDate() 
                    : (data.updatedAt ? new Date(data.updatedAt) : null),
                appointmentDate: data.selectedDate ? new Date(`${data.selectedDate}T00:00:00`) : null
            };
        });
    } catch (error) {
        console.error('Error getting current appointments:', error);
        return [];
    }
}

