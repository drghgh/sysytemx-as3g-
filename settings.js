// إعدادات النظام
let systemSettings = {
    language: 'ar',
    theme: 'light',
    notifications: true,
    sounds: false,
    twoFactor: false,
    auditLog: true,
    sessionTimeout: 60,
    caching: true,
    compression: true,
    autoRefresh: true,
    autoBackup: true,
    dataSync: false,
    dataCleanup: 90
};

// تهيئة الصفحة
document.addEventListener('DOMContentLoaded', function() {
    window.firebaseReady(initializeSettings);
});

async function initializeSettings() {
    // فحص صلاحيات المدير
    FirebaseHelpers.waitForAuth(async (user) => {
        if (!user) {
            window.location.href = 'admin-login.html';
            return;
        }
        
        const hasPermission = await AdminPermissions.checkPermission(user.uid, 'settings', 'view');
        if (!hasPermission) {
            showMessage('ليس لديك صلاحية للوصول لهذه الصفحة', 'error');
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 2000);
            return;
        }
        
        await loadSettings();
        applyCurrentTheme();
    });
}

// تحميل الإعدادات من Firebase
async function loadSettings() {
    try {
        const settingsDoc = await window.db.collection('settings').doc('system').get();
        
        if (settingsDoc.exists) {
            systemSettings = { ...systemSettings, ...settingsDoc.data() };
        }
        
        updateUIFromSettings();
    } catch (error) {
        console.error('خطأ في تحميل الإعدادات:', error);
    }
}

// تحديث الواجهة من الإعدادات
function updateUIFromSettings() {
    // تحديث اللغة
    document.querySelectorAll('.lang-option').forEach(option => {
        option.classList.remove('active');
    });
    document.querySelector(`[onclick="changeLanguage('${systemSettings.language}')"]`).classList.add('active');
    
    // تحديث المظهر
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.remove('active');
    });
    document.querySelector(`.theme-${systemSettings.theme}`).classList.add('active');
    
    // تحديث المفاتيح
    Object.keys(systemSettings).forEach(key => {
        const toggle = document.querySelector(`[onclick*="${key}"]`);
        if (toggle && toggle.classList.contains('toggle-switch')) {
            if (systemSettings[key]) {
                toggle.classList.add('active');
            } else {
                toggle.classList.remove('active');
            }
        }
    });
}

// تغيير اللغة
function changeLanguage(lang) {
    systemSettings.language = lang;
    
    document.querySelectorAll('.lang-option').forEach(option => {
        option.classList.remove('active');
    });
    document.querySelector(`[onclick="changeLanguage('${lang}')"]`).classList.add('active');
    
    // تطبيق اللغة
    if (lang === 'en') {
        document.documentElement.setAttribute('dir', 'ltr');
        document.documentElement.setAttribute('lang', 'en');
    } else {
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.setAttribute('lang', 'ar');
    }
    
    updateSetting('language', lang);
}

// تغيير المظهر
function changeTheme(theme) {
    systemSettings.theme = theme;
    
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.remove('active');
    });
    document.querySelector(`.theme-${theme}`).classList.add('active');
    
    applyTheme(theme);
    updateSetting('theme', theme);
}

// تطبيق المظهر
function applyTheme(theme) {
    document.body.className = theme === 'dark' ? 'dark-theme' : '';
    
    if (theme === 'dark') {
        document.documentElement.style.setProperty('--bg-color', '#2c3e50');
        document.documentElement.style.setProperty('--text-color', '#ecf0f1');
        document.documentElement.style.setProperty('--card-bg', '#34495e');
    } else {
        document.documentElement.style.setProperty('--bg-color', '#ffffff');
        document.documentElement.style.setProperty('--text-color', '#2c3e50');
        document.documentElement.style.setProperty('--card-bg', '#ffffff');
    }
}

// تطبيق المظهر الحالي
function applyCurrentTheme() {
    applyTheme(systemSettings.theme);
}

// تبديل إعداد
function toggleSetting(element, settingName) {
    element.classList.toggle('active');
    systemSettings[settingName] = element.classList.contains('active');
    updateSetting(settingName, systemSettings[settingName]);
}

