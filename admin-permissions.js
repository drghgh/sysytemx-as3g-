// نظام صلاحيات المدير
class AdminPermissions {
    constructor() {
        this.permissions = {
            // صلاحيات إدارة المنتجات
            products: {
                view: true,
                add: true,
                edit: true,
                delete: true
            },
            // صلاحيات إدارة المستخدمين
            users: {
                view: true,
                add: true,
                edit: true,
                delete: true,
                permissions: true
            },
            // صلاحيات الدعم الفني
            support: {
                view: true,
                reply: true,
                close: true,
                delete: true
            },
            // صلاحيات الطلبات
            orders: {
                view: true,
                edit: true,
                delete: true,
                reports: true
            },
            // صلاحيات الإعدادات
            settings: {
                view: true,
                edit: true,
                backup: true,
                import: true,
                system: true
            },
            // صلاحيات التقارير والإحصائيات
            analytics: {
                view: true,
                export: true,
                advanced: true
            }
        };
        
        this.adminRoles = {
            'super_admin': {
                name: 'مدير عام',
                permissions: 'all'
            },
            'products_manager': {
                name: 'مدير المنتجات',
                permissions: {
                    products: 'all',
                    analytics: { view: true }
                }
            },
            'support_manager': {
                name: 'مدير الدعم الفني',
                permissions: {
                    support: 'all',
                    users: { view: true },
                    analytics: { view: true }
                }
            },
            'orders_manager': {
                name: 'مدير الطلبات',
                permissions: {
                    orders: 'all',
                    users: { view: true },
                    analytics: { view: true, export: true }
                }
            },
            'content_manager': {
                name: 'مدير المحتوى',
                permissions: {
                    products: { view: true, add: true, edit: true },
                    settings: { view: true, edit: true }
                }
            }
        };
    }
    
    // فحص صلاحية معينة للمدير
    async checkPermission(adminId, section, action) {
        try {
            const adminDoc = await window.db.collection('admins').doc(adminId).get();
            
            if (!adminDoc.exists) {
                return false;
            }
            
            const adminData = adminDoc.data();
            const role = adminData.role || 'content_manager';
            
            // المدير العام له جميع الصلاحيات
            if (role === 'super_admin') {
                return true;
            }
            
            const rolePermissions = this.adminRoles[role];
            if (!rolePermissions) {
                return false;
            }
            
            // فحص الصلاحيات المخصصة
            if (adminData.customPermissions) {
                const customPerms = adminData.customPermissions[section];
                if (customPerms && customPerms[action] !== undefined) {
                    return customPerms[action];
                }
            }
            
            // فحص صلاحيات الدور
            const perms = rolePermissions.permissions;
            if (perms === 'all') {
                return true;
            }
            
            if (perms[section]) {
                if (perms[section] === 'all') {
                    return true;
                }
                return perms[section][action] || false;
            }
            
            return false;
        } catch (error) {
            console.error('خطأ في فحص الصلاحيات:', error);
            return false;
        }
    }
    
    // إخفاء/إظهار عناصر الواجهة حسب الصلاحيات
    async applyUIPermissions(adminId) {
        const menuItems = {
            'products': { selector: '.menu-item[onclick*="products"]', section: 'products', action: 'view' },
            'users': { selector: '.menu-item[onclick*="users"]', section: 'users', action: 'view' },
            'support': { selector: '.menu-item[onclick*="support"]', section: 'support', action: 'view' },
            'orders': { selector: '.menu-item[onclick*="orders"]', section: 'orders', action: 'view' },
            'settings': { selector: '.menu-item[onclick*="settings"]', section: 'settings', action: 'view' },
            'analytics': { selector: '.menu-item[onclick*="analytics"]', section: 'analytics', action: 'view' }
        };
        
        for (const [key, item] of Object.entries(menuItems)) {
            const hasPermission = await this.checkPermission(adminId, item.section, item.action);
            const element = document.querySelector(item.selector);
            
            if (element) {
                if (hasPermission) {
                    element.style.display = 'block';
                } else {
                    element.style.display = 'none';
                }
            }
        }
    }
    
