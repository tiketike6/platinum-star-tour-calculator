(() => {
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

    // ツアーの計算
    const calculateTour = () => {
        const datetimeEnd = $('#datetimeEnd').val();
        const targetEndVal = $('#targetEnd').val();
        const ownPointsVal = $('#ownPoints').val();
        const vitalityVal = $('#vitality').val();
        const vitalityCostMultiplier = Number($('[name="vitalityCostMultiplier"]:checked').val());
        const itemsCostMultiplier = Number($('[name="itemsCostMultiplier"]:checked').val());
        const eventBonusMultiplier = Number($('[name="eventBonusMultiplier"]:checked').val());
        const showCourse = $('[name="showCourse"]:checked')
            .map((i) => {
                return $('[name="showCourse"]:checked').eq(i).val();
            })
            .get();

        if (!ownPointsVal || !vitalityVal) {
            return;
        }

        const datetimeEndUnix = dayjs(datetimeEnd).unix();
        const targetEnd = Number(targetEndVal);
        const ownPoints = Number(ownPointsVal);
        const vitality = Number(vitalityVal);

        const value = {};
        const minCost = {};

        // コース毎の計算
        const calculateTourByCouse = (course, multiplier) => {
            let ownItems = $('#ownItems').val();
            let progress = $('#progress').val();

            if (!ownItems || !progress) {
                return;
            }

            ownItems = Number(ownItems);
            progress = Number(progress);

            let tourTimes = 0;
            let consumedVitality = 0;
            let tourEarnedPoints = 0;
            let earnItems = 0;

            let eventTimes = 0;
            let consumedItems = 0;
            let eventEarnedPoints = 0;

            // ツアー準備回数、イベント楽曲回数を計算
            while (targetEnd > ownPoints + tourEarnedPoints + eventEarnedPoints) {
                // 累積ptが最終目標pt以上になるまで繰り返し
                if (ownItems) {
                    // アイテムを消費倍率以上所持している場合、イベント楽曲
                    eventTimes++;
                    ownItems -= 1;
                    consumedItems += 1;
                    eventEarnedPoints += 144 * multiplier;
                } else {
                    // アイテム所持数が消費倍率未満の場合、ツアー準備
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

            // 消費倍率の調整
            tourTimes = tourTimes / vitalityCostMultiplier;
            eventTimes = eventTimes / itemsCostMultiplier;

            // 自然回復日時、要回復元気、所要時間を計算
            const naturalRecoveryUnix = dayjs()
                .add((consumedVitality - vitality) * 5, 'm')
                .unix();

            let requiredRecoveryVitality = 0;
            if (naturalRecoveryUnix > datetimeEndUnix) {
                requiredRecoveryVitality = Math.ceil((naturalRecoveryUnix - datetimeEndUnix) / 60 / 5);
            }

            const requiredMinutes = minutes[course] * Math.ceil(tourTimes) + 3 * Math.ceil(eventTimes);

            // 計算結果を格納
            if (!value[multiplier]) {
                value[multiplier] = {};
            }
            value[multiplier][course] = {};

            value[multiplier][course].tourTimes = tourTimes;
            value[multiplier][course].consumedVitality = consumedVitality;
            value[multiplier][course].tourEarnedPoints = tourEarnedPoints;
            value[multiplier][course].earnItems = earnItems;

            value[multiplier][course].eventTimes = eventTimes;
            value[multiplier][course].consumedItems = consumedItems;
            value[multiplier][course].eventEarnedPoints = eventEarnedPoints;

            value[multiplier][course].naturalRecoveryUnix = naturalRecoveryUnix;
            value[multiplier][course].requiredRecoveryVitality = requiredRecoveryVitality;
            value[multiplier][course].requiredMinutes = requiredMinutes;

            // 消費元気、所要時間の最小値を格納
            if (minCost.consumedVitality === undefined || minCost.consumedVitality > consumedVitality) {
                minCost.consumedVitality = consumedVitality;
            }
            if (minCost.requiredMinutes === undefined || minCost.requiredMinutes > requiredMinutes) {
                minCost.requiredMinutes = requiredMinutes;
            }
        };

        Object.keys(vitalityCost).forEach((course) => {
            if (showCourse.length && showCourse.indexOf(course) === -1) {
                return;
            }
            [5, 4.5, 4, 3.5, 3].forEach((multiplier) => {
                calculateTourByCouse(course, multiplier);
            });
        });

        // 表示
        Object.keys(vitalityCost).forEach((course) => {
            if (showCourse.length && showCourse.indexOf(course) === -1) {
                $(`.${course}`).addClass('collapse');
                return;
            }
            $(`.${course}`).removeClass('collapse');

            let tourTimes = value[eventBonusMultiplier][course].tourTimes;
            if (tourTimes - Math.floor(tourTimes)) {
                tourTimes = `${Math.floor(tourTimes).toLocaleString()}…${((tourTimes - Math.floor(tourTimes)) * vitalityCostMultiplier).toFixed()}`;
            } else {
                tourTimes = Math.floor(tourTimes).toLocaleString();
            }

            let eventTimes = value[eventBonusMultiplier][course].eventTimes;
            if (eventTimes - Math.floor(eventTimes)) {
                eventTimes = `${Math.floor(eventTimes).toLocaleString()}…${((eventTimes - Math.floor(eventTimes)) * itemsCostMultiplier).toFixed()}`;
            } else {
                eventTimes = Math.floor(eventTimes).toLocaleString();
            }

            let requiredMinutes = value[eventBonusMultiplier][course].requiredMinutes;
            let requiredTime = `${Math.ceil(requiredMinutes)}分`;
            if (requiredMinutes > 60) {
                requiredTime = `${Math.floor(requiredMinutes / 60)}時間`;
                requiredMinutes = requiredMinutes % 60;
                if (requiredMinutes > 0) {
                    requiredTime += `${Math.ceil(requiredMinutes)}分`;
                }
            }

            let recommendMultiplier = eventBonusMultiplier;
            [5, 4.5, 4, 3.5, 3].forEach((multiplier) => {
                if (value[multiplier][course].eventTimes === value[eventBonusMultiplier][course].eventTimes) {
                    recommendMultiplier = multiplier;
                }
            });
            if (recommendMultiplier === 5) {
                recommendMultiplier = '×5.0';
            } else if (recommendMultiplier === 3 || recommendMultiplier === 4) {
                recommendMultiplier = `×${recommendMultiplier}.0～`;
            } else {
                recommendMultiplier = `×${recommendMultiplier}～`;
            }

            $(`#tourTimes${course}`).text(tourTimes);
            $(`#consumedVitality${course}`).text(value[eventBonusMultiplier][course].consumedVitality.toLocaleString());
            $(`#tourEarnedPoints${course}`).text(`${value[eventBonusMultiplier][course].tourEarnedPoints.toLocaleString()} pt`);
            $(`#earnItems${course}`).text(`${value[eventBonusMultiplier][course].earnItems.toLocaleString()} 個`);

            $(`#eventTimes${course}`).text(eventTimes);
            $(`#consumedItems${course}`).text(`${value[eventBonusMultiplier][course].consumedItems.toLocaleString()} 個`);
            $(`#eventEarnedPoints${course}`).text(`${value[eventBonusMultiplier][course].eventEarnedPoints.toLocaleString()} pt`);

            $(`#naturalRecoveryAt${course}`).text(dayjs.unix(value[eventBonusMultiplier][course].naturalRecoveryUnix).format('M/D H:mm'));
            $(`#requiredRecoveryVitality${course}`).text(value[eventBonusMultiplier][course].requiredRecoveryVitality.toLocaleString());
            $(`#requiredTime${course}`).text(requiredTime);

            $(`#recommendMultiplier${course}`).text(recommendMultiplier);

            // 消費元気、所要時間の最小値は黄文字
            if (showCourse.length !== 1 && value[eventBonusMultiplier][course].consumedVitality === minCost.consumedVitality) {
                $(`#consumedVitality${course}`).addClass('minCost');
            } else {
                $(`#consumedVitality${course}`).removeClass('minCost');
            }
            if (showCourse.length !== 1 && value[eventBonusMultiplier][course].requiredMinutes === minCost.requiredMinutes) {
                $(`#requiredTime${course}`).addClass('minCost');
            } else {
                $(`#requiredTime${course}`).removeClass('minCost');
            }

            // 開催期限をオーバーする場合、赤文字
            if (value[eventBonusMultiplier][course].naturalRecoveryUnix > datetimeEndUnix) {
                $(`#naturalRecoveryAt${course}`).addClass('timeOver');
            } else {
                $(`#naturalRecoveryAt${course}`).removeClass('timeOver');
            }
            if (dayjs().add(value[eventBonusMultiplier][course].requiredMinutes, 'm').unix() > datetimeEndUnix) {
                $(`#requiredTime${course}`).addClass('timeOver');
            } else {
                $(`#requiredTime${course}`).removeClass('timeOver');
            }
        });
    };

    // 目標ポイントを計算・表示する
    const calculateTargetPoint = () => {
        const datetimeStart = $('#datetimeStart').val();
        const datetimeEnd = $('#datetimeEnd').val();
        const targetEnd = $('#targetEnd').val();

        const regex = /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]$/;
        if (!regex.test(datetimeStart) || !regex.test(datetimeEnd)) {
            alert('日時は「2021-01-01T00:00」のように入力してください。');
            return;
        }
        if (!dayjs(datetimeStart).isValid() || !dayjs(datetimeEnd).isValid() || !targetEnd) {
            return;
        }

        const datetimeStartUnix = dayjs(datetimeStart).unix();
        const datetimeEndUnix = dayjs(datetimeEnd).unix();
        let endOfTodayUnix = dayjs().endOf('d').unix();
        if (endOfTodayUnix < datetimeStartUnix) {
            endOfTodayUnix = dayjs.unix(datetimeStartUnix).endOf('d').unix();
        }
        if (endOfTodayUnix > datetimeEndUnix) {
            endOfTodayUnix = datetimeEndUnix;
        }
        const nowUnix = dayjs().endOf('m').unix();
        const targetToday = Math.round((targetEnd * (endOfTodayUnix - datetimeStartUnix)) / (datetimeEndUnix - datetimeStartUnix));
        const targetNow = Math.round((targetEnd * (nowUnix - datetimeStartUnix)) / (datetimeEndUnix - datetimeStartUnix));

        $('#labelToday').text(`${dayjs.unix(endOfTodayUnix).format('M/D')}の目標pt`);
        $('#labelNow').text(`${dayjs.unix(nowUnix).format('M/D H:mm')}の目標pt`);

        // ツアー追加分
        const ownPoints = $('#ownPoints').val() || 0;
        let diffEnd = targetEnd - ownPoints;
        if (diffEnd < 0) {
            diffEnd = 0;
        }
        let diffToday = targetToday - ownPoints;
        if (diffToday < 0) {
            diffToday = 0;
        }
        let diffNow = targetNow - ownPoints;
        if (diffNow < 0) {
            diffNow = 0;
        }
        $('#diffEnd').text(`(あと ${diffEnd.toLocaleString()} pt)`);
        $('#targetToday').text(`${targetToday.toLocaleString()} pt (あと ${diffToday.toLocaleString()} pt)`);
        $('#targetNow').text(`${targetNow.toLocaleString()} pt (あと ${diffNow.toLocaleString()} pt)`);
        calculateTour();

        if ($('#autoSave').prop('checked')) {
            save();
        }
    };

    // input要素の変更時
    $('#datetimeStart').change(calculateTargetPoint);
    $('#datetimeEnd').change(calculateTargetPoint);
    $('#targetEnd').change(calculateTargetPoint);
    $('#autoSave').change(calculateTargetPoint);
    // ツアー追加分
    $('#vitality').change(calculateTargetPoint);
    $('#ownPoints').change(calculateTargetPoint);
    $('#ownItems').change(calculateTargetPoint);
    $('#progress').change(calculateTargetPoint);
    $('[name="vitalityCostMultiplier"]').change(calculateTargetPoint);
    $('[name="itemsCostMultiplier"]').change(calculateTargetPoint);
    $('[name="eventBonusMultiplier"]').change(calculateTargetPoint);
    $('[name="showCourse"]').change(() => {
        const showCourse = $('[name="showCourse"]:checked')
            .map((i) => {
                return $('[name="showCourse"]:checked').eq(i).val();
            })
            .get();
        if (showCourse.length === 12) {
            $('#showCourse_all').prop('checked', true);
        } else {
            $('#showCourse_all').prop('checked', false);
        }
        calculateTargetPoint();
    });
    $('#showCourse_all').change(() => {
        if ($('#showCourse_all').prop('checked')) {
            $('[name="showCourse"]').each((i) => {
                $('[name="showCourse"]').eq(i).prop('checked', true);
            });
        } else {
            $('[name="showCourse"]').each((i) => {
                $('[name="showCourse"]').eq(i).prop('checked', false);
            });
        }
        calculateTargetPoint();
    });

    // 回数増減ボタン
    $('.subtractTourTimes').click(function () {
        const course = $(this).val();
        const vitalityCostMultiplier = Number($('[name="vitalityCostMultiplier"]:checked').val());

        let vitality = $('#vitality').val();
        if (!vitality) {
            return;
        }
        vitality = Number(vitality);
        vitality += vitalityCost[course] * vitalityCostMultiplier;
        $('#vitality').val(vitality);

        let ownPoints = $('#ownPoints').val();
        if (!ownPoints) {
            return;
        }
        ownPoints = Number(ownPoints);
        ownPoints -= points[course] * vitalityCostMultiplier;
        $('#ownPoints').val(ownPoints);

        let ownItems = $('#ownItems').val();
        let progress = $('#progress').val();
        if (!ownItems || !progress) {
            return;
        }
        ownItems = Number(ownItems);
        progress = Number(progress);
        progress -= (vitalityCost[course] / 5) * vitalityCostMultiplier;
        if (progress < 0) {
            // 進捗度が0未満の場合、アイテム消費
            progress += 20;
            ownItems--;
            $('#ownItems').val(ownItems);
        }
        $('#progress').val(progress);

        calculateTargetPoint();
    });
    $('.addTourTimes').click(function () {
        const course = $(this).val();
        const vitalityCostMultiplier = Number($('[name="vitalityCostMultiplier"]:checked').val());

        let vitality = $('#vitality').val();
        if (!vitality) {
            return;
        }
        vitality = Number(vitality);
        vitality -= vitalityCost[course] * vitalityCostMultiplier;
        $('#vitality').val(vitality);

        let ownPoints = $('#ownPoints').val();
        if (!ownPoints) {
            return;
        }
        ownPoints = Number(ownPoints);
        ownPoints += points[course] * vitalityCostMultiplier;
        $('#ownPoints').val(ownPoints);

        let ownItems = $('#ownItems').val();
        let progress = $('#progress').val();
        if (!ownItems || !progress) {
            return;
        }
        ownItems = Number(ownItems);
        progress = Number(progress);
        progress += (vitalityCost[course] / 5) * vitalityCostMultiplier;
        if (progress >= 20) {
            // 進捗度が20以上の場合、アイテム獲得
            progress -= 20;
            ownItems++;
            $('#ownItems').val(ownItems);
        }
        $('#progress').val(progress);

        calculateTargetPoint();
    });
    $('.subtractEventTimes').click(function () {
        const itemsCostMultiplier = Number($('[name="itemsCostMultiplier"]:checked').val());
        const eventBonusMultiplier = Number($('[name="eventBonusMultiplier"]:checked').val());

        let ownItems = $('#ownItems').val();
        if (!ownItems) {
            return;
        }
        ownItems = Number(ownItems);
        ownItems += itemsCostMultiplier;
        $('#ownItems').val(ownItems);

        let ownPoints = $('#ownPoints').val();
        if (!ownPoints) {
            return;
        }
        ownPoints = Number(ownPoints);
        ownPoints -= 144 * itemsCostMultiplier * eventBonusMultiplier;
        $('#ownPoints').val(ownPoints);

        calculateTargetPoint();
    });
    $('.addEventTimes').click(function () {
        const itemsCostMultiplier = Number($('[name="itemsCostMultiplier"]:checked').val());
        const eventBonusMultiplier = Number($('[name="eventBonusMultiplier"]:checked').val());

        let ownItems = $('#ownItems').val();
        if (!ownItems) {
            return;
        }
        ownItems = Number(ownItems);
        ownItems -= itemsCostMultiplier;
        $('#ownItems').val(ownItems);

        let ownPoints = $('#ownPoints').val();
        if (!ownPoints) {
            return;
        }
        ownPoints = Number(ownPoints);
        ownPoints += 144 * itemsCostMultiplier * eventBonusMultiplier;
        $('#ownPoints').val(ownPoints);

        calculateTargetPoint();
    });

    // 更新ボタン
    $('#update').click(calculateTargetPoint);

    // 保存ボタン
    const save = () => {
        const datetimeSave = dayjs().format('YYYY/M/D H:mm');

        const saveData = {
            datetimeStart: $('#datetimeStart').val(),
            datetimeEnd: $('#datetimeEnd').val(),
            targetEnd: $('#targetEnd').val(),
            autoSave: $('#autoSave').prop('checked'),
            datetimeSave: datetimeSave,
            // ツアー追加分
            vitality: $('#vitality').val(),
            ownPoints: $('#ownPoints').val(),
            ownItems: $('#ownItems').val(),
            progress: $('#progress').val(),
            vitalityCostMultiplier: $('[name="vitalityCostMultiplier"]:checked').val(),
            itemsCostMultiplier: $('[name="itemsCostMultiplier"]:checked').val(),
            eventBonusMultiplier: $('[name="eventBonusMultiplier"]:checked').val(),
            showCourse: $('[name="showCourse"]:checked')
                .map((i) => {
                    return $('[name="showCourse"]:checked').eq(i).val();
                })
                .get(),
        };

        localStorage.setItem(location.href, JSON.stringify(saveData));

        $('#datetimeSave').text(datetimeSave);
        $('#loadSave').prop('disabled', false);
        $('#clearSave').prop('disabled', false);
    };
    $('#save').click(save);

    // 入力を初期化ボタン
    const defaultInput = () => {
        $('#datetimeStart').val(dayjs().subtract(15, 'h').format('YYYY-MM-DDT15:00'));
        $('#datetimeEnd').val(dayjs().subtract(15, 'h').add(1, 'w').format('YYYY-MM-DDT20:59'));
        $('#targetEnd').val(30000);
        $('#autoSave').prop('checked', false);
        // ツアー追加分
        $('#vitality').val(0);
        $('#ownPoints').val(0);
        $('#ownItems').val(0);
        $('#progress').val(0);
        $('[name="vitalityCostMultiplier"][value="1"]').prop('checked', true);
        $('[name="itemsCostMultiplier"][value="2"]').prop('checked', true);
        $('[name="eventBonusMultiplier"][value="5"]').prop('checked', true);
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
        $('#showCourse_all').prop('checked', false);

        calculateTargetPoint();
    };
    $('#clearInput').click(defaultInput);

    // 保存した値を読込ボタン
    const loadSavedData = () => {
        const savedString = localStorage.getItem(location.href);

        if (!savedString) {
            return false;
        }

        const savedData = JSON.parse(savedString);

        $('#datetimeStart').val(savedData.datetimeStart);
        $('#datetimeEnd').val(savedData.datetimeEnd);
        $('#targetEnd').val(savedData.targetEnd);
        $('#autoSave').prop('checked', savedData.autoSave);
        // ツアー追加分
        $('#vitality').val(savedData.vitality);
        $('#ownPoints').val(savedData.ownPoints);
        $('#ownItems').val(savedData.ownItems);
        $('#progress').val(savedData.progress);
        $(`[name="vitalityCostMultiplier"][value="${savedData.vitalityCostMultiplier}"]`).prop('checked', true);
        $(`[name="itemsCostMultiplier"][value="${savedData.itemsCostMultiplier}"]`).prop('checked', true);
        $(`[name="eventBonusMultiplier"][value="${savedData.eventBonusMultiplier}"]`).prop('checked', true);
        $('[name="showCourse"]').each((i) => {
            if (savedData.showCourse.indexOf($('[name="showCourse"]').eq(i).val()) !== -1) {
                $('[name="showCourse"]').eq(i).prop('checked', true);
            } else {
                $('[name="showCourse"]').eq(i).prop('checked', false);
            }
        });
        if (savedData.showCourse.length === 12) {
            $('#showCourse_all').prop('checked', true);
        } else {
            $('#showCourse_all').prop('checked', false);
        }

        calculateTargetPoint();

        $('#datetimeSave').text(savedData.datetimeSave);
        $('#loadSave').prop('disabled', false);
        $('#clearSave').prop('disabled', false);

        return true;
    };
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
