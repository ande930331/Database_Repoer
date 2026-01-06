const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const multer = require('multer');

const app = express();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'ande123', resave: false, saveUninitialized: false, cookie: { maxAge: 86400000 }
}));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

const db = mysql.createConnection({
    host: 'localhost', user: 'root', password: 'ande20040331', database: 'dbtest'
});
db.connect(err => { if (err) console.error(err); else console.log('MySQL Connected...'); });

const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') next();
    else res.status(403).json({ success: false, message: '權限不足' });
};

// --- API ---

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
            [name, email, password, phone], (err) => res.json({ success: true }));
    });
});

app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });
app.get('/api/me', (req, res) => { res.json({ loggedIn: !!req.session.user, user: req.session.user }); });

// 車輛相關
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

app.get('/api/motorcycles/:id', (req, res) => {
    db.query('SELECT m.*, l.license_name FROM Motorcycle m LEFT JOIN LicenseType l ON m.license_id = l.license_id WHERE m.moto_id = ?', 
        [req.params.id], (err, results) => res.json(results[0]));
});

// Admin 車輛管理
app.get('/api/admin/motorcycles/:id', checkAdmin, (req, res) => {
    db.query('SELECT * FROM Motorcycle WHERE moto_id = ?', [req.params.id], (err, results) => res.json(results[0]));
});
app.post('/api/admin/motorcycles', checkAdmin, upload.single('image'), (req, res) => {
    const { brand, model, price, license_id, category_id, year, mileage, description } = req.body;
    const img = req.file ? `/uploads/${req.file.filename}` : '';
    db.query('INSERT INTO Motorcycle (brand, model, price, license_id, category_id, seller_id, year, mileage, image_url, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [brand, model, price, license_id, category_id, req.session.user.id, year, mileage, img, description], (err) => res.json({ success: true }));
});
app.put('/api/admin/motorcycles/:id', checkAdmin, upload.single('image'), (req, res) => {
    const { brand, model, price, license_id, category_id, year, mileage, description } = req.body;
    let sql = 'UPDATE Motorcycle SET brand=?, model=?, price=?, license_id=?, category_id=?, year=?, mileage=?, description=? WHERE moto_id=?';
    let params = [brand, model, price, license_id, category_id, year, mileage, description, req.params.id];
    if (req.file) {
        sql = 'UPDATE Motorcycle SET brand=?, model=?, price=?, license_id=?, category_id=?, year=?, mileage=?, description=?, image_url=? WHERE moto_id=?';
        params.splice(8, 0, `/uploads/${req.file.filename}`);
    }
    db.query(sql, params, (err) => res.json({ success: true }));
});
app.put('/api/admin/motorcycles/:id/status', checkAdmin, (req, res) => {
    db.query('UPDATE Motorcycle SET status = ? WHERE moto_id = ?', [req.body.status, req.params.id], (err) => res.json({ success: true }));
});
app.delete('/api/admin/motorcycles/:id', checkAdmin, (req, res) => {
    db.query('DELETE FROM Motorcycle WHERE moto_id = ?', [req.params.id], (err) => res.json({ success: true }));
});

// --- 預約系統 ---

// 買家新增預約
app.post('/api/reservations', (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: '請先登入' });
    const { moto_id, reserve_time, note } = req.body;
    db.query('INSERT INTO Reservation (moto_id, buyer_id, reserve_time, note, status) VALUES (?, ?, ?, ?, "pending")',
        [moto_id, req.session.user.id, reserve_time, note], (err) => {
            if (err) return res.status(500).json({ success: false });
            res.json({ success: true });
        });
});

// 買家查詢自己的預約
app.get('/api/my/reservations', (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false });
    const sql = `SELECT r.*, m.brand, m.model, m.image_url FROM Reservation r JOIN Motorcycle m ON r.moto_id = m.moto_id WHERE r.buyer_id = ? ORDER BY r.reserve_time DESC`;
    db.query(sql, [req.session.user.id], (err, results) => res.json(results));
});

