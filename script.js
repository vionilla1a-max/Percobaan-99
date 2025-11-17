// Data Storage
let appData = {
    saldo: 0,
    limitBulanan: 0,
    transactions: [],
    dreams: [],
    categories: {
        income: ['Gaji', 'Bonus', 'Investasi', 'Lainnya'],
        expense: ['Makanan', 'Transport', 'Belanja', 'Tagihan', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Lainnya']
    }
};

let selectedTransactionType = 'expense';
let charts = {
    kategori: null,
    trend: null
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initializeDateInput();
    updateUI();
    updateCategoryOptions();
    selectTransactionType('expense');
});

// Local Storage Functions
function saveData() {
    localStorage.setItem('fokusMasaDepan', JSON.stringify(appData));
}

function loadData() {
    const saved = localStorage.getItem('fokusMasaDepan');
    if (saved) {
        appData = JSON.parse(saved);
    }
}

// Page Navigation
function switchPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(`page-${page}`).classList.add('active');
    document.getElementById(`nav-${page}`).classList.add('active');
    
    if (page === 'impian') {
        renderDreams();
    } else if (page === 'analisis') {
        renderAnalysis();
    }
}

// Modal Functions
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    
    if (modalId === 'modal-edit-settings') {
        document.getElementById('settings-limit').value = appData.limitBulanan || '';
        document.getElementById('settings-saldo').value = appData.saldo || '';
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    
    if (modalId === 'modal-tambah-transaksi') {
        document.getElementById('input-amount').value = '';
        document.getElementById('input-description').value = '';
        document.getElementById('input-category').value = '';
        initializeDateInput();
    } else if (modalId === 'modal-edit-dream') {
        document.getElementById('dream-name').value = '';
        document.getElementById('dream-target').value = '';
        document.getElementById('dream-current').value = '';
    }
}

// Toast Notification
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Transaction Type Selection
function selectTransactionType(type) {
    selectedTransactionType = type;
    
    document.getElementById('btn-income').classList.remove('selected');
    document.getElementById('btn-expense').classList.remove('selected');
    
    document.getElementById(`btn-${type}`).classList.add('selected');
    
    updateCategoryOptions();
}

// Update Category Options
function updateCategoryOptions() {
    const categorySelect = document.getElementById('input-category');
    categorySelect.innerHTML = '<option value="">Pilih Kategori</option>';
    
    const categories = appData.categories[selectedTransactionType];
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
    });
}

// Initialize Date Input
function initializeDateInput() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('input-date').value = today;
}

// Add Transaction
function addTransaction(event) {
    event.preventDefault();
    
    const amount = parseFloat(document.getElementById('input-amount').value);
    const category = document.getElementById('input-category').value;
    const description = document.getElementById('input-description').value;
    const date = document.getElementById('input-date').value;
    
    if (!amount || !category || !description || !date) {
        showToast('Mohon lengkapi semua field!');
        return;
    }
    
    const transaction = {
        id: Date.now(),
        type: selectedTransactionType,
        amount: amount,
        category: category,
        description: description,
        date: date,
        timestamp: new Date().toISOString()
    };
    
    appData.transactions.unshift(transaction);
    
    if (selectedTransactionType === 'income') {
        appData.saldo += amount;
    } else {
        appData.saldo -= amount;
    }
    
    saveData();
    updateUI();
    closeModal('modal-tambah-transaksi');
    showToast(`Transaksi ${selectedTransactionType === 'income' ? 'pemasukan' : 'pengeluaran'} berhasil ditambahkan!`);
}

// Delete Transaction
function deleteTransaction(id) {
    const transaction = appData.transactions.find(t => t.id === id);
    
    if (!transaction) return;
    
    if (confirm('Yakin ingin menghapus transaksi ini?')) {
        if (transaction.type === 'income') {
            appData.saldo -= transaction.amount;
        } else {
            appData.saldo += transaction.amount;
        }
        
        appData.transactions = appData.transactions.filter(t => t.id !== id);
        saveData();
        updateUI();
        showToast('Transaksi berhasil dihapus!');
    }
}

// Format Currency
function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID').format(amount);
}

