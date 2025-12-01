const API_URL = "https://script.google.com/macros/s/AKfycbzqJkTWBuf7dmdoHHFJlLWz71v2H0NStiLUWIU0ahTQZl76lpkBO9N_PRf49lMk0Nb4hQ/exec"
// 全ての取引を保存する配列
let transactions = [];
//DOM取得などのコード
const form = document.getElementById('transaction-form');
const dateInput = document.getElementById('date');
const typeInput = document.getElementById('type');
const categoryInput = document.getElementById('category');
const amountInput = document.getElementById('amount');
const summaryDiv = document.getElementById('summary');
const accountInput = document.getElementById('account');
// 振替機能のデータ取得
const transferForm = document.getElementById('transfer-form');
const transferDate = document.getElementById('transfer-date');
const fromAccount = document.getElementById('from-account');
const toAccount = document.getElementById('to-account');
const transferAmount = document.getElementById('transfer-amount');
//月.年のフィルター
const monthFilter = document.getElementById('month-filter');
const yearFilter = document.getElementById('year-filter');

const filterModes = document.getElementsByName('filter-mode');
//一覧表示ロジック
const transactionList = document.getElementById('transaction-list');

// LocalStorage から読み込む
const savedData = localStorage.getItem('transactions');
if (savedData){
    transactions = JSON.parse(savedData);
    updateSummary();
}    

form.addEventListener('submit', function (e){
  e.preventDefault();

  // 入力値を取得
  const date = dateInput.value;
  const type = typeInput.value;
  const category = categoryInput.value;
  const amount = Number(amountInput.value);
  const account = accountInput.value;
  // 入力された取引をオブジェクトとして保存
  const transaction = {
    date,
    type,
    category,
    amount,
    account,
  };
  transactions.push(transaction);
  localStorage.setItem('transactions',JSON.stringify(transactions));
  // フォームの入力をクリア
  form.reset();

  // 合計を再計算して表示
  updateSummary();
});



// 合計を計算して表示する関数
function updateSummary() {
  let incomeTotal = 0;
  let expenseTotal = 0;
  let accountTotal = {};
  //選ばれた月
  //ver1.001年or月別を取得に変更
  const currentMode = document.querySelector('input[name="filter-mode"]:checked').value;
  const selectedMonth = monthFilter.value;
  const selectedYear  = yearFilter.value;
  //一覧表示のリスト作成
  let listHtml = "<ul>";

  transactions.forEach((t, index) => {
    //口座ごとの残高計算ver1.001
    if(!accountTotal[t.account]){
      accountTotal[t.account] = 0;
    }
    accountTotal[t.accounut] += (t.type === 'income' ? t.amount : -t.amount);
    //フィルター処理
    const tYear = t.date.slice(0,4);
    const tMonth = t.date.slice(0, 7);
    if (currentMode === 'month'){
      if(selectedMonth && tMonth !== selectedMonth) return;
    }else{
      if(selectedYear && tYear !== selectedYear) return;
    }
    //フィルター通過
    //ver1.001 振替判定->収支合計の変更
    const isTransfer = t.category.includes('振替');

    if(!isTransfer){
      if(t.type ==="income"){
        incomeTotal += t.amount;
      }
      else if (t.type === 'expense'){
        expenseTotal += t.amount;
      }
    }

    // 口座ごとの合計を計算
    if (!accountTotal[t.account]){
      accountTotal[t.account] = 0;
    }
    accountTotal[t.account] += (t.type === 'income' ? t.amount : -t.amount);

    listHtml += `
      <li>
        ${t.date} /${t.account} / ${t.type === 'income' ? '収入' : '支出'} / ${t.category} / ¥${t.amount.toLocaleString()}
        <button onclick = "deleteTransaction(${index})">削除</button>
      </li>
    `;
  });

  listHtml += "</ul>"
  transactionList.innerHTML = listHtml;

  // 表示
  //ver1.001 mode表示追加
  const periodLabel = currentMode === 'month' ? '月間':'年間';

  let summaryHtml = `
    <p><strong>収入合計：</strong> ¥${incomeTotal.toLocaleString()}</p>
    <p><strong>支出合計：</strong> ¥${expenseTotal.toLocaleString()}</p>
    <p><strong>収支：</strong> ¥${(incomeTotal - expenseTotal).toLocaleString()}</p>
    <hr/>
    <p><strong>口座別残高:</strong></p>
  `;

  for (const account in accountTotal) {
    summaryHtml += `<p>${account}: ¥${accountTotal[account].toLocaleString()}</p>`;
  }

  summaryDiv.innerHTML = summaryHtml;
}  
function deleteTransaction(index){
  if(confirm('この取引を削除しますか？')){
    transactions.splice(index, 1); //配列から削除
    localStorage.setItem('transactions', JSON.stringify(transactions));
    updateSummary();
  }
}
// 振替フォームの送信処理
monthFilter.addEventListener('change', updateSummary);
transferForm.addEventListener('submit', function (e){
  e.preventDefault();

  const date = transferDate.value;
  const from = fromAccount.value;
  const to = toAccount.value;
  const amount =Number(transferAmount.value);

  if (from === to){
    alert('同じ口座間では振替できません');
    return;
  }
  //出金として記録
  transactions.push({
    date,
    type: 'expense',
    category: '振替',
    amount,
    account: from,
  });
  //入金として記録
  transactions.push({
    date,
    type: 'income',
    category: '振替',
    amount,
    account: to,
  });

  //保存
  localStorage.setItem('transactions',JSON.stringify(transactions));

  //入力クリア
  transferForm.reset();

  //画面更新
  updateSummary();
});
//追加ver1.001
//月別、年別が変更->入寮欄を出し分けて再集計
filterModes.forEach(mode =>{
  mode.addEventListener('change',(e) => {
    if(e.target.value ==='month'){
      monthFilter.style.display = 'inline-block';
      yearFilter.style.display = 'none';
    }else{
      monthFilter.style.display = 'none';
      yearFilter.style.display = 'inline-block';
    }
    updateSummary()
  })
})
//年フィルター変更時再集計
yearFilter.addEventListener('input', updateSummary);

monthFilter.addEventListener('change',updateSummary);
