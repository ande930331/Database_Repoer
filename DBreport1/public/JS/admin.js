document.addEventListener('DOMContentLoaded', async () => {
    const res = await fetch('/api/me');
    const data = await res.json();
    if (!data.loggedIn || data.user.role !== 'admin') { alert('請先登入管理員帳號'); window.location.href = 'login.html'; return; }
    document.getElementById('adminName').textContent = data.user.name;
    loadCars();
    loadReservations();
});

async function logout() { await fetch('/api/logout', { method: 'POST' }); window.location.href = 'index.html'; }

// 載入車輛 (含篩選)
async function loadCars() {
    const license = document.getElementById('adm_filter_license')?.value || '';
    const category = document.getElementById('adm_filter_category')?.value || '';
    const sort = document.getElementById('adm_sort')?.value || '';
    const params = new URLSearchParams({ license_id: license, category_id: category, sort: sort });

    const res = await fetch(`/api/motorcycles?${params.toString()}`);
    const cars = await res.json();
    const tbody = document.querySelector('#adminTable tbody');
    tbody.innerHTML = '';
    if(cars.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">沒有符合條件的車輛</td></tr>'; return; }

    cars.forEach(moto => {
        const tr = document.createElement('tr');
        let statusText = moto.status === 'sold' ? '已售出' : (moto.status === 'removed' ? '已下架' : '上架中');
        let statusColor = moto.status === 'sold' ? 'red' : (moto.status === 'removed' ? 'gray' : 'green');
        const imgHtml = moto.image_url ? `<img src="${moto.image_url}" class="thumb-img">` : '無圖';
        tr.innerHTML = `
            <td>${moto.moto_id}</td><td>${imgHtml}</td>
            <td><b>${moto.brand} ${moto.model}</b><br><small style="color:#007bff">${moto.year || '----'}年 | ${moto.mileage ? moto.mileage.toLocaleString() : '---'} km</small></td>
            <td>$${moto.price.toLocaleString()}</td><td style="color:${statusColor}; font-weight:bold;">${statusText}</td>
            <td>
                <button class="btn-edit" onclick="openEditModal(${moto.moto_id})">修改</button>
                ${moto.status === 'available' ? `<button class="btn-sold" onclick="updateStatus(${moto.moto_id}, 'sold')">售出</button>` : `<button class="btn-relist" onclick="updateStatus(${moto.moto_id}, 'available')">上架</button>`}
                <button class="btn-del" onclick="deleteMoto(${moto.moto_id})">刪除</button>
            </td>`;
        tbody.appendChild(tr);
    });
}

// 載入預約列表
async function loadReservations() {
    const res = await fetch('/api/admin/reservations');
    const reservations = await res.json();
    const tbody = document.querySelector('#reserveTable tbody');
    tbody.innerHTML = '';
    if (reservations.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">目前沒有預約紀錄</td></tr>'; return; }

    reservations.forEach(r => {
        const tr = document.createElement('tr');
        let statusBadge = r.status === 'pending' ? '<span style="color:orange;">⏳ 待確認</span>' : (r.status === 'confirmed' ? '<span style="color:green;">✅ 已確認</span>' : '<span style="color:gray;">❌ 已取消</span>');
        const timeStr = new Date(r.reserve_time).toLocaleString();
        tr.innerHTML = `
            <td>${statusBadge}</td><td>${timeStr}</td>
            <td><b>${r.buyer_name}</b><br>${r.phone || '無電話'}<br><small>${r.email}</small></td>
            <td><img src="${r.image_url || ''}" style="width:50px; height:35px; object-fit:cover; vertical-align:middle;"> ${r.brand} ${r.model}</td>
            <td><div style="max-width:200px; font-size:0.9em; color:#555;">${r.note || '-'}</div></td>
            <td>
                <button onclick="openResEditModal(${r.reserve_id})" style="background:#007bff; color:white; border:none; padding:5px 8px; border-radius:3px; cursor:pointer;">修改</button>
                <button onclick="deleteRes(${r.reserve_id})" style="background:#6c757d; color:white; border:none; padding:5px 8px; border-radius:3px; cursor:pointer;">刪除</button>
            </td>`;
        tbody.appendChild(tr);
    });
}

// 🟢 預約修改視窗 (含換車邏輯)
window.openResEditModal = async (id) => {
    const res = await fetch(`/api/admin/reservations/${id}`);
    const data = await res.json();
    
    // 抓取可選車輛列表
    const carsRes = await fetch('/api/admin/available-cars');
    const cars = await carsRes.json();

    document.getElementById('edit_res_id').value = data.reserve_id;
    document.getElementById('edit_res_buyer').textContent = data.buyer_name;
    
    // 填充車輛選單
    const select = document.getElementById('edit_res_moto_select');
    select.innerHTML = '';
    const currentOpt = document.createElement('option');
    currentOpt.value = data.moto_id;
    currentOpt.text = `(目前) ${data.brand} ${data.model}`;
    currentOpt.selected = true;
    select.appendChild(currentOpt);
    
    cars.forEach(car => {
        if(car.moto_id !== data.moto_id) {
            let opt = document.createElement('option');
            opt.value = car.moto_id;
            opt.text = `${car.brand} ${car.model}`;
            select.appendChild(opt);
        }
    });

    const dt = new Date(data.reserve_time);
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
    document.getElementById('edit_res_time').value = dt.toISOString().slice(0, 16);
    document.getElementById('edit_res_status').value = data.status;
    document.getElementById('edit_res_note').value = data.note || '';
    document.getElementById('editResModal').style.display = 'flex';
};

document.getElementById('editResForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit_res_id').value;
    const payload = {
        moto_id: document.getElementById('edit_res_moto_select').value, // 傳送新車 ID
        reserve_time: document.getElementById('edit_res_time').value,
        status: document.getElementById('edit_res_status').value,
        note: document.getElementById('edit_res_note').value
    };
    const res = await fetch(`/api/admin/reservations/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) { alert('預約已修改！'); document.getElementById('editResModal').style.display = 'none'; loadReservations(); } else { alert('修改失敗'); }
});

// 其他固定功能
document.getElementById('addMotoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(document.getElementById('addMotoForm'));
    const fileInput = document.getElementById('imageFile');
    if (fileInput.files[0]) formData.append('image', fileInput.files[0]);
    const res = await fetch('/api/admin/motorcycles', { method: 'POST', body: formData });
    if (res.ok) { alert('上架成功！'); document.getElementById('addMotoForm').reset(); loadCars(); } else { alert('上架失敗'); }
});
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
window.closeEditModal = () => { document.getElementById('editModal').style.display = 'none'; };
document.getElementById('editMotoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit_moto_id').value;
    const formData = new FormData();
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
    if (res.ok) { alert('修改成功！'); closeEditModal(); loadCars(); } else { alert('修改失敗'); }
});
window.updateStatus = async (id, newStatus) => { await fetch(`/api/admin/motorcycles/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) }); loadCars(); };
window.deleteMoto = async (id) => { if(!confirm('確定刪除？')) return; await fetch(`/api/admin/motorcycles/${id}`, { method: 'DELETE' }); loadCars(); };
window.deleteRes = async (id) => { if (!confirm('確定刪除這筆紀錄？')) return; await fetch(`/api/admin/reservations/${id}`, { method: 'DELETE' }); loadReservations(); };
window.onclick = (event) => { if (event.target == document.getElementById('editModal')) closeEditModal(); if (event.target == document.getElementById('editResModal')) document.getElementById('editResModal').style.display='none'; };