// تحديث إعداد
async function updateSetting(key, value) {
    systemSettings[key] = value;
    
    try {
        await window.db.collection('settings').doc('system').set({
            [key]: value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        console.log(`تم تحديث ${key} إلى ${value}`);
    } catch (error) {
        console.error('خطأ في تحديث الإعداد:', error);
    }
}

// حفظ جميع الإعدادات
async function saveAllSettings() {
    try {
        await window.db.collection('settings').doc('system').set({
            ...systemSettings,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showMessage('تم حفظ جميع الإعدادات بنجاح', 'success');
    } catch (error) {
        console.error('خطأ في حفظ الإعدادات:', error);
        showMessage('خطأ في حفظ الإعدادات', 'error');
    }
}

// إعادة تعيين للافتراضي
async function resetToDefaults() {
    if (confirm('هل أنت متأكد من إعادة تعيين جميع الإعدادات للافتراضي؟')) {
        systemSettings = {
            language: 'ar',
            theme: 'light',
            notifications: true,
            sounds: false,
            twoFactor: false,
            auditLog: true,
            sessionTimeout: 60,
            caching: true,
            compression: true,
            autoRefresh: true,
            autoBackup: true,
            dataSync: false,
            dataCleanup: 90
        };
        
        await saveAllSettings();
        updateUIFromSettings();
        applyCurrentTheme();
        
        showMessage('تم إعادة تعيين الإعدادات للافتراضي', 'success');
    }
}

// === وظائف النسخ الاحتياطي ===

// إنشاء نسخة احتياطية
async function createBackup() {
    showProgress(0);
    showMessage('جاري إنشاء النسخة الاحتياطية...', 'warning');
    
    try {
        const collections = ['users', 'products', 'orders', 'support_tickets', 'settings', 'admins'];
        const backupData = {
            timestamp: new Date().toISOString(),
            version: '1.0',
            data: {}
        };
        
        let progress = 0;
        const increment = 100 / collections.length;
        
        for (const collection of collections) {
            const snapshot = await window.db.collection(collection).get();
            backupData.data[collection] = [];
            
            snapshot.forEach(doc => {
                backupData.data[collection].push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            progress += increment;
            showProgress(progress);
        }
        
        // حفظ النسخة الاحتياطية
        const backupId = `backup_${Date.now()}`;
        await window.db.collection('backups').doc(backupId).set(backupData);
        
        // تنزيل النسخة الاحتياطية
        downloadBackup(backupData, backupId);
        
        showProgress(100);
        showMessage('تم إنشاء النسخة الاحتياطية بنجاح', 'success');
        
        setTimeout(() => {
            hideProgress();
        }, 2000);
        
    } catch (error) {
        console.error('خطأ في إنشاء النسخة الاحتياطية:', error);
        showMessage('خطأ في إنشاء النسخة الاحتياطية', 'error');
        hideProgress();
    }
}

// تنزيل النسخة الاحتياطية
function downloadBackup(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// استيراد البيانات
function handleFileImport(input) {
    const file = input.files[0];
    if (!file) return;
    
    if (confirm('هل أنت متأكد من استيراد البيانات؟ سيتم استبدال البيانات الحالية.')) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const data = JSON.parse(e.target.result);
                await importBackupData(data);
            } catch (error) {
                console.error('خطأ في قراءة الملف:', error);
                showMessage('خطأ في قراءة الملف', 'error');
            }
        };
        reader.readAsText(file);
    }
    
    input.value = '';
}

// استيراد بيانات النسخة الاحتياطية
async function importBackupData(backupData) {
    showProgress(0);
    showMessage('جاري استيراد البيانات...', 'warning');
    
    try {
        const collections = Object.keys(backupData.data);
        let progress = 0;
        const increment = 100 / collections.length;
        
        for (const collectionName of collections) {
            const items = backupData.data[collectionName];
            
            for (const item of items) {
                const { id, ...data } = item;
                await window.db.collection(collectionName).doc(id).set(data);
            }
            
            progress += increment;
            showProgress(progress);
        }
        
        showProgress(100);
        showMessage('تم استيراد البيانات بنجاح', 'success');
        
        setTimeout(() => {
            hideProgress();
            location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('خطأ في استيراد البيانات:', error);
        showMessage('خطأ في استيراد البيانات', 'error');
        hideProgress();
    }
}

// تصدير البيانات
async function exportData() {
    try {
        const collections = ['products', 'users', 'orders', 'support_tickets'];
        const exportData = {};
        
        for (const collection of collections) {
            const snapshot = await window.db.collection(collection).get();
            exportData[collection] = [];
            
            snapshot.forEach(doc => {
                exportData[collection].push({
                    id: doc.id,
                    ...doc.data()
                });
            });
        }
        
        downloadBackup(exportData, `export_${Date.now()}`);
        showMessage('تم تصدير البيانات بنجاح', 'success');
        
    } catch (error) {
        console.error('خطأ في تصدير البيانات:', error);
        showMessage('خطأ في تصدير البيانات', 'error');
    }
}

// عرض سجل النسخ الاحتياطية
async function viewBackupHistory() {
    try {
        const snapshot = await window.db.collection('backups')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();
        
        let historyHTML = '<h3>سجل النسخ الاحتياطية</h3><ul>';
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = new Date(data.timestamp).toLocaleString('ar-SA');
            historyHTML += `
                <li>
                    <strong>${doc.id}</strong> - ${date}
                    <button onclick="restoreSpecificBackup('${doc.id}')" class="btn-sm">استعادة</button>
                </li>
            `;
        });
        
        historyHTML += '</ul>';
        
        showModal('سجل النسخ الاحتياطية', historyHTML);
        
    } catch (error) {
        console.error('خطأ في عرض السجل:', error);
        showMessage('خطأ في عرض سجل النسخ الاحتياطية', 'error');
    }
}

// استعادة من نسخة احتياطية محددة
async function restoreSpecificBackup(backupId) {
    if (confirm('هل أنت متأكد من استعادة هذه النسخة الاحتياطية؟')) {
        try {
            const backupDoc = await window.db.collection('backups').doc(backupId).get();
            
            if (backupDoc.exists) {
                await importBackupData(backupDoc.data());
            } else {
                showMessage('النسخة الاحتياطية غير موجودة', 'error');
            }
        } catch (error) {
            console.error('خطأ في الاستعادة:', error);
            showMessage('خطأ في استعادة النسخة الاحتياطية', 'error');
        }
    }
}

// استعادة من نسخة احتياطية
function restoreFromBackup() {
    document.getElementById('importFile').click();
}

// تنظيف النسخ القديمة
async function cleanupOldBackups() {
    if (confirm('هل تريد حذف النسخ الاحتياطية الأقدم من 30 يوم؟')) {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const snapshot = await window.db.collection('backups')
                .where('timestamp', '<', thirtyDaysAgo.toISOString())
                .get();
            
            let deletedCount = 0;
            const batch = window.db.batch();
            
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
                deletedCount++;
            });
            
            await batch.commit();
            
            showMessage(`تم حذف ${deletedCount} نسخة احتياطية قديمة`, 'success');
            
        } catch (error) {
            console.error('خطأ في تنظيف النسخ:', error);
            showMessage('خطأ في تنظيف النسخ الاحتياطية', 'error');
        }
    }
}

// === وظائف مساعدة للواجهة ===

// عرض شريط التقدم
function showProgress(percentage) {
    const progressBar = document.getElementById('backupProgress');
    const progressFill = document.getElementById('progressFill');
    
    progressBar.style.display = 'block';
    progressFill.style.width = percentage + '%';
}

// إخفاء شريط التقدم
function hideProgress() {
    document.getElementById('backupProgress').style.display = 'none';
}

// عرض رسالة الحالة
function showMessage(message, type) {
    const messageDiv = document.getElementById('statusMessage');
    messageDiv.textContent = message;
    messageDiv.className = `status-message status-${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// عرض نافذة منبثقة
function showModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}
