const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const fs = require('fs'); // 引入檔案系統模組

const app = express();

// ==========================================
// 1. 基礎設定 (Config & Middleware)
// ==========================================

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'ande123', 
    resave: false, 
    saveUninitialized: false, 
    cookie: { maxAge: 86400000 } // 24小時
}));

// 🟢 [圖片上傳設定] 自動建立資料夾 + 絕對路徑
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('✅ 已自動建立 public/uploads 資料夾');
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // 使用絕對路徑
    },
    filename: (req, file, cb) => {
        // 處理檔名編碼並加上時間戳記
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// 資料庫連線
const db = mysql.createConnection({
    host: 'localhost', 
    user: 'root', 
    password: 'ande20040331',  // 請確認密碼
    database: 'dbtest'
});

db.connect(err => { 
    if (err) console.error('Database connection failed:', err); 
    else console.log('MySQL Connected...'); 
});

// Admin 權限檢查 Middleware
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') next();
    else res.status(403).json({ success: false, message: '權限不足' });
};


// ==========================================
// 2. 會員驗證 API
// ==========================================

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM Users WHERE email = ? AND password = ?', [email, password], (err, results) => {
        if (results && results.length > 0) {
            const user = results[0];
            req.session.user = { id: user.user_id, name: user.name, role: user.role, phone: user.phone };
            res.json({ success: true, role: user.role });
        } else res.json({ success: false, message: '帳號或密碼錯誤' });
    });
});

app.post('/api/register', (req, res) => {
    const { name, email, password, phone } = req.body;
    db.query('SELECT * FROM Users WHERE email = ?', [email], (err, results) => {
        if (results.length > 0) return res.json({ success: false, message: 'Email 已註冊' });
        db.query('INSERT INTO Users (name, email, password, phone, role) VALUES (?, ?, ?, ?, "buyer")', 
            [name, email, password, phone], (err) => {
                if(err) return res.status(500).json({success:false});
                res.json({ success: true });
            });
    });
});

app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });
app.get('/api/me', (req, res) => { res.json({ loggedIn: !!req.session.user, user: req.session.user }); });


// ==========================================
// 3. 車輛管理 API
// ==========================================

// 取得列表
app.get('/api/motorcycles', (req, res) => {
    const { category_id, license_id, year, sort } = req.query;
    let sql = `SELECT m.*, l.license_name, c.category_name FROM Motorcycle m 
               LEFT JOIN LicenseType l ON m.license_id = l.license_id 
               LEFT JOIN Category c ON m.category_id = c.category_id WHERE 1=1 `;
    const params = [];
    if (category_id) { sql += ' AND m.category_id = ?'; params.push(category_id); }
    if (license_id) { sql += ' AND m.license_id = ?'; params.push(license_id); }
    if (year) { sql += ' AND m.year = ?'; params.push(year); }
    
    if (sort === 'price_asc') sql += ' ORDER BY m.price ASC';
    else if (sort === 'price_desc') sql += ' ORDER BY m.price DESC';
    else if (sort === 'year_desc') sql += ' ORDER BY m.year DESC';
    else if (sort === 'year_asc') sql += ' ORDER BY m.year ASC';
    else sql += ' ORDER BY m.created_at DESC';

    db.query(sql, params, (err, results) => res.json(results));
});

// 🟢 [補回] 取得單一車輛 (預約頁面用)
app.get('/api/motorcycles/:id', (req, res) => {
    const sql = `SELECT m.*, l.license_name, c.category_name 
                 FROM Motorcycle m 
                 LEFT JOIN LicenseType l ON m.license_id = l.license_id 
                 LEFT JOIN Category c ON m.category_id = c.category_id 
                 WHERE m.moto_id = ?`;
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.json({});
        res.json(results[0]);
    });
});

// [Admin] 取得單一車輛
app.get('/api/admin/motorcycles/:id', checkAdmin, (req, res) => {
    db.query('SELECT * FROM Motorcycle WHERE moto_id = ?', [req.params.id], (err, results) => res.json(results[0]));
});

