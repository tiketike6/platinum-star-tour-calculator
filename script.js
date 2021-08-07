/* eslint-disable max-statements */
(function () {
    // dayjsのロケール設定
    dayjs.locale('ja');

    // コース毎の元気コストの設定
    const vitalityCost = {
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
        validNumber('vitality');
        validNumber('ownPoints');
        validNumber('ownItems');
        validNumber('progress');
        validNumber('remainingProgress');

        formValue.vitalityCostMultiplier = Number($('[name="vitalityCostMultiplier"]:checked').val());
        formValue.eventBonusMultiplier = Number($('[name="eventBonusMultiplier"]:checked').val());
        formValue.itemsCostMultiplier = Number($('[name="itemsCostMultiplier"]:checked').val());
        formValue.showCourse = $('[name="showCourse"]:checked')
            .map((i) => {
                return $('[name="showCourse"]:checked').eq(i).val();
            })
            .get();
        formValue.isAutoSave = $('#autoSave').prop('checked');

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

        [5, 4.5, 4, 3.5, 3].forEach((multiplier) => {
            let ownItems = formValue.ownItems + formValue.loginBonus;
            let progress = formValue.progress;
            let remainingProgress = formValue.remainingProgress;

            let tourTimes = 0;
            let consumedVitality = 0;
            let earnItems = 0;
            let tourEarnedPoints = 0;

            let eventTimes = 0;
            let consumedItems = 0;
            let eventEarnedPoints = 0;

            // ツアー準備回数、イベント楽曲回数を計算
            while (formValue.ownPoints + tourEarnedPoints + eventEarnedPoints < formValue.targetEnd) {
                // 累積ptが最終目標pt以上になるまで繰り返し
                if (!shouldUseRemainingProgress && ownItems) {
                    // アイテムを所持している場合、イベント楽曲
                    ownItems--;
                    eventTimes++;
                    consumedItems++;
                    eventEarnedPoints += 144 * multiplier;
                } else if (shouldUseRemainingProgress && ownItems >= formValue.itemsCostMultiplier && remainingProgress <= 0) {
                    // pt5.0倍確定の場合、アイテム消費倍率でイベント楽曲
                    ownItems -= formValue.itemsCostMultiplier;
                    remainingProgress = 40;
                    eventTimes += formValue.itemsCostMultiplier;
                    consumedItems += formValue.itemsCostMultiplier;
                    eventEarnedPoints += 144 * multiplier * formValue.itemsCostMultiplier;
                } else {
                    // アイテムを所持していない場合、ツアー準備
                    remainingProgress -= vitalityCost[course] / 5;
                    tourTimes++;
                    consumedVitality += vitalityCost[course];
                    tourEarnedPoints += points[course];
                    progress += vitalityCost[course] / 5;
                    if (progress >= 20) {
                        // 進捗度が20以上の場合、アイテム獲得
                        progress -= 20;
                        ownItems++; // 計算用
                        earnItems++; // 表示用
                    }
                }
            }

            // 自然回復日時の計算
            const naturalRecoveryUnix = dayjs
                .unix(formValue.nowUnix)
                .add((consumedVitality - formValue.vitality) * 5, 'm')
                .unix();

            // 要回復元気の計算
            let requiredRecoveryVitality = 0;
            if (naturalRecoveryUnix > formValue.datetimeEndUnix) {
                requiredRecoveryVitality = Math.ceil((naturalRecoveryUnix - formValue.datetimeEndUnix) / 60 / 5);
            }

            // 所要時間の計算
            const requiredMinutes =
                minutes[course] * Math.ceil(tourTimes / formValue.vitalityCostMultiplier) + 3 * Math.ceil(eventTimes / formValue.itemsCostMultiplier);

            // 計算結果を格納
            if (!result[multiplier]) {
                result[multiplier] = {};
            }
            result[multiplier][course] = {};

            result[multiplier][course].tourTimes = Math.floor(tourTimes / formValue.vitalityCostMultiplier).toLocaleString();
            if (tourTimes % formValue.vitalityCostMultiplier) {
                result[multiplier][course].tourTimes += `…${tourTimes % formValue.vitalityCostMultiplier}`;
            }
            result[multiplier][course].consumedVitality = consumedVitality;
            result[multiplier][course].naturalRecoveryUnix = naturalRecoveryUnix;
            result[multiplier][course].requiredRecoveryVitality = requiredRecoveryVitality;
            result[multiplier][course].earnItems = earnItems;
            result[multiplier][course].tourEarnedPoints = tourEarnedPoints;

            result[multiplier][course].eventTimes = Math.floor(eventTimes / formValue.itemsCostMultiplier).toLocaleString();
            if (eventTimes % formValue.itemsCostMultiplier) {
                result[multiplier][course].eventTimes += `…${eventTimes % formValue.itemsCostMultiplier}`;
            }
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
            if (minCost.consumedVitality === undefined || minCost.consumedVitality > consumedVitality) {
                minCost.consumedVitality = consumedVitality;
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

        let recommendMultiplier = formValue.eventBonusMultiplier;
        [5, 4.5, 4, 3.5, 3].forEach((multiplier) => {
            if (minResult[multiplier][course].eventTimes === minResult[formValue.eventBonusMultiplier][course].eventTimes) {
                recommendMultiplier = multiplier;
            }
        });
        let fixedRecommendMultiplier = `×${recommendMultiplier.toFixed(1)}`;
        if (recommendMultiplier !== 5) {
            fixedRecommendMultiplier += ' ～';
        }

        function showResultText(field, minValue, maxValue, unit) {
            let text = minValue;
            if (recommendMultiplier !== 3 && minValue !== maxValue) {
                text += ` ～<br>${maxValue}`;
            }
            if (unit) {
                text += ` ${unit}`;
            }
            $(`#${field}${course}`).html(text);
        }
        showResultText(
            'tourTimes',
            minResult[formValue.eventBonusMultiplier][course].tourTimes,
            maxResult[formValue.eventBonusMultiplier][course].tourTimes
        );
        showResultText(
            'consumedVitality',
            minResult[formValue.eventBonusMultiplier][course].consumedVitality.toLocaleString(),
            maxResult[formValue.eventBonusMultiplier][course].consumedVitality.toLocaleString()
        );
        showResultText(
            'naturalRecoveryAt',
            dayjs.unix(minResult[formValue.eventBonusMultiplier][course].naturalRecoveryUnix).format('M/D H:mm'),
            dayjs.unix(maxResult[formValue.eventBonusMultiplier][course].naturalRecoveryUnix).format('M/D H:mm')
        );
        showResultText(
            'requiredRecoveryVitality',
            minResult[formValue.eventBonusMultiplier][course].requiredRecoveryVitality.toLocaleString(),
            maxResult[formValue.eventBonusMultiplier][course].requiredRecoveryVitality.toLocaleString()
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

        $(`#recommendMultiplier${course}`).text(fixedRecommendMultiplier);
        showResultText(
            'eventTimes',
            minResult[formValue.eventBonusMultiplier][course].eventTimes,
            maxResult[formValue.eventBonusMultiplier][course].eventTimes
        );
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

        // 消費元気、所要時間の最小値は青文字
        if (formValue.showCourse.length !== 1 && minResult[formValue.eventBonusMultiplier][course].consumedVitality === minCost.consumedVitality) {
            $(`#consumedVitality${course}`).addClass('info');
        } else {
            $(`#consumedVitality${course}`).removeClass('info');
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
        Object.keys(vitalityCost).forEach((course) => {
            calculateMinByCouse(course, formValue, minResult, minCost);
            calculateMinByCouse(course, formValue, maxResult, {}, true);
        });

        // 表示
        $('._2m').prop('colspan', 3);
        $('._4m').prop('colspan', 3);
        $('._6m').prop('colspan', 3);
        $('._mm').prop('colspan', 3);
        Object.keys(vitalityCost).forEach((course) => {
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
    $('#vitality').change(calculate);
    $('#ownPoints').change(calculate);
    $('#ownItems').change(calculate);
    $('#progress').change(calculate);
    $('#remainingProgress').change(calculate);
    $('[name="vitalityCostMultiplier"]').change(calculate);
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

        $('#vitality').val(formValue.vitality + vitalityCost[course] * formValue.vitalityCostMultiplier);
        $('#ownPoints').val(formValue.ownPoints - points[course] * formValue.vitalityCostMultiplier);

        formValue.progress -= (vitalityCost[course] / 5) * formValue.vitalityCostMultiplier;
        if (formValue.progress < 0) {
            // 進捗度が0未満の場合、アイテム消費
            formValue.progress += 20;
            $('#ownItems').val(formValue.ownItems - 1);
        }
        $('#progress').val(formValue.progress);
        formValue.remainingProgress += (vitalityCost[course] / 5) * formValue.vitalityCostMultiplier;
        if (formValue.remainingProgress > 40) {
            formValue.remainingProgress = 40;
        }
        $('#remainingProgress').val(formValue.remainingProgress);

        calculate();
    });
    $('.addTourTimes').click(function () {
        // eslint-disable-next-line no-invalid-this
        const course = $(this).val();
        const formValue = getFormValue();

        $('#vitality').val(formValue.vitality - vitalityCost[course] * formValue.vitalityCostMultiplier);
        $('#ownPoints').val(formValue.ownPoints + points[course] * formValue.vitalityCostMultiplier);

        formValue.progress += (vitalityCost[course] / 5) * formValue.vitalityCostMultiplier;
        if (formValue.progress >= 20) {
            // 進捗度が20以上の場合、アイテム獲得
            formValue.progress -= 20;
            $('#ownItems').val(formValue.ownItems + 1);
        }
        $('#progress').val(formValue.progress);
        formValue.remainingProgress -= (vitalityCost[course] / 5) * formValue.vitalityCostMultiplier;
        if (formValue.remainingProgress < 0) {
            formValue.remainingProgress = 0;
        }
        $('#remainingProgress').val(formValue.remainingProgress);

        calculate();
    });
    $('.subtractEventTimes').click(() => {
        const formValue = getFormValue();

        $('#ownItems').val(formValue.ownItems + formValue.itemsCostMultiplier);
        $('#ownPoints').val(formValue.ownPoints - 144 * formValue.itemsCostMultiplier * formValue.eventBonusMultiplier);

        calculate();
    });
    $('.addEventTimes').click(() => {
        const formValue = getFormValue();

        $('#ownItems').val(formValue.ownItems - formValue.itemsCostMultiplier);
        $('#ownPoints').val(formValue.ownPoints + 144 * formValue.itemsCostMultiplier * formValue.eventBonusMultiplier);
        if (formValue.remainingProgress <= 0) {
            $('#remainingProgress').val(40);
        }

        calculate();
    });

    // 保存ボタン
    function save() {
        const datetimeSave = dayjs().format('YYYY/M/D H:mm');

        const saveData = {
            datetimeStart: $('#datetimeStart').val(),
            datetimeEnd: $('#datetimeEnd').val(),
            targetEnd: $('#targetEnd').val(),
            vitality: $('#vitality').val(),
            ownPoints: $('#ownPoints').val(),
            ownItems: $('#ownItems').val(),
            progress: $('#progress').val(),
            remainingProgress: $('#remainingProgress').val(),
            vitalityCostMultiplier: $('[name="vitalityCostMultiplier"]:checked').val(),
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

        localStorage.setItem(location.href, JSON.stringify(saveData));

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
        $('#vitality').val(0);
        $('#ownPoints').val(0);
        $('#ownItems').val(0);
        $('#progress').val(0);
        $('#remainingProgress').val(40);
        $('[name="vitalityCostMultiplier"][value="1"]').prop('checked', true);
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
        const savedString = localStorage.getItem(location.href);

        if (!savedString) {
            return false;
        }

        const savedData = JSON.parse(savedString);

        $('#datetimeStart').val(savedData.datetimeStart);
        $('#datetimeEnd').val(savedData.datetimeEnd);
        $('#targetEnd').val(savedData.targetEnd);
        $('#vitality').val(savedData.vitality);
        $('#ownPoints').val(savedData.ownPoints);
        $('#ownItems').val(savedData.ownItems);
        $('#progress').val(savedData.progress);
        $('#remainingProgress').val(savedData.remainingProgress);
        $(`[name="vitalityCostMultiplier"][value="${savedData.vitalityCostMultiplier}"]`).prop('checked', true);
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
        localStorage.removeItem(location.href);

        $('#datetimeSave').text('削除済');
        $('#loadSave').prop('disabled', true);
        $('#clearSave').prop('disabled', true);
    });

    // 画面表示時に保存した値を読込、保存した値がなければ入力の初期化
    if (!loadSavedData()) {
        defaultInput();
    }
})();
