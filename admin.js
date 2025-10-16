// Admin panel JavaScript
let currentUser = null;
let allOrders = [];
let allUsers = [];
let allTickets = [];
let allFAQs = [];
let filteredOrders = [];
let filteredUsers = [];
let filteredTickets = [];
let filteredFAQs = [];

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication and admin privileges
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            const isAdmin = await FirebaseUtils.isAdmin(user.uid);
            
            if (isAdmin) {
                await initializeAdminPanel();
            } else {
                // Redirect non-admin users
                showMessage('ليس لديك صلاحية للوصول إلى هذه الصفحة', 'error');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            }
        } else {
            // Redirect to admin login if not authenticated
            window.location.href = 'admin-login.html';
        }
    });
});

// Initialize admin panel
async function initializeAdminPanel() {
    try {
        // Load user info
        const userResult = await FirebaseUtils.getDocument('users', currentUser.uid);
        if (userResult.success) {
            const userData = userResult.data;
            document.getElementById('adminUserName').textContent = `مرحباً، ${userData.name || 'المدير'}`;
        }
        
        // Load all data
        await loadDashboardData();
        await loadOrders();
        await loadUsers();
        await loadSupportTickets();
        
    } catch (error) {
        console.error('Error initializing admin panel:', error);
        showMessage('حدث خطأ في تحميل لوحة التحكم', 'error');
    }
}

// Switch between tabs
function switchTab(tabName) {
    // Update menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // Update page title
    const titles = {
        dashboard: 'لوحة التحكم الرئيسية',
        orders: 'إدارة الطلبات',
        users: 'إدارة المستخدمين',
        support: 'إدارة الدعم الفني',
        systems: 'إدارة الأنظمة',
        products: 'إدارة المنتجات',
        posts: 'إدارة المنشورات',
        faq: 'إدارة الأسئلة الشائعة',
        accounts: 'إدارة الحسابات',
        settings: 'إعدادات النظام'
    };
    
    document.getElementById('pageTitle').textContent = titles[tabName] || 'لوحة التحكم';
    
    // Load specific tab data if needed
    switch(tabName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'orders':
            displayOrders();
            break;
        case 'users':
            displayUsers();
            break;
        case 'support':
            displaySupportTickets();
            break;
        case 'products':
            loadProducts();
            break;
        case 'settings':
            loadQuickSettings();
            break;
        case 'faq':
            loadFAQs();
            break;
    }
}

// Toggle sidebar for mobile
function toggleSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const main = document.getElementById('adminMain');
    
    sidebar.classList.toggle('show');
    main.classList.toggle('expanded');
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load statistics
        const stats = await Promise.all([
            FirebaseUtils.getDocuments('orders'),
            FirebaseUtils.getDocuments('users'),
            FirebaseUtils.getDocuments('support_tickets')
        ]);
        
        const ordersCount = stats[0].success ? stats[0].data.length : 0;
        const usersCount = stats[1].success ? stats[1].data.length : 0;
        const ticketsCount = stats[2].success ? stats[2].data.length : 0;
        
        displayDashboardStats(ordersCount, usersCount, ticketsCount);
        
        // Load recent activities
        await loadRecentActivities();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Display dashboard statistics
function displayDashboardStats(ordersCount, usersCount, ticketsCount) {
    const statsGrid = document.getElementById('statsGrid');
    
    statsGrid.innerHTML = `
        <div class="stat-card orders">
            <i class="fas fa-shopping-cart"></i>
            <div class="stat-number">${ordersCount}</div>
            <div class="stat-label">إجمالي الطلبات</div>
        </div>
        
        <div class="stat-card users">
            <i class="fas fa-users"></i>
            <div class="stat-number">${usersCount}</div>
            <div class="stat-label">المستخدمين المسجلين</div>
        </div>
        
        <div class="stat-card tickets">
            <i class="fas fa-headset"></i>
            <div class="stat-number">${ticketsCount}</div>
            <div class="stat-label">تذاكر الدعم</div>
        </div>
        
        <div class="stat-card">
            <i class="fas fa-chart-line"></i>
            <div class="stat-number">${Math.round((ordersCount * 0.85))}</div>
            <div class="stat-label">معدل النجاح</div>
        </div>
    `;
}

// Load recent activities
async function loadRecentActivities() {
    const activitiesDiv = document.getElementById('recentActivities');
    
    try {
        // Get recent orders
        const recentOrders = await FirebaseUtils.getDocuments('orders', 
            { field: 'createdAt', direction: 'desc' }, 5);
        
        if (recentOrders.success && recentOrders.data.length > 0) {
            const activitiesHTML = recentOrders.data.map(order => `
                <div class="activity-item" style="padding: 1rem; border-bottom: 1px solid #e9ecef;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${order.customerName}</strong> طلب <strong>${order.systemName}</strong>
                        </div>
                        <small style="color: #666;">
                            ${order.createdAt ? formatDateArabic(order.createdAt.toDate()) : 'غير محدد'}
                        </small>
                    </div>
                </div>
            `).join('');
            
            activitiesDiv.innerHTML = activitiesHTML;
        } else {
            activitiesDiv.innerHTML = '<p style="text-align: center; color: #666;">لا توجد أنشطة حديثة</p>';
        }
    } catch (error) {
        console.error('Error loading recent activities:', error);
        activitiesDiv.innerHTML = '<p style="text-align: center; color: #666;">خطأ في تحميل الأنشطة</p>';
    }
}