// [Admin] 新增車輛
app.post('/api/admin/motorcycles', checkAdmin, upload.single('image'), (req, res) => {
    const { brand, model, price, license_id, category_id, year, mileage, description } = req.body;
    const img = req.file ? `/uploads/${req.file.filename}` : '';
    // 如果沒有 seller_id 欄位，請移除 sql 中的 seller_id
    db.query('INSERT INTO Motorcycle (brand, model, price, license_id, category_id, seller_id, year, mileage, image_url, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [brand, model, price, license_id, category_id, req.session.user.id, year, mileage, img, description], 
        (err) => {
            if(err) return res.status(500).json({success:false, message: err.message});
            res.json({ success: true });
        });
});

// [Admin] 修改車輛
app.put('/api/admin/motorcycles/:id', checkAdmin, upload.single('image'), (req, res) => {
    const { brand, model, price, license_id, category_id, year, mileage, description } = req.body;
    let sql = 'UPDATE Motorcycle SET brand=?, model=?, price=?, license_id=?, category_id=?, year=?, mileage=?, description=? WHERE moto_id=?';
    let params = [brand, model, price, license_id, category_id, year, mileage, description, req.params.id];
    
    if (req.file) {
        sql = 'UPDATE Motorcycle SET brand=?, model=?, price=?, license_id=?, category_id=?, year=?, mileage=?, description=?, image_url=? WHERE moto_id=?';
        params.splice(8, 0, `/uploads/${req.file.filename}`);
    }
    db.query(sql, params, (err) => {
        if(err) return res.status(500).json({success:false});
        res.json({ success: true });
    });
});

// [Admin] 修改狀態
app.put('/api/admin/motorcycles/:id/status', checkAdmin, (req, res) => {
    db.query('UPDATE Motorcycle SET status = ? WHERE moto_id = ?', [req.body.status, req.params.id], (err) => res.json({ success: true }));
});

// [Admin] 刪除
app.delete('/api/admin/motorcycles/:id', checkAdmin, (req, res) => {
    db.query('DELETE FROM Motorcycle WHERE moto_id = ?', [req.params.id], (err) => res.json({ success: true }));
});

// [Admin] 取得可換車輛
app.get('/api/admin/available-cars', checkAdmin, (req, res) => {
    db.query("SELECT moto_id, brand, model FROM Motorcycle WHERE status = 'available'", (err, results) => res.json(results));
});


// ==========================================
// 4. 預約系統 API
// ==========================================

// [Buyer] 新增預約
app.post('/api/reservations', (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: '請先登入' });
    const { moto_id, reserve_time, note } = req.body;
    
    db.query('INSERT INTO Reservation (moto_id, buyer_id, reserve_time, status, msg_status, last_msg_at) VALUES (?, ?, ?, "pending", "unread", NOW())',
        [moto_id, req.session.user.id, reserve_time], (err, result) => {
            if (err) return res.status(500).json({ success: false });
            if (note) {
                db.query('INSERT INTO Messages (reserve_id, sender_role, content) VALUES (?, "buyer", ?)', [result.insertId, note]);
            }
            res.json({ success: true });
        });
});

// [Buyer] 取得列表
app.get('/api/my/reservations', (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false });
    const sql = `SELECT r.*, m.brand, m.model, m.image_url FROM Reservation r JOIN Motorcycle m ON r.moto_id = m.moto_id WHERE r.buyer_id = ? ORDER BY r.reserve_time DESC`;
    db.query(sql, [req.session.user.id], (err, results) => res.json(results));
});

// 🟢 [補回] [Buyer] 取消預約 (解決 Cannot PUT 錯誤)
app.put('/api/my/reservations/:id/cancel', (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false });
    const sql = "UPDATE Reservation SET status = 'canceled' WHERE reserve_id = ? AND buyer_id = ? AND status = 'pending'";
    db.query(sql, [req.params.id, req.session.user.id], (err, result) => {
        if (err) return res.status(500).json({ success: false });
        if (result.affectedRows === 0) return res.json({ success: false, message: '取消失敗，可能狀態已變更' });
        res.json({ success: true });
    });
});