// Format Date
function formatDate(dateString) {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

// Apply Filter
function applyFilter() {
    updateUI();
}

// Get Filtered Transactions
function getFilteredTransactions() {
    const filter = document.getElementById('filter-select').value;
    const now = new Date();
    
    return appData.transactions.filter(t => {
        const transDate = new Date(t.date);
        
        switch(filter) {
            case 'today':
                return transDate.toDateString() === now.toDateString();
            case 'week':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return transDate >= weekAgo;
            case 'month':
                return transDate.getMonth() === now.getMonth() && 
                       transDate.getFullYear() === now.getFullYear();
            case 'year':
                return transDate.getFullYear() === now.getFullYear();
            case 'all':
            default:
                return true;
        }
    });
}

// Update UI
function updateUI() {
    updateSaldo();
    updateLimit();
    updateSummary();
    renderTransactions();
    updateLastUpdate();
}

// Update Saldo
function updateSaldo() {
    document.getElementById('current-saldo').textContent = `Rp ${formatRupiah(appData.saldo)}`;
}

// Update Last Update
function updateLastUpdate() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const dateString = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    document.getElementById('last-update').textContent = `Terakhir diperbarui: ${dateString}, ${timeString}`;
}

// Update Limit
function updateLimit() {
    const limitDisplay = document.getElementById('limit-amount-display');
    const limitStatus = document.getElementById('limit-bulanan-status');
    const motivasiText = document.getElementById('motivasi-text');
    const progressBar = document.getElementById('limit-progress-bar');
    
    limitDisplay.textContent = formatRupiah(appData.limitBulanan);
    
    if (appData.limitBulanan > 0) {
        const now = new Date();
        const monthlyExpenses = appData.transactions
            .filter(t => {
                const transDate = new Date(t.date);
                return t.type === 'expense' && 
                       transDate.getMonth() === now.getMonth() && 
                       transDate.getFullYear() === now.getFullYear();
            })
            .reduce((sum, t) => sum + t.amount, 0);
        
        const percentage = (monthlyExpenses / appData.limitBulanan) * 100;
        const remaining = appData.limitBulanan - monthlyExpenses;
        
        progressBar.style.width = `${Math.min(percentage, 100)}%`;
        
        if (percentage < 50) {
            limitStatus.textContent = 'Aman';
            limitStatus.className = 'font-bold text-accent';
            progressBar.className = 'bg-accent h-2 rounded-full transition-all';
            motivasiText.textContent = `Bagus! Sisa limit Rp ${formatRupiah(remaining)}`;
        } else if (percentage < 80) {
            limitStatus.textContent = 'Hati-hati';
            limitStatus.className = 'font-bold text-yellow-500';
            progressBar.className = 'bg-yellow-500 h-2 rounded-full transition-all';
            motivasiText.textContent = `Perhatikan pengeluaran! Sisa Rp ${formatRupiah(remaining)}`;
        } else if (percentage < 100) {
            limitStatus.textContent = 'Bahaya';
            limitStatus.className = 'font-bold text-red-500';
            progressBar.className = 'bg-red-500 h-2 rounded-full transition-all';
            motivasiText.textContent = `Hampir habis! Sisa Rp ${formatRupiah(remaining)}`;
        } else {
            limitStatus.textContent = 'Melewati Limit';
            limitStatus.className = 'font-bold text-red-600';
            progressBar.className = 'bg-red-600 h-2 rounded-full transition-all';
            motivasiText.textContent = `Anda sudah melewati limit sebesar Rp ${formatRupiah(Math.abs(remaining))}!`;
        }
    } else {
        limitStatus.textContent = '-';
        limitStatus.className = 'font-bold text-gray-400';
        progressBar.style.width = '0%';
        motivasiText.textContent = 'Atur Limit Bulanan Anda di Pengaturan!';
    }
}

// Update Summary
function updateSummary() {
    const filtered = getFilteredTransactions();
    const filter = document.getElementById('filter-select').value;
    
    const periodNames = {
        today: 'Hari Ini',
        week: 'Minggu Ini',
        month: 'Bulan Ini',
        year: 'Tahun Ini',
        all: 'Semua Waktu'
    };
    
    document.getElementById('summary-period').textContent = periodNames[filter];
    
    const income = filtered
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = filtered
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    document.getElementById('summary-income').textContent = `Rp ${formatRupiah(income)}`;
    document.getElementById('summary-expense').textContent = `Rp ${formatRupiah(expense)}`;
}

