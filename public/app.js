// A quick static array of English Surah Names to make the UI friendly
const surahNames = [
    "Al-Fatihah","Al-Baqarah","Al-Imran","An-Nisa","Al-Ma'idah","Al-An'am","Al-A'raf","Al-Anfal","At-Tawbah","Yunus","Hud","Yusuf","Ar-Ra'd","Ibrahim","Al-Hijr","An-Nahl","Al-Isra","Al-Kahf","Maryam","Ta-Ha","Al-Anbiya","Al-Hajj","Al-Mu'minun","An-Nur","Al-Furqan","Ash-Shu'ara","An-Naml","Al-Qasas","Al-Ankabut","Ar-Rum","Luqman","As-Sajdah","Al-Ahzab","Saba","Fatir","Ya-Sin","As-Saffat","Sad","Az-Zumar","Ghafir","Fussilat","Ash-Shura","Az-Zukhruf","Ad-Dukhan","Al-Jathiyah","Al-Ahqaf","Muhammad","Al-Fath","Al-Hujurat","Qaf","Adh-Dhariyat","At-Tur","An-Najm","Al-Qamar","Ar-Rahman","Al-Waqi'ah","Al-Hadid","Al-Mujadilah","Al-Hashr","Al-Mumtahanah","As-Saff","Al-Jumu'ah","Al-Munafiqun","At-Taghabun","At-Talaq","At-Tahrim","Al-Mulk","Al-Qalam","Al-Haqqah","Al-Ma'arij","Nuh","Al-Jinn","Al-Muzzammil","Al-Muddaththir","Al-Qiyamah","Al-Insan","Al-Mursalat","An-Naba","An-Nazi'at","Abasa","At-Takwir","Al-Infitar","Al-Mutaffifin","Al-Inshiqaq","Al-Buruj","At-Tariq","Al-A'la","Al-Ghashiyah","Al-Fajr","Al-Balad","Ash-Shams","Al-Layl","Ad-Duha","Ash-Sharh","At-Tin","Al-Alaq","Al-Qadr","Al-Bayyinah","Az-Zalzalah","Al-Adiyat","Al-Qari'ah","At-Takathur","Al-Asr","Al-Humazah","Al-Fil","Quraysh","Al-Ma'un","Al-Kauthar","Al-Kafirun","An-Nasr","Al-Masad","Al-Ikhlas","Al-Falaq","An-Nas"
];

const surahSelect = document.getElementById('surahSelect');
const smartSearchInput = document.getElementById('smartSearchInput');
const searchBtn = document.getElementById('searchBtn');

// Ask AI / selection UI elements
const askAiFab = document.getElementById('askAiFab');
const handleStart = document.getElementById('handleStart');
const handleEnd = document.getElementById('handleEnd');
const selectionToolbar = document.getElementById('selectionToolbar');

let selectedSourceText = "";

// Flat, per-surah arrays used for word-level selection (index order = reading order)
let wordSpans = [];
let wordTexts = [];

// Selection-mode state
let selectionMode = false;
let startIdx = 0;
let endIdx = 0;
let draggingHandle = null; // 'start' | 'end' | null

// 1. Setup Dropdown Navigation Content List
surahNames.forEach((name, idx) => {
    const opt = document.createElement('option');
    opt.value = idx + 1;
    opt.innerText = `${idx + 1}. ${name}`;
    surahSelect.appendChild(opt);
});

surahSelect.addEventListener('change', (e) => {
    smartSearchInput.value = "";
    loadLiveSurah(parseInt(e.target.value));
});

searchBtn.addEventListener('click', handleVerseJump);

function handleVerseJump() {
    const currentSurahId = parseInt(surahSelect.value);
    const verseNum = parseInt(smartSearchInput.value.trim());
    if (!currentSurahId) return alert("Select a Surah first!");
    if (isNaN(verseNum) || verseNum < 1) return alert("Enter valid verse number.");
    loadLiveSurah(currentSurahId, verseNum);
}

