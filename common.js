// =============================================
// common.js — index.html / edit.html 共通ライブラリ
// =============================================

// --- 定数 ---
const STORAGE_KEYS = {
  ALL_TASKS:       'lifelisten_timer_all_tasks',
  RESULTS:         'lifelisten_timer_results',
  SUMMARY_RESULTS: 'lifelisten_timer_summary_results',
  MEMO_RESULTS:    'lifelisten_timer_memo_results',
  LAST_CSV:        'lifelisten_timer_last_csv'
};

const PRESET_ICONS = [
  'fa-solid fa-bath',         'fa-solid fa-toilet',       'fa-solid fa-bed',
  'fa-solid fa-utensils',     'fa-solid fa-fire-burner',  'fa-solid fa-broom',
  'fa-solid fa-briefcase',    'fa-solid fa-droplet',      'fa-solid fa-face-smile',
  'fa-solid fa-sun',          'fa-solid fa-person-running','fa-solid fa-person-walking',
  'fa-solid fa-bicycle',      'fa-solid fa-train',        'fa-solid fa-shirt',
  'fa-solid fa-tooth',        'fa-solid fa-book',         'fa-solid fa-laptop',
  'fa-solid fa-mobile-screen','fa-solid fa-cart-shopping','fa-solid fa-yen-sign',
  'fa-solid fa-mug-hot',      'fa-solid fa-wine-glass',   'fa-solid fa-music',
  'fa-solid fa-trash-can',    'fa-solid fa-pills',        'fa-solid fa-hospital',
  'fa-solid fa-heart',        'fa-solid fa-star',         'fa-solid fa-headphones'
];

// --- LocalStorage ユーティリティ ---
function saveToLocalStorage(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); return true; }
  catch (e) { console.warn('LocalStorage保存失敗:', e); return false; }
}
function loadFromLocalStorage(key) {
  try { return JSON.parse(localStorage.getItem(key)); }
  catch (e) { return null; }
}

// --- RFC 4180 準拠 CSVパーサー ---
// カンマ・改行・ダブルクォートを含むフィールドを正しく処理する
function parseCSV(text) {
  const rows = [];
  let field = '';
  let inQuote = false;
  let row = [];
  // 末尾に改行がない場合も正しく処理するために番兵を追加
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];

    if (inQuote) {
      if (ch === '"' && next === '"') {
        // エスケープされたダブルクォート
        field += '"';
        i++;
      } else if (ch === '"') {
        // クォート終了
        inQuote = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
      } else {
        field += ch;
      }
    }
  }
  // 最後のフィールド・行を追加
  row.push(field);
  if (row.some(f => f !== '')) rows.push(row);

  return rows;
}

// CSVテキストをオブジェクト配列に変換
function csvToObjects(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(cols => {
    return headers.reduce((obj, h, i) => {
      let v = (cols[i] || '').trim();
      if (h === '秒数' || h === '順番') v = Number(v) || 0;
      obj[h] = v;
      return obj;
    }, {});
  });
}

// オブジェクト配列をCSVテキストに変換（RFC 4180準拠）
function objectsToCSV(objects, headers) {
  const escapeField = (val) => {
    const str = String(val === null || val === undefined ? '' : val);
    // カンマ・ダブルクォート・改行を含む場合はクォートで囲む
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };
  const lines = [headers.join(',')];
  objects.forEach(obj => {
    lines.push(headers.map(h => escapeField(obj[h] ?? '')).join(','));
  });
  return lines.join('\n') + '\n';
}

// データマイグレーション（旧データの欠損フィールドを補完）
function migrateTaskData(tasks) {
  if (!Array.isArray(tasks)) return [];
  tasks.forEach(task => {
    if (!task.hasOwnProperty('アイコン'))  task['アイコン'] = 'fa-solid fa-headphones';
    if (!task.hasOwnProperty('メモ'))      task['メモ'] = '';
    if (typeof task['秒数'] !== 'number')  task['秒数'] = parseInt(task['秒数']) || 30;
    if (typeof task['順番'] !== 'number')  task['順番'] = 1;
  });
  return tasks;
}

const CSV_HEADERS = ['タスク名', '項目名', '読み上げテキスト', '秒数', '順番', 'アイコン', 'メモ'];
