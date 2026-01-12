// 頁面載入時執行
document.addEventListener('DOMContentLoaded', async () => {
    // 1. 檢查身分
    const res = await fetch('/api/me');
    const data = await res.json();
    
    // 如果沒登入或不是 admin，踢回登入頁
    if (!data.loggedIn || data.user.role !== 'admin') { 
        alert('請先登入管理員帳號'); 
        window.location.href = 'login.html'; 
        return; 
    }
    
    // 顯示管理員名字
    document.getElementById('adminName').textContent = data.user.name;
    
    // 2. 載入資料
    loadCars();
    loadReservations();

    // 3. 綁定「重新整理」按鈕 (清除篩選 + 載入全部)
    const btnRefresh = document.getElementById('btnRefreshCars');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', async function() {
            const originalText = this.innerHTML;
            this.innerHTML = '⏳ 載入中...';
            this.disabled = true;
            this.style.opacity = '0.7';
            
            // 清空篩選條件
            document.getElementById('adm_filter_license').value = '';
            document.getElementById('adm_filter_category').value = '';
            document.getElementById('adm_sort').value = 'newest';

            // 重新載入
            await loadCars();
            
            await new Promise(r => setTimeout(r, 300)); // 體驗延遲
            
            this.innerHTML = originalText;
            this.disabled = false;
            this.style.opacity = '1';
        });
    }
});

// 登出
async function logout() { 
    await fetch('/api/logout', { method: 'POST' }); 
    window.location.href = 'index.html'; 
}

// ==========================================
//              車輛管理邏輯
// ==========================================

async function loadCars() {
    const license = document.getElementById('adm_filter_license')?.value || '';
    const category = document.getElementById('adm_filter_category')?.value || '';
    const sort = document.getElementById('adm_sort')?.value || '';
    const params = new URLSearchParams({ license_id: license, category_id: category, sort: sort });

    const res = await fetch(`/api/motorcycles?${params.toString()}`);
    const cars = await res.json();
    const tbody = document.querySelector('#adminTable tbody');
    tbody.innerHTML = '';
    
    if(cars.length === 0) { 
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">沒有符合條件的車輛</td></tr>'; 
        return; 
    }

    cars.forEach(moto => {
        const tr = document.createElement('tr');
        let statusText = moto.status === 'sold' ? '已售出' : (moto.status === 'removed' ? '已下架' : '上架中');
        let statusColor = moto.status === 'sold' ? 'red' : (moto.status === 'removed' ? 'gray' : 'green');
        const imgHtml = moto.image_url ? `<img src="${moto.image_url}" class="thumb-img">` : '無圖';
        
        tr.innerHTML = `
            <td>${moto.moto_id}</td>
            <td>${imgHtml}</td>
            <td><b>${moto.brand} ${moto.model}</b><br><small style="color:#007bff">${moto.year || '----'}年 | ${moto.mileage ? moto.mileage.toLocaleString() : '---'} km</small></td>
            <td>$${moto.price.toLocaleString()}</td>
            <td style="color:${statusColor}; font-weight:bold;">${statusText}</td>
            <td>
                <button class="btn-edit" onclick="openEditModal(${moto.moto_id})">修改</button>
                ${moto.status === 'available' ? `<button class="btn-sold" onclick="updateStatus(${moto.moto_id}, 'sold')">售出</button>` : `<button class="btn-relist" onclick="updateStatus(${moto.moto_id}, 'available')">上架</button>`}
                <button class="btn-del" onclick="deleteMoto(${moto.moto_id})">刪除</button>
            </td>`;
        tbody.appendChild(tr);
    });
}

// 新增車輛表單
document.getElementById('addMotoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(document.getElementById('addMotoForm'));
    const fileInput = document.getElementById('imageFile');
    if (fileInput.files[0]) formData.append('image', fileInput.files[0]);
    
    const res = await fetch('/api/admin/motorcycles', { method: 'POST', body: formData });
    if (res.ok) { 
        alert('上架成功！'); 
        document.getElementById('addMotoForm').reset(); 
        loadCars(); 
    } else { 
        // 讀取錯誤訊息
        const err = await res.json();
        alert('上架失敗：' + (err.message || '未知錯誤')); 
    }
});

// 打開修改車輛視窗
window.openEditModal = async (id) => {
    const res = await fetch(`/api/admin/motorcycles/${id}`);
    const moto = await res.json();
    
    document.getElementById('edit_moto_id').value = moto.moto_id;
    document.getElementById('edit_brand').value = moto.brand;
    document.getElementById('edit_model').value = moto.model;
    document.getElementById('edit_price').value = moto.price;
    document.getElementById('edit_year').value = moto.year;
    document.getElementById('edit_mileage').value = moto.mileage;
    document.getElementById('edit_description').value = moto.description || '';
    document.getElementById('edit_license_id').value = moto.license_id;
    document.getElementById('edit_category_id').value = moto.category_id;
    document.getElementById('edit_imageFile').value = '';
    
    document.getElementById('editModal').style.display = 'flex';
};

