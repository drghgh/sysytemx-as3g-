// Support page JavaScript
let currentUser = null;
let userTickets = [];

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication state
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await loadUserTickets();
        } else {
            // Show login prompt for non-authenticated users
            showLoginPrompt();
        }
    });

    // Handle support form submission
    const supportForm = document.getElementById('supportForm');
    if (supportForm) {
        supportForm.addEventListener('submit', handleSupportSubmission);
    }
});

// Select priority option
function selectPriority(priority, element) {
    // Remove selected class from all options
    document.querySelectorAll('.priority-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Add selected class to clicked option
    element.classList.add('selected');
    
    // Update hidden input value
    document.getElementById('ticketPriority').value = priority;
}

// Handle support form submission
async function handleSupportSubmission(e) {
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
    
    const ticketData = {
        subject: formData.get('subject'),
        message: formData.get('description'),
        category: formData.get('category') || 'other',
        priority: formData.get('priority'),
        contactInfo: formData.get('contactInfo'),
        status: 'open',
        userId: currentUser ? currentUser.uid : null,
        userEmail: currentUser ? currentUser.email : null,
        replies: []
    };
    
    try {
        const result = await FirebaseUtils.addDocument('support_tickets', ticketData);
        
        if (result.success) {
            showMessage('تم إرسال تذكرة الدعم بنجاح! سيتم الرد عليك قريباً.', 'success');
            form.reset();
            // Reset priority to medium
            selectPriority('medium', document.querySelector('.priority-medium'));
            
            // Reload tickets if user is authenticated
            if (currentUser) {
                await loadUserTickets();
            }
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error submitting support ticket:', error);
        showMessage('حدث خطأ في إرسال تذكرة الدعم. يرجى المحاولة مرة أخرى.', 'error');
    } finally {
        // Reset button state
        btnText.style.display = 'inline';
        loading.style.display = 'none';
        submitBtn.disabled = false;
    }
}

// Load user tickets
async function loadUserTickets() {
    if (!currentUser) return;
    
    try {
        const result = await FirebaseUtils.getDocuments('support_tickets', 
            { field: 'createdAt', direction: 'desc' });
        
        if (result.success) {
            // Filter tickets for current user
            userTickets = result.data.filter(ticket => ticket.userId === currentUser.uid);
        } else {
            userTickets = [];
        }
        
        displayUserTickets();
    } catch (error) {
        console.error('Error loading user tickets:', error);
        userTickets = [];
        displayUserTickets();
    }
}

// Display user tickets
function displayUserTickets() {
    const ticketsList = document.getElementById('ticketsList');
    
    if (userTickets.length === 0) {
        ticketsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-ticket-alt"></i>
                <h3>لا توجد تذاكر دعم</h3>
                <p>لم تقم بإنشاء أي تذاكر دعم حتى الآن</p>
            </div>
        `;
        return;
    }
    
    const ticketsHTML = userTickets.map(ticket => {
        const statusClass = getTicketStatusClass(ticket.status);
        const statusText = getTicketStatusText(ticket.status);
        const priorityClass = getPriorityBadgeClass(ticket.priority);
        const priorityText = getPriorityText(ticket.priority);
        
        const repliesHTML = ticket.replies && ticket.replies.length > 0 ? 
            `<div class="ticket-replies">
                <h4 style="margin-bottom: 1rem; color: #2c5aa0;">الردود:</h4>
                ${ticket.replies.map(reply => `
                    <div class="reply-item ${reply.authorId === currentUser?.uid ? 'user-reply' : 'support-reply'}">
                        <div class="reply-header">
                            <span class="reply-author">${reply.authorName || 'فريق الدعم'}</span>
                            <span class="reply-date">${reply.createdAt ? formatDateArabic(reply.createdAt.toDate()) : ''}</span>
                            ${reply.authorId === currentUser?.uid ? '<span class="reply-badge user-badge">أنت</span>' : '<span class="reply-badge support-badge">الدعم</span>'}
                        </div>
                        <div class="reply-content">${reply.content}</div>
                    </div>
                `).join('')}
            </div>` : '';
        
        return `
            <div class="ticket-card">
                <div class="ticket-header">
                    <span class="ticket-id">تذكرة #${ticket.id.substring(0, 8)}</span>
                    <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                        <span class="ticket-priority ${priorityClass}">${priorityText}</span>
                        <span class="ticket-status ${statusClass}">${statusText}</span>
                    </div>
                </div>
                
                <div class="ticket-content">
                    <p><strong>الموضوع:</strong> ${ticket.subject}</p>
                    <p><strong>الرسالة:</strong> ${ticket.message}</p>
                    <p><strong>الأولوية:</strong> <span class="${priorityClass}">${priorityText}</span></p>
                    <p><strong>الحالة:</strong> <span class="${statusClass}">${statusText}</span></p>
                    <p><strong>تاريخ الإنشاء:</strong> ${ticket.createdAt ? formatDateArabic(ticket.createdAt.toDate()) : 'غير محدد'}</p>
                    ${repliesHTML}
                    
                    ${ticket.status !== 'closed' ? `
                        <div class="ticket-actions" style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e9ecef;">
                            <button class="btn-primary" onclick="showReplyModal('${ticket.id}')" style="width: 100%;">
                                <i class="fas fa-reply"></i> رد على التذكرة
                            </button>
                        </div>
                    ` : `
                        <div class="ticket-closed-notice" style="margin-top: 1.5rem; padding: 1rem; background: #f8d7da; color: #721c24; border-radius: 8px; text-align: center;">
                            <i class="fas fa-lock"></i> هذه التذكرة مغلقة ولا يمكن الرد عليها
                        </div>
                    `}
                </div>
                
                ${ticket.contactInfo ? `<span>معلومات التواصل: ${ticket.contactInfo}</span>` : ''}
            </div>
        `;
    }).join('');
    
    ticketsList.innerHTML = ticketsHTML;
}

// Get ticket status CSS class
function getTicketStatusClass(status) {
    switch (status) {
        case 'open':
            return 'status-open';
        case 'in-progress':
            return 'status-in-progress';
        case 'resolved':
            return 'status-resolved';
        case 'closed':
            return 'status-closed';
        default:
            return 'status-open';
    }
}

// Get ticket status text in Arabic
function getTicketStatusText(status) {
    switch (status) {
        case 'open':
            return 'مفتوحة';
        case 'in-progress':
            return 'قيد المعالجة';
        case 'resolved':
            return 'تم الحل';
        case 'closed':
            return 'مغلقة';
        default:
            return 'مفتوحة';
    }
}

// Get priority badge CSS class
function getPriorityBadgeClass(priority) {
    switch (priority) {
        case 'high':
            return 'priority-high-badge';
        case 'medium':
            return 'priority-medium-badge';
        case 'low':
            return 'priority-low-badge';
        default:
            return 'priority-medium-badge';
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

// Show login prompt for non-authenticated users
function showLoginPrompt() {
    const ticketsList = document.getElementById('ticketsList');
    ticketsList.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-user-lock"></i>
            <h3>تسجيل الدخول مطلوب</h3>
            <p>يرجى تسجيل الدخول لعرض تذاكر الدعم الخاصة بك</p>
            <a href="login.html" class="btn-primary" style="margin-top: 1rem;">
                تسجيل الدخول
            </a>
        </div>
    `;
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
