function createCategory(categoryId, categoryName) {
    const categoryContainer = document.createElement('section');
    categoryContainer.className = 'taskcat';
    categoryContainer.id = `taskcat-${categoryId}`;

    const categoryWrapper = document.createElement('div');
    categoryWrapper.className = 'taskcat-wrapper';

    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'taskcat-header';

    const categoryTitle = document.createElement('h3');
    categoryTitle.className = 'taskcat-header__title text-clip';
    categoryTitle.innerText = categoryName;
    const categoryContent = document.createElement('div');
    categoryContent.className = 'taskcat-content';

    categoryHeader.appendChild(categoryTitle);
    categoryWrapper.appendChild(categoryHeader);
    categoryWrapper.appendChild(categoryContent);

    categoryContainer.appendChild(categoryWrapper);

    tasklist.appendChild(categoryContainer);
}



// ФУНКЦИИ НИЖЕ ТРЕБУЮТ ПРИВИЛЕГИЙ ПОЛЬЗОВАТЕЛЯ
function updateTasklist() {
    const token = getToken();
    const tasklist = document.querySelector('#tasklist');
    
    if (currentBoard === null) {
        document.querySelector('#tasklist').innerHTML = '<h1 class="tasklist-placeholder">Выберите доску, чтобы начать работу.</h1>';
        return;
    }

    fetch(`../api/board${currentBoard}/submits`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(submitsData => {
        fetch(`../api/board${currentBoard}/tasks`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(tasksData => {
            tasklist.innerHTML = '';
            
            if (tasksData.length > 0) {
                for (const taskData of tasksData) {
                    const submitData = submitsData.filter(submitData => submitData.task_id === taskData.id)[0] || {};

                    createTasklistTask(taskData, submitData);
                }
            }
            else {
                tasklist.innerHTML = '<h2 class="tasklist-placeholder">Похоже, оператор этой доски пока<br>не создал ни одной задачи… пичаль.</h2>';
            }

            if (showActionsForOperator) {
                document.querySelector('#groupinfo-actions').classList.remove('hidden');
                document.querySelector('#boardman-actions__edit-btn').disabled = false;
                document.querySelector('#boardman-actions__delete-btn').disabled = false;
            }
        })
        .catch(error => console.error(error));
    })
}

function createTasklistTask(taskData, submitData) {
    const token = getToken();
    //console.log(taskData, submitData);
    
    // Сперва определяем категорию задачи, исходя из
    // статуса посылки в submitData (если есть)...
    let categoryId = 'unknown', categoryName = '⁉️ Неизвестно';
    if (!submitData.status || submitData.status === undefined) {
        categoryId = 'to-do';
        categoryName = '⚒️ К выполнению';
    }
    else {
        if (submitData.status === 'pending') {
            categoryId = 'pending';
            categoryName = '🐝 На рассмотрении…';
        }
        else if (submitData.status === 'accepted') {
            categoryId = 'accepted';
            categoryName = '🏆 ПРИНЯТО!';
        }
        else if (submitData.status === 'rejected') {
            categoryId = 'rejected';
            categoryName = '🗿 Отклонено';
        }
    }

    // Затем создаем задачу в соответствующей категории,
    // элемент за элементов (ну а **ли, на чистом JSе же пишем)...
    let category = document.querySelector(`#taskcat-${categoryId}`);
    if (!category) {
        createCategory(categoryId, categoryName);
        category = document.querySelector(`#taskcat-${categoryId}`);
    }

    const taskContainer = document.createElement('article');
    taskContainer.className = 'task';

    const taskContent = document.createElement('div');
    taskContent.className = 'task-content';

    const taskTitle = document.createElement('h3');
    taskTitle.className = 'task-content__title text-clip';
    taskTitle.innerText = taskData.title;
    taskContent.appendChild(taskTitle);

    const taskText = document.createElement('p');
    taskText.className = 'task-content__text text-clip';
    taskText.innerText = taskData.body;
    taskContent.appendChild(taskText);

    const taskDue = document.createElement('i');
    taskDue.className = 'task-content__due';

    if (taskData.date_due !== null) {
    const taskDueDate = ISOtoDDMMYY(taskData.date_due);
        taskDue.innerText = `Срок сдачи: ДО ${taskDueDate}`;

        if (checkIfOutdated(taskData.date_due)) {
            taskDue.classList.add('task-outdated');
        }
    }
    taskContent.appendChild(taskDue);

    taskContent.onclick = () => {
        taskmanGetInfo(taskData.id, submitData.status);
        openTaskmanView();
    }

    taskContainer.appendChild(taskContent);

    // Наконец, если пользователь является оператором,
    // добавляем специальные кнопки управления задачей.
    if (showActionsForOperator) {
        const taskActions = document.createElement('div');
        taskActions.className = 'task-actions';

        const taskActionsEdit = document.createElement('button');
        taskActionsEdit.className = 'task-actions__edit';
        taskActionsEdit.innerText = 'Изменить';
        taskActionsEdit.onclick = () => tasklistEditTask(taskData.id);

        const taskActionsDelete = document.createElement('button');
        taskActionsDelete.className = 'task-actions__delete';
        taskActionsDelete.innerText = 'Удалить';
        taskActionsDelete.onclick = () => tasklistDeleteTask(taskData.id);

        const taskActionsSubmits = document.createElement('button');
        taskActionsSubmits.className = 'task-actions__submits';
        taskActionsSubmits.innerText = 'Посылки';
        taskActionsSubmits.onclick = () => tasklistSubmitsPanel(taskData.id);

        taskActions.appendChild(taskActionsEdit);
        taskActions.appendChild(taskActionsDelete);
        taskActions.appendChild(taskActionsSubmits);
        taskContainer.appendChild(taskActions);
    }

    category.querySelector('.taskcat-content').appendChild(taskContainer);
}



// ФУНКЦИИ НИЖЕ ТРЕБУЮТ ПРИВИЛЕГИЙ ОПЕРАТОРА
function tasklistNewTask() {
    const token = getToken();

    const title = prompt('Введите заголовок новой задачи:');
    const body = prompt('Введите текст новой задачи:');
    const dateDue = DDMMYYtoISO(prompt('Введите срок сдачи новой задачи (ДД.ММ.ГГ, НЕ включительно; пропуск — без срока):'));
    //console.log(dateDue);

    fetch(`../api/board${currentBoard}/tasks`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
			title: title,
			body: body,
			dateDue: dateDue
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message !== undefined) { alert(data.message); }

        updateTasklist();
    })
    .catch(error => console.error(error));
}

