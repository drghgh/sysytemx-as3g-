// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCzQjVixn8D_3T9v1hfLqy7Q0dKn3B0nyw",
    authDomain: "system-ef973.firebaseapp.com",
    projectId: "system-ef973",
    storageBucket: "system-ef973.firebasestorage.app",
    messagingSenderId: "947634219183",
    appId: "1:947634219183:web:2974735cfadd5411654c5a",
    measurementId: "G-D22ERXVGG7"
};

// Initialize Firebase with error handling
try {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ تم تهيئة Firebase بنجاح');
} catch (error) {
    console.error('❌ خطأ في تهيئة Firebase:', error);
}

// Initialize Firebase services with proper settings
let db, auth;

try {
    // Set Firestore settings BEFORE initializing
    if (!firebase.apps.length || !firebase.app().firestore) {
        db = firebase.firestore();
        
        // Apply settings only if Firestore hasn't been started yet
        db.settings({
            timestampsInSnapshots: true,
            experimentalForceLongPolling: false,
            merge: true
        });
        
        console.log('✅ تم تطبيق إعدادات Firestore بنجاح');
    } else {
        db = firebase.firestore();
        console.log('⚠️ Firestore مُهيأ مسبقاً');
    }
    
    auth = firebase.auth();
    
    // Enable offline persistence
    db.enablePersistence({ synchronizeTabs: true })
        .then(() => {
            console.log('✅ تم تفعيل الوضع غير المتصل');
        })
        .catch((err) => {
            if (err.code == 'failed-precondition') {
                console.warn('⚠️ الوضع غير المتصل غير متاح: عدة تبويبات مفتوحة');
            } else if (err.code == 'unimplemented') {
                console.warn('⚠️ الوضع غير المتصل غير مدعوم في هذا المتصفح');
            }
        });
        
} catch (error) {
    console.error('خطأ في تهيئة خدمات Firebase:', error);
    // Fallback initialization
    db = firebase.firestore();
    auth = firebase.auth();
}

// Make Firebase services globally available
window.db = db;
window.auth = auth;
window.firebase = firebase;

// Connection state monitoring
let isOnline = navigator.onLine;
let connectionRetries = 0;
const maxRetries = 3;

// Monitor network status
window.addEventListener('online', () => {
    isOnline = true;
    connectionRetries = 0;
    console.log('🌐 الاتصال بالإنترنت متاح');
    showConnectionStatus('متصل', 'success');
});

window.addEventListener('offline', () => {
    isOnline = false;
    console.log('📵 لا يوجد اتصال بالإنترنت');
    showConnectionStatus('غير متصل - العمل في الوضع المحلي', 'warning');
});

// Show connection status
function showConnectionStatus(message, type) {
    const statusDiv = document.getElementById('connectionStatus');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `connection-status ${type}`;
        statusDiv.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 3000);
        }
    }
}

// Auth state observer with connection handling
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('User is signed in:', user.uid);
        updateUIForAuthenticatedUser(user);
    } else {
        console.log('User is signed out');
        updateUIForUnauthenticatedUser();
    }
});

// Update UI based on authentication state
function updateUIForAuthenticatedUser(user) {
    const loginBtn = document.querySelector('.btn-login');
    if (loginBtn) {
        loginBtn.textContent = 'حسابي';
        loginBtn.href = 'account.html';
    }
}

function updateUIForUnauthenticatedUser() {
    const loginBtn = document.querySelector('.btn-login');
    if (loginBtn) {
        loginBtn.textContent = 'تسجيل الدخول';
        loginBtn.href = 'login.html';
    }
}