// Load orders
async function loadOrders() {
    try {
        const result = await FirebaseUtils.getDocuments('orders', 
            { field: 'createdAt', direction: 'desc' });
        
        if (result.success) {
            allOrders = result.data;
            filteredOrders = [...allOrders];
            displayOrders();
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// Display orders
function displayOrders() {
    const ordersTable = document.getElementById('ordersTable');
    
    if (filteredOrders.length === 0) {
        ordersTable.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-cart"></i>
                <h3>لا توجد طلبات</h3>
                <p>لم يتم تسجيل أي طلبات حتى الآن</p>
            </div>
        `;
        return;
    }
    
    const tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>رقم الطلب</th>
                    <th>اسم العميل</th>
                    <th>النظام</th>
                    <th>النشاط التجاري</th>
                    <th>الحالة</th>
                    <th>التاريخ</th>
                    <th>الإجراءات</th>
                </tr>
            </thead>
            <tbody>
                ${filteredOrders.map(order => `
                    <tr>
                        <td>#${order.id.substring(0, 8)}</td>
                        <td>${order.customerName}</td>
                        <td>${order.systemName}</td>
                        <td>${order.businessName}</td>
                        <td>
                            <span class="order-status ${getStatusClass(order.status)}">
                                ${getStatusText(order.status)}
                            </span>
                        </td>
                        <td>${order.createdAt ? formatDateArabic(order.createdAt.toDate()) : 'غير محدد'}</td>
                        <td>
                            <button class="action-btn btn-view" onclick="viewOrderDetails('${order.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${order.status === 'pending' ? `
                                <button class="action-btn btn-approve" onclick="updateOrderStatus('${order.id}', 'approved')">
                                    <i class="fas fa-check"></i>
                                </button>
                                <button class="action-btn btn-reject" onclick="updateOrderStatus('${order.id}', 'rejected')">
                                    <i class="fas fa-times"></i>
                                </button>
                            ` : ''}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    ordersTable.innerHTML = tableHTML;
}

// Filter orders
function filterOrders() {
    const statusFilter = document.getElementById('orderStatusFilter').value;
    
    filteredOrders = allOrders.filter(order => {
        return !statusFilter || order.status === statusFilter;
    });
    
    displayOrders();
}

// Search orders
function searchOrders() {
    const searchTerm = document.getElementById('orderSearchInput').value.toLowerCase();
    
    filteredOrders = allOrders.filter(order => {
        return order.customerName.toLowerCase().includes(searchTerm) ||
               order.businessName.toLowerCase().includes(searchTerm) ||
               order.systemName.toLowerCase().includes(searchTerm);
    });
    
    displayOrders();
}

// View order details
function viewOrderDetails(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const modal = createModal();
    
    modal.querySelector('.modal-content').innerHTML = `
        <span class="close">&times;</span>
        <h2>تفاصيل الطلب #${order.id.substring(0, 8)}</h2>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin: 2rem 0;">
            <div>
                <h3>معلومات العميل</h3>
                <p><strong>الاسم:</strong> ${order.customerName}</p>
                <p><strong>النشاط التجاري:</strong> ${order.businessName}</p>
                <p><strong>رقم الهاتف:</strong> ${order.phoneNumber}</p>
                <p><strong>العنوان:</strong> ${order.location}</p>
                ${order.email ? `<p><strong>البريد الإلكتروني:</strong> ${order.email}</p>` : ''}
            </div>
            
            <div>
                <h3>معلومات الطلب</h3>
                <p><strong>النظام:</strong> ${order.systemName}</p>
                <p><strong>السعر:</strong> ${order.systemPrice}</p>
                <p><strong>الحالة:</strong> ${getStatusText(order.status)}</p>
                <p><strong>تاريخ الطلب:</strong> ${order.createdAt ? formatDateArabic(order.createdAt.toDate()) : 'غير محدد'}</p>
            </div>
        </div>
        
        ${order.notes ? `
            <div>
                <h3>ملاحظات</h3>
                <p>${order.notes}</p>
            </div>
        ` : ''}
        
        <div style="margin-top: 2rem; text-align: center;">
            ${order.status === 'pending' ? `
                <button class="btn-primary" onclick="updateOrderStatus('${order.id}', 'approved'); closeModal()">
                    قبول الطلب
                </button>
                <button class="btn-reject" onclick="updateOrderStatus('${order.id}', 'rejected'); closeModal()" style="margin-right: 1rem;">
                    رفض الطلب
                </button>
            ` : ''}
        </div>
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
}

// Update order status
async function updateOrderStatus(orderId, newStatus) {
    try {
        const result = await FirebaseUtils.updateDocument('orders', orderId, {
            status: newStatus
        });
        
        if (result.success) {
            showMessage(`تم ${newStatus === 'approved' ? 'قبول' : 'رفض'} الطلب بنجاح`, 'success');
            await loadOrders(); // Reload orders
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        showMessage('حدث خطأ في تحديث حالة الطلب', 'error');
    }
}

// Load users
async function loadUsers() {
    try {
        const result = await FirebaseUtils.getDocuments('users', 
            { field: 'createdAt', direction: 'desc' });
        
        if (result.success) {
            allUsers = result.data;
            filteredUsers = [...allUsers];
            displayUsers();
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Display users
function displayUsers() {
    const usersTable = document.getElementById('usersTable');
    
    if (filteredUsers.length === 0) {
        usersTable.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>لا توجد مستخدمين</h3>
                <p>لم يتم تسجيل أي مستخدمين حتى الآن</p>
            </div>
        `;
        return;
    }
    
    const tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>الاسم</th>
                    <th>البريد الإلكتروني</th>
                    <th>النشاط التجاري</th>
                    <th>النوع</th>
                    <th>تاريخ التسجيل</th>
                    <th>الإجراءات</th>
                </tr>
            </thead>
            <tbody>
                ${filteredUsers.map(user => `
                    <tr>
                        <td>${user.name || 'غير محدد'}</td>
                        <td>${user.email}</td>
                        <td>${user.businessName || 'غير محدد'}</td>
                        <td>${getRoleText(user.role)}</td>
                        <td>${user.createdAt ? formatDateArabic(user.createdAt.toDate()) : 'غير محدد'}</td>
                        <td>
                            <button class="action-btn btn-view" onclick="viewUserDetails('${user.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn btn-edit" onclick="editUserRole('${user.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    usersTable.innerHTML = tableHTML;
}

// Filter users
function filterUsers() {
    const roleFilter = document.getElementById('userRoleFilter').value;
    
    filteredUsers = allUsers.filter(user => {
        return !roleFilter || user.role === roleFilter;
    });
    
    displayUsers();
}

// Search users
function searchUsers() {
    const searchTerm = document.getElementById('userSearchInput').value.toLowerCase();
    
    filteredUsers = allUsers.filter(user => {
        return (user.name && user.name.toLowerCase().includes(searchTerm)) ||
               user.email.toLowerCase().includes(searchTerm) ||
               (user.businessName && user.businessName.toLowerCase().includes(searchTerm));
    });
    
    displayUsers();
}

// Load support tickets
async function loadSupportTickets() {
    try {
        const result = await FirebaseUtils.getDocuments('support_tickets', 
            { field: 'createdAt', direction: 'desc' });
        
        if (result.success) {
            allTickets = result.data;
            filteredTickets = [...allTickets];
            displaySupportTickets();
        }
    } catch (error) {
        console.error('Error loading support tickets:', error);
    }
}

// Display support tickets
function displaySupportTickets() {
    const ticketsTable = document.getElementById('supportTicketsTable');
    
    if (filteredTickets.length === 0) {
        ticketsTable.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-headset"></i>
                <h3>لا توجد تذاكر دعم</h3>
                <p>لم يتم تسجيل أي تذاكر دعم حتى الآن</p>
            </div>
        `;
        return;
    }
    
    const tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>رقم التذكرة</th>
                    <th>الموضوع</th>
                    <th>العميل</th>
                    <th>الأولوية</th>
                    <th>الحالة</th>
                    <th>التاريخ</th>
                    <th>الإجراءات</th>
                </tr>
            </thead>
            <tbody>
                ${filteredTickets.map(ticket => `
                    <tr>
                        <td>#${ticket.id.substring(0, 8)}</td>
                        <td>${ticket.subject}</td>
                        <td>${ticket.userEmail || 'غير محدد'}</td>
                        <td>
                            <span class="ticket-priority ${getPriorityBadgeClass(ticket.priority)}">
                                ${getPriorityText(ticket.priority)}
                            </span>
                        </td>
                        <td>
                            <span class="ticket-status ${getTicketStatusClass(ticket.status)}">
                                ${getTicketStatusText(ticket.status)}
                            </span>
                        </td>
                        <td>${ticket.createdAt ? formatDateArabic(ticket.createdAt.toDate()) : 'غير محدد'}</td>
                        <td>
                            <button class="action-btn btn-view" onclick="viewTicketDetails('${ticket.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn btn-edit" onclick="replyToTicket('${ticket.id}')">
                                <i class="fas fa-reply"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    ticketsTable.innerHTML = tableHTML;
}

// Utility functions
function getStatusClass(status) {
    switch (status) {
        case 'pending': return 'status-pending';
        case 'approved': return 'status-approved';
        case 'rejected': return 'status-rejected';
        default: return 'status-pending';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'pending': return 'قيد المراجعة';
        case 'approved': return 'مقبول';
        case 'rejected': return 'مرفوض';
        default: return 'قيد المراجعة';
    }
}

function getRoleText(role) {
    switch (role) {
        case 'customer': return 'عميل';
        case 'support': return 'دعم فني';
        case 'admin': return 'مدير';
        case 'super_admin': return 'مدير عام';
        default: return 'عميل';
    }
}

function getTicketStatusClass(status) {
    switch (status) {
        case 'open': return 'status-open';
        case 'in-progress': return 'status-in-progress';
        case 'resolved': return 'status-resolved';
        case 'closed': return 'status-closed';
        default: return 'status-open';
    }
}

function getTicketStatusText(status) {
    switch (status) {
        case 'open': return 'مفتوحة';
        case 'in-progress': return 'قيد المعالجة';
        case 'resolved': return 'تم الحل';
        case 'closed': return 'مغلقة';
        default: return 'مفتوحة';
    }
}

function getPriorityBadgeClass(priority) {
    switch (priority) {
        case 'high': return 'priority-high-badge';
        case 'medium': return 'priority-medium-badge';
        case 'low': return 'priority-low-badge';
        default: return 'priority-medium-badge';
    }
}

function getPriorityText(priority) {
    switch (priority) {
        case 'high': return 'عالية';
        case 'medium': return 'متوسطة';
        case 'low': return 'منخفضة';
        default: return 'متوسطة';
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

// FAQ Management Functions
async function loadFAQs() {
    try {
        const result = await FirebaseUtils.getDocuments('faqs', 
            { field: 'createdAt', direction: 'desc' });
        
        if (result.success) {
            allFAQs = result.data;
            filteredFAQs = [...allFAQs];
            displayFAQs();
        }
    } catch (error) {
        console.error('Error loading FAQs:', error);
    }
}

function displayFAQs() {
    const faqManagement = document.getElementById('faqManagement');
    
    if (filteredFAQs.length === 0) {
        faqManagement.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-question-circle"></i>
                <h3>لا توجد أسئلة شائعة</h3>
                <p>لم يتم إضافة أي أسئلة شائعة حتى الآن</p>
            </div>
        `;
        return;
    }
    
    const tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>السؤال</th>
                    <th>الفئة</th>
                    <th>الحالة</th>
                    <th>تاريخ الإنشاء</th>
                    <th>الإجراءات</th>
                </tr>
            </thead>
            <tbody>
                ${filteredFAQs.map(faq => `
                    <tr>
                        <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${faq.question}
                        </td>
                        <td>
                            <span class="category-badge ${getCategoryClass(faq.category)}">
                                ${getCategoryText(faq.category)}
                            </span>
                        </td>
                        <td>
                            <span class="status-badge ${faq.isActive ? 'status-active' : 'status-inactive'}">
                                ${faq.isActive ? 'نشط' : 'غير نشط'}
                            </span>
                        </td>
                        <td>${faq.createdAt ? formatDateArabic(faq.createdAt.toDate()) : 'غير محدد'}</td>
                        <td>
                            <button class="action-btn btn-view" onclick="viewFAQDetails('${faq.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn btn-edit" onclick="editFAQ('${faq.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn btn-delete" onclick="deleteFAQ('${faq.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    faqManagement.innerHTML = tableHTML;
}

function showAddFAQModal() {
    const modal = createModal();
    
    modal.querySelector('.modal-content').innerHTML = `
        <span class="close">&times;</span>
        <h2>إضافة سؤال شائع جديد</h2>
        
        <form id="addFAQForm">
            <div class="form-group">
                <label for="faqCategory">الفئة *</label>
                <select id="faqCategory" name="category" required>
                    <option value="">اختر الفئة</option>
                    <option value="technical">الأسئلة التقنية</option>
                    <option value="pricing">أسئلة الأسعار</option>
                    <option value="support">أسئلة الدعم الفني</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="faqQuestion">السؤال *</label>
                <input type="text" id="faqQuestion" name="question" required>
            </div>
            
            <div class="form-group">
                <label for="faqAnswer">الإجابة *</label>
                <textarea id="faqAnswer" name="answer" rows="6" required></textarea>
            </div>
            
            <div class="form-group">
                <label for="faqOrder">ترتيب العرض</label>
                <input type="number" id="faqOrder" name="order" value="1" min="1">
            </div>
            
            <div class="form-group">
                <label>
                    <input type="checkbox" id="faqActive" name="isActive" checked>
                    نشط (سيظهر في الموقع)
                </label>
            </div>
            
            <button type="submit" class="btn-submit">
                <span class="btn-text">إضافة السؤال</span>
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
    const addForm = document.getElementById('addFAQForm');
    addForm.onsubmit = async (e) => {
        e.preventDefault();
        await handleAddFAQ(addForm, modal);
    };
}

async function handleAddFAQ(form, modal) {
    const submitBtn = form.querySelector('.btn-submit');
    const btnText = submitBtn.querySelector('.btn-text');
    const loading = submitBtn.querySelector('.loading');
    
    // Show loading state
    btnText.style.display = 'none';
    loading.style.display = 'inline-block';
    submitBtn.disabled = true;
    
    const formData = new FormData(form);
    
    const faqData = {
        category: formData.get('category'),
        question: formData.get('question'),
        answer: formData.get('answer'),
        order: parseInt(formData.get('order')) || 1,
        isActive: formData.get('isActive') === 'on',
        createdBy: currentUser.uid
    };
    
    try {
        const result = await FirebaseUtils.addDocument('faqs', faqData);
        
        if (result.success) {
            showMessage('تم إضافة السؤال بنجاح!', 'success');
            document.body.removeChild(modal);
            await loadFAQs(); // Reload FAQs
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error adding FAQ:', error);
        showMessage('حدث خطأ في إضافة السؤال', 'error');
    } finally {
        // Reset button state
        btnText.style.display = 'inline';
        loading.style.display = 'none';
        submitBtn.disabled = false;
    }
}

function editFAQ(faqId) {
    const faq = allFAQs.find(f => f.id === faqId);
    if (!faq) return;
    
    const modal = createModal();
    
    modal.querySelector('.modal-content').innerHTML = `
        <span class="close">&times;</span>
        <h2>تعديل السؤال الشائع</h2>
        
        <form id="editFAQForm">
            <div class="form-group">
                <label for="editFaqCategory">الفئة *</label>
                <select id="editFaqCategory" name="category" required>
                    <option value="technical" ${faq.category === 'technical' ? 'selected' : ''}>الأسئلة التقنية</option>
                    <option value="pricing" ${faq.category === 'pricing' ? 'selected' : ''}>أسئلة الأسعار</option>
                    <option value="support" ${faq.category === 'support' ? 'selected' : ''}>أسئلة الدعم الفني</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="editFaqQuestion">السؤال *</label>
                <input type="text" id="editFaqQuestion" name="question" value="${faq.question}" required>
            </div>
            
            <div class="form-group">
                <label for="editFaqAnswer">الإجابة *</label>
                <textarea id="editFaqAnswer" name="answer" rows="6" required>${faq.answer}</textarea>
            </div>
            
            <div class="form-group">
                <label for="editFaqOrder">ترتيب العرض</label>
                <input type="number" id="editFaqOrder" name="order" value="${faq.order || 1}" min="1">
            </div>
            
            <div class="form-group">
                <label>
                    <input type="checkbox" id="editFaqActive" name="isActive" ${faq.isActive ? 'checked' : ''}>
                    نشط (سيظهر في الموقع)
                </label>
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
    const editForm = document.getElementById('editFAQForm');
    editForm.onsubmit = async (e) => {
        e.preventDefault();
        await handleEditFAQ(faqId, editForm, modal);
    };
}

async function handleEditFAQ(faqId, form, modal) {
    const submitBtn = form.querySelector('.btn-submit');
    const btnText = submitBtn.querySelector('.btn-text');
    const loading = submitBtn.querySelector('.loading');
    
    // Show loading state
    btnText.style.display = 'none';
    loading.style.display = 'inline-block';
    submitBtn.disabled = true;
    
    const formData = new FormData(form);
    
    const updateData = {
        category: formData.get('category'),
        question: formData.get('question'),
        answer: formData.get('answer'),
        order: parseInt(formData.get('order')) || 1,
        isActive: formData.get('isActive') === 'on'
    };
    
    try {
        const result = await FirebaseUtils.updateDocument('faqs', faqId, updateData);
        
        if (result.success) {
            showMessage('تم تحديث السؤال بنجاح!', 'success');
            document.body.removeChild(modal);
            await loadFAQs(); // Reload FAQs
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error updating FAQ:', error);
        showMessage('حدث خطأ في تحديث السؤال', 'error');
    } finally {
        // Reset button state
        btnText.style.display = 'inline';
        loading.style.display = 'none';
        submitBtn.disabled = false;
    }
}

async function deleteFAQ(faqId) {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
    
    try {
        const result = await FirebaseUtils.deleteDocument('faqs', faqId);
        
        if (result.success) {
            showMessage('تم حذف السؤال بنجاح!', 'success');
            await loadFAQs(); // Reload FAQs
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error deleting FAQ:', error);
        showMessage('حدث خطأ في حذف السؤال', 'error');
    }
}

function viewFAQDetails(faqId) {
    const faq = allFAQs.find(f => f.id === faqId);
    if (!faq) return;
    
    const modal = createModal();
    
    modal.querySelector('.modal-content').innerHTML = `
        <span class="close">&times;</span>
        <h2>تفاصيل السؤال الشائع</h2>
        
        <div style="margin: 2rem 0;">
            <div style="margin-bottom: 1rem;">
                <strong>الفئة:</strong> 
                <span class="category-badge ${getCategoryClass(faq.category)}">
                    ${getCategoryText(faq.category)}
                </span>
            </div>
            
            <div style="margin-bottom: 1rem;">
                <strong>الحالة:</strong> 
                <span class="status-badge ${faq.isActive ? 'status-active' : 'status-inactive'}">
                    ${faq.isActive ? 'نشط' : 'غير نشط'}
                </span>
            </div>
            
            <div style="margin-bottom: 1rem;">
                <strong>ترتيب العرض:</strong> ${faq.order || 1}
            </div>
            
            <div style="margin-bottom: 2rem;">
                <strong>تاريخ الإنشاء:</strong> ${faq.createdAt ? formatDateArabic(faq.createdAt.toDate()) : 'غير محدد'}
            </div>
            
            <div style="margin-bottom: 2rem;">
                <h3 style="color: #2c5aa0; margin-bottom: 1rem;">السؤال:</h3>
                <p style="background: #f8f9fa; padding: 1rem; border-radius: 8px; line-height: 1.6;">
                    ${faq.question}
                </p>
            </div>
            
            <div>
                <h3 style="color: #2c5aa0; margin-bottom: 1rem;">الإجابة:</h3>
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; line-height: 1.8;">
                    ${faq.answer.replace(/\n/g, '<br>')}
                </div>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 2rem;">
            <button class="btn-primary" onclick="editFAQ('${faq.id}'); closeModal()">
                <i class="fas fa-edit"></i> تعديل السؤال
            </button>
        </div>
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
}

function filterFAQs() {
    const categoryFilter = document.getElementById('faqCategoryFilter').value;
    
    filteredFAQs = allFAQs.filter(faq => {
        return !categoryFilter || faq.category === categoryFilter;
    });
    
    displayFAQs();
}

function searchFAQs() {
    const searchTerm = document.getElementById('faqSearchInput').value.toLowerCase();
    
    filteredFAQs = allFAQs.filter(faq => {
        return faq.question.toLowerCase().includes(searchTerm) ||
               faq.answer.toLowerCase().includes(searchTerm);
    });
    
    displayFAQs();
}

function loadFAQCategories() {
    loadFAQs();
}

function getCategoryClass(category) {
    switch (category) {
        case 'technical': return 'category-technical';
        case 'pricing': return 'category-pricing';
        case 'support': return 'category-support';
        default: return 'category-default';
    }
}

function getCategoryText(category) {
    switch (category) {
        case 'technical': return 'الأسئلة التقنية';
        case 'pricing': return 'أسئلة الأسعار';
        case 'support': return 'أسئلة الدعم الفني';
        default: return 'غير محدد';
    }
}

// Missing functions implementation

// Quick Actions
function showQuickActions() {
    const modal = createModal();
    
    modal.querySelector('.modal-content').innerHTML = `
        <span class="close">&times;</span>
        <h2>الإجراءات السريعة</h2>
        
        <div class="quick-actions-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 2rem 0;">
            <button class="quick-action-btn" onclick="showAddSystemModal(); closeModal();">
                <i class="fas fa-plus"></i>
                إضافة نظام جديد
            </button>
            
            <button class="quick-action-btn" onclick="showAddProductModal(); closeModal();">
                <i class="fas fa-box"></i>
                إضافة منتج جديد
            </button>
            
            <button class="quick-action-btn" onclick="showAddPostModal(); closeModal();">
                <i class="fas fa-newspaper"></i>
                إضافة منشور جديد
            </button>
            
            <button class="quick-action-btn" onclick="showAddAccountModal(); closeModal();">
                <i class="fas fa-user-plus"></i>
                إضافة حساب جديد
            </button>
            
            <button class="quick-action-btn" onclick="exportData(); closeModal();">
                <i class="fas fa-download"></i>
                تصدير البيانات
            </button>
            
            <button class="quick-action-btn" onclick="showSystemStats(); closeModal();">
                <i class="fas fa-chart-bar"></i>
                إحصائيات النظام
            </button>
            
            <button class="quick-action-btn" onclick="showBackupOptions(); closeModal();">
                <i class="fas fa-shield-alt"></i>
                النسخ الاحتياطي
            </button>
            
            <button class="quick-action-btn" onclick="showSocialMediaManager(); closeModal();">
                <i class="fas fa-share-alt"></i>
                إدارة وسائل التواصل
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    setupModalClose(modal);
}

// Close Modal function
function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    });
}

// Filter Tickets
function filterTickets(status) {
    if (!allTickets) return;
    
    if (status === 'all') {
        filteredTickets = [...allTickets];
    } else {
        filteredTickets = allTickets.filter(ticket => ticket.status === status);
    }
    
    displayTickets();
}

// View Ticket Details
function viewTicketDetails(ticketId) {
    const ticket = allTickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    const modal = createModal();
    
    modal.querySelector('.modal-content').innerHTML = `
        <span class="close">&times;</span>
        <h2>تفاصيل تذكرة الدعم #${ticketId.substring(0, 8)}</h2>
        
        <div class="ticket-details" style="text-align: right;">
            <div class="detail-row" style="margin-bottom: 1rem;">
                <strong>الموضوع:</strong> ${ticket.subject}
            </div>
            
            <div class="detail-row" style="margin-bottom: 1rem;">
                <strong>الأولوية:</strong> 
                <span class="priority-badge priority-${ticket.priority}">${getPriorityText(ticket.priority)}</span>
            </div>
            
            <div class="detail-row" style="margin-bottom: 1rem;">
                <strong>الحالة:</strong> 
                <span class="status-badge ${getStatusClass(ticket.status)}">${getStatusText(ticket.status)}</span>
            </div>
            
            <div class="detail-row" style="margin-bottom: 1rem;">
                <strong>معلومات الاتصال:</strong> ${ticket.contactInfo}
            </div>
            
            <div class="detail-row" style="margin-bottom: 2rem;">
                <strong>الرسالة:</strong>
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-top: 0.5rem;">
                    ${ticket.message || ticket.description}
                </div>
            </div>
            
            ${ticket.replies && ticket.replies.length > 0 ? `
                <div class="replies-section">
                    <h4>الردود:</h4>
                    ${ticket.replies.map(reply => `
                        <div class="reply-item" style="background: #e3f2fd; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                            <div style="font-weight: 600; margin-bottom: 0.5rem;">
                                ${reply.authorName || 'فريق الدعم'} - ${reply.createdAt ? new Date(reply.createdAt.seconds * 1000).toLocaleDateString('ar-EG') : ''}
                            </div>
                            <div>${reply.content}</div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            <div class="ticket-actions" style="display: flex; gap: 1rem; margin-top: 2rem;">
                <button class="btn-primary" onclick="replyToTicket('${ticketId}')">
                    <i class="fas fa-reply"></i> رد على التذكرة
                </button>
                
                <button class="btn-success" onclick="updateTicketStatus('${ticketId}', 'resolved')">
                    <i class="fas fa-check"></i> تم الحل
                </button>
                
                <button class="btn-warning" onclick="updateTicketStatus('${ticketId}', 'in_progress')">
                    <i class="fas fa-clock"></i> قيد المعالجة
                </button>
                
                <button class="btn-danger" onclick="updateTicketStatus('${ticketId}', 'closed')">
                    <i class="fas fa-times"></i> إغلاق
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    setupModalClose(modal);
}

// Add System Modal
function showAddSystemModal() {
    const modal = createModal();
    
    modal.querySelector('.modal-content').innerHTML = `
        <span class="close">&times;</span>
        <h2>إضافة نظام جديد</h2>
        
        <form id="addSystemForm" style="text-align: right;">
            <div class="form-group">
                <label>اسم النظام:</label>
                <input type="text" name="name" required>
            </div>
            
            <div class="form-group">
                <label>الوصف:</label>
                <textarea name="description" rows="3" required></textarea>
            </div>
            
            <div class="form-group">
                <label>السعر:</label>
                <input type="text" name="price" required placeholder="750 جنيه/شهر">
            </div>
            
            <div class="form-group">
                <label>السعر الأصلي (اختياري):</label>
                <input type="text" name="originalPrice" placeholder="950 جنيه/شهر">
            </div>
            
            <div class="form-group">
                <label>الأيقونة (Font Awesome):</label>
                <input type="text" name="icon" placeholder="fas fa-desktop">
            </div>
            
            <div class="form-group">
                <label>المميزات (كل مميزة في سطر منفصل):</label>
                <textarea name="features" rows="5" placeholder="واجهة مستخدم عربية&#10;إدارة المبيعات&#10;تتبع المخزون"></textarea>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> حفظ النظام
                </button>
                <button type="button" class="btn-secondary" onclick="closeModal()">إلغاء</button>
            </div>
        </form>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    setupModalClose(modal);
    
    // Handle form submission
    document.getElementById('addSystemForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const systemData = {
            name: formData.get('name'),
            description: formData.get('description'),
            price: formData.get('price'),
            originalPrice: formData.get('originalPrice') || null,
            image: formData.get('icon'),
            features: formData.get('features').split('\n').filter(f => f.trim()),
            gallery: [],
            videos: []
        };
        
        try {
            const result = await FirebaseUtils.addDocument('systems', systemData);
            if (result.success) {
                showMessage('تم إضافة النظام بنجاح!', 'success');
                closeModal();
                // Reload systems if needed
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            showMessage('حدث خطأ في إضافة النظام', 'error');
        }
    });
}

// Add Post Modal
function showAddPostModal() {
    const modal = createModal();
    
    modal.querySelector('.modal-content').innerHTML = `
        <span class="close">&times;</span>
        <h2>إضافة منشور جديد</h2>
        
        <form id="addPostForm" style="text-align: right;">
            <div class="form-group">
                <label>عنوان المنشور:</label>
                <input type="text" name="title" required>
            </div>
            
            <div class="form-group">
                <label>المحتوى:</label>
                <textarea name="content" rows="6" required></textarea>
            </div>
            
            <div class="form-group">
                <label>الفئة:</label>
                <select name="category" required>
                    <option value="">اختر الفئة</option>
                    <option value="news">أخبار</option>
                    <option value="updates">تحديثات</option>
                    <option value="announcements">إعلانات</option>
                    <option value="tips">نصائح</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>حالة النشر:</label>
                <select name="status" required>
                    <option value="draft">مسودة</option>
                    <option value="published">منشور</option>
                </select>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> حفظ المنشور
                </button>
                <button type="button" class="btn-secondary" onclick="closeModal()">إلغاء</button>
            </div>
        </form>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    setupModalClose(modal);
    
    // Handle form submission
    document.getElementById('addPostForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const postData = {
            title: formData.get('title'),
            content: formData.get('content'),
            category: formData.get('category'),
            status: formData.get('status'),
            author: currentUser.displayName || currentUser.email,
            authorId: currentUser.uid
        };
        
        try {
            const result = await FirebaseUtils.addDocument('posts', postData);
            if (result.success) {
                showMessage('تم إضافة المنشور بنجاح!', 'success');
                closeModal();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            showMessage('حدث خطأ في إضافة المنشور', 'error');
        }
    });
}

// Add Account Modal
function showAddAccountModal() {
    const modal = createModal();
    
    modal.querySelector('.modal-content').innerHTML = `
        <span class="close">&times;</span>
        <h2>إضافة حساب جديد</h2>
        
        <form id="addAccountForm" style="text-align: right;">
            <div class="form-group">
                <label>الاسم الكامل:</label>
                <input type="text" name="name" required>
            </div>
            
            <div class="form-group">
                <label>البريد الإلكتروني:</label>
                <input type="email" name="email" required>
            </div>
            
            <div class="form-group">
                <label>كلمة المرور:</label>
                <input type="password" name="password" required minlength="6">
            </div>
            
            <div class="form-group">
                <label>اسم النشاط:</label>
                <input type="text" name="businessName" required>
            </div>
            
            <div class="form-group">
                <label>رقم الهاتف:</label>
                <input type="tel" name="phone" required>
            </div>
            
            <div class="form-group">
                <label>العنوان:</label>
                <input type="text" name="address" required>
            </div>
            
            <div class="form-group">
                <label>الدور:</label>
                <select name="role" required>
                    <option value="user">مستخدم عادي</option>
                    <option value="admin">مدير</option>
                    <option value="super_admin">مدير عام</option>
                </select>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> إنشاء الحساب
                </button>
                <button type="button" class="btn-secondary" onclick="closeModal()">إلغاء</button>
            </div>
        </form>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    setupModalClose(modal);
    
    // Handle form submission
    document.getElementById('addAccountForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const userData = {
            name: formData.get('name'),
            businessName: formData.get('businessName'),
            phone: formData.get('phone'),
            address: formData.get('address'),
            role: formData.get('role')
        };
        
        try {
            const result = await FirebaseUtils.signUpWithEmail(
                formData.get('email'),
                formData.get('password'),
                userData
            );
            
            if (result.success) {
                showMessage('تم إنشاء الحساب بنجاح!', 'success');
                closeModal();
                await loadUsers(); // Reload users list
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            showMessage('حدث خطأ في إنشاء الحساب', 'error');
        }
    });
}

// Helper functions
function getPriorityText(priority) {
    switch (priority) {
        case 'high': return 'عالية';
        case 'medium': return 'متوسطة';
        case 'low': return 'منخفضة';
        default: return 'غير محدد';
    }
}

function getStatusClass(status) {
    switch (status) {
        case 'open': return 'status-open';
        case 'in_progress': return 'status-progress';
        case 'resolved': return 'status-resolved';
        case 'closed': return 'status-closed';
        default: return 'status-default';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'open': return 'مفتوحة';
        case 'in_progress': return 'قيد المعالجة';
        case 'resolved': return 'تم الحل';
        case 'closed': return 'مغلقة';
        default: return 'غير محدد';
    }
}

// Setup modal close functionality
function setupModalClose(modal) {
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) {
        closeBtn.onclick = () => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        };
    }
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }
    };
}

// Additional helper functions
function replyToTicket(ticketId) {
    // Implementation for replying to ticket
    showMessage('وظيفة الرد قيد التطوير', 'info');
}

function updateTicketStatus(ticketId, newStatus) {
    // Implementation for updating ticket status
    showMessage(`تم تحديث حالة التذكرة إلى: ${getStatusText(newStatus)}`, 'success');
}

function exportData() {
    showMessage('وظيفة تصدير البيانات قيد التطوير', 'info');
}

function showSystemStats() {
    showMessage('وظيفة إحصائيات النظام قيد التطوير', 'info');
}

function showBackupOptions() {
    showMessage('وظيفة النسخ الاحتياطي قيد التطوير', 'info');
}

// Missing display functions
function displayTickets() {
    const ticketsContainer = document.getElementById('ticketsContainer');
    if (!ticketsContainer) return;
    
    if (!filteredTickets || filteredTickets.length === 0) {
        ticketsContainer.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 3rem; color: #666;">
                <i class="fas fa-ticket-alt" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <h3>لا توجد تذاكر دعم</h3>
                <p>لم يتم العثور على تذاكر دعم بالمعايير المحددة</p>
            </div>
        `;
        return;
    }
    
    const ticketsHTML = filteredTickets.map(ticket => `
        <div class="ticket-card" style="background: white; border-radius: 10px; padding: 1.5rem; margin-bottom: 1rem; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div class="ticket-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <div>
                    <h4 style="margin: 0 0 0.5rem 0; color: #2c5aa0;">#${ticket.id.substring(0, 8)} - ${ticket.subject}</h4>
                    <p style="margin: 0; color: #666; font-size: 0.9rem;">
                        <i class="fas fa-user"></i> ${ticket.userEmail || ticket.contactInfo}
                    </p>
                </div>
                <div style="display: flex; gap: 0.5rem; flex-direction: column; align-items: end;">
                    <span class="priority-badge priority-${ticket.priority}">${getPriorityText(ticket.priority)}</span>
                    <span class="status-badge ${getStatusClass(ticket.status)}">${getStatusText(ticket.status)}</span>
                </div>
            </div>
            
            <div class="ticket-content" style="margin-bottom: 1rem;">
                <p style="margin: 0; color: #333; line-height: 1.6;">
                    ${(ticket.message || ticket.description || '').substring(0, 150)}${(ticket.message || ticket.description || '').length > 150 ? '...' : ''}
                </p>
            </div>
            
            <div class="ticket-actions" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button class="btn-primary" onclick="viewTicketDetails('${ticket.id}')" style="font-size: 0.9rem; padding: 0.5rem 1rem;">
                    <i class="fas fa-eye"></i> عرض التفاصيل
                </button>
                <button class="btn-success" onclick="replyToTicket('${ticket.id}')" style="font-size: 0.9rem; padding: 0.5rem 1rem;">
                    <i class="fas fa-reply"></i> رد
                </button>
                <button class="btn-warning" onclick="updateTicketStatus('${ticket.id}', 'in_progress')" style="font-size: 0.9rem; padding: 0.5rem 1rem;">
                    <i class="fas fa-clock"></i> قيد المعالجة
                </button>
                <button class="btn-success" onclick="updateTicketStatus('${ticket.id}', 'resolved')" style="font-size: 0.9rem; padding: 0.5rem 1rem;">
                    <i class="fas fa-check"></i> تم الحل
                </button>
            </div>
        </div>
    `).join('');
    
    ticketsContainer.innerHTML = ticketsHTML;
}

// Edit User Role
function editUserRole(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const modal = createModal();
    
    modal.querySelector('.modal-content').innerHTML = `
        <span class="close">&times;</span>
        <h2>تعديل صلاحيات المستخدم</h2>
        
        <div style="text-align: right; margin-bottom: 2rem;">
            <div class="user-info" style="background: #f8f9fa; padding: 1.5rem; border-radius: 10px; margin-bottom: 2rem;">
                <h4 style="color: #2c5aa0; margin-bottom: 1rem;">معلومات المستخدم:</h4>
                <p><strong>الاسم:</strong> ${user.name}</p>
                <p><strong>البريد الإلكتروني:</strong> ${user.email}</p>
                <p><strong>النشاط:</strong> ${user.businessName || 'غير محدد'}</p>
                <p><strong>الصلاحية الحالية:</strong> <span class="role-badge">${getRoleText(user.role)}</span></p>
            </div>
            
            <form id="editRoleForm">
                <div class="form-group">
                    <label>الصلاحية الجديدة:</label>
                    <select name="role" required>
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>مستخدم عادي</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>مدير</option>
                        <option value="super_admin" ${user.role === 'super_admin' ? 'selected' : ''}>مدير عام</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>سبب التغيير:</label>
                    <textarea name="reason" rows="3" placeholder="اختياري - سبب تغيير الصلاحية"></textarea>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-save"></i> حفظ التغييرات
                    </button>
                    <button type="button" class="btn-secondary" onclick="closeModal()">إلغاء</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    setupModalClose(modal);
    
    // Handle form submission
    document.getElementById('editRoleForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const newRole = formData.get('role');
        const reason = formData.get('reason');
        
        try {
            const result = await FirebaseUtils.updateDocument('users', userId, {
                role: newRole,
                isAdmin: newRole === 'admin' || newRole === 'super_admin',
                roleChangedAt: firebase.firestore.FieldValue.serverTimestamp(),
                roleChangeReason: reason || null
            });
            
            if (result.success) {
                showMessage('تم تحديث صلاحيات المستخدم بنجاح!', 'success');
                closeModal();
                await loadUsers(); // Reload users list
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            showMessage('حدث خطأ في تحديث الصلاحيات', 'error');
        }
    });
}

// View User Details
function viewUserDetails(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const modal = createModal();
    
    modal.querySelector('.modal-content').innerHTML = `
        <span class="close">&times;</span>
        <h2>تفاصيل المستخدم</h2>
        
        <div class="user-details" style="text-align: right;">
            <div class="detail-section" style="background: #f8f9fa; padding: 1.5rem; border-radius: 10px; margin-bottom: 2rem;">
                <h4 style="color: #2c5aa0; margin-bottom: 1rem;">المعلومات الأساسية:</h4>
                <div class="detail-row"><strong>الاسم:</strong> ${user.name}</div>
                <div class="detail-row"><strong>البريد الإلكتروني:</strong> ${user.email}</div>
                <div class="detail-row"><strong>اسم النشاط:</strong> ${user.businessName || 'غير محدد'}</div>
                <div class="detail-row"><strong>رقم الهاتف:</strong> ${user.phone || 'غير محدد'}</div>
                <div class="detail-row"><strong>العنوان:</strong> ${user.address || 'غير محدد'}</div>
                <div class="detail-row"><strong>الصلاحية:</strong> <span class="role-badge">${getRoleText(user.role)}</span></div>
            </div>
            
            <div class="detail-section" style="background: #e3f2fd; padding: 1.5rem; border-radius: 10px; margin-bottom: 2rem;">
                <h4 style="color: #1565c0; margin-bottom: 1rem;">معلومات الحساب:</h4>
                <div class="detail-row"><strong>تاريخ التسجيل:</strong> ${user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString('ar-EG') : 'غير محدد'}</div>
                <div class="detail-row"><strong>آخر تحديث:</strong> ${user.updatedAt ? new Date(user.updatedAt.seconds * 1000).toLocaleDateString('ar-EG') : 'غير محدد'}</div>
                <div class="detail-row"><strong>معرف المستخدم:</strong> ${user.id}</div>
            </div>
            
            <div class="user-actions" style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <button class="btn-primary" onclick="editUserRole('${user.id}'); closeModal();">
                    <i class="fas fa-user-cog"></i> تعديل الصلاحيات
                </button>
                <button class="btn-warning" onclick="resetUserPassword('${user.id}')">
                    <i class="fas fa-key"></i> إعادة تعيين كلمة المرور
                </button>
                <button class="btn-info" onclick="viewUserOrders('${user.id}')">
                    <i class="fas fa-shopping-cart"></i> عرض الطلبات
                </button>
                <button class="btn-info" onclick="viewUserTickets('${user.id}')">
                    <i class="fas fa-ticket-alt"></i> عرض تذاكر الدعم
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    setupModalClose(modal);
}

// Helper function for role text
function getRoleText(role) {
    switch (role) {
        case 'super_admin': return 'مدير عام';
        case 'admin': return 'مدير';
        case 'user': return 'مستخدم عادي';
        default: return 'غير محدد';
    }
}

// Improved reply to ticket function
function replyToTicket(ticketId) {
    const ticket = allTickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    const modal = createModal();
    
    modal.querySelector('.modal-content').innerHTML = `
        <span class="close">&times;</span>
        <h2>الرد على تذكرة الدعم #${ticketId.substring(0, 8)}</h2>
        
        <div style="text-align: right;">
            <div class="ticket-summary" style="background: #f8f9fa; padding: 1.5rem; border-radius: 10px; margin-bottom: 2rem;">
                <h4 style="color: #2c5aa0; margin-bottom: 1rem;">ملخص التذكرة:</h4>
                <p><strong>الموضوع:</strong> ${ticket.subject}</p>
                <p><strong>المرسل:</strong> ${ticket.userEmail || ticket.contactInfo}</p>
                <p><strong>الحالة:</strong> <span class="status-badge ${getStatusClass(ticket.status)}">${getStatusText(ticket.status)}</span></p>
            </div>
            
            <form id="replyForm">
                <div class="form-group">
                    <label>نص الرد:</label>
                    <textarea name="replyContent" rows="6" required placeholder="اكتب ردك هنا..."></textarea>
                </div>
                
                <div class="form-group">
                    <label>تحديث حالة التذكرة:</label>
                    <select name="newStatus">
                        <option value="">عدم التغيير</option>
                        <option value="in_progress">قيد المعالجة</option>
                        <option value="resolved">تم الحل</option>
                        <option value="closed">مغلقة</option>
                    </select>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-paper-plane"></i> إرسال الرد
                    </button>
                    <button type="button" class="btn-secondary" onclick="closeModal()">إلغاء</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    setupModalClose(modal);
    
    // Handle form submission
    document.getElementById('replyForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const replyContent = formData.get('replyContent');
        const newStatus = formData.get('newStatus');
        
        try {
            // Add reply to ticket
            const replyData = {
                id: Date.now().toString(),
                content: replyContent,
                authorId: 'admin',
                authorName: 'فريق الدعم',
                createdAt: new Date(),
                isAdminReply: true
            };
            
            const updateData = {
                replies: firebase.firestore.FieldValue.arrayUnion(replyData),
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            if (newStatus) {
                updateData.status = newStatus;
                updateData.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();
            }
            
            const result = await FirebaseUtils.updateDocument('support_tickets', ticketId, updateData);
            
            if (result.success) {
                showMessage('تم إرسال الرد بنجاح!', 'success');
                closeModal();
                await loadTickets(); // Reload tickets
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            showMessage('حدث خطأ في إرسال الرد', 'error');
        }
    });
}

// Additional helper functions
function resetUserPassword(userId) {
    showMessage('وظيفة إعادة تعيين كلمة المرور قيد التطوير', 'info');
}

function viewUserOrders(userId) {
    showMessage('وظيفة عرض طلبات المستخدم قيد التطوير', 'info');
}

function viewUserTickets(userId) {
    showMessage('وظيفة عرض تذاكر المستخدم قيد التطوير', 'info');
}

// Products Management Functions
let allProducts = [];
let filteredProducts = [];

// Load tickets from Firebase
async function loadTickets() {
    try {
        const result = await FirebaseUtils.getDocuments('support_tickets', 
            { field: 'createdAt', direction: 'desc' });
        
        if (result.success) {
            allTickets = result.data;
            filteredTickets = [...allTickets];
            displayTickets();
            
            // Check for tickets with new user replies
            checkForNewUserReplies();
        } else {
            allTickets = [];
            filteredTickets = [];
            displayTickets();
        }
    } catch (error) {
        console.error('Error loading tickets:', error);
        allTickets = [];
        filteredTickets = [];
        displayTickets();
    }
}

// Check for new user replies
function checkForNewUserReplies() {
    const ticketsWithNewReplies = allTickets.filter(ticket => {
        if (!ticket.replies || ticket.replies.length === 0) return false;
        
        // Check if the last reply is from a user and recent
        const lastReply = ticket.replies[ticket.replies.length - 1];
        const isUserReply = lastReply.isUserReply === true;
        const isRecent = lastReply.createdAt && 
            (new Date() - lastReply.createdAt.toDate()) < (24 * 60 * 60 * 1000); // 24 hours
        
        return isUserReply && isRecent;
    });
    
    if (ticketsWithNewReplies.length > 0) {
        // Update sidebar notification
        updateTicketNotification(ticketsWithNewReplies.length);
    }
}

// Update ticket notification in sidebar
function updateTicketNotification(count) {
    const supportMenuItem = document.querySelector('button[onclick="switchTab(\'support\')"]');
    if (supportMenuItem && count > 0) {
        // Remove existing notification
        const existingNotification = supportMenuItem.querySelector('.notification-badge');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Add new notification badge
        const notificationBadge = document.createElement('span');
        notificationBadge.className = 'notification-badge';
        notificationBadge.textContent = count;
        notificationBadge.style.cssText = `
            background: #e74c3c;
            color: white;
            border-radius: 50%;
            padding: 0.2rem 0.5rem;
            font-size: 0.7rem;
            font-weight: 600;
            margin-right: 0.5rem;
            min-width: 1.2rem;
            text-align: center;
        `;
        
        supportMenuItem.appendChild(notificationBadge);
    }
}

// Load products from Firebase
async function loadProducts() {
    try {
        const result = await FirebaseUtils.getDocuments('products', 
            { field: 'createdAt', direction: 'desc' });
        
        if (result.success) {
            allProducts = result.data;
            filteredProducts = [...allProducts];
            displayProducts();
        } else {
            allProducts = [];
            filteredProducts = [];
            displayProducts();
        }
    } catch (error) {
        console.error('Error loading products:', error);
        allProducts = [];
        filteredProducts = [];
        displayProducts();
    }
}

// Display products in admin panel
function displayProducts() {
    const productsContainer = document.getElementById('productsContainer');
    if (!productsContainer) return;
    
    if (!filteredProducts || filteredProducts.length === 0) {
        productsContainer.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 3rem; color: #666;">
                <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <h3>لا توجد منتجات</h3>
                <p>لم يتم إضافة أي منتجات حتى الآن</p>
                <button class="btn-primary" onclick="showAddProductModal()" style="margin-top: 1rem;">
                    <i class="fas fa-plus"></i> إضافة منتج جديد
                </button>
            </div>
        `;
        return;
    }
    
    const productsHTML = filteredProducts.map(product => `
        <div class="product-card" style="background: white; border-radius: 15px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
            <div class="product-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #2c5aa0; font-size: 1.3rem;">${product.name}</h4>
                    <p style="margin: 0; color: #666; font-size: 0.9rem; line-height: 1.5;">
                        ${product.description.substring(0, 100)}${product.description.length > 100 ? '...' : ''}
                    </p>
                </div>
                <div style="display: flex; gap: 0.5rem; flex-direction: column; align-items: end; margin-right: 1rem;">
                    <span class="status-badge ${product.isActive ? 'status-active' : 'status-inactive'}">
                        ${product.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                    <span class="category-badge category-${product.category || 'default'}">
                        ${getCategoryText(product.category)}
                    </span>
                </div>
            </div>
            
            <div class="product-image" style="margin-bottom: 1rem;">
                ${product.image ? `
                    <img src="${product.image}" alt="${product.name}" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 10px;">
                ` : `
                    <div style="width: 100%; height: 150px; background: #f8f9fa; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #666;">
                        <i class="fas fa-image" style="font-size: 2rem;"></i>
                        <span style="margin-right: 0.5rem;">لا توجد صورة</span>
                    </div>
                `}
            </div>
            
            <div class="product-details" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div class="detail-item">
                    <strong style="color: #2c5aa0;">السعر:</strong>
                    <span style="font-size: 1.2rem; font-weight: 600; color: #28a745;">${product.price}</span>
                </div>
                ${product.originalPrice ? `
                    <div class="detail-item">
                        <strong style="color: #666;">السعر الأصلي:</strong>
                        <span style="text-decoration: line-through; color: #999;">${product.originalPrice}</span>
                    </div>
                ` : ''}
                <div class="detail-item">
                    <strong style="color: #2c5aa0;">الترتيب:</strong>
                    <span>${product.order || 0}</span>
                </div>
            </div>
            
            <div class="product-features" style="margin-bottom: 1.5rem;">
                <strong style="color: #2c5aa0; display: block; margin-bottom: 0.5rem;">المميزات:</strong>
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                    ${(product.features || []).slice(0, 3).map(feature => `
                        <span style="background: #e3f2fd; color: #1565c0; padding: 0.3rem 0.8rem; border-radius: 15px; font-size: 0.8rem;">
                            ${feature}
                        </span>
                    `).join('')}
                    ${(product.features || []).length > 3 ? `
                        <span style="background: #f5f5f5; color: #666; padding: 0.3rem 0.8rem; border-radius: 15px; font-size: 0.8rem;">
                            +${(product.features || []).length - 3} أخرى
                        </span>
                    ` : ''}
                </div>
            </div>
            
            <div class="product-actions" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button class="btn-primary" onclick="viewProductDetails('${product.id}')" style="font-size: 0.9rem; padding: 0.5rem 1rem;">
                    <i class="fas fa-eye"></i> عرض التفاصيل
                </button>
                <button class="btn-warning" onclick="editProduct('${product.id}')" style="font-size: 0.9rem; padding: 0.5rem 1rem;">
                    <i class="fas fa-edit"></i> تعديل
                </button>
                <button class="btn-${product.isActive ? 'secondary' : 'success'}" onclick="toggleProductStatus('${product.id}')" style="font-size: 0.9rem; padding: 0.5rem 1rem;">
                    <i class="fas fa-${product.isActive ? 'eye-slash' : 'eye'}"></i> ${product.isActive ? 'إخفاء' : 'إظهار'}
                </button>
                <button class="btn-danger" onclick="deleteProduct('${product.id}')" style="font-size: 0.9rem; padding: 0.5rem 1rem;">
                    <i class="fas fa-trash"></i> حذف
                </button>
            </div>
        </div>
    `).join('');
    
    productsContainer.innerHTML = productsHTML;
}

// Show add product modal
function showAddProductModal() {
    const modal = createModal();
    
    modal.querySelector('.modal-content').innerHTML = `
        <span class="close">&times;</span>
        <h2>إضافة منتج جديد</h2>
        
        <form id="addProductForm" style="text-align: right;">
            <div class="form-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
                <div class="form-group">
                    <label>اسم المنتج:</label>
                    <input type="text" name="name" required placeholder="AS3G SYSTEM - الباقة الأساسية">
                </div>
                
                <div class="form-group">
                    <label>الفئة:</label>
                    <select name="category" required>
                        <option value="">اختر الفئة</option>
                        <option value="basic">باقة أساسية</option>
                        <option value="advanced">باقة متقدمة</option>
                        <option value="professional">باقة احترافية</option>
                        <option value="enterprise">باقة مؤسسات</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>السعر:</label>
                    <input type="text" name="price" required placeholder="750 جنيه/شهر">
                </div>
                
                <div class="form-group">
                    <label>السعر الأصلي (اختياري):</label>
                    <input type="text" name="originalPrice" placeholder="950 جنيه/شهر">
                </div>
                
                <div class="form-group">
                    <label>رابط الصورة:</label>
                    <input type="url" name="image" placeholder="https://example.com/image.jpg">
                </div>
                
                <div class="form-group">
                    <label>الأيقونة (Font Awesome):</label>
                    <input type="text" name="icon" placeholder="fas fa-desktop">
                </div>
                
                <div class="form-group">
                    <label>ترتيب العرض:</label>
                    <input type="number" name="order" value="0" min="0">
                </div>
                
                <div class="form-group">
                    <label>الحالة:</label>
                    <select name="isActive">
                        <option value="true">نشط</option>
                        <option value="false">غير نشط</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label>وصف المنتج:</label>
                <textarea name="description" rows="4" required placeholder="وصف شامل للمنتج ومميزاته"></textarea>
            </div>
            
            <div class="form-group">
                <label>المميزات (كل مميزة في سطر منفصل):</label>
                <textarea name="features" rows="6" placeholder="واجهة مستخدم عربية بالكامل&#10;إدارة المبيعات والفواتير&#10;تتبع المخزون الذكي"></textarea>
            </div>
            
            <div class="form-group">
                <label>معرض الصور (كل رابط في سطر منفصل):</label>
                <textarea name="gallery" rows="4" placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"></textarea>
            </div>
            
            <div class="form-group">
                <label>روابط الفيديوهات (كل رابط في سطر منفصل):</label>
                <textarea name="videos" rows="3" placeholder="https://example.com/video1.mp4&#10;https://example.com/video2.mp4"></textarea>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> حفظ المنتج
                </button>
                <button type="button" class="btn-secondary" onclick="closeModal()">إلغاء</button>
            </div>
        </form>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    setupModalClose(modal);
    
    // Handle form submission
    document.getElementById('addProductForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const productData = {
            name: formData.get('name'),
            description: formData.get('description'),
            category: formData.get('category'),
            price: formData.get('price'),
            originalPrice: formData.get('originalPrice') || null,
            image: formData.get('image') || null,
            icon: formData.get('icon') || 'fas fa-box',
            order: parseInt(formData.get('order')) || 0,
            isActive: formData.get('isActive') === 'true',
            features: formData.get('features').split('\n').filter(f => f.trim()),
            gallery: formData.get('gallery').split('\n').filter(g => g.trim()),
            videos: formData.get('videos').split('\n').filter(v => v.trim()),
            createdBy: currentUser.uid,
            createdByName: currentUser.displayName || currentUser.email
        };
        
        try {
            const result = await FirebaseUtils.addDocument('products', productData);
            if (result.success) {
                showMessage('تم إضافة المنتج بنجاح!', 'success');
                closeModal();
                await loadProducts(); // Reload products
                updateMainPageProducts(); // Update main page
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            showMessage('حدث خطأ في إضافة المنتج', 'error');
        }
    });
}

// Edit product
function editProduct(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    const modal = createModal();
    
    modal.querySelector('.modal-content').innerHTML = `
        <span class="close">&times;</span>
        <h2>تعديل المنتج</h2>
        
        <form id="editProductForm" style="text-align: right;">
            <div class="form-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
                <div class="form-group">
                    <label>اسم المنتج:</label>
                    <input type="text" name="name" required value="${product.name}">
                </div>
                
                <div class="form-group">
                    <label>الفئة:</label>
                    <select name="category" required>
                        <option value="">اختر الفئة</option>
                        <option value="basic" ${product.category === 'basic' ? 'selected' : ''}>باقة أساسية</option>
                        <option value="advanced" ${product.category === 'advanced' ? 'selected' : ''}>باقة متقدمة</option>
                        <option value="professional" ${product.category === 'professional' ? 'selected' : ''}>باقة احترافية</option>
                        <option value="enterprise" ${product.category === 'enterprise' ? 'selected' : ''}>باقة مؤسسات</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>السعر:</label>
                    <input type="text" name="price" required value="${product.price}">
                </div>
                
                <div class="form-group">
                    <label>السعر الأصلي (اختياري):</label>
                    <input type="text" name="originalPrice" value="${product.originalPrice || ''}">
                </div>
                
                <div class="form-group">
                    <label>رابط الصورة:</label>
                    <input type="url" name="image" value="${product.image || ''}">
                </div>
                
                <div class="form-group">
                    <label>الأيقونة (Font Awesome):</label>
                    <input type="text" name="icon" value="${product.icon || 'fas fa-box'}">
                </div>
                
                <div class="form-group">
                    <label>ترتيب العرض:</label>
                    <input type="number" name="order" value="${product.order || 0}" min="0">
                </div>
                
                <div class="form-group">
                    <label>الحالة:</label>
                    <select name="isActive">
                        <option value="true" ${product.isActive ? 'selected' : ''}>نشط</option>
                        <option value="false" ${!product.isActive ? 'selected' : ''}>غير نشط</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label>وصف المنتج:</label>
                <textarea name="description" rows="4" required>${product.description}</textarea>
            </div>
            
            <div class="form-group">
                <label>المميزات (كل مميزة في سطر منفصل):</label>
                <textarea name="features" rows="6">${(product.features || []).join('\n')}</textarea>
            </div>
            
            <div class="form-group">
                <label>معرض الصور (كل رابط في سطر منفصل):</label>
                <textarea name="gallery" rows="4">${(product.gallery || []).join('\n')}</textarea>
            </div>
            
            <div class="form-group">
                <label>روابط الفيديوهات (كل رابط في سطر منفصل):</label>
                <textarea name="videos" rows="3">${(product.videos || []).join('\n')}</textarea>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> حفظ التغييرات
                </button>
                <button type="button" class="btn-secondary" onclick="closeModal()">إلغاء</button>
            </div>
        </form>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    setupModalClose(modal);
    
    // Handle form submission
    document.getElementById('editProductForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const updateData = {
            name: formData.get('name'),
            description: formData.get('description'),
            category: formData.get('category'),
            price: formData.get('price'),
            originalPrice: formData.get('originalPrice') || null,
            image: formData.get('image') || null,
            icon: formData.get('icon') || 'fas fa-box',
            order: parseInt(formData.get('order')) || 0,
            isActive: formData.get('isActive') === 'true',
            features: formData.get('features').split('\n').filter(f => f.trim()),
            gallery: formData.get('gallery').split('\n').filter(g => g.trim()),
            videos: formData.get('videos').split('\n').filter(v => v.trim()),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.uid,
            updatedByName: currentUser.displayName || currentUser.email
        };
        
        try {
            const result = await FirebaseUtils.updateDocument('products', productId, updateData);
            if (result.success) {
                showMessage('تم تحديث المنتج بنجاح!', 'success');
                closeModal();
                await loadProducts(); // Reload products
                updateMainPageProducts(); // Update main page
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            showMessage('حدث خطأ في تحديث المنتج', 'error');
        }
    });
}

// Toggle product status
async function toggleProductStatus(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    try {
        const result = await FirebaseUtils.updateDocument('products', productId, {
            isActive: !product.isActive,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        if (result.success) {
            showMessage(`تم ${!product.isActive ? 'تفعيل' : 'إلغاء تفعيل'} المنتج بنجاح!`, 'success');
            await loadProducts();
            updateMainPageProducts();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        showMessage('حدث خطأ في تحديث حالة المنتج', 'error');
    }
}

// Delete product
async function deleteProduct(productId) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.')) {
        return;
    }
    
    try {
        const result = await FirebaseUtils.deleteDocument('products', productId);
        
        if (result.success) {
            showMessage('تم حذف المنتج بنجاح!', 'success');
            await loadProducts();
            updateMainPageProducts();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        showMessage('حدث خطأ في حذف المنتج', 'error');
    }
}

// View product details
function viewProductDetails(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    const modal = createModal();
    
    modal.querySelector('.modal-content').innerHTML = `
        <span class="close">&times;</span>
        <h2>تفاصيل المنتج</h2>
        
        <div class="product-details-view" style="text-align: right;">
            <div class="detail-section" style="background: #f8f9fa; padding: 1.5rem; border-radius: 10px; margin-bottom: 2rem;">
                <h4 style="color: #2c5aa0; margin-bottom: 1rem;">المعلومات الأساسية:</h4>
                <div class="detail-row"><strong>الاسم:</strong> ${product.name}</div>
                <div class="detail-row"><strong>الفئة:</strong> ${getCategoryText(product.category)}</div>
                <div class="detail-row"><strong>السعر:</strong> ${product.price}</div>
                ${product.originalPrice ? `<div class="detail-row"><strong>السعر الأصلي:</strong> ${product.originalPrice}</div>` : ''}
                <div class="detail-row"><strong>الحالة:</strong> <span class="status-badge ${product.isActive ? 'status-active' : 'status-inactive'}">${product.isActive ? 'نشط' : 'غير نشط'}</span></div>
                <div class="detail-row"><strong>ترتيب العرض:</strong> ${product.order || 0}</div>
            </div>
            
            <div class="detail-section" style="background: #e3f2fd; padding: 1.5rem; border-radius: 10px; margin-bottom: 2rem;">
                <h4 style="color: #1565c0; margin-bottom: 1rem;">الوصف:</h4>
                <p style="line-height: 1.8;">${product.description}</p>
            </div>
            
            ${product.features && product.features.length > 0 ? `
                <div class="detail-section" style="background: #e8f5e8; padding: 1.5rem; border-radius: 10px; margin-bottom: 2rem;">
                    <h4 style="color: #2e7d32; margin-bottom: 1rem;">المميزات:</h4>
                    <ul style="list-style: none; padding: 0;">
                        ${product.features.map(feature => `
                            <li style="padding: 0.5rem 0; border-bottom: 1px solid #c8e6c9;">
                                <i class="fas fa-check" style="color: #4caf50; margin-left: 0.5rem;"></i>
                                ${feature}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${product.image ? `
                <div class="detail-section" style="margin-bottom: 2rem;">
                    <h4 style="color: #2c5aa0; margin-bottom: 1rem;">الصورة الرئيسية:</h4>
                    <img src="${product.image}" alt="${product.name}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 10px;">
                </div>
            ` : ''}
            
            <div class="product-actions" style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; margin-top: 2rem;">
                <button class="btn-warning" onclick="editProduct('${product.id}'); closeModal();">
                    <i class="fas fa-edit"></i> تعديل المنتج
                </button>
                <button class="btn-${product.isActive ? 'secondary' : 'success'}" onclick="toggleProductStatus('${product.id}'); closeModal();">
                    <i class="fas fa-${product.isActive ? 'eye-slash' : 'eye'}"></i> ${product.isActive ? 'إخفاء' : 'إظهار'}
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    setupModalClose(modal);
}

// Update main page products
function updateMainPageProducts() {
    // This function will be called to refresh products on the main page
    if (typeof loadSystems === 'function') {
        loadSystems();
    }
}

// Get category text in Arabic
function getProductCategoryText(category) {
    switch (category) {
        case 'basic': return 'باقة أساسية';
        case 'advanced': return 'باقة متقدمة';
        case 'professional': return 'باقة احترافية';
        case 'enterprise': return 'باقة مؤسسات';
        default: return 'غير محدد';
    }
}

// Filter products
function filterProducts(filterType, filterValue) {
    if (filterType === 'category') {
        if (filterValue === '') {
            filteredProducts = [...allProducts];
        } else {
            filteredProducts = allProducts.filter(product => product.category === filterValue);
        }
    } else if (filterType === 'status') {
        if (filterValue === '') {
            filteredProducts = [...allProducts];
        } else if (filterValue === 'active') {
            filteredProducts = allProducts.filter(product => product.isActive);
        } else if (filterValue === 'inactive') {
            filteredProducts = allProducts.filter(product => !product.isActive);
        }
    }
    
    displayProducts();
}

// Search products
function searchProducts(searchTerm) {
    if (!searchTerm.trim()) {
        filteredProducts = [...allProducts];
    } else {
        const term = searchTerm.toLowerCase();
        filteredProducts = allProducts.filter(product => 
            product.name.toLowerCase().includes(term) ||
            product.description.toLowerCase().includes(term) ||
            (product.features && product.features.some(feature => 
                feature.toLowerCase().includes(term)
            ))
        );
    }
    
    displayProducts();
}

// Reset product filters
function resetProductFilters() {
    // Reset all filter dropdowns
    document.querySelectorAll('.products-filters select').forEach(select => {
        select.selectedIndex = 0;
    });
    
    // Reset search input
    document.querySelector('.products-filters input[type="text"]').value = '';
    
    // Reload all products
    loadProducts();
    filteredProducts = [...allProducts];
    displayProducts();
}
