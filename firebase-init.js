// Firebase Initialization Helper
// هذا الملف يضمن تهيئة Firebase بشكل صحيح في جميع الصفحات

(function() {
    'use strict';
    
    // Wait for Firebase to be loaded
    function waitForFirebase(callback, maxAttempts = 50) {
        let attempts = 0;
        
        function check() {
            attempts++;
            
            if (typeof firebase !== 'undefined' && 
                typeof window.auth !== 'undefined' && 
                typeof window.db !== 'undefined') {
                console.log('✅ Firebase جاهز للاستخدام');
                callback();
            } else if (attempts < maxAttempts) {
                setTimeout(check, 100);
            } else {
                console.error('❌ فشل في تحميل Firebase بعد', maxAttempts, 'محاولة');
                // Try to initialize manually as fallback
                initializeFirebaseFallback();
                callback();
            }
        }
        
        check();
    }
    
    // Fallback initialization
    function initializeFirebaseFallback() {
        try {
            if (typeof firebase !== 'undefined') {
                if (!window.db && firebase.firestore) {
                    window.db = firebase.firestore();
                }
                if (!window.auth && firebase.auth) {
                    window.auth = firebase.auth();
                }
                console.log('🔄 تم تهيئة Firebase كحل احتياطي');
            }
        } catch (error) {
            console.error('خطأ في التهيئة الاحتياطية:', error);
        }
    }
    
    // Global Firebase ready event
    window.firebaseReady = function(callback) {
        if (typeof callback !== 'function') {
            console.error('firebaseReady يتطلب دالة callback');
            return;
        }
        
        waitForFirebase(callback);
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            waitForFirebase(function() {
                // Firebase is ready
                document.dispatchEvent(new CustomEvent('firebaseReady'));
            });
        });
    } else {
        waitForFirebase(function() {
            // Firebase is ready
            document.dispatchEvent(new CustomEvent('firebaseReady'));
        });
    }
    
    // Global error handler for Firebase
    window.addEventListener('error', function(event) {
        if (event.error && event.error.message && 
            (event.error.message.includes('auth is not defined') || 
             event.error.message.includes('db is not defined'))) {
            console.warn('🔄 إعادة محاولة تهيئة Firebase...');
            initializeFirebaseFallback();
        }
    });
    
})();

// Helper functions for common Firebase operations
window.FirebaseHelpers = {
    // Safe auth check
    isAuthenticated: function() {
        return window.auth && window.auth.currentUser;
    },
    
    // Safe database operation
    safeDbOperation: async function(operation) {
        if (!window.db) {
            throw new Error('قاعدة البيانات غير متاحة');
        }
        return await operation(window.db);
    },
    
    // Safe auth operation
    safeAuthOperation: async function(operation) {
        if (!window.auth) {
            throw new Error('نظام المصادقة غير متاح');
        }
        return await operation(window.auth);
    },
    
    // Wait for auth state
    waitForAuth: function(callback) {
        if (window.auth) {
            window.auth.onAuthStateChanged(callback);
        } else {
            window.firebaseReady(function() {
                window.auth.onAuthStateChanged(callback);
            });
        }
    }
};