// 🟢 [新功能] 買家修改預約 (改時間/備註)
// 🟢 [邏輯升級] 買家修改預約 (依狀態決定能改什麼)
app.put('/api/my/reservations/:id', (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false });
    
    const { reserve_time, note } = req.body;
    const buyer_id = req.session.user.id;
    const reserve_id = req.params.id;

    // 1. 先查詢目前的狀態
    const checkSql = "SELECT status FROM Reservation WHERE reserve_id = ? AND buyer_id = ?";
    db.query(checkSql, [reserve_id, buyer_id], (err, results) => {
        if (err) return res.status(500).json({ success: false });
        if (results.length === 0) return res.json({ success: false, message: '找不到預約' });

        const currentStatus = results[0].status;

        if (currentStatus === 'pending') {
            // A. 如果是待確認：時間、備註都可以改
            const sql = "UPDATE Reservation SET reserve_time = ?, note = ? WHERE reserve_id = ?";
            db.query(sql, [reserve_time, note, reserve_id], (err) => {
                if (err) return res.status(500).json({ success: false });
                res.json({ success: true, message: '修改成功！' });
            });

        } else if (currentStatus === 'confirmed') {
            // B. 如果是已確認：只准改備註 (時間鎖定)
            const sql = "UPDATE Reservation SET note = ? WHERE reserve_id = ?";
            db.query(sql, [note, reserve_id], (err) => {
                if (err) return res.status(500).json({ success: false });
                res.json({ success: true, message: '留言已更新！管理員會看到您的訊息。' });
            });

        } else {
            // C. 已取消或完成：不能改
            res.json({ success: false, message: '此預約狀態無法修改' });
        }
    });
});

// 買家取消預約
app.put('/api/my/reservations/:id/cancel', (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false });
    const sql = "UPDATE Reservation SET status = 'canceled' WHERE reserve_id = ? AND buyer_id = ? AND status = 'pending'";
    db.query(sql, [req.params.id, req.session.user.id], (err, result) => {
        if (result.affectedRows === 0) return res.json({ success: false, message: '取消失敗' });
        res.json({ success: true });
    });
});

// Admin 取得所有預約
app.get('/api/admin/reservations', checkAdmin, (req, res) => {
    const sql = `SELECT r.*, m.brand, m.model, m.image_url, u.name as buyer_name, u.phone, u.email FROM Reservation r JOIN Motorcycle m ON r.moto_id = m.moto_id JOIN Users u ON r.buyer_id = u.user_id ORDER BY r.reserve_time DESC`;
    db.query(sql, (err, results) => res.json(results));
});

// Admin 取得單筆預約
app.get('/api/admin/reservations/:id', checkAdmin, (req, res) => {
    const sql = `SELECT r.*, m.brand, m.model, u.name as buyer_name FROM Reservation r JOIN Motorcycle m ON r.moto_id = m.moto_id JOIN Users u ON r.buyer_id = u.user_id WHERE r.reserve_id = ?`;
    db.query(sql, [req.params.id], (err, results) => res.json(results[0]));
});

// 🟢 [新功能] Admin 取得可供更換的車輛列表
app.get('/api/admin/available-cars', checkAdmin, (req, res) => {
    db.query("SELECT moto_id, brand, model FROM Motorcycle WHERE status = 'available'", (err, results) => res.json(results));
});

// 🟢 [升級] Admin 修改預約 (含換車 moto_id)
app.put('/api/admin/reservations/:id', checkAdmin, (req, res) => {
    const { moto_id, reserve_time, note, status } = req.body;
    const sql = 'UPDATE Reservation SET moto_id = ?, reserve_time = ?, note = ?, status = ? WHERE reserve_id = ?';
    db.query(sql, [moto_id, reserve_time, note, status, req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.put('/api/admin/reservations/:id/status', checkAdmin, (req, res) => {
    db.query('UPDATE Reservation SET status = ? WHERE reserve_id = ?', [req.body.status, req.params.id], (err) => res.json({ success: true }));
});
app.delete('/api/admin/reservations/:id', checkAdmin, (req, res) => {
    db.query('DELETE FROM Reservation WHERE reserve_id = ?', [req.params.id], (err) => res.json({ success: true }));
});

app.listen(3000, () => {
    console.log('伺服器執行中: http://localhost:3000');
});