// 🟢 [Buyer] 修改預約 (含換車)
app.put('/api/my/reservations/:id', (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false });
    const { reserve_time, note, moto_id } = req.body;
    const buyer_id = req.session.user.id;
    const reserve_id = req.params.id;

    db.query("SELECT status FROM Reservation WHERE reserve_id = ? AND buyer_id = ?", [reserve_id, buyer_id], (err, results) => {
        if (results.length === 0) return res.json({ success: false, message: '找不到預約' });
        const status = results[0].status;
        
        if (status === 'pending') {
            const sql = "UPDATE Reservation SET reserve_time = ?, note = ?, moto_id = ?, msg_status = 'unread' WHERE reserve_id = ?";
            db.query(sql, [reserve_time, note, moto_id, reserve_id], (err) => res.json({ success: true }));
        } else if (status === 'confirmed') {
            db.query("UPDATE Reservation SET note = ?, msg_status = 'unread' WHERE reserve_id = ?", [note, reserve_id], (err) => res.json({ success: true }));
        } else {
            res.json({ success: false, message: '此狀態無法修改' });
        }
    });
});

// [Admin] 預約列表 (儀表板)
app.get('/api/admin/reservations', checkAdmin, (req, res) => {
    const { date } = req.query;
    let sql = `
        SELECT r.*, m.brand, m.model, m.image_url, u.name as buyer_name, u.phone, u.email
        FROM Reservation r
        JOIN Motorcycle m ON r.moto_id = m.moto_id
        JOIN Users u ON r.buyer_id = u.user_id
        WHERE 1=1
    `;
    const params = [];
    if (date) { sql += ' AND DATE(r.reserve_time) = ?'; params.push(date); }
    sql += ' ORDER BY (r.msg_status = "unread") DESC, r.last_msg_at DESC, r.reserve_time ASC';
    db.query(sql, params, (err, results) => res.json(results));
});

// [Admin] 單筆預約
app.get('/api/admin/reservations/:id', checkAdmin, (req, res) => {
    const sql = `SELECT r.*, m.brand, m.model, u.name as buyer_name FROM Reservation r JOIN Motorcycle m ON r.moto_id = m.moto_id JOIN Users u ON r.buyer_id = u.user_id WHERE r.reserve_id = ?`;
    db.query(sql, [req.params.id], (err, results) => res.json(results[0]));
});

// [Admin] 修改預約
app.put('/api/admin/reservations/:id', checkAdmin, (req, res) => {
    const { moto_id, reserve_time, status } = req.body;
    const sql = 'UPDATE Reservation SET moto_id = ?, reserve_time = ?, status = ? WHERE reserve_id = ?';
    db.query(sql, [moto_id, reserve_time, status, req.params.id], (err) => {
        if(err) return res.status(500).json({success:false});
        res.json({ success: true });
    });
});

// [Admin] 標示已讀
app.put('/api/admin/reservations/:id/handle', checkAdmin, (req, res) => {
    db.query("UPDATE Reservation SET msg_status = 'handled' WHERE reserve_id = ?", [req.params.id], (err) => res.json({ success: true }));
});

// [Admin] 刪除
app.delete('/api/admin/reservations/:id', checkAdmin, (req, res) => {
    db.query('DELETE FROM Reservation WHERE reserve_id = ?', [req.params.id], (err) => res.json({ success: true }));
});


// ==========================================
// 5. 聊天室 API
// ==========================================

app.get('/api/reservations/:id/messages', (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false });
    const sql = `SELECT * FROM Messages WHERE reserve_id = ? ORDER BY created_at ASC`;
    db.query(sql, [req.params.id], (err, results) => res.json(results));
});

app.post('/api/reservations/:id/messages', (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false });
    const reserve_id = req.params.id;
    const { content } = req.body;
    const sender_role = req.session.user.role;

    if (!content) return res.status(400).json({ success: false });

    db.query('INSERT INTO Messages (reserve_id, sender_role, content) VALUES (?, ?, ?)', 
    [reserve_id, sender_role, content], (err) => {
        if (err) return res.status(500).json({ success: false });
        let updateSql = 'UPDATE Reservation SET last_msg_at = NOW()';
        if (sender_role === 'buyer') updateSql += ', msg_status = "unread"';
        else updateSql += ', msg_status = "handled"';
        updateSql += ' WHERE reserve_id = ?';
        db.query(updateSql, [reserve_id], () => res.json({ success: true }));
    });
});

app.listen(3000, () => {
    console.log('伺服器執行中: http://localhost:3000');
});