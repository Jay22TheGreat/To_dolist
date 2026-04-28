document.addEventListener('DOMContentLoaded', () => {
    const mainTasksList = document.getElementById('main-tasks-list');
    const fab = document.querySelector('.fab');

    // Make current date look nice
    const currentDateSpan = document.getElementById('current-date-span');
    if (currentDateSpan) {
        const d = new Date();
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dateStr = `- ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}, ${days[d.getDay()]}`;
        currentDateSpan.textContent = dateStr;
    }

    // Toggle task completion and Handle Deletion (Delegated to both lists)
    document.addEventListener('click', (e) => {
        // We only care if it's inside a tasks container
        if (!e.target.closest('.tasks-scroll-area')) return;

        const taskCard = e.target.closest('.task-card');
        if (!taskCard) return;

        // Check if delete button was clicked
        if (e.target.closest('.delete-btn')) {
            taskCard.remove();
            if (calendarGrid) generateCalendar(); // Refresh calendar dots
            return;
        }

        if (e.target.closest('.custom-checkbox')) {
            // Let the default click happen, but we style the card
            setTimeout(() => {
                const checkbox = taskCard.querySelector('input[type="checkbox"]');
                if (checkbox.checked) {
                    taskCard.classList.add('active');
                } else {
                    taskCard.classList.remove('active');
                }
            }, 10);
        }
    });

    function filterTasks(category) {
        const tasks = document.querySelectorAll('#main-tasks-list .task-card');
        tasks.forEach(task => {
            if (task.dataset.category === category || category === 'All') {
                task.style.display = 'flex';
            } else {
                task.style.display = 'none';
            }
        });
    }

    // Modal Logic
    const addTaskModal = document.getElementById('add-task-modal');
    const cancelTaskBtn = document.getElementById('cancel-task-btn');
    const saveTaskBtn = document.getElementById('save-task-btn');
    const newTaskName = document.getElementById('new-task-name');
    const newTaskDate = document.getElementById('new-task-date');

    fab.addEventListener('click', () => {
        addTaskModal.classList.remove('hidden');
        newTaskName.focus();
    });

    function closeModal() {
        addTaskModal.classList.add('hidden');
        newTaskName.value = '';
        newTaskDate.value = '';
    }

    cancelTaskBtn.addEventListener('click', closeModal);

    saveTaskBtn.addEventListener('click', () => {
        const taskText = newTaskName.value.trim();
        const dateVal = newTaskDate.value; // YYYY-MM-DD

        if (taskText !== '') {
            const activePill = document.querySelector('.pill.active');
            const activeCategory = activePill ? activePill.querySelector('span').textContent.trim() : 'Uncategorized';

            // Format date for UI
            let dateDisplay = '';
            if (dateVal) {
                const parts = dateVal.split('-');
                if (parts.length === 3) {
                    dateDisplay = `Due: ${parts[2]}.${parts[1]}`;
                }
            }

            const newTaskHTML = `
                <div class="task-card" data-category="${activeCategory}" data-deadline="${dateVal}">
                    <div class="task-info">
                        <span class="task-text">${taskText}</span>
                        <span class="task-deadline">${dateDisplay}</span>
                    </div>
                    <div class="task-actions">
                        <i class="fa-solid fa-trash delete-btn"></i>
                        <label class="custom-checkbox">
                            <input type="checkbox">
                            <span class="checkmark"><i class="fa-solid fa-check"></i></span>
                        </label>
                    </div>
                </div>
            `;

            mainTasksList.insertAdjacentHTML('afterbegin', newTaskHTML);
            closeModal();

            // Re-apply filter just in case
            if (activePill) filterTasks(activeCategory);

            // Regenerate calendar to add dot if necessary
            if (calendarGrid) generateCalendar();
        }
    });

    const categoryContainer = document.querySelector('.category-pills');
    const addNewCategoryBtn = document.querySelector('.add-new-btn');

    // Add new category
    addNewCategoryBtn.addEventListener('click', () => {
        const catName = prompt('Enter new category name:');
        if (catName && catName.trim() !== '') {
            const newCat = document.createElement('div');
            newCat.className = 'pill';
            newCat.innerHTML = `<span>${catName.trim()}</span><i class="fa-solid fa-xmark remove-category"></i>`;
            categoryContainer.appendChild(newCat);
        }
    });

    // Category Selection and Deletion Logic
    categoryContainer.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-category');
        const pill = e.target.closest('.pill');

        if (!pill) return;

        if (removeBtn) {
            const catName = pill.querySelector('span').textContent.trim();
            if (confirm(`Remove category "${catName}" and all its tasks?`)) {
                pill.remove();
                const tasksToDelete = document.querySelectorAll(`#main-tasks-list .task-card[data-category="${catName}"]`);
                tasksToDelete.forEach(t => t.remove());

                if (pill.classList.contains('active')) {
                    const firstPill = categoryContainer.querySelector('.pill');
                    if (firstPill) {
                        firstPill.classList.add('active');
                        filterTasks(firstPill.querySelector('span').textContent.trim());
                    } else {
                        filterTasks('');
                    }
                }
                if (calendarGrid) generateCalendar();
            }
            return;
        }

        const allPills = categoryContainer.querySelectorAll('.pill');
        allPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        const selectedCategory = pill.querySelector('span').textContent.trim();
        filterTasks(selectedCategory);
    });

    // Initial filter execution based on active pill
    const initialActivePill = document.querySelector('.pill.active');
    if (initialActivePill) {
        const initialCategory = initialActivePill.querySelector('span').textContent.trim();
        filterTasks(initialCategory);
    }

    // Weather Fetching Logic
    const weatherWidget = document.getElementById('weather-widget');

    function getWeatherEmoji(weathercode) {
        if (weathercode === 0) return '☀️';
        if (weathercode === 1 || weathercode === 2 || weathercode === 3) return '⛅';
        if (weathercode >= 45 && weathercode <= 48) return '🌫️';
        if (weathercode >= 51 && weathercode <= 67) return '🌧️';
        if (weathercode >= 71 && weathercode <= 77) return '❄️';
        if (weathercode >= 80 && weathercode <= 82) return '🌦️';
        if (weathercode >= 85 && weathercode <= 86) return '🌨️';
        if (weathercode >= 95) return '⛈️';
        return '🌡️';
    }

    function fetchWeather(lat, lon) {
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
            .then(response => response.json())
            .then(data => {
                const temp = Math.round(data.current_weather.temperature);
                const code = data.current_weather.weathercode;
                const emoji = getWeatherEmoji(code);
                weatherWidget.textContent = `${temp}°C ${emoji}`;
            })
            .catch(error => {
                console.error("Error fetching weather:", error);
                weatherWidget.textContent = "Weather Error ⚠️";
            });
    }

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                fetchWeather(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                console.warn("Geolocation denied or failed:", error);
                // Fallback to New York
                fetchWeather(40.7128, -74.0060);
            }
        );
    } else {
        weatherWidget.textContent = "No Geolocation 🚫";
    }

    // --- Navigation Logic ---
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.id;

            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            views.forEach(view => view.classList.remove('active'));
            if (targetId === 'nav-calendar') {
                document.getElementById('calendar-view').classList.add('active');
                generateCalendar(); // refresh dots
            }
            if (targetId === 'nav-tasks') document.getElementById('tasks-view').classList.add('active');
            if (targetId === 'nav-notes') document.getElementById('notes-view').classList.add('active');
        });
    });

    // --- Calendar Generation Logic ---
    const calendarGrid = document.getElementById('calendar-grid');
    const calendarMonthYear = document.getElementById('calendar-month-year');

    let currentMonthOffset = 0;
    let selectedDateStr = null;

    function generateCalendar() {
        const today = new Date();
        const targetDate = new Date(today.getFullYear(), today.getMonth() + currentMonthOffset, 1);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth(); // 0-11

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        calendarMonthYear.textContent = `${monthNames[month]} ${year}`;

        let firstDay = new Date(year, month, 1).getDay();
        firstDay = firstDay === 0 ? 7 : firstDay;

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        calendarGrid.innerHTML = '';

        // Find all deadlines from tasks
        const mainTasks = document.querySelectorAll('#main-tasks-list .task-card');
        const deadlines = Array.from(mainTasks).map(t => t.dataset.deadline).filter(d => d);

        // Previous month days
        for (let i = 1; i < firstDay; i++) {
            const dayNum = daysInPrevMonth - firstDay + i + 1;
            calendarGrid.innerHTML += `<div class="cal-day muted">${dayNum}</div>`;
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const hasTaskClass = deadlines.includes(dateStr) ? 'has-task' : '';

            let extraClasses = '';
            // Visual flourishes to match the design sample
            if (i === 3) extraClasses += ' event-span start';
            if (i === 4) extraClasses += ' event-span';
            if (i === 5 || i === 6) extraClasses += ' event-span';
            if (i === 7) extraClasses += ' event-span end darker';
            if (i === 23 || i === 24) extraClasses += ' hollow';

            // Highlight selected day, or today if nothing selected
            if (selectedDateStr === dateStr) {
                extraClasses += ' active';
            } else if (!selectedDateStr && i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                extraClasses += ' active';
            }

            calendarGrid.innerHTML += `<div class="cal-day ${extraClasses} ${hasTaskClass}" data-date="${dateStr}">${i}</div>`;
        }

        const totalCells = (firstDay - 1) + daysInMonth;
        const remainingCells = 42 - totalCells;
        for (let i = 1; i <= remainingCells; i++) {
            calendarGrid.innerHTML += `<div class="cal-day muted">${i}</div>`;
        }
    }

    if (calendarGrid) generateCalendar();

    // Calendar arrow navigation
    const prevMonthBtn = document.querySelector('.calendar-header-top .fa-chevron-left');
    const nextMonthBtn = document.querySelector('.calendar-header-top .fa-chevron-right');

    if (prevMonthBtn && nextMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentMonthOffset--;
            generateCalendar();
        });
        nextMonthBtn.addEventListener('click', () => {
            currentMonthOffset++;
            generateCalendar();
        });
    }

    // Calendar interaction
    if (calendarGrid) {
        calendarGrid.addEventListener('click', (e) => {
            const day = e.target.closest('.cal-day');
            if (day && !day.classList.contains('muted')) {
                selectedDateStr = day.dataset.date;
                const allDays = calendarGrid.querySelectorAll('.cal-day');
                allDays.forEach(d => d.classList.remove('active', 'selected'));
                day.classList.add('active');

                // Filter calendar tasks
                const dateStr = day.dataset.date;
                const calTasksList = document.getElementById('calendar-tasks-list');
                calTasksList.innerHTML = '';

                const mainTasks = document.querySelectorAll('#main-tasks-list .task-card');
                let found = false;
                mainTasks.forEach(task => {
                    if (task.dataset.deadline === dateStr) {
                        calTasksList.appendChild(task.cloneNode(true));
                        found = true;
                    }
                });

                if (!found) {
                    calTasksList.innerHTML = '<p style="text-align:center; color:var(--text-secondary); font-size:13px; margin-top:20px;">No tasks due on this date.</p>';
                }
            }
        });
    }

    // --- Notes Interaction ---
    const addNoteIcon = document.querySelector('.add-note-icon');
    const notesContainer = document.querySelector('.notes-scroll-area');

    // Note Modal Elements
    const addNoteModal = document.getElementById('add-note-modal');
    const cancelNoteBtn = document.getElementById('cancel-note-btn');
    const saveNoteBtn = document.getElementById('save-note-btn');
    const newNoteTitle = document.getElementById('new-note-title');
    const newNoteBody = document.getElementById('new-note-body');

    if (addNoteIcon && notesContainer && addNoteModal) {
        addNoteIcon.addEventListener('click', () => {
            addNoteModal.classList.remove('hidden');
            newNoteTitle.focus();
        });

        function closeNoteModal() {
            addNoteModal.classList.add('hidden');
            newNoteTitle.value = '';
            newNoteBody.value = '';
        }

        cancelNoteBtn.addEventListener('click', closeNoteModal);

        saveNoteBtn.addEventListener('click', () => {
            const titleText = newNoteTitle.value.trim();
            const bodyText = newNoteBody.value.trim() || 'No content...';

            if (titleText !== '') {
                const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }).replace('/', '.');

                const newNote = `
                    <div class="note-card">
                        <div class="note-top">
                            <h3 class="note-title">${titleText}</h3>
                            <span class="note-date">${todayStr}</span>
                        </div>
                        <div class="note-body">
                            <p>${bodyText.replace(/\n/g, '<br>')}</p>
                            <div class="note-select-circle"></div>
                        </div>
                    </div>
                `;
                notesContainer.insertAdjacentHTML('afterbegin', newNote);
                closeNoteModal();

                const noteH1 = document.querySelector('.notes-header h1');
                if (noteH1) {
                    const countMatch = noteH1.textContent.match(/\d+/);
                    if (countMatch) {
                        const newCount = parseInt(countMatch[0]) + 1;
                        noteH1.textContent = `Notes (${newCount})`;
                    }
                }
            }
        });

        notesContainer.addEventListener('click', (e) => {
            const card = e.target.closest('.note-card');
            if (card) {
                const allNotes = notesContainer.querySelectorAll('.note-card');
                allNotes.forEach(n => {
                    n.classList.remove('active');
                    const circle = n.querySelector('.note-select-circle');
                    if (circle) circle.classList.remove('selected');
                });
                card.classList.add('active');
                const circle = card.querySelector('.note-select-circle');
                if (circle) circle.classList.add('selected');
            }
        });
    }
});
