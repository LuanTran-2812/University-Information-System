// --- HÀM TẢI VÀ CẬP NHẬT THỐNG KÊ (DỮ LIỆU SỐ) ---
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

// ----------------------------------------------------------------
// --- HÀM TẢI VÀ CẬP NHẬT BIỂU ĐỒ LỊCH HỌC TRONG TUẦN ---
// ----------------------------------------------------------------

/**
 * Hàm làm tròn giá trị lớn nhất của trục Y lên bội số của 10 gần nhất (hoặc lớn hơn 5 nếu cần).
 * @param {number} max - Giá trị lớn nhất trong dữ liệu.
 * @returns {number} Giá trị tối đa cho trục Y (ví dụ: 50, 60, 100, ...).
 */
function calculateChartMaxY(max) {
    if (max <= 0) return 10; // Trường hợp không có dữ liệu
    // Làm tròn lên bội số của 10. Ví dụ: 43 -> 50, 50 -> 50, 51 -> 60.
    return Math.ceil(max / 10) * 10; 
}


async function updateWeeklyScheduleChart() {
    const chartArea = document.querySelector('.chart-area'); // Target cha của bar-group
    const yAxisContainer = document.querySelector('.y-axis'); // Target container trục Y
    if (!chartArea || !yAxisContainer) return;

    try {
        const response = await fetch('http://localhost:8000/api/dashboard/weekly-schedule');
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            const weeklyData = result.data;
            const barGroup = chartArea.querySelector('.bar-group');

            // 1. TÍNH TOÁN GIÁ TRỊ LỚN NHẤT
            const counts = weeklyData.map(item => item.count);
            const maxCount = Math.max(...counts);
            const chartMaxY = calculateChartMaxY(maxCount); // Tính toán giá trị Y max (ví dụ: 50)
            
            // Số lượng khoảng chia Y (ví dụ: 50, 40, 30, 20, 10, 0 là 5 khoảng, cần 6 nhãn)
            const NUM_INTERVALS = 5; 
            const intervalStep = chartMaxY / NUM_INTERVALS; // Khoảng cách giữa các nhãn (ví dụ: 10)
            
            // 2. CẬP NHẬT TRỤC Y (Y-AXIS LABELS)
            let yAxisHTML = '';
            // Lặp từ giá trị lớn nhất xuống 0
            for (let i = 0; i <= NUM_INTERVALS; i++) {
                const value = chartMaxY - (i * intervalStep);
                yAxisHTML += `<span>${value}</span>`;
            }
            yAxisContainer.innerHTML = yAxisHTML;
            
            // 3. CẬP NHẬT ĐƯỜNG LƯỚI (GRID LINES)
            // Khi chia thành NUM_INTERVALS khoảng, vẽ đường tại mọi vạch: 0%, step%, ..., 100%
            let gridLineHTML = '';
            for (let i = 0; i <= NUM_INTERVALS; i++) {
                const percent = (i / NUM_INTERVALS) * 100;
                const extraStyle = i === 0 ? ' background-color: #EFEFEF;' : '';
                gridLineHTML += `<div class="grid-line" style="bottom: ${percent}%;${extraStyle}"></div>`;
            }

            // Xóa các đường cũ và chèn các đường mới
            chartArea.querySelectorAll('.grid-line').forEach(el => el.remove());
            chartArea.insertAdjacentHTML('afterbegin', gridLineHTML);

            // 4. CẬP NHẬT THANH BIỂU ĐỒ (BARS)
            let barGroupHTML = '';

            weeklyData.forEach(item => {
                const day = item.day;
                const count = item.count;
                
                // Tính chiều cao dựa trên chartMaxY đã tính toán
                const heightPercent = Math.min(100, (count / chartMaxY) * 100);

                barGroupHTML += `
                    <div class="bar-wrapper">
                        <div class="bar-tooltip" data-value="${count}">${count}</div>
                        <div class="bar" style="height: ${heightPercent}%;"></div>
                        <span class="bar-label">${day}</span>
                    </div>
                `;
            });
            barGroup.innerHTML = barGroupHTML;

        } else {
             chartArea.querySelector('.bar-group').innerHTML = '<div style="text-align:center; padding: 20px;">Không có dữ liệu lịch học trong tuần.</div>';
        }
    } catch (error) { 
        console.error("Lỗi tải biểu đồ lịch học:", error); 
        chartArea.querySelector('.bar-group').innerHTML = '<div style="text-align:center; padding: 20px; color: #ef4444;">Lỗi kết nối hoặc tải dữ liệu biểu đồ.</div>';
    }
}

async function initDashboardPage() {
    await updateDashboardStats();
    await updateWeeklyScheduleChart();
}

// Export
if (typeof window !== 'undefined') {
    window.updateDashboardStats = updateDashboardStats;
    window.updateWeeklyScheduleChart = updateWeeklyScheduleChart;
    window.initDashboardPage = initDashboardPage;
}