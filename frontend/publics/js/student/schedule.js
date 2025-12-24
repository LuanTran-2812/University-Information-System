async function initSchedulePage() {
    /* =========================
       MOCK DATA
       ========================= */
    const lessons = [
        { date: "2025-10-03", subject: "Giải tích 1", semester: "hk251" },
        { date: "2025-10-05", subject: "Hóa đại cương", semester: "hk251" },
        { date: "2025-10-12", subject: "Vật lý 1", semester: "hk251" },
        { date: "2025-06-20", subject: "Nhập môn điện toán", semester: "hk243" },
        { date: "2025-06-25", subject: "Anh văn 1", semester: "hk243" },
    ];

    /* =========================
       State
       ========================= */
    let currentDate = new Date();
    let currentView = 'month';

    /* =========================
       DOM Elements
       ========================= */
    const container = document.querySelector('.calendar-container');
    const calendarGrid = document.querySelector('.calendar-grid'); 
    const calendarDays = document.getElementById('calendar-days');
    const monthYearLabel = document.getElementById('current-month-year');
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    const selectTrigger = document.querySelector('.custom-select-trigger');
    const selectMenu = document.querySelector('.custom-select-menu');
    const selectedText = document.getElementById('selected-semester-text');
    const weekdaysRow = document.querySelector(".weekdays");

    /* =========================
       Helper functions
       ========================= */
    function pad(n){ return String(n).padStart(2,'0'); }
    function formatDateObj(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
    function formatYMD(y,m,d){ return `${y}-${pad(m+1)}-${pad(d)}`; }
    function monthName(monthIndex){
        const names = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6",
                       "Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];
        return names[monthIndex];
    }
    function clearChildren(el){ while(el.firstChild) el.removeChild(el.firstChild); }
    function getStartOfWeek(date){
        const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const day = d.getDay();
        const diff = (day === 0) ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        return d;
    }

    /* =========================
       RENDERERS
       ========================= */
    function renderMonthView(date, lessonData){
        currentView = 'month';
        if (weekdaysRow) weekdaysRow.style.display = 'grid';

        currentDate = date || currentDate;
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        monthYearLabel.innerText = `${monthName(month)} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        calendarDays.innerHTML = '';
        const startDay = firstDay === 0 ? 6 : firstDay - 1;

        // ô trống đầu tháng
        for(let i=0;i<startDay;i++){
            const empty = document.createElement('div');
            empty.classList.add('day-cell', 'other-month');
            calendarDays.appendChild(empty);
        }

        for(let d=1; d<=daysInMonth; d++){
            const cell = document.createElement('div');
            cell.classList.add('day-cell');

            const dayNum = document.createElement('div');
            dayNum.classList.add('day-number');
            dayNum.innerText = d;
            cell.appendChild(dayNum);

            const dateStr = formatYMD(year, month, d);
            const dayLessons = lessonData.filter(l => l.date === dateStr);

            dayLessons.forEach(l => {
                const ev = document.createElement('div');
                ev.classList.add('event-box', 'event-blue');
                ev.innerText = l.subject;
                cell.appendChild(ev);
            });

            calendarDays.appendChild(cell);
        }
    }

    function renderWeekView(date, lessonData){
        currentView = 'week';
        if (weekdaysRow) weekdaysRow.style.display = 'none';

        const start = getStartOfWeek(date);
        const end = new Date(start);
        end.setDate(start.getDate()+6);
        monthYearLabel.innerText = `Tuần ${start.getDate()}/${start.getMonth()+1} — ${end.getDate()}/${end.getMonth()+1}`;

        clearChildren(calendarDays);
        calendarDays.style.gridTemplateColumns = 'repeat(7, 1fr)';
        calendarDays.style.gridTemplateRows = '1fr';

        for(let i=0;i<7;i++){
            const d = new Date(start);
            d.setDate(start.getDate()+i);
            const cell = document.createElement('div');
            cell.className = 'day-cell';
            const dn = document.createElement('div');
            dn.className = 'day-number';
            dn.innerText = `${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]} ${d.getDate()}`;
            cell.appendChild(dn);

            const dateStr = formatDateObj(d);
            const dayLessons = lessonData.filter(l => l.date === dateStr);
            dayLessons.forEach(l => {
                const ev = document.createElement('div');
                ev.className = 'event-box';
                ev.innerText = l.subject;
                cell.appendChild(ev);
            });

            calendarDays.appendChild(cell);
        }
    }

    function renderYearView(){
        currentView = 'year';
        if (weekdaysRow) weekdaysRow.style.display = 'none';
        calendarDays.innerHTML = '';
        const year = currentDate.getFullYear();
        monthYearLabel.innerText = `${year}`;

        for(let m=1;m<=12;m++){
            const cell = document.createElement('div');
            cell.classList.add('day-cell');
            cell.style.cursor = 'pointer';
            cell.innerHTML = `<div class="day-number">Tháng ${m}</div>`;
            calendarDays.appendChild(cell);

            cell.addEventListener('click', ()=> {
                const newDate = new Date(year, m-1, 1);
                filterAndRender(newDate);
            });
        }
    }

    /* =========================
       FILTER & RENDER
       ========================= */
    function getFilteredLessons(){
        const semester = (selectedText?.innerText || '').toLowerCase().replace('chọn học kỳ','').trim();
        return lessons.filter(l => !semester || l.semester.toLowerCase() === semester);
    }

    function filterAndRender(date){
        const filtered = getFilteredLessons();
        const targetDate = date || currentDate;
        if(currentView==='month') renderMonthView(targetDate, filtered);
        else if(currentView==='week') renderWeekView(targetDate, filtered);
        else if(currentView==='year') renderYearView();
    }

    /* =========================
       Prev / Next Buttons
       ========================= */
    prevBtn.addEventListener('click', ()=>{
        if(currentView==='month') currentDate.setMonth(currentDate.getMonth()-1);
        else if(currentView==='week') currentDate.setDate(currentDate.getDate()-7);
        else if(currentView==='year') currentDate.setFullYear(currentDate.getFullYear()-1);
        filterAndRender();
    });

    nextBtn.addEventListener('click', ()=>{
        if(currentView==='month') currentDate.setMonth(currentDate.getMonth()+1);
        else if(currentView==='week') currentDate.setDate(currentDate.getDate()+7);
        else if(currentView==='year') currentDate.setFullYear(currentDate.getFullYear()+1);
        filterAndRender();
    });

    /* =========================
       Semester selection
       ========================= */
    if(selectTrigger && selectMenu){
        selectTrigger.addEventListener('click', e=>{
            e.stopPropagation();
            selectMenu.style.display = selectMenu.style.display==='block'?'none':'block';
        });
        document.addEventListener('click', e=>{
            if(!e.target.closest('.custom-select-wrapper')) selectMenu.style.display='none';
        });
        document.querySelectorAll('.custom-option').forEach(opt=>{
            opt.addEventListener('click', ()=>{
                selectedText.innerText = opt.innerText;
                selectMenu.style.display='none';
                filterAndRender();
            });
        });
    }

    /* =========================
       Init
       ========================= */
    filterAndRender();
}

if(typeof window!=='undefined') window.initSchedulePage = initSchedulePage;
