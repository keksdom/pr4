        function calculate() {
            // Вводимо дані
            let height = parseFloat(document.getElementById('height').value);
            let weight = parseFloat(document.getElementById('weight').value);
            let activityLevel = document.getElementById('activity').value;
            let targetWeight = parseFloat(document.getElementById('targetWeight').value);
            let normalWeight = parseFloat(document.getElementById('normalWeight').value);

            activityLevel = activityLevel ?? "середній";
            // Кількість тренуваннь
            let totalWorkouts;
            totalWorkouts ??= 0;

            // Обчислення BMI зріст/вага^2
            let bmi = weight / Math.pow(height,2);

            // Базовий метаболізм
            let baseMetabolism = 1600;

            // Множник активності
            let activityMultiplier =
                activityLevel === "низький" ? 1.2 :
                activityLevel === "середній" ? 1.4 :
                1.6;
            // Загальні калорії
            let calories = baseMetabolism * activityMultiplier;

            let targetCaloriesLose = calories - 500;
            let targetCaloriesGain = calories + 500;
            // Оновлення кількості тренувань
            totalWorkouts++;
            // Кількість склянок води
            let waterGlasses = 8;
            waterGlasses--;
            // Логічні змінні
            let isGoalAchieved = (weight <= targetWeight) && (bmi < 25);
            let showWarning = (weight > normalWeight) || (bmi > 30);
            let needMotivation = !isGoalAchieved;
            // Тernary оператор
            let statusEqual25 = (bmi == 25)
                ? "Нормальна вага"
                : "Статус не визначений";
            // Визначення статусу BMI
            let bmiStatus =
                bmi < 18.5 ? "Недостатня вага" :
                (bmi >= 18.5 && bmi < 25 ? "Нормальна вага" : "Зайва вага");
            // Виведення результатів
            document.getElementById('result').innerHTML = `
                <h3>Результати:</h3>
                <p><b>BMI:</b> ${bmi.toFixed(2)}</p>
                <p><b>Статус:</b> ${bmiStatus}</p>
                <p><b>Ціль досягнута:</b> ${isGoalAchieved}</p>
                <p><b>Попередження:</b> ${showWarning ? "Є ризики" : "Все добре"}</p>
                <p><b>Мотивація:</b> ${needMotivation ? "Не здавайся!" : "Так тримати!"}</p>
                <p><b>Калорії для схуднення:</b> ${targetCaloriesLose}</p>
                <p><b>Калорії для набору:</b> ${targetCaloriesGain}</p>
                <p><b>Виконано тренувань:</b> ${totalWorkouts}</p>
                <p><b>Склянок води:</b> ${waterGlasses}</p>
                <p><b>Перевірка == 25:</b> ${statusEqual25}</p>
                <p><b>Рівень активності:</b> ${activityLevel}</p>
            `;
        }