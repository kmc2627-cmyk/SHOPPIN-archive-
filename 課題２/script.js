// script.js の冒頭あたりに追加
const fairyMessages = [
    "こんにちは！ぼくの名前はショプノ介。このアプリを司どる妖精だ",
    "このアプリは君が買い物のときに感じた尊い記憶を保管するためのもの",
    "自分の心に釣り糸を垂らして、君自身の ことば を見つけて。そして記録しよう！"
];
let currentMsgIndex = 0;

// ホーム画面のセリフを切り替える関数
function nextMessage() {
    currentMsgIndex++;
    if (currentMsgIndex >= fairyMessages.length) {
        currentMsgIndex = 0;
    }
    const textElement = document.getElementById('fairy-text');
    
    // ふわっと切り替える演出
    textElement.style.opacity = 0;
    setTimeout(() => {
        // ここで「 」を足しています！
        // キーボードの「」を直接入力して囲むのが一番確実です
        textElement.textContent = "「 " + fairyMessages[currentMsgIndex] + " 」";
        textElement.style.opacity = 1;
    }, 200);
}

// ページを読み込んだ瞬間の最初のセリフにもカッコを付ける
// window.onload などの最後にある初期設定部分
document.getElementById('fairy-text').textContent = "「 " + fairyMessages[0] + " 」";

// 起動時に最初のメッセージを表示
// window.onload の最後の方に追加してください
document.getElementById('fairy-text').textContent = fairyMessages[0];

// script.js の冒頭にセリフを追加
const mainFairyMessages = [
    "ぼくもそれいいと思った！", "君の好きな色は？形は？", "一目惚れって、本当にあるらしいよ",
    "今回のラッキーカラーは黄色！", "今回のラッキーカラーは赤！", "今回のラッキーカラーは青！",
    "今回のラッキーカラーは緑！", "今回のラッキーカラーはむらさき！", "今回のラッキーカラーはピンク！",
    "今回のラッキーカラーは白！", "今回のラッキーカラーはオレンジ！", "今回のラッキーカラーは黒！",
    "今回のラッキーカラーはブラウン！", "ぼくの親友はフクロウのオク子ちゃんっていう子なんだ〜！",
    "思ったままをことばにしてみよう！", "語彙を増やしてぼくとたくさん会話しよっ！",
    "語彙を増やすには本を読むと良いよ！", "ぼく君と出会えて、胸がいっぱい！"
];

// セリフをランダムに選ぶ関数
function updateMainFairyMessage() {
    const randomIndex = Math.floor(Math.random() * mainFairyMessages.length);
    const textElement = document.getElementById('main-fairy-text');
    if (textElement) {
        textElement.textContent = mainFairyMessages[randomIndex];
    }
}

// 分類を選んだ時などにセリフを変えるように、既存の setCategory に追記
const originalSetCategory = setCategory;
setCategory = function(cat) {
    originalSetCategory(cat); // 以前の処理を実行
    updateMainFairyMessage(); // セリフをランダムに変更
};

// メモを追加した時にも応援してくれるように addMemo に追記
const originalAddMemo = addMemo;
addMemo = async function(imp) {
    await originalAddMemo(imp);
    updateMainFairyMessage(); // セリフをランダムに変更
};

const impressionData = {
    "コップ類": ["持ちやすい", "軽い", "色がきれい", "ペアで欲しい"],
    "お皿・食器": ["使いやすそう", "料理が映えそう", "高級感ある", "丈夫そう"],
    "インテリア": ["部屋に合う", "おしゃれ", "個性的", "サイズが丁度いい"],
    "衣類": ["肌触りがいい", "形がきれい", "長く着られそう", "色が似合う"], // 追加
    "雑貨": ["一目惚れ！", "便利そう", "癒やされる", "自分へのご褒美"], // 追加
    "その他": ["かわいい", "美しい", "かっこいい", "プレゼント用"]
};



const DB_NAME = "ShoppinArchiveDB";
const STORE_NAME = "memos";
let db;
let currentCategory = "";
let currentPhotoBlob = null;
let selectedBest = null;

// --- データベース起動 ---
function openDB() {
    return new Promise((resolve) => {
        try {
            const request = indexedDB.open(DB_NAME, 2);
            request.onupgradeneeded = (e) => {
                let database = e.target.result;
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    database.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
                }
            };
            request.onsuccess = (e) => { 
                db = e.target.result; 
                resolve(); 
            };
            request.onerror = () => {
                console.log("DB初期化エラーですが続行します");
                resolve(); // エラーでも次に進ませる
            };
        } catch (e) {
            resolve();
        }
    });
}

// --- 起動時の処理（安全装置付き） ---
window.onload = async function() {
    const splash = document.getElementById('splash');
    const mainContent = document.getElementById('main-content');

    // 1. データベース接続を試みる（最大1秒で切り上げる）
    await Promise.race([
        openDB(),
        new Promise(r => setTimeout(r, 1000))
    ]);

    // 2. 2.5秒後に必ずメイン画面を表示する
    setTimeout(() => {
        if (splash) splash.style.display = 'none';
        if (mainContent) {
            mainContent.style.display = 'flex'; // 確実に見せる
            mainContent.style.opacity = '1';
            mainContent.style.pointerEvents = 'auto';
        }
        renderArchive();
        renderListFromDB();
    }, 2500);
};

// --- カメラ起動 ---
function triggerCamera() {
    const input = document.getElementById('cameraInput');
    // 一旦値を空にすることで、同じ写真を連続で選んでも反応するようにする
    input.value = ''; 
    input.click();
}