function tasklistEditTask(taskId) {
    const token = getToken();

    const title = prompt('Введите новой заголовок задачи:');
    const body = prompt('Введите новой текст задачи:');
    const dateDue = DDMMYYtoISO(prompt('Введите новый срок сдачи задачи (ДД.ММ.ГГ, НЕ включительно; пропуск — без срока):'));
    //console.log(dateDue);

    fetch(`../api/board${currentBoard}/task${taskId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
			title: title,
			body: body,
			dateDue: dateDue
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message !== undefined) { alert(data.message); }

        updateTasklist();
    })
    .catch(error => console.error(error));
}

function tasklistDeleteTask(taskId) {
    const token = getToken();

    if (confirm("Вы уверены, что хотите удалить эту задачу?")) {
        fetch(`../api/board${currentBoard}/task${taskId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.message !== undefined) { alert(data.message); }

            updateTasklist();
        })
        .catch(error => console.error(error));
    }
}

function tasklistSubmitsPanel(taskId) {
    const token = getToken();

    fetch(`../api/board${currentBoard}/task${taskId}/submits`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        })
        .then(response => response.json())
    
        .then(data => {
            if (data.length > 0) {
                const selectedSubmit = prompt(`Выберите посылку для просмотра: ${data.toString()}`);

                fetch(`../api/board${currentBoard}/task${taskId}/submit${selectedSubmit}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                })
                .then(response => response.json())
                .then(data => {
                    if (data.message) { alert(data.message); }

                    let newSubmitStatus = prompt('Статус посылки: ' + data.status
                    + '\n\nТекст посылки: ' + data.text
                    + '\n\nДата отправления: ' + ISOtoDDMMYY(data.date_submitted)
                    + '\n\nПРИНЯТЬ — "a", ОТКЛОНИТЬ — "r", НЕ МЕНЯТЬ — (пропуск):');

                    if (newSubmitStatus !== 'a' && newSubmitStatus !== 'r') { return; }
                    else if (newSubmitStatus === 'a') { newSubmitStatus = 'accepted'; }
                    else if (newSubmitStatus === 'r') { newSubmitStatus = 'rejected'; }

                    fetch(`../api/board${currentBoard}/task${taskId}/submit${selectedSubmit}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            status: newSubmitStatus
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.message) { alert(data.message); }

                        alert(`Статус посылки изменён на "${newSubmitStatus}"!`);
                    })
                    .catch(error => console.error(error));
                })
                .catch(error => console.error(error));
            }
            else {
                alert('Нет посылок для просмотра.');
            }
        })
        .catch(error => alert(error.message));
}
