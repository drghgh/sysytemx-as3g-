# AS3G SYSTEM - أنظمة الكاشير الذكية

موقع متكامل لعرض وبيع أنظمة الكاشير الذكية AS3G مع لوحة تحكم إدارية شاملة ومميزات متقدمة.

## المميزات

### للعملاء:
- عرض أنظمة الكاشير المختلفة مع الصور والفيديوهات
- طلب الاشتراك مع نموذج تفصيلي
- حساب شخصي لإدارة المعلومات والطلبات
- نظام دعم فني متكامل
- تسجيل دخول آمن

### للإدارة:
- لوحة تحكم شاملة
- إدارة الطلبات (قبول/رفض)
- إدارة المستخدمين والصلاحيات
- نظام الدعم الفني والرد على التذاكر
- إحصائيات مفصلة
- إدارة المحتوى والمنشورات

## التقنيات المستخدمة

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Firebase (Firestore, Authentication)
- **التصميم**: CSS Grid, Flexbox, Responsive Design
- **الخطوط**: Google Fonts (Cairo)
- **الأيقونات**: Font Awesome

## إعداد المشروع

### 1. إعداد Firebase

1. انتقل إلى [Firebase Console](https://console.firebase.google.com/)
2. أنشئ مشروع جديد
3. فعّل Authentication وحدد Email/Password
4. فعّل Firestore Database
5. احصل على بيانات التكوين من Project Settings

### 2. تكوين Firebase

افتح ملف `js/firebase-config.js` وأدخل بيانات مشروعك:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 3. إعداد قواعد Firestore

في Firebase Console، انتقل إلى Firestore Database > Rules وأدخل القواعد التالية:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super_admin'];
    }
    
    // Orders collection
    match /orders/{orderId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid ||
         exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super_admin']);
      allow update: if request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super_admin'];
    }
    
    // Support tickets collection
    match /support_tickets/{ticketId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid ||
         exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super_admin', 'support']);
      allow update: if request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super_admin', 'support'];
    }
    
    // Posts collection (for announcements)
    match /posts/{postId} {
      allow read: if true;
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super_admin'];
    }
  }
}
```

### 4. إنشاء حساب المدير الأول

1. سجّل حساب جديد من صفحة التسجيل
2. انتقل إلى Firestore في Firebase Console
3. ابحث عن المستخدم في collection `users`
4. أضف/عدّل حقل `role` إلى `super_admin`

### 5. تشغيل المشروع

يمكنك تشغيل المشروع بعدة طرق:

#### باستخدام Live Server (VS Code):
1. افتح المشروع في VS Code
2. ثبّت إضافة Live Server
3. انقر بزر الماوس الأيمن على `index.html`
4. اختر "Open with Live Server"

#### باستخدام Python:
```bash
# Python 3
python -m http.server 8000

# Python 2
python -SimpleHTTPServer 8000
```

#### باستخدام Node.js:
```bash
npx http-server
```

## هيكل المشروع

```
├── index.html              # الصفحة الرئيسية
├── login.html              # صفحة تسجيل الدخول
├── account.html            # صفحة حساب العميل
├── support.html            # صفحة الدعم الفني
├── admin.html              # لوحة تحكم الإدارة
├── css/
│   └── style.css           # ملف التنسيقات الرئيسي
├── js/
│   ├── firebase-config.js  # تكوين Firebase
│   ├── main.js             # الوظائف الرئيسية
│   ├── auth.js             # وظائف المصادقة
│   ├── account.js          # وظائف حساب العميل
│   ├── support.js          # وظائف الدعم الفني
│   └── admin.js            # وظائف لوحة الإدارة
├── images/                 # مجلد الصور
├── videos/                 # مجلد الفيديوهات
└── README.md              # هذا الملف
```

## الصفحات والوظائف

### الصفحة الرئيسية (`index.html`)
- عرض أنظمة الكاشير المتاحة
- تفاصيل كل نظام مع الصور والفيديوهات
- نموذج طلب الاشتراك
- قسم المميزات

### صفحة تسجيل الدخول (`login.html`)
- تسجيل الدخول للمستخدمين الحاليين
- إنشاء حساب جديد
- استعادة كلمة المرور

### صفحة الحساب (`account.html`)
- عرض وتعديل المعلومات الشخصية
- عرض الطلبات السابقة
- تغيير كلمة المرور

### صفحة الدعم الفني (`support.html`)
- إنشاء تذكرة دعم جديدة
- عرض تذاكر الدعم السابقة
- متابعة حالة التذاكر

### لوحة تحكم الإدارة (`admin.html`)
- إحصائيات شاملة
- إدارة الطلبات
- إدارة المستخدمين
- إدارة تذاكر الدعم
- إدارة المحتوى

## قاعدة البيانات (Firestore Collections)

### `users`
```javascript
{
  id: "user_id",
  name: "اسم المستخدم",
  email: "email@example.com",
  businessName: "اسم النشاط التجاري",
  phone: "رقم الهاتف",
  address: "العنوان",
  role: "customer|support|admin|super_admin",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### `orders`
```javascript
{
  id: "order_id",
  userId: "user_id",
  systemId: "system_id",
  systemName: "اسم النظام",
  systemPrice: "السعر",
  customerName: "اسم العميل",
  businessName: "اسم النشاط",
  phoneNumber: "رقم الهاتف",
  location: "العنوان",
  email: "البريد الإلكتروني",
  notes: "ملاحظات",
  status: "pending|approved|rejected",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### `support_tickets`
```javascript
{
  id: "ticket_id",
  userId: "user_id",
  userEmail: "email@example.com",
  subject: "موضوع التذكرة",
  description: "وصف المشكلة",
  priority: "low|medium|high",
  status: "open|in-progress|resolved|closed",
  contactInfo: "معلومات التواصل",
  replies: [
    {
      authorName: "اسم المؤلف",
      content: "محتوى الرد",
      createdAt: timestamp
    }
  ],
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## الأمان والصلاحيات

### أنواع المستخدمين:
- **customer**: عميل عادي (يمكنه طلب الأنظمة وإنشاء تذاكر دعم)
- **support**: دعم فني (يمكنه الرد على تذاكر الدعم)
- **admin**: مدير (يمكنه إدارة الطلبات والمستخدمين)
- **super_admin**: مدير عام (صلاحيات كاملة)

## التخصيص

### إضافة أنظمة جديدة:
عدّل مصفوفة `systemsData` في ملف `js/main.js`

### تخصيص الألوان:
عدّل متغيرات CSS في ملف `css/style.css`

### إضافة صفحات جديدة:
اتبع نفس هيكل الصفحات الموجودة وأضف الروابط في القائمة

## الدعم والمساعدة

للحصول على المساعدة أو الإبلاغ عن مشاكل:
1. تحقق من وحدة تحكم المتصفح للأخطاء
2. تأكد من صحة إعدادات Firebase
3. تحقق من قواعد Firestore

## الترخيص

هذا المشروع مفتوح المصدر ويمكن استخدامه وتعديله بحرية.
