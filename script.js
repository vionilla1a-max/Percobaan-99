// --- Inisialisasi Aplikasi ---
// Kunci untuk localStorage
const APP_KEY = 'fokusMasaDepanDB';

// --- Fungsi Helper (Utility) ---
function getISODate(date) {
    return date.getFullYear() + '-' +
           ('0' + (date.getMonth() + 1)).slice(-2) + '-' +
           ('0' + date.getDate()).slice(-2);
}

function getDefaultDB() {
    return {
        saldo: 0,
        dream: {
            title: 'Atur Impian Anda!',
            targetAmount: 0,
            targetDate: getISODate(new Date())
        },
        settings: {
            limitBulanan: 0,
            motivasi: {
                kuning: 'Hati-hati, pengeluaranmu banyak!',
                merah: 'STOP! Kamu sudah boros!'
            },
            kategori: [
                '🍔 Makanan',
                '🚌 Transportasi',
                '💡 Tagihan',
                '🏠 Sewa/Cicilan',
                '🎬 Hiburan',
                '👕 Belanja',
                'Lainnya'
            ],
            notifikasi: {
                aktif: false,
                waktu: '09:00'
            }
        },
        transactions: []
    };
}

// State global
let db = getDefaultDB();
let currentTxType = 'pengeluaran';
let myAnalysisChart = null;

// --- Inisialisasi DOM-ready ---
document.addEventListener('DOMContentLoaded', () => {
    loadDB();
    populateCategorySelects();
    renderDashboard();
    navigateTo('page-dashboard');

    const txDateInput = document.getElementById('form-tx-tanggal');
    if (txDateInput) txDateInput.value = getISODate(new Date());
});

// --- LocalStorage management ---
function loadDB() {
    const data = localStorage.getItem(APP_KEY);
    if (data) {
        try {
            db = JSON.parse(data);
            if (!db.settings) db.settings = getDefaultDB().settings;
            if (!db.dream) db.dream = getDefaultDB().dream;
            if (!db.transactions) db.transactions = [];
        } catch(e) {
            console.error('Corrupt DB, resetting', e);
            db = getDefaultDB();
            saveDB();
        }
    } else {
        db = getDefaultDB();
        saveDB();
    }
}

function saveDB() {
    try {
        localStorage.setItem(APP_KEY, JSON.stringify(db));
    } catch (e) {
        console.error('Gagal menyimpan:', e);
        showToast('Gagal menyimpan data.', 'error');
    }
}

// --- Navigation & modal helpers ---
window.navigateTo = function(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) {
        target.classList.add('active');
        window.scrollTo(0,0);
        if (pageId === 'page-dashboard') renderDashboard();
        if (pageId === 'page-history') renderHistoryPage();
        if (pageId === 'page-analysis') renderAnalysisPage();
        if (pageId === 'page-settings-limit') renderSettingsLimitPage();
        if (pageId === 'page-settings-kategori') renderSettingsKategoriPage();
        if (pageId === 'page-settings-motivasi') renderSettingsMotivasiPage();
        if (pageId === 'page-settings-notifikasi') renderSettingsNotifikasiPage();
    } else {
        console.error('Halaman tidak ditemukan:', pageId);
    }
}

window.showModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('active');

    if (modalId === 'modal-edit-dream') {
        document.getElementById('form-dream-title').value = db.dream.title || '';
        document.getElementById('form-dream-target').value = db.dream.targetAmount || '';
        document.getElementById('form-dream-date').value = db.dream.targetDate || getISODate(new Date());
    } else if (modalId === 'modal-add-tx') {
        document.getElementById('form-tx-nominal').value = '';
        document.getElementById('form-tx-alasan').value = '';
        document.getElementById('form-tx-tanggal').value = getISODate(new Date());
        switchTxType('pengeluaran');
    }
}

window.hideModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// --- Transaction flow (gabungan: flow lama yang simpel + fitur lengkap) ---
window.switchTxType = function(type) {
    currentTxType = type;
    const tabPengeluaran = document.getElementById('tab-pengeluaran');
    const tabPemasukan = document.getElementById('tab-pemasukan');
    const kategoriGroup = document.getElementById('form-tx-kategori-group');
    if (!tabPengeluaran || !tabPemasukan) return;
    if (type === 'pengeluaran') {
        tabPengeluaran.classList.remove('text-gray-500');
        tabPemasukan.classList.add('text-gray-500');
        kategoriGroup.style.display = 'block';
    } else {
        tabPemasukan.classList.remove('text-gray-500');
        tabPengeluaran.classList.add('text-gray-500');
        kategoriGroup.style.display = 'none';
    }
}

