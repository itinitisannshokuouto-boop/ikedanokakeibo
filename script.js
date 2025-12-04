// ★★★ Google Apps ScriptのURL ★★★
const API_URL = "https://script.google.com/macros/s/AKfycbzqJkTWBuf7dmdoHHFJlLWz71v2H0NStiLUWIU0ahTQZl76lpkBO9N_PRf49lMk0Nb4hQ/exec";

// 全ての取引を保存する配列
let transactions = [];

// ページの読み込み時にデータを取得
window.addEventListener('DOMContentLoaded', () => {
    fetchData();
});

// ▼ データをスプレッドシートから取得する関数
function fetchData() {
    console.log("データ取得中...");
    const summaryDiv = document.getElementById('summary');
    // 読み込み中であることを表示
    if(transactions.length === 0) {
        summaryDiv.innerHTML = "<p>データを読み込み中...</p>"; 
    }

    fetch(API_URL)
        .then(response => response.json())
        .then(data => {
            // スプレッドシートのデータを扱いやすい形に変換
            transactions = data.map(item => {
                return {
                    date: formatDate(new Date(item.date)),
                    type: item.type,
                    category: item.category,
                    amount: Number(item.amount),
                    account: item.account
                };
            });
            // 画面更新
            updateSummary();
            console.log("データ取得完了", transactions);
        })
        .catch(error => {
            console.error('エラー:', error);
            summaryDiv.innerHTML = "<p>データの読み込みに失敗しました。</p>";
        });
}

// ▼ データをスプレッドシートに送信（追加）する関数
function sendData(transactionData) {
    // ボタンを無効化して連打防止
    const submitBtn = document.querySelector('button[type="submit"]');
    if(submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "送信中...";
    }

    fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(transactionData)
    })
    .then(() => {
        alert("保存しました！");
        // フォームをクリア
        document.getElementById('transaction-form').reset();
        document.getElementById('transfer-form').reset();
        
        // 最新データを再取得して表示
        fetchData(); 
    })
    .catch(error => {
        alert("エラーが発生しました");
        console.error(error);
    })
    .finally(() => {
        // ボタンを元に戻す
        if(submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "追加";
        }
    });
}


// DOM取得
const form = document.getElementById('transaction-form');
const dateInput = document.getElementById('date');
const typeInput = document.getElementById('type');
const categoryInput = document.getElementById('category');
const amountInput = document.getElementById('amount');
const summaryDiv = document.getElementById('summary');
const accountInput = document.getElementById('account');

// 振替機能のDOM
const transferForm = document.getElementById('transfer-form');
const transferDate = document.getElementById('transfer-date');
const fromAccount = document.getElementById('from-account');
const toAccount = document.getElementById('to-account');
const transferAmount = document.getElementById('transfer-amount');

// フィルター
const monthFilter = document.getElementById('month-filter');
const yearFilter = document.getElementById('year-filter');
const filterModes = document.getElementsByName('filter-mode');
const transactionList = document.getElementById('transaction-list');


// ★★★ 通常の取引追加イベント ★★★
form.addEventListener('submit', function (e) {
    e.preventDefault();

    // 送信するデータを作る
    const transaction = {
        date: dateInput.value,
        type: typeInput.value,
        category: categoryInput.value,
        amount: amountInput.value,
        account: accountInput.value,
    };

    // Googleスプレッドシートへ送信
    sendData(transaction);
});


// ★★★ 振替フォームの送信イベント ★★★
transferForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const date = transferDate.value;
    const from = fromAccount.value;
    const to = toAccount.value;
    const amount = Number(transferAmount.value);

    if (from === to) {
        alert('同じ口座間では振替できません');
        return;
    }
    
    alert("振替データを送信します（2回処理が走ります）");

    // 1. 出金データの送信
    const expenseData = {
        date: date,
        type: 'expense',
        category: '振替（出金）',
        amount: amount,
        account: from
    };

    // 2. 入金データの送信
    fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(expenseData)
    }).then(() => {
        // 出金が送れたら入金を送る
        const incomeData = {
            date: date,
            type: 'income',
            category: '振替（入金）',
            amount: amount,
            account: to
        };
        return fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(incomeData)
        });
    }).then(() => {
        alert("振替完了しました");
        transferForm.reset();
        fetchData();
    });
});


// ★★★ 合計計算と表示 ★★★
function updateSummary() {
    let incomeTotal = 0;
    let expenseTotal = 0;
    let accountTotal = {};

    // フィルター設定の取得
    const currentMode = document.querySelector('input[name="filter-mode"]:checked').value;
    const selectedMonth = monthFilter.value;
    const selectedYear = yearFilter.value;

    let listHtml = "<ul>";

    transactions.forEach((t, index) => {
        // 口座ごとの残高計算
        if (!accountTotal[t.account]) {
            accountTotal[t.account] = 0;
        }
        // 収入ならプラス、支出ならマイナス
        accountTotal[t.account] += (t.type === 'income' ? t.amount : -t.amount);


        // ▼ここからフィルター処理
        const tYear = t.date.slice(0, 4);
        const tMonth = t.date.slice(0, 7);

        if (currentMode === 'month') {
            if (selectedMonth && tMonth !== selectedMonth) return;
        } else {
            if (selectedYear && tYear !== selectedYear) return;
        }

        // フィルターを通過したデータだけが集計対象
        const isTransfer = t.category.includes('振替');

        if (!isTransfer) {
            if (t.type === "income") {
                incomeTotal += t.amount;
            } else if (t.type === 'expense') {
                expenseTotal += t.amount;
            }
        }

        listHtml += `
            <li>
                ${t.date} / ${t.account} / ${t.type === 'income' ? '収入' : '支出'} / ${t.category} / ¥${t.amount.toLocaleString()}
                <button onclick="alert('削除機能はスプレッドシート連携中は使用できません。シートを直接編集してください。')">削除不可</button>
            </li>
        `;
    });

    listHtml += "</ul>";
    transactionList.innerHTML = listHtml;

    // 表示
    let summaryHtml = `
        <p><strong>収入合計：</strong> ¥${incomeTotal.toLocaleString()}</p>
        <p><strong>支出合計：</strong> ¥${expenseTotal.toLocaleString()}</p>
        <p><strong>収支：</strong> ¥${(incomeTotal - expenseTotal).toLocaleString()}</p>
        <hr/>
        <p><strong>現在の口座残高 (全期間):</strong></p>
    `;

    for (const account in accountTotal) {
        summaryHtml += `<p>${account}: ¥${accountTotal[account].toLocaleString()}</p>`;
    }

    summaryDiv.innerHTML = summaryHtml;
}

// 日付フォーマット関数
function formatDate(date) {
    if (isNaN(date.getTime())) return ""; 
    const y = date.getFullYear();
    const m = ('0' + (date.getMonth() + 1)).slice(-2);
    const d = ('0' + date.getDate()).slice(-2);
    return `${y}-${m}-${d}`;
}

// フィルター切り替えイベント
filterModes.forEach(mode => {
    mode.addEventListener('change', (e) => {
        if (e.target.value === 'month') {
            monthFilter.style.display = 'inline-block';
            yearFilter.style.display = 'none';
        } else {
            monthFilter.style.display = 'none';
            yearFilter.style.display = 'inline-block';
        }
        updateSummary();
    });
});

yearFilter.addEventListener('input', updateSummary);
monthFilter.addEventListener('change', updateSummary);