// 2. Load Surah from Local MongoDB with Highlight Integration
async function loadLiveSurah(surahId, targetVerseNum = null) {
    try {
        const response = await fetch(`/api/surah/${surahId}`);
        const result = await response.json();
        if (!result.success) return;

        const verses = result.data;
        surahSelect.value = surahId;

        document.getElementById('surahName').innerText = surahNames[surahId - 1];
        document.getElementById('surahMeta').innerText = `Surah ${surahId} • ${verses.length} Verses`;
        document.getElementById('bismillahText').style.display = (surahId === 9 || surahId === 1) ? 'none' : 'block';

        const grid = document.getElementById('quranGrid');
        grid.innerHTML = "";

        // Reset word-selection tracking for the newly loaded surah
        exitSelectionMode();
        wordSpans = [];
        wordTexts = [];

        // 🌟 DYNAMICALLY GET RULE FROM THE URL PARAMETERS
        const urlParams = new URLSearchParams(window.location.search);
        // Fallback default rule to "definite_indefinite" if none is passed in URL
        const activeRule = urlParams.get('rule') || "definite_indefinite";

        // Loop through your REAL MongoDB documents inside the browser
        verses.forEach(ayah => {
            const textSpan = document.createElement('span');
            textSpan.className = 'verse-block';

            // Check if the current verse has an array of indices for this specific active rule
            const highlightIndices = (ayah.grammar_highlights && ayah.grammar_highlights[activeRule]) || null;
            const wordsArray = ayah.text.split(" ");

            wordsArray.forEach((word, index) => {
                const wordSpan = document.createElement('span');
                wordSpan.className = 'qword';
                wordSpan.innerText = word + " ";

                if (highlightIndices && highlightIndices.includes(index)) {
                    wordSpan.classList.add('grammar-highlight');
                }

                textSpan.appendChild(wordSpan);

                // Track every word in flat, reading-order arrays for the Ask AI selector
                wordSpans.push(wordSpan);
                wordTexts.push(word);
            });

            const numberSpan = document.createElement('span');
            numberSpan.className = 'verse-number';
            numberSpan.innerText = ` ﴿${ayah.verse}﴾ `;

            if (targetVerseNum && ayah.verse === targetVerseNum) {
                textSpan.classList.add('highlight-target');
                setTimeout(() => textSpan.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
            }
            grid.appendChild(textSpan);
            grid.appendChild(numberSpan);
        });

        // Only show the Ask AI button once there's actually text to select
        if (wordSpans.length > 0) {
            askAiFab.classList.add('visible');
        } else {
            askAiFab.classList.remove('visible');
        }
    } catch (err) {
        console.error("Error connecting to DB Stream:", err);
        document.getElementById('surahName').innerText = "Server Offline";
    }
}

// ---------------------------------------------------------
// 3. Ask AI - Drag Handle Text Selector (mouse + touch alike)
// ---------------------------------------------------------

askAiFab.addEventListener('click', enterSelectionMode);

function enterSelectionMode() {
    if (wordSpans.length === 0) return;

    selectionMode = true;
    document.body.classList.add('selection-mode');
    askAiFab.classList.remove('visible');
    selectionToolbar.classList.add('visible');
    handleStart.classList.add('active');
    handleEnd.classList.add('active');

    // Default to a small chunk of text around whatever is currently in view,
    // so the user has something sensible to immediately drag from.
    const anchorIdx = findFirstVisibleWordIdx();
    startIdx = anchorIdx;
    endIdx = Math.min(wordSpans.length - 1, anchorIdx + 3);

    updateSelectionHighlight();
    positionHandles();
}

function findFirstVisibleWordIdx() {
    const vh = window.innerHeight;
    for (let i = 0; i < wordSpans.length; i++) {
        const rect = wordSpans[i].getBoundingClientRect();
        if (rect.top >= 0 && rect.top < vh) return i;
    }
    return 0;
}

function updateSelectionHighlight() {
    const lo = Math.min(startIdx, endIdx);
    const hi = Math.max(startIdx, endIdx);
    wordSpans.forEach((span, i) => {
        span.classList.toggle('selected', i >= lo && i <= hi);
    });
}

function positionHandles() {
    if (!wordSpans[startIdx] || !wordSpans[endIdx]) return;
    const startRect = wordSpans[startIdx].getBoundingClientRect();
    const endRect = wordSpans[endIdx].getBoundingClientRect();

    handleStart.style.left = `${startRect.left + startRect.width / 2 - 13}px`;
    handleStart.style.top = `${startRect.top - 8}px`;

    handleEnd.style.left = `${endRect.left + endRect.width / 2 - 13}px`;
    handleEnd.style.top = `${endRect.bottom - 18}px`;
}

function nearestWordIdx(x, y) {
    let closest = 0;
    let minDist = Infinity;
    wordSpans.forEach((span, i) => {
        const r = span.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dist = Math.hypot(cx - x, cy - y);
        if (dist < minDist) {
            minDist = dist;
            closest = i;
        }
    });
    return closest;
}

function attachHandleDrag(handleEl, isStart) {
    const tag = isStart ? 'start' : 'end';

    handleEl.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        draggingHandle = tag;
        handleEl.setPointerCapture(e.pointerId);
    });

    handleEl.addEventListener('pointermove', (e) => {
        if (draggingHandle !== tag) return;
        const idx = nearestWordIdx(e.clientX, e.clientY);
        if (isStart) startIdx = idx; else endIdx = idx;
        updateSelectionHighlight();
        positionHandles();
    });

    handleEl.addEventListener('pointerup', () => { draggingHandle = null; });
    handleEl.addEventListener('pointercancel', () => { draggingHandle = null; });
}