// Render Transactions
function renderTransactions() {
    const list = document.getElementById('transaction-list');
    const noTransactions = document.getElementById('no-transactions');
    const filtered = getFilteredTransactions();
    
    if (filtered.length === 0) {
        list.innerHTML = '';
        noTransactions.classList.remove('hidden');
        return;
    }
    
    noTransactions.classList.add('hidden');
    list.innerHTML = filtered.map(t => `
        <li class="flex justify-between items-center">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-100' : 'bg-red-100'}">
                    <i class="fas fa-${t.type === 'income' ? 'arrow-down' : 'arrow-up'} text-${t.type === 'income' ? 'accent' : 'red-500'}"></i>
                </div>
                <div>
                    <p class="font-semibold text-gray-800">${t.description}</p>
                    <p class="text-xs text-gray-500">${t.category} • ${formatDate(t.date)}</p>
                </div>
            </div>
            <div class="text-right flex items-center gap-2">
                <p class="font-bold ${t.type === 'income' ? 'text-accent' : 'text-red-500'}">
                    ${t.type === 'income' ? '+' : '-'}Rp ${formatRupiah(t.amount)}
                </p>
                <button onclick="deleteTransaction(${t.id})" class="text-gray-400 hover:text-red-500 transition-colors">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </li>
    `).join('');
}

// Save Dream
function saveDream(event) {
    event.preventDefault();
    
    const name = document.getElementById('dream-name').value;
    const target = parseFloat(document.getElementById('dream-target').value);
    const current = parseFloat(document.getElementById('dream-current').value);
    
    if (!name || !target || current < 0) {
        showToast('Mohon lengkapi semua field!');
        return;
    }
    
    const dream = {
        id: Date.now(),
        name: name,
        target: target,
        current: current
    };
    
    appData.dreams.push(dream);
    saveData();
    closeModal('modal-edit-dream');
    renderDreams();
    showToast('Impian berhasil ditambahkan!');
}

// Delete Dream
function deleteDream(id) {
    if (confirm('Yakin ingin menghapus impian ini?')) {
        appData.dreams = appData.dreams.filter(d => d.id !== id);
        saveData();
        renderDreams();
        showToast('Impian berhasil dihapus!');
    }
}

// Update Dream Progress
function updateDreamProgress(id, amount) {
    const dream = appData.dreams.find(d => d.id === id);
    if (dream) {
        dream.current = parseFloat(amount);
        if (dream.current > dream.target) {
            dream.current = dream.target;
        }
        saveData();
        renderDreams();
    }
}

// Render Dreams
function renderDreams() {
    const container = document.getElementById('dream-list');
    const noDreams = document.getElementById('no-dreams');
    
    if (appData.dreams.length === 0) {
        container.innerHTML = '';
        noDreams.classList.remove('hidden');
        return;
    }
    
    noDreams.classList.add('hidden');
    container.innerHTML = appData.dreams.map(d => {
        const percentage = Math.min((d.current / d.target) * 100, 100);
        const remaining = d.target - d.current;
        const isComplete = percentage >= 100;
        
        return `
            <div class="dream-card">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h3 class="font-bold text-lg text-gray-800">${d.name}</h3>
                        <p class="text-sm text-gray-500">Target: Rp ${formatRupiah(d.target)}</p>
                    </div>
                    <button onclick="deleteDream(${d.id})" class="text-gray-400 hover:text-red-500 transition-colors">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                
                <div class="mb-3">
                    <div class="flex justify-between text-sm mb-1">
                        <span class="text-gray-600">Progress</span>
                        <span class="font-semibold ${isComplete ? 'text-accent' : 'text-primary'}">${percentage.toFixed(0)}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div class="h-3 rounded-full transition-all ${isComplete ? 'bg-accent' : 'bg-primary'}" style="width: ${percentage}%"></div>
                    </div>
                </div>
                
                <div class="flex justify-between items-center mb-3">
                    <div>
                        <p class="text-xs text-gray-500">Terkumpul</p>
                        <p class="font-bold text-gray-800">Rp ${formatRupiah(d.current)}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-gray-500">Sisa</p>
                        <p class="font-bold ${isComplete ? 'text-accent' : 'text-gray-800'}">
                            ${isComplete ? 'Tercapai! 🎉' : `Rp ${formatRupiah(remaining)}`}
                        </p>
                    </div>
                </div>
                
                ${!isComplete ? `
                    <div class="flex gap-2">
                        <input type="number" id="dream-add-${d.id}" min="0" placeholder="Tambah tabungan" class="flex-1 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary">
                        <button onclick="addToDream(${d.id})" class="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Add to Dream
function addToDream(id) {
    const input = document.getElementById(`dream-add-${id}`);
    const amount = parseFloat(input.value);
    
    if (!amount || amount <= 0) {
        showToast('Masukkan jumlah yang valid!');
        return;
    }
    
    const dream = appData.dreams.find(d => d.id === id);
    if (dream) {
        dream.current += amount;
        if (dream.current > dream.target) {
            dream.current = dream.target;
        }
        saveData();
        renderDreams();
        showToast(`Berhasil menambah Rp ${formatRupiah(amount)} ke ${dream.name}!`);
    }
}

// Render Analysis
function renderAnalysis() {
    renderCategoryChart();
    renderTrendChart();
    renderCategoryBreakdown();
}

// Render Category Chart
function renderCategoryChart() {
    const ctx = document.getElementById('chart-kategori');
    
    const expenses = appData.transactions.filter(t => t.type === 'expense');
    
    const categoryData = {};
    expenses.forEach(t => {
        categoryData[t.category] = (categoryData[t.category] || 0) + t.amount;
    });
    
    const labels = Object.keys(categoryData);
    const data = Object.values(categoryData);
    
    if (charts.kategori) {
        charts.kategori.destroy();
    }
    
    if (labels.length === 0) {
        ctx.parentElement.innerHTML = '<p class="text-center text-gray-400 py-8">Belum ada data pengeluaran</p>';
        return;
    }
    
    charts.kategori = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#ef4444', '#f97316', '#f59e0b', '#eab308', 
                    '#84cc16', '#22c55e', '#10b981', '#14b8a6',
                    '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Render Trend Chart
function renderTrendChart() {
    const ctx = document.getElementById('chart-trend');
    
    const monthlyData = {};
    
    appData.transactions.forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { income: 0, expense: 0 };
        }
        
        if (t.type === 'income') {
            monthlyData[monthKey].income += t.amount;
        } else {
            monthlyData[monthKey].expense += t.amount;
        }
    });
    
    const sortedMonths = Object.keys(monthlyData).sort();
    const last6Months = sortedMonths.slice(-6);
    
    const incomeData = last6Months.map(m => monthlyData[m].income);
    const expenseData = last6Months.map(m => monthlyData[m].expense);
    
    const labels = last6Months.map(m => {
        const [year, month] = m.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    });
    
    if (charts.trend) {
        charts.trend.destroy();
    }
    
    if (labels.length === 0) {
        ctx.parentElement.innerHTML = '<p class="text-center text-gray-400 py-8">Belum ada data transaksi</p>';
        return;
    }
    
    charts.trend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Pemasukan',
                    data: incomeData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Pengeluaran',
                    data: expenseData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'Rp ' + formatRupiah(value);
                        }
                    }
                }
            }
        }
    });
}