window.saveTransaction = function() {
    const amount = parseFloat(document.getElementById('form-tx-nominal').value);
    const category = (currentTxType === 'pengeluaran') ? document.getElementById('form-tx-kategori').value : 'Pemasukan';
    const note = document.getElementById('form-tx-alasan').value || '';
    const date = document.getElementById('form-tx-tanggal').value;

    if (!amount || amount <= 0) { showToast('Nominal harus diisi > 0','error'); return; }
    if (!date) { showToast('Tanggal harus diisi','error'); return; }

    const newTx = { id: Date.now().toString(), type: currentTxType, amount, category, note, date };
    db.transactions.push(newTx);
    if (currentTxType === 'pengeluaran') db.saldo -= amount; else db.saldo += amount;
    saveDB();
    hideModal('modal-add-tx');
    showToast('Transaksi berhasil disimpan!', 'success');
    renderDashboard();
}

// --- History rendering ---
window.renderHistoryPage = function() {
    const filter = document.getElementById('history-filter-time').value;
    const filteredTx = filterTransactions(db.transactions, filter);
    const listEl = document.getElementById('history-full-list');
    const totalInEl = document.getElementById('hist-total-in');
    const totalOutEl = document.getElementById('hist-total-out');

    let totalIn = 0, totalOut = 0;
    filteredTx.sort((a,b) => new Date(b.date) - new Date(a.date));
    if (!listEl) return;
    if (filteredTx.length === 0) {
        listEl.innerHTML = '<p class="text-gray-500">Tidak ada transaksi untuk periode ini.</p>';
    } else {
        let html = '';
        filteredTx.forEach(tx => {
            const amountHtml = tx.type === 'pemasukan'
                ? `<div class="text-green-600 font-semibold">+${formatRupiah(tx.amount)}</div>`
                : `<div class="text-red-600 font-semibold">-${formatRupiah(tx.amount)}</div>`;
            if (tx.type === 'pemasukan') totalIn += tx.amount; else totalOut += tx.amount;

            html += `<div class="card">
                        <div class="flex justify-between">
                          <div>
                            <div class="font-semibold">${tx.category}</div>
                            <div class="text-xs text-muted">${tx.note || formatDate(tx.date)}</div>
                          </div>
                          <div class="text-right">${amountHtml}<div class="text-xs text-muted">${formatDate(tx.date)}</div></div>
                        </div>
                     </div>`;
        });
        listEl.innerHTML = html;
    }

    if (totalInEl) totalInEl.textContent = formatRupiah(totalIn);
    if (totalOutEl) totalOutEl.textContent = formatRupiah(totalOut);
}

// --- Analysis rendering (chart) ---
window.renderAnalysisPage = function() {
    const filter = document.getElementById('analysis-filter-time').value;
    const allPengeluaran = db.transactions.filter(tx => tx.type === 'pengeluaran');
    const filteredTx = filterTransactions(allPengeluaran, filter);

    const limit = db.settings.limitBulanan;
    const terpakai = filteredTx.reduce((s,tx)=>s+tx.amount,0);
    const sisa = limit - terpakai;

    document.getElementById('analysis-limit').textContent = formatRupiah(limit);
    document.getElementById('analysis-terpakai').textContent = formatRupiah(terpakai);
    document.getElementById('analysis-sisa').textContent = formatRupiah(sisa);

    const spendingByCategory = filteredTx.reduce((acc,tx)=>{
        if (!acc[tx.category]) acc[tx.category]=0;
        acc[tx.category]+=tx.amount;
        return acc;
    }, {});
    const labels = Object.keys(spendingByCategory);
    const data = Object.values(spendingByCategory);
    const canvas = document.getElementById('analysis-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (myAnalysisChart) myAnalysisChart.destroy();
    if (labels.length > 0) {
        myAnalysisChart = new Chart(ctx, {
            type: 'pie',
            data: { labels, datasets:[{ data, backgroundColor: ['#ef4444','#f59e0b','#22c55e','#3b82f6','#8b5cf6','#ec4899'] }]},
            options: { responsive:true, maintainAspectRatio:false }
        });
    } else {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText('Tidak ada data pengeluaran', canvas.width/2, canvas.height/2);
    }
}

// --- Settings pages ---
function renderSettingsLimitPage() {
    const el = document.getElementById('setting-limit-bulanan');
    if (el) el.value = db.settings.limitBulanan || 0;
}
window.saveSettingsLimit = function() {
    const limit = parseFloat(document.getElementById('setting-limit-bulanan').value);
    if (!isNaN(limit) && limit >= 0) {
        db.settings.limitBulanan = limit;
        saveDB();
        showToast('Limit berhasil disimpan!', 'success');
        navigateTo('page-settings');
    } else showToast('Limit tidak valid','error');
}

function renderSettingsKategoriPage() {
    const listEl = document.getElementById('settings-kategori-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    db.settings.kategori.forEach((kategori, i) => {
        listEl.innerHTML += `<div class="flex justify-between items-center"><div>${kategori}</div><button onclick="deleteCategory(${i})" class="text-danger text-sm">Hapus</button></div>`;
    });
}
window.addCategory = function() {
    const input = document.getElementById('setting-kategori-baru');
    if (!input) return;
    const v = input.value.trim();
    if (!v) return;
    db.settings.kategori.push(v);
    saveDB();
    populateCategorySelects();
    renderSettingsKategoriPage();
    input.value = '';
    showToast('Kategori ditambahkan!', 'success');
}
window.deleteCategory = function(index) {
    const kategori = db.settings.kategori[index];
    db.settings.kategori.splice(index,1);
    saveDB();
    populateCategorySelects();
    renderSettingsKategoriPage();
    showToast(`Kategori "${kategori}" dihapus.`);
}