// 提交修改
document.getElementById('editMotoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit_moto_id').value;
    const formData = new FormData();
    // 收集表單資料
    formData.append('brand', document.getElementById('edit_brand').value);
    formData.append('model', document.getElementById('edit_model').value);
    formData.append('price', document.getElementById('edit_price').value);
    formData.append('year', document.getElementById('edit_year').value);
    formData.append('mileage', document.getElementById('edit_mileage').value);
    formData.append('description', document.getElementById('edit_description').value);
    formData.append('license_id', document.getElementById('edit_license_id').value);
    formData.append('category_id', document.getElementById('edit_category_id').value);
    
    const fileInput = document.getElementById('edit_imageFile');
    if (fileInput.files[0]) formData.append('image', fileInput.files[0]);
    
    const res = await fetch(`/api/admin/motorcycles/${id}`, { method: 'PUT', body: formData });
    if (res.ok) { 
        alert('修改成功！'); 
        document.getElementById('editModal').style.display='none'; 
        loadCars(); 
    } else { 
        alert('修改失敗'); 
    }
});

// 更新狀態 (售出/上架)
window.updateStatus = async (id, newStatus) => { 
    await fetch(`/api/admin/motorcycles/${id}/status`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ status: newStatus }) 
    }); 
    loadCars(); 
};

// 刪除車輛
window.deleteMoto = async (id) => { 
    if(!confirm('確定刪除？')) return; 
    await fetch(`/api/admin/motorcycles/${id}`, { method: 'DELETE' }); 
    loadCars(); 
};


// ==========================================
//          預約與訊息管理 (儀表板)
// ==========================================

let currentReserveId = null;