// Render Category Breakdown
function renderCategoryBreakdown() {
    const container = document.getElementById('category-breakdown');
    
    const expenses = appData.transactions.filter(t => t.type === 'expense');
    
    const categoryData = {};
    let total = 0;
    
    expenses.forEach(t => {
        categoryData[t.category] = (categoryData[t.category] || 0) + t.amount;
        total += t.amount;
    });
    
    const sorted = Object.entries(categoryData).sort((a, b) => b[1] - a[1]);
    
    if (sorted.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-8">Belum ada data pengeluaran</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="bg-white p-4 rounded-xl shadow-md border border-gray-200">
            <h3 class="font-bold text-gray-700 mb-3">Detail Pengeluaran per Kategori</h3>
            <div class="space-y-3">
                ${sorted.map(([category, amount]) => {
                    const percentage = ((amount / total) * 100).toFixed(1);
                    return `
                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <span class="text-sm font-semibold text-gray-700">${category}</span>
                                <span class="text-sm font-bold text-gray-800">Rp ${formatRupiah(amount)}</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-primary h-2 rounded-full" style="width: ${percentage}%"></div>
                            </div>
                            <p class="text-xs text-gray-500 mt-1">${percentage}% dari total pengeluaran</p>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// Save Settings
function saveSettings(event) {
    event.preventDefault();
    
    const limit = parseFloat(document.getElementById('settings-limit').value) || 0;
    const saldo = parseFloat(document.getElementById('settings-saldo').value) || 0;
    
    appData.limitBulanan = limit;
    appData.saldo = saldo;
    
    saveData();
    updateUI();
    closeModal('modal-edit-settings');
    showToast('Pengaturan berhasil disimpan!');
}

// Reset All Data
function resetAllData() {
    appData = {
        saldo: 0,
        limitBulanan: 0,
        transactions: [],
        dreams: [],
        categories: {
            income: ['Gaji', 'Bonus', 'Investasi', 'Lainnya'],
            expense: ['Makanan', 'Transport', 'Belanja', 'Tagihan', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Lainnya']
        }
    };
    
    saveData();
    updateUI();
    closeModal('modal-confirm-reset');
    closeModal('modal-edit-settings');
    showToast('Semua data berhasil direset!');
    
    setTimeout(() => {
        location.reload();
    }, 1000);
}

// Close modal when clicking outside
document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal.id);
        }
    });
});/* script.js — tidak diubah (pakai punyamu) */
