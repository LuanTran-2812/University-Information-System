async function updateDashboardStats() {
    try {
        const response = await fetch('http://localhost:8000/api/dashboard/stats');
        const result = await response.json();
        if (result.success) {
            const ids = ['stat-users', 'stat-subjects', 'stat-classes'];
            const keys = ['users', 'subjects', 'classes'];
            
            ids.forEach((id, index) => {
                const el = document.getElementById(id);
                if (el) el.innerText = result.data[keys[index]];
            });
        }
    } catch (error) { console.error("Lỗi tải thống kê:", error); }
}

// Export để main.js có thể gọi
if (typeof window !== 'undefined') {
    window.updateDashboardStats = updateDashboardStats;
}