// --- 写真を受け取った時の処理 ---
function handlePhoto(input) {
    if (input.files && input.files[0]) {
        currentPhotoBlob = input.files[0];
        
        // プレビュー表示
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('photoPreview');
            const container = document.getElementById('previewContainer');
            preview.src = e.target.result;
            container.style.display = 'block'; // プレビューを表示
            
            // 入力エリアまでスクロールさせる（撮影したことがわかるように）
            container.scrollIntoView({behavior: 'smooth'});
        };
        reader.readAsDataURL(currentPhotoBlob);
    }
}

// --- 撮り直し機能 ---
function resetPhoto() {
    currentPhotoBlob = null;
    document.getElementById('photoPreview').src = '';
    document.getElementById('previewContainer').style.display = 'none';
}

// --- ナビゲーション ---
function goHome() {
    document.getElementById('shopping-screen').style.display = 'none';
    document.getElementById('best-select-screen').style.display = 'none';
    document.getElementById('archive-screen').style.display = 'none';
    document.getElementById('start-screen').style.display = 'flex';
    document.getElementById('home-btn').style.display = 'none';
}

function startShopping() {
    if (db) {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        transaction.objectStore(STORE_NAME).clear();
    }
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('shopping-screen').style.display = 'flex';
    document.getElementById('home-btn').style.display = 'flex';
    document.getElementById('memoList').innerHTML = "";
}

// --- メモ追加 ---
async function addMemo(imp) {
    const name = document.getElementById('itemName').value;
    if (!name || !currentCategory) { alert("商品名と分類を選んでね！"); return; }
    if (!db) { alert("データベースが準備できていません"); return; }

    const memoData = {
        name: name,
        category: currentCategory,
        impression: imp,
        photo: currentPhotoBlob,
        date: new Date().toLocaleDateString()
    };

    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.add(memoData).onsuccess = () => {
        document.getElementById('itemName').value = "";
        currentPhotoBlob = null;
        document.getElementById('photoPreview').style.display = 'none';
        renderListFromDB();
    };
}

function addManualMemo() {
    const input = document.getElementById('manualImpression');
    if (input.value) { addMemo(input.value); input.value = ""; }
}

function renderListFromDB() {
    if (!db) return;
    const list = document.getElementById('memoList');
    list.innerHTML = "";
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    store.openCursor(null, "prev").onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            const m = cursor.value;
            const div = document.createElement('div');
            div.className = 'memo-item';
            div.innerHTML = `<small>[${m.category}]</small> <strong>${m.name}</strong><br>印象：${m.impression}`;
            if (m.photo) {
                const img = document.createElement('img');
                img.className = 'list-photo';
                img.style.width = "100%";
                img.style.marginTop = "10px";
                img.src = URL.createObjectURL(m.photo);
                div.appendChild(img);
            }
            list.appendChild(div);
            cursor.continue();
        }
    };
}

function setCategory(cat) {
    currentCategory = cat;
    document.getElementById('selectedCategory').textContent = cat;
    const container = document.getElementById('impressionButtons');
    container.innerHTML = "";
    if(impressionData[cat]) {
        impressionData[cat].forEach(text => {
            const b = document.createElement('button');
            b.className = 'btn'; b.textContent = text;
            b.onclick = () => addMemo(text);
            container.appendChild(b);
        });
    }
}

function finishShopping() {
    if (!db) return;
    document.getElementById('shopping-screen').style.display = 'none';
    document.getElementById('best-select-screen').style.display = 'flex';
    const list = document.getElementById('candidateList');
    list.innerHTML = "";

    const transaction = db.transaction([STORE_NAME], "readonly");
    transaction.objectStore(STORE_NAME).getAll().onsuccess = (e) => {
        const memos = e.target.result;
        memos.forEach((m) => {
            const div = document.createElement('div');
            div.className = 'memo-item';
            div.innerHTML = `<strong>${m.name}</strong>`;
            div.onclick = () => {
                selectedBest = m;
                document.getElementById('best-detail-area').style.display = 'block';
                document.querySelectorAll('#candidateList .memo-item').forEach(el => el.style.border = "none");
                div.style.border = "3px solid #f06292";
            };
            list.appendChild(div);
        });
    };
}

function saveBestProduct() {
    const detail = document.getElementById('bestDetail').value;
    const best = { ...selectedBest, detail, date: new Date().toLocaleDateString() };
    const arc = JSON.parse(localStorage.getItem('bestArchive') || '[]');
    arc.unshift(best);
    localStorage.setItem('bestArchive', JSON.stringify(arc));
    alert("保存しました！");
    location.reload();
}

function toggleArchive() {
    const arc = document.getElementById('archive-screen');
    const start = document.getElementById('start-screen');
    const isHidden = arc.style.display === 'none';
    arc.style.display = isHidden ? 'flex' : 'none';
    start.style.display = isHidden ? 'none' : 'flex';
    document.getElementById('home-btn').style.display = isHidden ? 'flex' : 'none';
    if (isHidden) renderArchive();
}

function renderArchive() {
    const archive = JSON.parse(localStorage.getItem('bestArchive') || '[]');
    const list = document.getElementById('bestArchiveList');
    list.innerHTML = archive.length === 0 ? "<p>履歴がありません</p>" : 
        archive.map(a => `<div class="memo-item"><small>${a.date} 🏆</small><br><strong>${a.name}</strong><br>${a.detail}</div>`).join('');
}

function startVoiceInput() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    const rec = new Recognition();
    rec.lang = 'ja-JP';
    rec.start();
    rec.onresult = (e) => { document.getElementById('manualImpression').value = e.results[0][0].transcript; };
}