function renderSettingsMotivasiPage() {
    const a = document.getElementById('setting-motivasi-kuning');
    const b = document.getElementById('setting-motivasi-merah');
    if (a) a.value = db.settings.motivasi.kuning || '';
    if (b) b.value = db.settings.motivasi.merah || '';
}
window.saveSettingsMotivasi = function() {
    db.settings.motivasi.kuning = document.getElementById('setting-motivasi-kuning').value;
    db.settings.motivasi.merah = document.getElementById('setting-motivasi-merah').value;
    saveDB();
    showToast('Motivasi berhasil disimpan!', 'success');
    navigateTo('page-settings');
}

function renderSettingsNotifikasiPage() {
    const a = document.getElementById('setting-notif-aktif');
    const b = document.getElementById('setting-notif-waktu');
    if (a) a.checked = !!db.settings.notifikasi.aktif;
    if (b) b.value = db.settings.notifikasi.waktu || '09:00';
}
window.saveSettingsNotifikasi = function() {
    db.settings.notifikasi.aktif = !!document.getElementById('setting-notif-aktif').checked;
    db.settings.notifikasi.waktu = document.getElementById('setting-notif-waktu').value;
    saveDB();
    showToast('Pengaturan notifikasi disimpan!', 'success');
    navigateTo('page-settings');
}

// --- Reset app ---
window.resetApp = function() {
    hideModal('modal-confirm-reset');
    localStorage.removeItem(APP_KEY);
    showToast('Data berhasil direset. Memuat ulang...', 'success');
    setTimeout(()=>location.reload(), 900);
}

// --- Dream (impian) ---
window.saveDream = function() {
    const title = document.getElementById('form-dream-title').value;
    const targetAmount = parseFloat(document.getElementById('form-dream-target').value);
    const targetDate = document.getElementById('form-dream-date').value;
    if (!title || !targetAmount || !targetDate) { showToast('Semua field impian harus diisi','error'); return; }
    db.dream.title = title;
    db.dream.targetAmount = targetAmount;
    db.dream.targetDate = targetDate;
    saveDB();
    hideModal('modal-edit-dream');
    showToast('Impian berhasil disimpan!', 'success');
    renderDashboard();
}