async function loadReservations() {
    const dateInput = document.getElementById('res_date_filter').value;
    const statusFilter = document.getElementById('res_status_filter').value;
    const url = dateInput ? `/api/admin/reservations?date=${dateInput}` : '/api/admin/reservations';

    const res = await fetch(url);
    const reservations = await res.json();
    
    // 1. 計算儀表板數據
    let counts = { pending: 0, confirmed: 0, canceled: 0, unread: 0 };
    reservations.forEach(r => {
        if (r.status === 'pending') counts.pending++;
        if (r.status === 'confirmed') counts.confirmed++;
        if (r.status === 'canceled') counts.canceled++;
        if (r.msg_status === 'unread') counts.unread++;
    });
    
    document.getElementById('stat_pending').textContent = counts.pending;
    document.getElementById('stat_confirmed').textContent = counts.confirmed;
    document.getElementById('stat_canceled').textContent = counts.canceled;
    document.getElementById('stat_unread').textContent = counts.unread;
    
    // 紅點通知
    document.title = counts.unread > 0 ? `(${counts.unread}) 🔴 管理員後台` : '管理員後台';

    // 2. 前端篩選
    let displayList = reservations;
    if (statusFilter) {
        if(statusFilter==='unread') displayList = reservations.filter(r => r.msg_status === 'unread');
        else displayList = reservations.filter(r => r.status === statusFilter);
    }

    // 3. 渲染列表
    const tbody = document.querySelector('#reserveTable tbody');
    tbody.innerHTML = '';
    document.getElementById('res_count_display').textContent = `顯示 ${displayList.length} 筆`;

    if (displayList.length === 0) { 
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#888;">查無資料</td></tr>'; 
        return; 
    }

    displayList.forEach(r => {
        const tr = document.createElement('tr');
        const isUnread = r.msg_status === 'unread';
        
        // 未讀高亮
        if (isUnread) { 
            tr.style.backgroundColor = '#fff8e1'; 
            tr.style.borderLeft = '4px solid #ffc107'; 
        }

        let statusHtml = '';
        if (r.status === 'pending') statusHtml = '<span style="color:orange; font-weight:bold;">⏳ 待確認</span>';
        else if (r.status === 'confirmed') statusHtml = '<span style="color:green; font-weight:bold;">✅ 已確認</span>';
        else statusHtml = '<span style="color:gray;">❌ 已取消</span>';

        if (isUnread) statusHtml += '<br><span style="background:red; color:white; font-size:11px; padding:2px 5px; border-radius:10px;">🔔 新訊息</span>';
        
        const timeStr = new Date(r.reserve_time).toLocaleString([], {month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'});

        tr.innerHTML = `
            <td>${statusHtml}</td>
            <td><b>${timeStr}</b></td>
            <td>${r.buyer_name}<br><small>${r.phone}</small></td>
            <td>${r.brand} ${r.model}</td>
            <td>
                ${isUnread ? `<button onclick="markAsHandled(${r.reserve_id})" style="background:#28a745;">✅ 已讀</button>` : ''}
                <button onclick="openResEditModal(${r.reserve_id})" style="background:#007bff;">回覆 / 修改</button>
                <button onclick="deleteRes(${r.reserve_id})" style="background:#6c757d;">刪除</button>
            </td>`;
        tbody.appendChild(tr);
    });
}

function resetResFilter() {
    document.getElementById('res_date_filter').value = '';
    document.getElementById('res_status_filter').value = '';
    loadReservations();
}

async function markAsHandled(id) {
    await fetch(`/api/admin/reservations/${id}/handle`, {method:'PUT'});
    loadReservations();
}

async function deleteRes(id) {
    if(!confirm('確定刪除此預約？')) return;
    await fetch(`/api/admin/reservations/${id}`, {method:'DELETE'});
    loadReservations();
}

// ==========================================
//          聊天室 & 預約修改 Modal
// ==========================================

window.openResEditModal = async (id) => {
    currentReserveId = id;
    const res = await fetch(`/api/admin/reservations/${id}`);
    const data = await res.json();
    
    // 填充車輛選單
    const carsRes = await fetch('/api/admin/available-cars');
    const cars = await carsRes.json();
    const select = document.getElementById('edit_res_moto_select');
    select.innerHTML = '';
    
    let currentOpt = document.createElement('option'); 
    currentOpt.value = data.moto_id; 
    currentOpt.text = `(目前) ${data.brand} ${data.model}`; 
    currentOpt.selected = true; 
    select.appendChild(currentOpt);
    
    cars.forEach(c => { 
        if(c.moto_id !== data.moto_id){ 
            let o = document.createElement('option'); 
            o.value=c.moto_id; 
            o.text=`${c.brand} ${c.model}`; 
            select.appendChild(o); 
        }
    });

    // 填入資料
    document.getElementById('edit_res_id').value = data.reserve_id;
    document.getElementById('edit_res_buyer').textContent = data.buyer_name;
    
    // 時間處理 (處理時區偏移)
    const dt = new Date(data.reserve_time); 
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
    document.getElementById('edit_res_time').value = dt.toISOString().slice(0, 16);
    document.getElementById('edit_res_status').value = data.status;

    // 載入對話紀錄
    loadMessages(id);
    document.getElementById('editResModal').style.display = 'flex';
};

// 儲存預約修改 (狀態/車輛/時間)
document.getElementById('editResForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit_res_id').value;
    const payload = { 
        moto_id: document.getElementById('edit_res_moto_select').value, 
        reserve_time: document.getElementById('edit_res_time').value, 
        status: document.getElementById('edit_res_status').value 
    };
    
    const res = await fetch(`/api/admin/reservations/${id}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
    });
    
    if (res.ok) { 
        alert('設定已更新！'); 
        document.getElementById('editResModal').style.display = 'none'; 
        loadReservations(); 
    } else { 
        alert('修改失敗'); 
    }
});

// 載入訊息 API
async function loadMessages(id) {
    const box = document.getElementById('chatBox');
    box.innerHTML = '<div style="text-align:center;">載入中...</div>';
    
    const res = await fetch(`/api/reservations/${id}/messages`);
    const msgs = await res.json();
    box.innerHTML = '';
    
    if(msgs.length === 0) { 
        box.innerHTML = '<div style="text-align:center; color:#ccc; margin-top:20px;">無訊息</div>'; 
        return; 
    }
    
    msgs.forEach(m => {
        const div = document.createElement('div');
        div.className = 'msg-row';
        // 管理員看：sender_role='admin' 是自己 (my-msg)
        div.classList.add(m.sender_role === 'admin' ? 'my-msg' : 'other-msg');
        
        div.innerHTML = `
            <div style="font-size:0.8em; color:#666;">${m.sender_role==='admin'?'我':'買家'}</div>
            <div class="msg-bubble">${m.content}</div>
        `;
        box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
}

// 發送訊息
async function sendMessage() {
    const input = document.getElementById('chatInput');
    if(!input.value.trim()) return;
    
    const res = await fetch(`/api/reservations/${currentReserveId}/messages`, {
        method: 'POST', 
        headers:{'Content-Type':'application/json'}, 
        body:JSON.stringify({content: input.value})
    });
    
    if(res.ok) { 
        input.value = ''; 
        loadMessages(currentReserveId); 
        loadReservations(); // 更新列表 (如果需要更新 last_msg_at)
    }
}