// Function to set user as admin (for development/setup)
async function setUserAsAdmin(userId) {
    try {
        const userRef = db.collection('users').doc(userId);
        await userRef.update({
            role: 'super_admin',
            isAdmin: true,
            adminLevel: 'super',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('User set as admin successfully:', userId);
        return true;
    } catch (error) {
        console.error('Error setting user as admin:', error);
        return false;
    }
}

// Auto-set specific user as admin on page load (for setup)
document.addEventListener('DOMContentLoaded', async function() {
    const ADMIN_USER_ID = 'eQRcB7S59Ae2ndkJuYwfPCPNj513';
    
    // Check if this user exists and set as admin
    try {
        const userDoc = await db.collection('users').doc(ADMIN_USER_ID).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            if (!userData.role || userData.role !== 'super_admin') {
                await setUserAsAdmin(ADMIN_USER_ID);
                console.log('Admin privileges granted to user:', ADMIN_USER_ID);
            }
        } else {
            // Create admin user document if it doesn't exist
            await db.collection('users').doc(ADMIN_USER_ID).set({
                name: 'مدير النظام',
                email: 'admin@as3gsystem.com',
                role: 'super_admin',
                isAdmin: true,
                adminLevel: 'super',
                businessName: 'إدارة AS3G SYSTEM',
                phone: '+201234567890',
                address: 'مصر',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Admin user document created:', ADMIN_USER_ID);
        }
    } catch (error) {
        console.log('Admin setup check completed');
    }
});

// Utility functions for Firebase operations
const FirebaseUtils = {
    // Add document to collection
    async addDocument(collection, data) {
        try {
            const docRef = await db.collection(collection).add({
                ...data,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('Error adding document:', error);
            return { success: false, error: error.message };
        }
    },

    // Get documents with query and connection handling
    async getDocuments(collection, orderBy = null, limit = null) {
        try {
            let query = db.collection(collection);
            
            if (orderBy) {
                query = query.orderBy(orderBy.field, orderBy.direction || 'asc');
            }
            
            if (limit) {
                query = query.limit(limit);
            }
            
            // Try to get from cache first if offline
            const options = !isOnline ? { source: 'cache' } : { source: 'default' };
            const snapshot = await query.get(options);
            const documents = [];
            
            snapshot.forEach(doc => {
                documents.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Show cache indicator if data is from cache
            if (snapshot.metadata.fromCache && !isOnline) {
                console.log('📱 البيانات محملة من التخزين المحلي');
                showConnectionStatus('البيانات من التخزين المحلي', 'info');
            }
            
            return { success: true, data: documents, fromCache: snapshot.metadata.fromCache };
        } catch (error) {
            console.error('Error getting documents:', error);
            
            // Try cache if server request failed
            if (error.code === 'unavailable' && isOnline) {
                try {
                    const cacheSnapshot = await db.collection(collection).get({ source: 'cache' });
                    const cacheDocuments = [];
                    
                    cacheSnapshot.forEach(doc => {
                        cacheDocuments.push({
                            id: doc.id,
                            ...doc.data()
                        });
                    });
                    
                    console.log('📱 تم تحميل البيانات من التخزين المحلي بدلاً من الخادم');
                    showConnectionStatus('البيانات من التخزين المحلي', 'warning');
                    
                    return { success: true, data: cacheDocuments, fromCache: true };
                } catch (cacheError) {
                    console.error('Cache also failed:', cacheError);
                }
            }
            
            return { success: false, error: error.message, code: error.code };
        }
    },

    // Update document
    async updateDocument(collection, docId, data) {
        try {
            await db.collection(collection).doc(docId).update({
                ...data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            console.error('Error updating document:', error);
            return { success: false, error: error.message };
        }
    },

    // Delete document
    async deleteDocument(collection, docId) {
        try {
            await db.collection(collection).doc(docId).delete();
            return { success: true };
        } catch (error) {
            console.error('Error deleting document:', error);
            return { success: false, error: error.message };
        }
    },

    // Get document by ID
    async getDocument(collection, docId) {
        try {
            const doc = await db.collection(collection).doc(docId).get();
            if (doc.exists) {
                return { 
                    success: true, 
                    data: { id: doc.id, ...doc.data() } 
                };
            } else {
                return { success: false, error: 'Document not found' };
            }
        } catch (error) {
            console.error('Error getting document:', error);
            return { success: false, error: error.message };
        }
    },

    // Listen to collection changes
    listenToCollection(collection, callback, orderBy = null) {
        let query = db.collection(collection);
        
        if (orderBy) {
            query = query.orderBy(orderBy.field, orderBy.direction || 'desc');
        }
        
        return query.onSnapshot(callback);
    },

    // User authentication
    async signInWithEmail(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Error signing in:', error);
            return { success: false, error: error.message };
        }
    },

    async signUpWithEmail(email, password, userData) {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            
            // Add user data to Firestore
            await db.collection('users').doc(userCredential.user.uid).set({
                ...userData,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Error signing up:', error);
            return { success: false, error: error.message };
        }
    },

    async signOut() {
        try {
            await auth.signOut();
            return { success: true };
        } catch (error) {
            console.error('Error signing out:', error);
            return { success: false, error: error.message };
        }
    },

    // Get current user
    getCurrentUser() {
        return auth.currentUser;
    },

    // Check if user is admin
    async isAdmin(userId) {
        try {
            // First check by document ID (for the specific admin user)
            const userDoc = await db.collection('users').doc('eQRcB7S59Ae2ndkJuYwfPCPNj513').get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData.authUid === userId && (userData.role === 'admin' || userData.role === 'super_admin')) {
                    return true;
                }
            }
            
            // Then check by userId as document ID
            const userDocById = await db.collection('users').doc(userId).get();
            if (userDocById.exists) {
                const userData = userDocById.data();
                return userData.role === 'admin' || userData.role === 'super_admin';
            }
            
            return false;
        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    }
};