    // إنشاء واجهة إدارة الصلاحيات
    createPermissionsUI(adminId, targetAdminId) {
        return `
            <div class="permissions-manager">
                <h3>إدارة صلاحيات المدير</h3>
                
                <div class="role-selector">
                    <label>الدور:</label>
                    <select id="adminRole" onchange="updateRolePermissions()">
                        ${Object.entries(this.adminRoles).map(([key, role]) => 
                            `<option value="${key}">${role.name}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <div class="permissions-grid">
                    ${Object.entries(this.permissions).map(([section, actions]) => `
                        <div class="permission-section">
                            <h4>${this.getSectionName(section)}</h4>
                            ${Object.entries(actions).map(([action, defaultValue]) => `
                                <label class="permission-item">
                                    <input type="checkbox" 
                                           id="perm_${section}_${action}"
                                           ${defaultValue ? 'checked' : ''}>
                                    <span>${this.getActionName(action)}</span>
                                </label>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
                
                <div class="permissions-actions">
                    <button class="btn-primary" onclick="saveAdminPermissions('${targetAdminId}')">
                        حفظ الصلاحيات
                    </button>
                    <button class="btn-secondary" onclick="resetToRoleDefaults()">
                        إعادة تعيين للافتراضي
                    </button>
                </div>
            </div>
        `;
    }
    
    getSectionName(section) {
        const names = {
            products: 'إدارة المنتجات',
            users: 'إدارة المستخدمين',
            support: 'الدعم الفني',
            orders: 'إدارة الطلبات',
            settings: 'الإعدادات',
            analytics: 'التقارير والإحصائيات'
        };
        return names[section] || section;
    }
    
    getActionName(action) {
        const names = {
            view: 'عرض',
            add: 'إضافة',
            edit: 'تعديل',
            delete: 'حذف',
            reply: 'رد',
            close: 'إغلاق',
            permissions: 'إدارة الصلاحيات',
            backup: 'نسخ احتياطي',
            import: 'استيراد',
            export: 'تصدير',
            system: 'إعدادات النظام',
            reports: 'التقارير',
            advanced: 'متقدم'
        };
        return names[action] || action;
    }
}

// إنشاء مثيل عام
window.AdminPermissions = new AdminPermissions();

// وظائف مساعدة للواجهة
async function updateRolePermissions() {
    const role = document.getElementById('adminRole').value;
    const roleData = window.AdminPermissions.adminRoles[role];
    
    if (roleData.permissions === 'all') {
        // تفعيل جميع الصلاحيات
        document.querySelectorAll('.permission-item input').forEach(input => {
            input.checked = true;
        });
    } else {
        // تطبيق صلاحيات الدور
        Object.entries(roleData.permissions).forEach(([section, actions]) => {
            if (actions === 'all') {
                document.querySelectorAll(`[id^="perm_${section}_"]`).forEach(input => {
                    input.checked = true;
                });
            } else {
                Object.entries(actions).forEach(([action, value]) => {
                    const input = document.getElementById(`perm_${section}_${action}`);
                    if (input) {
                        input.checked = value;
                    }
                });
            }
        });
    }
}

async function saveAdminPermissions(adminId) {
    const role = document.getElementById('adminRole').value;
    const customPermissions = {};
    
    // جمع الصلاحيات المخصصة
    Object.keys(window.AdminPermissions.permissions).forEach(section => {
        customPermissions[section] = {};
        Object.keys(window.AdminPermissions.permissions[section]).forEach(action => {
            const input = document.getElementById(`perm_${section}_${action}`);
            if (input) {
                customPermissions[section][action] = input.checked;
            }
        });
    });
    
    try {
        await window.db.collection('admins').doc(adminId).update({
            role: role,
            customPermissions: customPermissions,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showMessage('تم حفظ الصلاحيات بنجاح', 'success');
        closeModal();
    } catch (error) {
        console.error('خطأ في حفظ الصلاحيات:', error);
        showMessage('خطأ في حفظ الصلاحيات', 'error');
    }
}

function resetToRoleDefaults() {
    updateRolePermissions();
}
