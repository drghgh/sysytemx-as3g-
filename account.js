// Account page JavaScript
let currentUser = null;
let userOrders = [];

// Wait for Firebase to be ready
document.addEventListener('DOMContentLoaded', function() {
    // Use the new Firebase ready system
    window.firebaseReady(initializeAccount);
});

function initializeAccount() {
    // Check authentication state using helper
    FirebaseHelpers.waitForAuth(async (user) => {
        if (user) {
            currentUser = user;
            await loadUserProfile();
            await loadUserOrders();
        } else {
            // Redirect to login if not authenticated
            window.location.href = 'login.html';
        }
    });

    // Handle change password form
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handleChangePassword);
    }
}

// Switch between account tabs
function switchAccountTab(tab) {
    const tabs = document.querySelectorAll('.nav-tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    
    document.querySelector(`[onclick="switchAccountTab('${tab}')"]`).classList.add('active');
    document.getElementById(`${tab}Tab`).classList.add('active');
    
    // Load data based on tab
    if (tab === 'support') {
        loadUserSupportTickets();
    }
}

// Load user profile
async function loadUserProfile() {
    if (!currentUser) return;
    
    try {
        const userDoc = await window.db.collection('users').doc(currentUser.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            displayUserProfile(userData);
        } else {
            console.log('User profile not found, creating default profile');
            displayUserProfile({
                displayName: currentUser.displayName || '',
                email: currentUser.email || '',
                phone: '',
                address: ''
            });
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// Display user profile
function displayUserProfile(userData) {
    const profileInfo = document.getElementById('profileInfo');
    
    profileInfo.innerHTML = `
        <div class="info-card">
            <h3><i class="fas fa-user"></i> المعلومات الشخصية</h3>
            <div class="info-item">
                <span class="info-label">الاسم:</span>
                <span class="info-value">${userData.name || 'غير محدد'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">البريد الإلكتروني:</span>
                <span class="info-value">${userData.email || currentUser.email}</span>
            </div>
            <div class="info-item">
                <span class="info-label">رقم الهاتف:</span>
                <span class="info-value">${userData.phone || 'غير محدد'}</span>
            </div>
        </div>
        
        <div class="info-card">
            <h3><i class="fas fa-building"></i> معلومات النشاط التجاري</h3>
            <div class="info-item">
                <span class="info-label">اسم النشاط:</span>
                <span class="info-value">${userData.businessName || 'غير محدد'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">العنوان:</span>
                <span class="info-value">${userData.address || 'غير محدد'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">تاريخ التسجيل:</span>
                <span class="info-value">${userData.createdAt ? formatDateArabic(userData.createdAt.toDate()) : 'غير محدد'}</span>
            </div>
        </div>
    `;
}

// Load user orders
async function loadUserOrders() {
    if (!currentUser) return;
    
    try {
        // Get orders for current user
        const result = await FirebaseUtils.getDocuments('orders');
        
        if (result.success) {
            // Filter orders for current user
            const filteredOrders = result.data.filter(order => order.userId === currentUser.uid);
            displayUserOrders(filteredOrders);
        } else {
            console.error('Error loading orders:', result.error);
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// Display user orders
function displayUserOrders(orders) {
    const ordersGrid = document.getElementById('ordersGrid');
    
    if (orders.length === 0) {
        ordersGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-cart"></i>
                <h3>لا توجد طلبات</h3>
                <p>لم تقم بإجراء أي طلبات حتى الآن</p>
                <a href="index.html#systems" class="btn-primary" style="margin-top: 1rem;">
                    تصفح الأنظمة
                </a>
            </div>
        `;
        return;
    }
    
    const ordersHTML = orders.map(order => {
        const statusClass = getStatusClass(order.status);
        const statusText = getStatusText(order.status);
        
        return `
            <div class="order-card">
                <div class="order-header">
                    <span class="order-id">طلب #${order.id.substring(0, 8)}</span>
                    <span class="order-status ${statusClass}">${statusText}</span>
                </div>
                
                <div class="order-details">
                    <div class="detail-item">
                        <span class="detail-label">النظام</span>
                        <span class="detail-value">${order.systemName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">السعر</span>
                        <span class="detail-value">${order.systemPrice}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">تاريخ الطلب</span>
                        <span class="detail-value">${order.createdAt ? formatDateArabic(order.createdAt.toDate()) : 'غير محدد'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">النشاط التجاري</span>
                        <span class="detail-value">${order.businessName}</span>
                    </div>
                </div>
                
                ${order.notes ? `
                    <div class="detail-item">
                        <span class="detail-label">ملاحظات</span>
                        <span class="detail-value">${order.notes}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    ordersGrid.innerHTML = ordersHTML;
}

// Get status CSS class
function getStatusClass(status) {
    switch (status) {
        case 'pending':
            return 'status-pending';
        case 'approved':
            return 'status-approved';
        case 'rejected':
            return 'status-rejected';
        default:
            return 'status-pending';
    }
}

// Get status text in Arabic
function getStatusText(status) {
    switch (status) {
        case 'pending':
            return 'قيد المراجعة';
        case 'approved':
            return 'تم القبول';
        case 'rejected':
            return 'مرفوض';
        default:
            return 'قيد المراجعة';
    }
}

// Show edit profile modal
function showEditProfile() {
    const modal = createModal();
    
    // Get current user data
    FirebaseUtils.getDocument('users', currentUser.uid).then(result => {
        const userData = result.success ? result.data : {};
        
        modal.querySelector('.modal-content').innerHTML = `
            <span class="close">&times;</span>
            <h2>تعديل الملف الشخصي</h2>
            
            <form id="editProfileForm">
                <div class="form-group">
                    <label for="editName">الاسم الكامل</label>
                    <input type="text" id="editName" name="name" value="${userData.name || ''}" required>
                </div>
                
                <div class="form-group">
                    <label for="editBusiness">اسم النشاط التجاري</label>
                    <input type="text" id="editBusiness" name="businessName" value="${userData.businessName || ''}" required>
                </div>
                
                <div class="form-group">
                    <label for="editPhone">رقم الهاتف</label>
                    <input type="tel" id="editPhone" name="phone" value="${userData.phone || ''}" required>
                </div>
                
                <div class="form-group">
                    <label for="editAddress">العنوان</label>
                    <textarea id="editAddress" name="address" rows="3" required>${userData.address || ''}</textarea>
                </div>
                
                <button type="submit" class="btn-submit">
                    <span class="btn-text">حفظ التغييرات</span>
                    <span class="loading" style="display: none;"></span>
                </button>
            </form>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';

        // Close modal functionality
        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = () => {
            document.body.removeChild(modal);
        };

        modal.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        };

        // Handle form submission
        const editForm = document.getElementById('editProfileForm');
        editForm.onsubmit = async (e) => {
            e.preventDefault();
            await handleEditProfile(editForm, modal);
        };
    });
}

// Handle edit profile
async function handleEditProfile(form, modal) {
    const submitBtn = form.querySelector('.btn-submit');
    const btnText = submitBtn.querySelector('.btn-text');
    const loading = submitBtn.querySelector('.loading');
    
    // Show loading state
    btnText.style.display = 'none';
    loading.style.display = 'inline-block';
    submitBtn.disabled = true;
    
    const formData = new FormData(form);
    const updateData = {
        name: formData.get('name'),
        businessName: formData.get('businessName'),
        phone: formData.get('phone'),
        address: formData.get('address')
    };
    
    try {
        // Add timestamp for update
        updateData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        const result = await FirebaseUtils.updateDocument('users', currentUser.uid, updateData);
        
        if (result.success) {
            showMessage('تم تحديث الملف الشخصي بنجاح!', 'success');
            document.body.removeChild(modal);
            await loadUserProfile(); // Reload profile
        } else {
            throw new Error(result.error || 'فشل في تحديث البيانات');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        let errorMessage = 'حدث خطأ في تحديث الملف الشخصي';
        
        if (error.message.includes('permission-denied')) {
            errorMessage = 'ليس لديك صلاحية لتحديث هذه البيانات';
        } else if (error.message.includes('network')) {
            errorMessage = 'تحقق من اتصال الإنترنت وحاول مرة أخرى';
        }
        
        showMessage(errorMessage, 'error');
    } finally {
        // Reset button state
        btnText.style.display = 'inline';
        loading.style.display = 'none';
        submitBtn.disabled = false;
    }
}

// Handle change password
async function handleChangePassword(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('.btn-submit');
    const btnText = submitBtn.querySelector('.btn-text');
    const loading = submitBtn.querySelector('.loading');
    
    // Show loading state
    btnText.style.display = 'none';
    loading.style.display = 'inline-block';
    submitBtn.disabled = true;
    
    const formData = new FormData(form);
    const currentPassword = formData.get('currentPassword');
    const newPassword = formData.get('newPassword');
    const confirmNewPassword = formData.get('confirmNewPassword');
    
    // Validate new password confirmation
    if (newPassword !== confirmNewPassword) {
        showMessage('كلمة المرور الجديدة وتأكيدها غير متطابقين', 'error');
        btnText.style.display = 'inline';
        loading.style.display = 'none';
        submitBtn.disabled = false;
        return;
    }
    
    try {
        // Re-authenticate user with current password
        const credential = firebase.auth.EmailAuthProvider.credential(
            currentUser.email,
            currentPassword
        );
        
        await currentUser.reauthenticateWithCredential(credential);
        
        // Update password
        await currentUser.updatePassword(newPassword);
        
        showMessage('تم تغيير كلمة المرور بنجاح!', 'success');
        form.reset();
    } catch (error) {
        console.error('Error changing password:', error);
        let errorMessage = 'حدث خطأ في تغيير كلمة المرور';
        
        if (error.message.includes('wrong-password')) {
            errorMessage = 'كلمة المرور الحالية غير صحيحة';
        } else if (error.message.includes('weak-password')) {
            errorMessage = 'كلمة المرور الجديدة ضعيفة';
        }
        
        showMessage(errorMessage, 'error');
    } finally {
        // Reset button state
        btnText.style.display = 'inline';
        loading.style.display = 'none';
        submitBtn.disabled = false;
    }
}

// Handle logout
async function handleLogout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        try {
            await FirebaseUtils.signOut();
            showMessage('تم تسجيل الخروج بنجاح', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } catch (error) {
            console.error('Error signing out:', error);
            showMessage('حدث خطأ في تسجيل الخروج', 'error');
        }
    }
}

// Create modal element (reuse from main.js)
function createModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <!-- Content will be added dynamically -->
        </div>
    `;
    return modal;
}

// Show message to user (reuse from main.js)
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Insert at the top of the page
    document.body.insertBefore(messageDiv, document.body.firstChild);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
}

// Format date in Arabic (reuse from main.js)
function formatDateArabic(date) {
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    return new Date(date).toLocaleDateString('ar-EG', options);
}

// Load user support tickets
async function loadUserSupportTickets() {
    if (!currentUser) return;
    
    try {
        const result = await FirebaseUtils.getDocuments('support_tickets');
        
        if (result.success) {
            // Filter tickets for current user
            const userTickets = result.data.filter(ticket => ticket.userId === currentUser.uid);
            displayUserSupportTickets(userTickets);
        } else {
            console.error('Error loading support tickets:', result.error);
        }
    } catch (error) {
        console.error('Error loading support tickets:', error);
    }
}

// Display user support tickets
function displayUserSupportTickets(tickets) {
    const ticketsGrid = document.getElementById('supportTicketsGrid');
    
    if (tickets.length === 0) {
        ticketsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-headset"></i>
                <h3>لا توجد تذاكر دعم</h3>
                <p>لم تقم بإرسال أي طلبات دعم فني حتى الآن</p>
                <a href="support.html" class="btn-primary" style="margin-top: 1rem;">
                    إرسال طلب دعم
                </a>
            </div>
        `;
        return;
    }
    
    const ticketsHTML = tickets.map(ticket => {
        const statusClass = getSupportStatusClass(ticket.status);
        const statusText = getSupportStatusText(ticket.status);
        const priorityClass = getPriorityClass(ticket.priority);
        const priorityText = getPriorityText(ticket.priority);
        
        return `
            <div class="order-card">
                <div class="order-header">
                    <span class="order-id">تذكرة #${ticket.id.substring(0, 8)}</span>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <span class="order-status ${statusClass}">${statusText}</span>
                        <span class="order-status ${priorityClass}">${priorityText}</span>
                    </div>
                </div>
                
                <div class="order-details">
                    <div class="detail-item">
                        <span class="detail-label">الموضوع</span>
                        <span class="detail-value">${ticket.subject}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">الفئة</span>
                        <span class="detail-value">${getCategoryText(ticket.category)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">تاريخ الإرسال</span>
                        <span class="detail-value">${ticket.createdAt ? formatDateArabic(ticket.createdAt.toDate()) : 'غير محدد'}</span>
                    </div>
                    ${ticket.lastReply ? `
                        <div class="detail-item">
                            <span class="detail-label">آخر رد</span>
                            <span class="detail-value">${formatDateArabic(ticket.lastReply.toDate())}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="detail-item" style="margin-top: 1rem;">
                    <span class="detail-label">الرسالة</span>
                    <span class="detail-value" style="white-space: pre-wrap; max-height: 100px; overflow: hidden; text-overflow: ellipsis;">
                        ${ticket.message.length > 150 ? ticket.message.substring(0, 150) + '...' : ticket.message}
                    </span>
                </div>
                
                ${ticket.adminReply ? `
                    <div style="background: #e3f2fd; padding: 1rem; border-radius: 8px; margin-top: 1rem;">
                        <div style="font-weight: 600; color: #1565c0; margin-bottom: 0.5rem;">
                            <i class="fas fa-reply"></i> رد الدعم الفني:
                        </div>
                        <div style="color: #666; white-space: pre-wrap;">
                            ${ticket.adminReply}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    ticketsGrid.innerHTML = ticketsHTML;
}

// Get support status CSS class
function getSupportStatusClass(status) {
    switch (status) {
        case 'open':
            return 'status-pending';
        case 'in_progress':
            return 'status-approved';
        case 'resolved':
            return 'status-approved';
        case 'closed':
            return 'status-rejected';
        default:
            return 'status-pending';
    }
}

// Get support status text in Arabic
function getSupportStatusText(status) {
    switch (status) {
        case 'open':
            return 'مفتوح';
        case 'in_progress':
            return 'قيد المعالجة';
        case 'resolved':
            return 'تم الحل';
        case 'closed':
            return 'مغلق';
        default:
            return 'مفتوح';
    }
}

// Get priority CSS class
function getPriorityClass(priority) {
    switch (priority) {
        case 'high':
            return 'status-rejected';
        case 'medium':
            return 'status-pending';
        case 'low':
            return 'status-approved';
        default:
            return 'status-pending';
    }
}

// Get priority text in Arabic
function getPriorityText(priority) {
    switch (priority) {
        case 'high':
            return 'عالية';
        case 'medium':
            return 'متوسطة';
        case 'low':
            return 'منخفضة';
        default:
            return 'متوسطة';
    }
}

// Get category text in Arabic (reuse from support.js)
function getCategoryText(category) {
    switch (category) {
        case 'technical':
            return 'مشكلة تقنية';
        case 'billing':
            return 'استفسار مالي';
        case 'feature':
            return 'طلب ميزة';
        case 'other':
            return 'أخرى';
        default:
            return 'غير محدد';
    }
}