// --- Render dashboard (gabungan UI lama flow) ---
function renderDashboard() {
    document.getElementById('dash-saldo').textContent = formatRupiah(db.saldo);

    const { title, targetAmount, targetDate } = db.dream;
    const progress = (targetAmount > 0) ? (db.saldo / targetAmount) * 100 : 0;
    const progressPercent = Math.min(Math.max(progress, 0), 100);
    document.getElementById('dash-dream-title').textContent = title;
    document.getElementById('dash-dream-target-amount').textContent = formatRupiah(targetAmount);
    document.getElementById('dash-dream-target-date').textContent = formatDate(targetDate, { month:'short', year:'numeric' });
    document.getElementById('dash-dream-progress').style.width = `${progressPercent}%`;
    document.getElementById('dash-dream-progress-percent').textContent = `${progressPercent.toFixed(1)}%`;

    const limit = db.settings.limitBulanan || 0;
    const pengeluaranBulanIni = filterTransactions(db.transactions.filter(tx => tx.type === 'pengeluaran'),'month').reduce((s,tx)=>s+tx.amount,0);
    const sisa = limit - pengeluaranBulanIni;
    const sisaPercent = (limit > 0) ? (sisa / limit) * 100 : 0;

    document.getElementById('dash-budget-limit').textContent = formatRupiah(limit);
    document.getElementById('dash-budget-sisa').textContent = formatRupiah(sisa);

    const indicatorEl = document.getElementById('dash-budget-indicator');
    const warningEl = document.getElementById('dash-budget-warning');

    if (limit === 0) {
        indicatorEl.textContent = '...';
        indicatorEl.className = '';
        warningEl.textContent = 'Atur limit budget Anda di Pengaturan.';
    } else if (sisaPercent > 40) {
        indicatorEl.textContent = 'Aman';
        indicatorEl.className = 'inline-block px-2 py-1 text-xs rounded text-success';
        warningEl.textContent = '';
    } else if (sisaPercent > 10) {
        indicatorEl.textContent = 'Hati-hati';
        indicatorEl.className = 'inline-block px-2 py-1 text-xs rounded';
        warningEl.textContent = db.settings.motivasi.kuning;
    } else {
        indicatorEl.textContent = 'Bahaya';
        indicatorEl.className = 'inline-block px-2 py-1 text-xs rounded text-danger';
        warningEl.textContent = db.settings.motivasi.merah;
    }

    // Recent transactions (simple UI from version lama)
    const listEl = document.getElementById('dash-history-list');
    const recentTx = [...db.transactions].sort((a,b)=> new Date(b.date) - new Date(a.date)).slice(0,5);
    if (!listEl) return;
    if (recentTx.length === 0) {
        listEl.innerHTML = '<p class="text-gray-500">Belum ada transaksi.</p>';
    } else {
        let html = '';
        recentTx.forEach(tx => {
            const amountHtml = tx.type === 'pemasukan' ? `<div class="text-success font-semibold">+${formatRupiah(tx.amount)}</div>` : `<div class="text-danger font-semibold">-${formatRupiah(tx.amount)}</div>`;
            html += `<div class="flex justify-between items-center"><div><div class="font-semibold">${tx.category}</div><div class="text-xs text-muted">${formatDate(tx.date)}</div></div>${amountHtml}</div><hr class="my-2">`;
        });
        listEl.innerHTML = html;
    }
}

// --- Utilities ---
function formatRupiah(number) {
    if (isNaN(number)) number = 0;
    return new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', minimumFractionDigits:0, maximumFractionDigits:0 }).format(number);
}
function formatDate(dateString, options={day:'numeric', month:'short', year:'numeric'}) {
    try {
        const d = new Date(dateString + 'T00:00:00');
        return new Intl.DateTimeFormat('id-ID', options).format(d);
    } catch(e) {
        return dateString;
    }
}

function populateCategorySelects() {
    const selectEl = document.getElementById('form-tx-kategori');
    if (!selectEl) return;
    selectEl.innerHTML = '';
    db.settings.kategori.forEach(k=>{
        const opt = document.createElement('option'); opt.value = k; opt.textContent = k; selectEl.appendChild(opt);
    });
}

function filterTransactions(transactions, filter) {
    const now = new Date();
    const today = getISODate(new Date());
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = now.getDate();
    const dayOfWeek = now.getDay();
    const firstDayOfWeek = new Date(year, month, date - dayOfWeek);
    const startOfWeek = getISODate(firstDayOfWeek);
    const startOfMonth = getISODate(new Date(year, month, 1));
    const startOfYear = getISODate(new Date(year, 0, 1));

    switch(filter) {
        case 'today': return transactions.filter(tx => tx.date === today);
        case 'week': return transactions.filter(tx => tx.date >= startOfWeek && tx.date <= today);
        case 'month': return transactions.filter(tx => tx.date >= startOfMonth && tx.date <= today);
        case 'year': return transactions.filter(tx => tx.date >= startOfYear && tx.date <= today);
        case 'all':
        default: return transactions;
    }
}

// Toast
function showToast(message, type='default') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = message;
    if (type === 'success') t.style.backgroundColor = '#22c55e';
    else if (type === 'error') t.style.backgroundColor = '#ef4444';
    else t.style.backgroundColor = '#333';
    t.classList.add('show');
    setTimeout(()=> t.classList.remove('show'), 2500);
          }
