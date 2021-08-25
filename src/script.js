/* eslint-disable max-statements */
(function () {
    // dayjsのロケール設定
    dayjs.locale('ja');

    // コース毎の元気コストの設定
    const staminaCost = {
        _2m_push: 15,
        _2m_live: 15,
        _2m_work: 15,
        _4m_push: 20,
        _4m_live: 20,
        _4m_work: 20,
        _6m_push: 25,
        _6m_live: 25,
        _6m_work: 25,
        _mm_push: 30,
        _mm_live: 30,
        _mm_work: 30,
    };

    // コース毎の獲得ptの設定
    const points = {
        _2m_push: 70,
        _2m_live: 58,
        _2m_work: 24,
        _4m_push: 93,
        _4m_live: 77,
        _4m_work: 32,
        _6m_push: 116,
        _6m_live: 96,
        _6m_work: 40,
        _mm_push: 140,
        _mm_live: 116,
        _mm_work: 48,
    };

    // コース毎の所要時間の設定
    const minutes = {
        _2m_push: 3,
        _2m_live: 3,
        _2m_work: 0.5,
        _4m_push: 3,
        _4m_live: 3,
        _4m_work: 0.5,
        _6m_push: 3,
        _6m_live: 3,
        _6m_work: 0.5,
        _mm_push: 3,
        _mm_live: 3,
        _mm_work: 0.5,
    };

    // 入力値の取得
    function getFormValue() {
        const formValue = {};
        const errors = [];

        function validDateTime(field) {
            const inputValue = $(`#${field}`).val();
            if (!inputValue) {
                errors.push({
                    field: field,
                    message: '必須です。',
                });
            } else if (!dayjs(inputValue).isValid()) {
                errors.push({
                    field: field,
                    message: '日時の入力例は「2017-06-29T15:00」です。',
                });
            } else {
                formValue[field] = inputValue;
                formValue[`${field}Unix`] = dayjs(inputValue).unix();
            }
        }
        validDateTime('datetimeStart');
        validDateTime('datetimeEnd');

        formValue.endOfTodayUnix = dayjs().endOf('d').unix();
        if (formValue.endOfTodayUnix < formValue.datetimeStartUnix) {
            formValue.endOfTodayUnix = formValue.datetimeStartUnix;
        }
        if (formValue.endOfTodayUnix > formValue.datetimeEndUnix) {
            formValue.endOfTodayUnix = formValue.datetimeEndUnix;
        }

        formValue.nowUnix = dayjs().endOf('m').unix();
        if (formValue.nowUnix < formValue.datetimeStartUnix) {
            formValue.nowUnix = formValue.datetimeStartUnix;
            formValue.isFuture = true;
        }
        if (formValue.nowUnix > formValue.datetimeEndUnix) {
            formValue.nowUnix = formValue.datetimeEndUnix;
        }

        function validNumber(field) {
            const inputValue = $(`#${field}`).val();
            if (!inputValue) {
                errors.push({
                    field: field,
                    message: '必須です。',
                });
            } else if (!Number.isSafeInteger(Number(inputValue))) {
                errors.push({
                    field: field,
                    message: '有効な値ではありません。',
                });
            } else {
                formValue[field] = Number(inputValue);
            }
        }
        validNumber('targetEnd');
        validNumber('stamina');
        validNumber('ownPoints');
        validNumber('ownItems');
        validNumber('progress');
        validNumber('remainingProgress');
        validNumber('mission');
        validNumber('bingo');

        formValue.staminaCostMultiplier = Number($('[name="staminaCostMultiplier"]:checked').val());
        formValue.eventBonusMultiplier = Number($('[name="eventBonusMultiplier"]:checked').val());
        formValue.itemsCostMultiplier = Number($('[name="itemsCostMultiplier"]:checked').val());
        formValue.showCourse = $('[name="showCourse"]:checked')
            .map((i) => {
                return $('[name="showCourse"]:checked').eq(i).val();
            })
            .get();
        formValue.isAutoSave = $('#autoSave').prop('checked');
        formValue.inTable = {};
        formValue.inTable.staminaCostMultiplier = {};
        formValue.inTable.eventBonusMultiplier = {};
        formValue.inTable.itemsCostMultiplier = {};
        Object.keys(staminaCost).forEach((course) => {
            formValue.inTable.staminaCostMultiplier[course] = Number($(`[name="staminaCostMultiplier${course}"]:checked`).val());
            formValue.inTable.eventBonusMultiplier[course] = Number($(`[name="eventBonusMultiplier${course}"]:checked`).val());
            formValue.inTable.itemsCostMultiplier[course] = Number($(`[name="itemsCostMultiplier${course}"]:checked`).val());
        });

        $('.error').remove();
        if (errors.length) {
            errors.forEach((error) => {
                $(`#${error.field}`).after(`<span class="error">${error.message}</span>`);
            });
            return null;
        }
        return formValue;
    }

    // 目標ポイントを計算
    function calculateTargetPoint(formValue) {
        let diffEnd = formValue.targetEnd - formValue.ownPoints;
        if (diffEnd < 0) {
            diffEnd = 0;
        }
        $('#diffEnd').text(`(あと ${diffEnd.toLocaleString()} pt)`);

        $('#labelToday').text(`${dayjs.unix(formValue.endOfTodayUnix).format('M/D')}の目標pt`);

        const targetToday = Math.round(
            (formValue.targetEnd * (formValue.endOfTodayUnix - formValue.datetimeStartUnix)) /
                (formValue.datetimeEndUnix - formValue.datetimeStartUnix)
        );
        let diffToday = targetToday - formValue.ownPoints;
        if (diffToday < 0) {
            diffToday = 0;
        }
        $('#targetToday').text(`${targetToday.toLocaleString()} pt (あと ${diffToday.toLocaleString()} pt)`);

        $('#labelNow').text(`${dayjs.unix(formValue.nowUnix).format('M/D H:mm')}の目標pt`);

        const targetNow = Math.round(
            (formValue.targetEnd * (formValue.nowUnix - formValue.datetimeStartUnix)) / (formValue.datetimeEndUnix - formValue.datetimeStartUnix)
        );
        let diffNow = targetNow - formValue.ownPoints;
        if (diffNow < 0) {
            diffNow = 0;
        }
        $('#targetNow').text(`${targetNow.toLocaleString()} pt (あと ${diffNow.toLocaleString()} pt)`);
    }

    // ログインボーナスを考慮
    function calculateLoginBonus(formValue) {
        let loginBonus = dayjs.unix(formValue.datetimeEndUnix).endOf('d').diff(dayjs.unix(formValue.nowUnix), 'd') * 2;
        if (formValue.isFuture) {
            loginBonus += 2;
        }
        $('#loginBonus').text(`+ ログインボーナス ${loginBonus} 個`);
        formValue.loginBonus = loginBonus;
    }

    // コース毎の計算
    function calculateMinByCouse(course, formValue, result, minCost, shouldUseRemainingProgress) {
        if (formValue.showCourse.length && formValue.showCourse.indexOf(course) === -1) {
            // 表示コースでなければ計算しない
            return;
        }

        const isWork = course.indexOf('work') !== -1;
        const bingoTimes = isWork ? 1 : 2;

        [5, 4.5, 4, 3.5, 3].forEach((multiplier) => {
            let ownItems = formValue.ownItems + formValue.loginBonus;
            let progress = formValue.progress;
            let remainingProgress = formValue.remainingProgress;

            let tourTimes = 0;
            let consumedStamina = 0;
            let earnItems = 0;
            let tourEarnedPoints = 0;

            let eventTimes = 0;
            const eventTimesForMission = {
                1: 0,
                2: 0,
                3: 0,
            };
            let consumedItems = 0;
            let eventEarnedPoints = 0;

            // ツアー準備回数、イベント楽曲回数を計算
            while (
                formValue.targetEnd > formValue.ownPoints + tourEarnedPoints + eventEarnedPoints ||
                formValue.mission > eventTimesForMission[1] + eventTimesForMission[2] + eventTimesForMission[3] ||
                formValue.bingo > bingoTimes * formValue.staminaCostMultiplier * tourTimes + 3 * formValue.itemsCostMultiplier * eventTimes
            ) {
                // 累積ptが最終目標pt以上、ミッション回数・残りビンゴ回数が0以下になるまで繰り返し
                if (
                    remainingProgress <= 0 &&
                    formValue.targetEnd <= formValue.ownPoints + tourEarnedPoints + eventEarnedPoints + 144 * 5 &&
                    ownItems
                ) {
                    // pt5.0倍確定、アイテム消費1倍で達成できる場合、イベント楽曲
                    ownItems--;
                    remainingProgress = 40;
                    eventTimes++;
                    eventTimesForMission[1]++;
                    consumedItems++;
                    eventEarnedPoints += 144 * 5;
                } else if (
                    remainingProgress <= 0 &&
                    formValue.targetEnd <= formValue.ownPoints + tourEarnedPoints + eventEarnedPoints + 144 * 5 * 2 &&
                    ownItems >= 2 &&
                    formValue.itemsCostMultiplier >= 2
                ) {
                    // pt5.0倍確定、アイテム消費2倍で達成できる場合、イベント楽曲
                    ownItems -= 2;
                    remainingProgress = 40;
                    eventTimes += 2;
                    eventTimesForMission[2]++;
                    consumedItems += 2;
                    eventEarnedPoints += 144 * 5 * 2;
                } else if (
                    remainingProgress <= 0 &&
                    formValue.targetEnd <= formValue.ownPoints + tourEarnedPoints + eventEarnedPoints + 144 * 5 * 3 &&
                    ownItems >= 3 &&
                    formValue.itemsCostMultiplier >= 3
                ) {
                    // pt5.0倍確定、アイテム消費3倍で達成できる場合、イベント楽曲
                    ownItems -= 3;
                    remainingProgress = 40;
                    eventTimes += 3;
                    eventTimesForMission[3]++;
                    consumedItems += 3;
                    eventEarnedPoints += 144 * 5 * 3;
                } else if (remainingProgress <= 0 && ownItems >= formValue.itemsCostMultiplier) {
                    // pt5.0倍確定の場合、アイテム消費倍率でイベント楽曲
                    ownItems -= formValue.itemsCostMultiplier;
                    remainingProgress = 40;
                    eventTimes += formValue.itemsCostMultiplier;
                    eventTimesForMission[formValue.itemsCostMultiplier]++;
                    consumedItems += formValue.itemsCostMultiplier;
                    eventEarnedPoints += 144 * 5 * formValue.itemsCostMultiplier;
                } else if (
                    (!shouldUseRemainingProgress || multiplier === 3) &&
                    formValue.targetEnd <= formValue.ownPoints + tourEarnedPoints + eventEarnedPoints + 144 * multiplier * ownItems &&
                    ownItems
                ) {
                    // アイテムで達成できる場合、イベント楽曲
                    ownItems--;
                    eventTimes++;
                    eventTimesForMission[1]++;
                    consumedItems++;
                    eventEarnedPoints += 144 * multiplier;
                } else if ((!shouldUseRemainingProgress || multiplier === 3) && ownItems >= formValue.itemsCostMultiplier) {
                    // アイテムを所持している場合、イベント楽曲
                    ownItems--;
                    eventTimes++;
                    eventTimesForMission[1]++;
                    consumedItems++;
                    eventEarnedPoints += 144 * multiplier;
                } else if (formValue.targetEnd <= formValue.ownPoints + tourEarnedPoints + eventEarnedPoints + 144 * 3 * ownItems && ownItems) {
                    // pt3.0倍で達成できる場合、イベント楽曲
                    ownItems--;
                    eventTimes++;
                    eventTimesForMission[1]++;
                    consumedItems++;
                    eventEarnedPoints += 144 * 3;
                } else {
                    // アイテムを所持していない場合、ツアー準備
                    remainingProgress -= staminaCost[course] / 5;
                    tourTimes++;
                    consumedStamina += staminaCost[course];
                    tourEarnedPoints += points[course];
                    progress += staminaCost[course] / 5;
                    if (progress >= 20) {
                        // 進捗度が20以上の場合、アイテム獲得
                        progress -= 20;
                        ownItems++; // 計算用
                        earnItems++; // 表示用
                    }
                }
            }

            // ミッションを考慮したイベント楽曲回数を計算
            function calculateEventTimesForMission() {
                if (
                    formValue.itemsCostMultiplier >= 3 &&
                    eventTimesForMission[1] >= 3 &&
                    formValue.mission <= eventTimesForMission[1] + eventTimesForMission[2] + eventTimesForMission[3] - 2
                ) {
                    eventTimesForMission[3]++;
                    eventTimesForMission[1] -= 3;
                    calculateEventTimesForMission();
                }
                if (
                    formValue.itemsCostMultiplier >= 2 &&
                    eventTimesForMission[1] >= 2 &&
                    formValue.mission <= eventTimesForMission[1] + eventTimesForMission[2] + eventTimesForMission[3] - 1
                ) {
                    eventTimesForMission[2]++;
                    eventTimesForMission[1] -= 2;
                    calculateEventTimesForMission();
                }
            }
            calculateEventTimesForMission();

            // 自然回復日時の計算
            const naturalRecoveryUnix = dayjs
                .unix(formValue.nowUnix)
                .add((consumedStamina - formValue.stamina) * 5, 'm')
                .unix();

            // 要回復元気の計算
            let requiredRecoveryStamina = 0;
            if (naturalRecoveryUnix > formValue.datetimeEndUnix) {
                requiredRecoveryStamina = Math.ceil((naturalRecoveryUnix - formValue.datetimeEndUnix) / 60 / 5);
            }

            // 所要時間の計算
            const requiredMinutes =
                minutes[course] * Math.ceil(tourTimes / formValue.staminaCostMultiplier) +
                3 * (eventTimesForMission[1] + eventTimesForMission[2] + eventTimesForMission[3]);

            // 計算結果を格納
            if (!result[multiplier]) {
                result[multiplier] = {};
            }
            result[multiplier][course] = {};

            result[multiplier][course].tourTimes = {};
            result[multiplier][course].tourTimes[formValue.staminaCostMultiplier] = Math.floor(tourTimes / formValue.staminaCostMultiplier);
            if (formValue.staminaCostMultiplier === 2) {
                result[multiplier][course].tourTimes[1] = tourTimes % formValue.staminaCostMultiplier;
            }
            result[multiplier][course].consumedStamina = consumedStamina;
            result[multiplier][course].naturalRecoveryUnix = naturalRecoveryUnix;
            result[multiplier][course].requiredRecoveryStamina = requiredRecoveryStamina;
            result[multiplier][course].earnItems = earnItems;
            result[multiplier][course].tourEarnedPoints = tourEarnedPoints;

            result[multiplier][course].eventTimes = eventTimesForMission;
            result[multiplier][course].consumedItems = consumedItems;
            result[multiplier][course].eventEarnedPoints = eventEarnedPoints;

            result[multiplier][course].requiredMinutes = requiredMinutes;
            result[multiplier][course].requiredTime = '';
            if (Math.floor(requiredMinutes / 60)) {
                result[multiplier][course].requiredTime += `${Math.floor(requiredMinutes / 60)}時間`;
            }
            if (Math.ceil(requiredMinutes % 60)) {
                result[multiplier][course].requiredTime += `${Math.ceil(requiredMinutes % 60)}分`;
            }
            if (!result[multiplier][course].requiredTime) {
                result[multiplier][course].requiredTime += '0分';
            }

            // 消費元気、所要時間の最小値を格納
            if (minCost.consumedStamina === undefined || minCost.consumedStamina > consumedStamina) {
                minCost.consumedStamina = consumedStamina;
            }
            if (minCost.requiredMinutes === undefined || minCost.requiredMinutes > requiredMinutes) {
                minCost.requiredMinutes = requiredMinutes;
            }
        });
    }

    // 計算結果の表示
    function showResultByCouse(course, formValue, minResult, minCost, maxResult) {
        if (formValue.showCourse.length && formValue.showCourse.indexOf(course) === -1) {
            // 表示コースでなければ列を非表示
            $(`.${course}`).hide();
            const level = course.slice(0, 3);
            const colspan = $(`.${level}`).prop('colspan');
            if (colspan > 1) {
                $(`.${level}`).prop('colspan', colspan - 1);
            } else {
                $(`.${level}`).hide();
            }
            return;
        }
        $(`.${course}`).show();

        let tourTimesHtml = '';
        Object.keys(minResult[formValue.eventBonusMultiplier][course].tourTimes).forEach((multiplier, i, self) => {
            tourTimesHtml +=
                `<label for="staminaCostMultiplier${course}-${multiplier}">` +
                `<input type="radio"` +
                ` name="staminaCostMultiplier${course}"` +
                ` id="staminaCostMultiplier${course}-${multiplier}"` +
                ` value="${multiplier}" />` +
                ` [×${multiplier}] ${minResult[formValue.eventBonusMultiplier][course].tourTimes[multiplier].toLocaleString()}` +
                `</label>`;
            if (self[i + 1]) {
                tourTimesHtml += '<br>';
            }
        });
        if (
            minResult[formValue.eventBonusMultiplier][course].tourTimes[1] < maxResult[formValue.eventBonusMultiplier][course].tourTimes[1] ||
            minResult[formValue.eventBonusMultiplier][course].tourTimes[2] < maxResult[formValue.eventBonusMultiplier][course].tourTimes[2]
        ) {
            tourTimesHtml += '<br><span class="vertical">～</span><br>';
            Object.keys(maxResult[formValue.eventBonusMultiplier][course].tourTimes)
                .filter((multiplier) => {
                    return maxResult[formValue.eventBonusMultiplier][course].tourTimes[multiplier];
                })
                .forEach((multiplier, i, self) => {
                    tourTimesHtml += `[×${multiplier}] ${maxResult[formValue.eventBonusMultiplier][course].tourTimes[multiplier].toLocaleString()}`;
                    if (self[i + 1]) {
                        tourTimesHtml += '<br>';
                    }
                });
        }

        let recommendMultiplier = formValue.eventBonusMultiplier;
        [5, 4.5, 4, 3.5, 3].forEach((multiplier) => {
            if (
                minResult[multiplier][course].eventTimes[1] === minResult[formValue.eventBonusMultiplier][course].eventTimes[1] &&
                minResult[multiplier][course].eventTimes[2] === minResult[formValue.eventBonusMultiplier][course].eventTimes[2] &&
                minResult[multiplier][course].eventTimes[3] === minResult[formValue.eventBonusMultiplier][course].eventTimes[3]
            ) {
                recommendMultiplier = multiplier;
            }
        });

        let recommendMultiplierHtml = '';
        [3, 3.5, 4, 4.5, 5]
            .filter((multiplier) => {
                return multiplier >= recommendMultiplier;
            })
            .forEach((multiplier, i, self) => {
                recommendMultiplierHtml +=
                    `<label for="eventBonusMultiplier${course}-${multiplier}">` +
                    `<input type="radio"` +
                    ` name="eventBonusMultiplier${course}"` +
                    ` id="eventBonusMultiplier${course}-${multiplier}"` +
                    ` value="${multiplier}" />` +
                    ` ×${multiplier.toFixed(1)}` +
                    `</label>`;
                if (i % 2 && self[i + 1]) {
                    recommendMultiplierHtml += '<br>';
                }
            });

        let eventTimesHtml = '';
        [1, 2, 3]
            .filter((multiplier) => {
                return multiplier <= formValue.itemsCostMultiplier;
            })
            .forEach((multiplier, i, self) => {
                eventTimesHtml +=
                    `<label for="itemsCostMultiplier${course}-${multiplier}">` +
                    `<input type="radio"` +
                    ` name="itemsCostMultiplier${course}"` +
                    ` id="itemsCostMultiplier${course}-${multiplier}"` +
                    ` value="${multiplier}" />` +
                    ` [×${multiplier}] ${minResult[formValue.eventBonusMultiplier][course].eventTimes[multiplier].toLocaleString()}` +
                    `</label>`;
                if (self[i + 1]) {
                    eventTimesHtml += '<br>';
                }
            });
        if (
            minResult[formValue.eventBonusMultiplier][course].eventTimes[1] < maxResult[formValue.eventBonusMultiplier][course].eventTimes[1] ||
            minResult[formValue.eventBonusMultiplier][course].eventTimes[2] < maxResult[formValue.eventBonusMultiplier][course].eventTimes[2] ||
            minResult[formValue.eventBonusMultiplier][course].eventTimes[3] < maxResult[formValue.eventBonusMultiplier][course].eventTimes[3]
        ) {
            eventTimesHtml += '<br><span class="vertical">～</span><br>';
            [3, 2, 1]
                .filter((multiplier) => {
                    return maxResult[formValue.eventBonusMultiplier][course].eventTimes[multiplier];
                })
                .forEach((multiplier, i, self) => {
                    eventTimesHtml += `[×${multiplier}] ${maxResult[formValue.eventBonusMultiplier][course].eventTimes[multiplier].toLocaleString()}`;
                    if (self[i + 1]) {
                        eventTimesHtml += '<br>';
                    }
                });
        }

        function showResultText(field, minValue, maxValue, unit, isLink) {
            let text = minValue;
            if (isLink) {
                text = `<a href="../event-jewels-calculator/index.html?datetimeStart=${formValue.datetimeStart}&datetimeEnd=${
                    formValue.datetimeEnd
                }&consumedStamina=${minValue}&stamina=${formValue.stamina}">${minValue.toLocaleString()}</a>`;
            }
            if (minValue !== maxValue && !isLink) {
                text += ` ～<br>${maxValue}`;
            }
            if (minValue !== maxValue && isLink) {
                text += ` ～<br><a href="../event-jewels-calculator/index.html?datetimeStart=${formValue.datetimeStart}&datetimeEnd=${
                    formValue.datetimeEnd
                }&consumedStamina=${maxValue}&stamina=${formValue.stamina}">${maxValue.toLocaleString()}</a>`;
            }
            if (unit) {
                text += ` ${unit}`;
            }
            $(`#${field}${course}`).html(text);
        }
        showResultText('tourTimes', tourTimesHtml, tourTimesHtml);
        showResultText(
            'consumedStamina',
            minResult[formValue.eventBonusMultiplier][course].consumedStamina.toLocaleString(),
            maxResult[formValue.eventBonusMultiplier][course].consumedStamina.toLocaleString()
        );
        showResultText(
            'naturalRecoveryAt',
            dayjs.unix(minResult[formValue.eventBonusMultiplier][course].naturalRecoveryUnix).format('M/D H:mm'),
            dayjs.unix(maxResult[formValue.eventBonusMultiplier][course].naturalRecoveryUnix).format('M/D H:mm')
        );
        showResultText(
            'requiredRecoveryStamina',
            minResult[formValue.eventBonusMultiplier][course].requiredRecoveryStamina,
            maxResult[formValue.eventBonusMultiplier][course].requiredRecoveryStamina,
            false,
            true
        );
        showResultText(
            'earnItems',
            minResult[formValue.eventBonusMultiplier][course].earnItems.toLocaleString(),
            maxResult[formValue.eventBonusMultiplier][course].earnItems.toLocaleString(),
            '個'
        );
        showResultText(
            'tourEarnedPoints',
            minResult[formValue.eventBonusMultiplier][course].tourEarnedPoints.toLocaleString(),
            maxResult[formValue.eventBonusMultiplier][course].tourEarnedPoints.toLocaleString(),
            'pt'
        );
        showResultText('recommendMultiplier', recommendMultiplierHtml, recommendMultiplierHtml);
        showResultText('eventTimes', eventTimesHtml, eventTimesHtml);
        showResultText(
            'consumedItems',
            minResult[formValue.eventBonusMultiplier][course].consumedItems.toLocaleString(),
            maxResult[formValue.eventBonusMultiplier][course].consumedItems.toLocaleString(),
            '個'
        );
        showResultText(
            'eventEarnedPoints',
            minResult[formValue.eventBonusMultiplier][course].eventEarnedPoints.toLocaleString(),
            maxResult[formValue.eventBonusMultiplier][course].eventEarnedPoints.toLocaleString(),
            'pt'
        );

        showResultText(
            'requiredTime',
            minResult[formValue.eventBonusMultiplier][course].requiredTime,
            maxResult[formValue.eventBonusMultiplier][course].requiredTime
        );

        // 表中のラジオボタンに初期値セット
        const staminaCostMultiplier =
            [2, 1].find((multiplier) => {
                return (
                    minResult[formValue.eventBonusMultiplier][course].tourTimes[multiplier] &&
                    maxResult[formValue.eventBonusMultiplier][course].tourTimes[multiplier]
                );
            }) ||
            [2, 1].find((multiplier) => {
                return minResult[formValue.eventBonusMultiplier][course].tourTimes[multiplier];
            }) ||
            [2, 1].find((multiplier) => {
                return maxResult[formValue.eventBonusMultiplier][course].tourTimes[multiplier];
            }) ||
            formValue.staminaCostMultiplier;
        $(`[name="staminaCostMultiplier${course}"][value="${staminaCostMultiplier}"]`).prop('checked', true);
        $(`[name="eventBonusMultiplier${course}"][value="${formValue.eventBonusMultiplier}"]`).prop('checked', true);
        const itemsCostMultiplier =
            [3, 2, 1].find((multiplier) => {
                return (
                    minResult[formValue.eventBonusMultiplier][course].eventTimes[multiplier] &&
                    maxResult[formValue.eventBonusMultiplier][course].eventTimes[multiplier]
                );
            }) ||
            [3, 2, 1].find((multiplier) => {
                return minResult[formValue.eventBonusMultiplier][course].eventTimes[multiplier];
            }) ||
            [3, 2, 1].find((multiplier) => {
                return maxResult[formValue.eventBonusMultiplier][course].eventTimes[multiplier];
            }) ||
            formValue.itemsCostMultiplier;
        $(`[name="itemsCostMultiplier${course}"][value="${itemsCostMultiplier}"]`).prop('checked', true);

        // 消費元気、所要時間の最小値は青文字
        if (formValue.showCourse.length !== 1 && minResult[formValue.eventBonusMultiplier][course].consumedStamina === minCost.consumedStamina) {
            $(`#consumedStamina${course}`).addClass('info');
        } else {
            $(`#consumedStamina${course}`).removeClass('info');
        }
        if (formValue.showCourse.length !== 1 && minResult[formValue.eventBonusMultiplier][course].requiredMinutes === minCost.requiredMinutes) {
            $(`#requiredTime${course}`).addClass('info');
        } else {
            $(`#requiredTime${course}`).removeClass('info');
        }

        // 最大値が開催期限をオーバーする場合、オレンジ文字
        if (maxResult[formValue.eventBonusMultiplier][course].naturalRecoveryUnix > formValue.datetimeEndUnix) {
            $(`#naturalRecoveryAt${course}`).addClass('warning');
        } else {
            $(`#naturalRecoveryAt${course}`).removeClass('warning');
        }
        if (
            dayjs.unix(formValue.nowUnix).add(maxResult[formValue.eventBonusMultiplier][course].requiredMinutes, 'm').unix() >
            formValue.datetimeEndUnix
        ) {
            $(`#requiredTime${course}`).addClass('warning');
        } else {
            $(`#requiredTime${course}`).removeClass('warning');
        }

        // 開催期限をオーバーする場合、赤文字
        if (minResult[formValue.eventBonusMultiplier][course].naturalRecoveryUnix > formValue.datetimeEndUnix) {
            $(`#naturalRecoveryAt${course}`).addClass('danger');
        } else {
            $(`#naturalRecoveryAt${course}`).removeClass('danger');
        }
        if (
            dayjs.unix(formValue.nowUnix).add(minResult[formValue.eventBonusMultiplier][course].requiredMinutes, 'm').unix() >
            formValue.datetimeEndUnix
        ) {
            $(`#requiredTime${course}`).addClass('danger');
        } else {
            $(`#requiredTime${course}`).removeClass('danger');
        }
    }

    // ツアーの計算
    function calculateTour(formValue) {
        const minResult = {};
        const minCost = {};
        const maxResult = {};

        // 計算
        Object.keys(staminaCost).forEach((course) => {
            calculateMinByCouse(course, formValue, minResult, minCost);
            calculateMinByCouse(course, formValue, maxResult, {}, true);
        });

        // 表示
        $('._2m').prop('colspan', 3);
        $('._4m').prop('colspan', 3);
        $('._6m').prop('colspan', 3);
        $('._mm').prop('colspan', 3);
        Object.keys(staminaCost).forEach((course) => {
            showResultByCouse(course, formValue, minResult, minCost, maxResult);
        });
    }

    function calculate() {
        const formValue = getFormValue();
        calculateTargetPoint(formValue);
        calculateLoginBonus(formValue);
        calculateTour(formValue);
        if (formValue.isAutoSave) {
            save();
        }
    }

    // input要素の変更時
    $('#datetimeStart').change(calculate);
    $('#datetimeEnd').change(calculate);
    $('#targetEnd').change(calculate);
    $('#stamina').change(calculate);
    $('#ownPoints').change(calculate);
    $('#ownItems').change(calculate);
    $('#progress').change(calculate);
    $('#remainingProgress').change(calculate);
    $('#mission').change(calculate);
    $('#bingo').change(calculate);
    $('[name="staminaCostMultiplier"]').change(calculate);
    $('[name="eventBonusMultiplier"]').change(calculate);
    $('[name="itemsCostMultiplier"]').change(calculate);
    $('[name="showCourse"]').change(() => {
        $('#showCourse-all').prop('checked', true);
        $('[name="showCourse"]').each((i) => {
            if (!$('[name="showCourse"]').eq(i).prop('checked')) {
                $('#showCourse-all').prop('checked', false);
            }
        });
        calculate();
    });
    $('#showCourse-all').change(() => {
        $('[name="showCourse"]').each((i) => {
            $('[name="showCourse"]').eq(i).prop('checked', $('#showCourse-all').prop('checked'));
        });
        calculate();
    });
    $('#autoSave').change(calculate);
    $('#update').click(calculate);

    // 回数増減ボタン
    $('.subtractTourTimes').click(function () {
        // eslint-disable-next-line no-invalid-this
        const course = $(this).val();
        const formValue = getFormValue();

        $('#stamina').val(formValue.stamina + staminaCost[course] * formValue.inTable.staminaCostMultiplier[course]);
        $('#ownPoints').val(formValue.ownPoints - points[course] * formValue.inTable.staminaCostMultiplier[course]);

        formValue.progress -= (staminaCost[course] / 5) * formValue.inTable.staminaCostMultiplier[course];
        if (formValue.progress < 0) {
            // 進捗度が0未満の場合、アイテム消費
            formValue.progress += 20;
            $('#ownItems').val(formValue.ownItems - 1);
        }
        $('#progress').val(formValue.progress);
        formValue.remainingProgress += (staminaCost[course] / 5) * formValue.inTable.staminaCostMultiplier[course];
        if (formValue.remainingProgress > 40) {
            formValue.remainingProgress = 40;
        }
        $('#remainingProgress').val(formValue.remainingProgress);

        const isWork = course.indexOf('work') !== -1;
        const bingoTimes = isWork ? 1 : 2;
        $('#bingo').val(formValue.bingo + bingoTimes * formValue.inTable.staminaCostMultiplier[course]);

        calculate();
    });
    $('.addTourTimes').click(function () {
        // eslint-disable-next-line no-invalid-this
        const course = $(this).val();
        const formValue = getFormValue();

        $('#stamina').val(formValue.stamina - staminaCost[course] * formValue.inTable.staminaCostMultiplier[course]);
        $('#ownPoints').val(formValue.ownPoints + points[course] * formValue.inTable.staminaCostMultiplier[course]);

        formValue.progress += (staminaCost[course] / 5) * formValue.inTable.staminaCostMultiplier[course];
        if (formValue.progress >= 20) {
            // 進捗度が20以上の場合、アイテム獲得
            formValue.progress -= 20;
            $('#ownItems').val(formValue.ownItems + 1);
        }
        $('#progress').val(formValue.progress);
        formValue.remainingProgress -= (staminaCost[course] / 5) * formValue.inTable.staminaCostMultiplier[course];
        if (formValue.remainingProgress < 0) {
            formValue.remainingProgress = 0;
        }
        $('#remainingProgress').val(formValue.remainingProgress);

        const isWork = course.indexOf('work') !== -1;
        const bingoTimes = isWork ? 1 : 2;
        $('#bingo').val(formValue.bingo - bingoTimes * formValue.inTable.staminaCostMultiplier[course]);

        calculate();
    });
    $('.subtractEventTimes').click(function () {
        // eslint-disable-next-line no-invalid-this
        const course = $(this).val();
        const formValue = getFormValue();

        $('#ownItems').val(formValue.ownItems + formValue.inTable.itemsCostMultiplier[course]);
        $('#ownPoints').val(
            formValue.ownPoints - 144 * formValue.inTable.itemsCostMultiplier[course] * formValue.inTable.eventBonusMultiplier[course]
        );
        $('#mission').val(formValue.mission + 1);
        $('#bingo').val(formValue.bingo + 3 * formValue.inTable.itemsCostMultiplier[course]);

        calculate();
    });
    $('.addEventTimes').click(function () {
        // eslint-disable-next-line no-invalid-this
        const course = $(this).val();
        const formValue = getFormValue();

        $('#ownItems').val(formValue.ownItems - formValue.inTable.itemsCostMultiplier[course]);
        $('#ownPoints').val(
            formValue.ownPoints + 144 * formValue.inTable.itemsCostMultiplier[course] * formValue.inTable.eventBonusMultiplier[course]
        );
        if (formValue.remainingProgress <= 0) {
            $('#remainingProgress').val(40);
        }
        $('#mission').val(formValue.mission - 1);
        $('#bingo').val(formValue.bingo - 3 * formValue.inTable.itemsCostMultiplier[course]);

        calculate();
    });

    // 保存ボタン
    function save() {
        const datetimeSave = dayjs().format('YYYY/M/D H:mm');

        const saveData = {
            datetimeStart: $('#datetimeStart').val(),
            datetimeEnd: $('#datetimeEnd').val(),
            targetEnd: $('#targetEnd').val(),
            stamina: $('#stamina').val(),
            ownPoints: $('#ownPoints').val(),
            ownItems: $('#ownItems').val(),
            progress: $('#progress').val(),
            remainingProgress: $('#remainingProgress').val(),
            mission: $('#mission').val(),
            bingo: $('#bingo').val(),
            staminaCostMultiplier: $('[name="staminaCostMultiplier"]:checked').val(),
            eventBonusMultiplier: $('[name="eventBonusMultiplier"]:checked').val(),
            itemsCostMultiplier: $('[name="itemsCostMultiplier"]:checked').val(),
            showCourse: $('[name="showCourse"]:checked')
                .map((i) => {
                    return $('[name="showCourse"]:checked').eq(i).val();
                })
                .get(),
            autoSave: $('#autoSave').prop('checked'),
            datetimeSave: datetimeSave,
        };

        localStorage.setItem(location.href.replace('index.html', ''), JSON.stringify(saveData));

        $('#datetimeSave').text(datetimeSave);
        $('#loadSave').prop('disabled', false);
        $('#clearSave').prop('disabled', false);
    }
    $('#save').click(save);

    // 入力を初期化ボタン
    function defaultInput() {
        $('#datetimeStart').val(dayjs().subtract(15, 'h').format('YYYY-MM-DDT15:00'));
        $('#datetimeEnd').val(dayjs().subtract(15, 'h').add(1, 'w').format('YYYY-MM-DDT20:59'));
        $('#targetEnd').val(30000);
        $('#stamina').val(0);
        $('#ownPoints').val(0);
        $('#ownItems').val(0);
        $('#progress').val(0);
        $('#remainingProgress').val(40);
        $('#mission').val(30);
        $('#bingo').val(96);
        $('[name="staminaCostMultiplier"][value="1"]').prop('checked', true);
        $('[name="eventBonusMultiplier"][value="5"]').prop('checked', true);
        $('[name="itemsCostMultiplier"][value="2"]').prop('checked', true);
        $('[name="showCourse"]').each((i) => {
            if (
                ['_2m_push', '_2m_work', '_4m_push', '_4m_work', '_6m_push', '_6m_work', '_mm_push', '_mm_work'].indexOf(
                    $('[name="showCourse"]').eq(i).val()
                ) !== -1
            ) {
                $('[name="showCourse"]').eq(i).prop('checked', true);
            } else {
                $('[name="showCourse"]').eq(i).prop('checked', false);
            }
        });
        $('#showCourse-all').prop('checked', false);
        $('#autoSave').prop('checked', false);

        calculate();
    }
    $('#clearInput').click(defaultInput);

    // 保存した値を読込ボタン
    function loadSavedData() {
        const savedString = localStorage.getItem(location.href.replace('index.html', ''));

        if (!savedString) {
            return false;
        }

        const savedData = JSON.parse(savedString);

        $('#datetimeStart').val(savedData.datetimeStart);
        $('#datetimeEnd').val(savedData.datetimeEnd);
        $('#targetEnd').val(savedData.targetEnd);
        $('#stamina').val(savedData.stamina);
        $('#ownPoints').val(savedData.ownPoints);
        $('#ownItems').val(savedData.ownItems);
        $('#progress').val(savedData.progress);
        $('#remainingProgress').val(savedData.remainingProgress);
        $('#mission').val(savedData.mission);
        $('#bingo').val(savedData.bingo);
        $(`[name="staminaCostMultiplier"][value="${savedData.staminaCostMultiplier}"]`).prop('checked', true);
        $(`[name="eventBonusMultiplier"][value="${savedData.eventBonusMultiplier}"]`).prop('checked', true);
        $(`[name="itemsCostMultiplier"][value="${savedData.itemsCostMultiplier}"]`).prop('checked', true);
        $('#showCourse-all').prop('checked', true);
        $('[name="showCourse"]').each((i) => {
            if (savedData.showCourse.indexOf($('[name="showCourse"]').eq(i).val()) !== -1) {
                $('[name="showCourse"]').eq(i).prop('checked', true);
            } else {
                $('[name="showCourse"]').eq(i).prop('checked', false);
                $('#showCourse-all').prop('checked', false);
            }
        });
        $('#autoSave').prop('checked', savedData.autoSave);

        calculate();

        $('#datetimeSave').text(savedData.datetimeSave);
        $('#loadSave').prop('disabled', false);
        $('#clearSave').prop('disabled', false);

        return true;
    }
    $('#loadSave').click(loadSavedData);

    // 保存した値を削除ボタン
    $('#clearSave').click(() => {
        localStorage.removeItem(location.href.replace('index.html', ''));

        $('#datetimeSave').text('削除済');
        $('#loadSave').prop('disabled', true);
        $('#clearSave').prop('disabled', true);
    });

    // 画面表示時に保存した値を読込、保存した値がなければ入力の初期化
    if (!loadSavedData()) {
        defaultInput();
    }
})();