attachHandleDrag(handleStart, true);
attachHandleDrag(handleEnd, false);

// Keep handles glued to their words while scrolling in selection mode
window.addEventListener('scroll', () => {
    if (selectionMode) positionHandles();
}, { passive: true });

window.addEventListener('resize', () => {
    if (selectionMode) positionHandles();
});

function cancelSelection() {
    exitSelectionMode();
}

function confirmSelection() {
    const lo = Math.min(startIdx, endIdx);
    const hi = Math.max(startIdx, endIdx);
    const text = wordTexts.slice(lo, hi + 1).join(' ');
    exitSelectionMode();
    openAiChat(text);
}

function exitSelectionMode() {
    selectionMode = false;
    draggingHandle = null;
    document.body.classList.remove('selection-mode');
    handleStart.classList.remove('active');
    handleEnd.classList.remove('active');
    selectionToolbar.classList.remove('visible');
    wordSpans.forEach(span => span.classList.remove('selected'));
    if (wordSpans.length > 0) askAiFab.classList.add('visible');
}

// ---------------------------------------------------------
// 4. Study with Gemini - Sidebar Chat Panel
// ---------------------------------------------------------

function openAiChat(text) {
    selectedSourceText = text;
    document.getElementById('contextTextPreview').innerText = selectedSourceText;
    document.getElementById('chatMessages').innerHTML = ""; // Clear old message chains
    document.getElementById('chatDrawer').classList.add('open');
}

function closeAiChat() {
    document.getElementById('chatDrawer').classList.remove('open');
}

// 5. Submit Conversation Stream directly to Gemini Endpoint
async function submitAiQuestion() {
    const inputField = document.getElementById('chatQuestionInput');
    const questionText = inputField.value.trim();
    if (!questionText) return;

    const messagesContainer = document.getElementById('chatMessages');

    // Append User Question to Screen UI
    const userMsg = document.createElement('div');
    userMsg.className = 'msg user';
    userMsg.innerText = questionText;
    messagesContainer.appendChild(userMsg);
    inputField.value = ""; // clear input text field

    // Append a loading indicator
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'msg ai';
    loadingMsg.innerText = "Gemini is reflecting...";
    messagesContainer.appendChild(loadingMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
        const response = await fetch('/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourceText: selectedSourceText, question: questionText })
        });

        const data = await response.json();

        // Remove loading state text indicator
        messagesContainer.removeChild(loadingMsg);

        const aiMsg = document.createElement('div');
        aiMsg.className = 'msg ai';
        aiMsg.innerText = data.answer || data.error;
        messagesContainer.appendChild(aiMsg);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

    } catch (err) {
        if (loadingMsg.parentNode) messagesContainer.removeChild(loadingMsg);
        console.error(err);
    }
}

// Initial Bootup Configuration Hook load
loadLiveSurah(1);