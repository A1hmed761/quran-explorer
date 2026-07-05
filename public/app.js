const surahNames = [
    "Al-Fatihah","Al-Baqarah","Al-Imran","An-Nisa","Al-Ma'idah","Al-An'am","Al-A'raf","Al-Anfal","At-Tawbah","Yunus","Hud","Yusuf","Ar-Ra'd","Ibrahim","Al-Hijr","An-Nahl","Al-Isra","Al-Kahf","Maryam","Ta-Ha","Al-Anbiya","Al-Hajj","Al-Mu'minun","An-Nur","Al-Furqan","Ash-Shu'ara","An-Naml","Al-Qasas","Al-Ankabut","Ar-Rum","Luqman","As-Sajdah","Al-Ahzab","Saba","Fatir","Ya-Sin","As-Saffat","Sad","Az-Zumar","Ghafir","Fussilat","Ash-Shura","Az-Zukhruf","Ad-Dukhan","Al-Jathiyah","Al-Ahqaf","Muhammad","Al-Fath","Al-Hujurat","Qaf","Adh-Dhariyat","At-Tur","An-Najm","Al-Qamar","Ar-Rahman","Al-Waqi'ah","Al-Hadid","Al-Mujadilah","Al-Hashr","Al-Mumtahanah","As-Saff","Al-Jumu'ah","Al-Munafiqun","At-Taghabun","At-Talaq","At-Tahrim","Al-Mulk","Al-Qalam","Al-Haqqah","Al-Ma'arij","Nuh","Al-Jinn","Al-Muzzammil","Al-Muddaththir","Al-Qiyamah","Al-Insan","Al-Mursalat","An-Naba","An-Nazi'at","Abasa","At-Takwir","Al-Infitar","Al-Mutaffifin","Al-Inshiqaq","Al-Buruj","At-Tariq","Al-A'la","Al-Ghashiyah","Al-Fajr","Al-Balad","Ash-Shams","Al-Layl","Ad-Duha","Ash-Sharh","At-Tin","Al-Alaq","Al-Qadr","Al-Bayyinah","Az-Zalzalah","Al-Adiyat","Al-Qari'ah","At-Takathur","Al-Asr","Al-Humazah","Al-Fil","Quraysh","Al-Ma'un","Al-Kauthar","Al-Kafirun","An-Nasr","Al-Masad","Al-Ikhlas","Al-Falaq","An-Nas"
];

const surahSelect = document.getElementById('surahSelect');
const smartSearchInput = document.getElementById('smartSearchInput');
const searchBtn = document.getElementById('searchBtn');
const startSlider = document.getElementById('startSlider');
const endSlider = document.getElementById('endSlider');

let selectedSourceText = ""; 
let totalWordsInSurah = 0;

// Setup Dropdown Navigation Content List
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

// Load Surah from Cloud Database with Selector Tokenization Engine
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

        const urlParams = new URLSearchParams(window.location.search);
        const activeRule = urlParams.get('rule') || "definite_indefinite"; 

        let wordGlobalCounter = 0;

        // Loop through and assign unique tracking IDs to every single word token
        verses.forEach(ayah => {
            const verseContainer = document.createElement('span');
            verseContainer.className = 'verse-block';
            
            const wordsArray = ayah.text.split(" ");
            const highlightIndices = (ayah.grammar_highlights && ayah.grammar_highlights[activeRule]) || null;

            wordsArray.forEach((word, index) => {
                const wordSpan = document.createElement('span');
                wordSpan.innerText = word + " ";
                wordSpan.setAttribute('data-word-idx', wordGlobalCounter);

                // Re-apply database dynamic styling parameters
                if (highlightIndices && highlightIndices.includes(index)) {
                    wordSpan.style.borderBottom = '3px solid var(--gold-accent)';
                }

                verseContainer.appendChild(wordSpan);
                wordGlobalCounter++;
            });

            const numberSpan = document.createElement('span');
            numberSpan.className = 'verse-number';
            numberSpan.innerText = ` ﴿${ayah.verse}﴾ `;

            if (targetVerseNum && ayah.verse === targetVerseNum) {
                verseContainer.classList.add('highlight-target');
                setTimeout(() => verseContainer.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
            }
            
            grid.appendChild(verseContainer);
            grid.appendChild(numberSpan);
        });

        // Initialize Slider Configurations based on current page word counts
        totalWordsInSurah = wordGlobalCounter;
        startSlider.max = totalWordsInSurah - 1;
        endSlider.max = totalWordsInSurah - 1;
        startSlider.value = 0;
        endSlider.value = Math.min(10, totalWordsInSurah - 1); // Select a small chunk by default
        
        updateVisualSelectionHighlights();

    } catch (err) { 
        console.error("Error connecting to DB Stream:", err); 
        document.getElementById('surahName').innerText = "Server Offline";
    }
}

// Monitor Slider Modifications on both Mobile and PC
startSlider.addEventListener('input', updateVisualSelectionHighlights);
endSlider.addEventListener('input', updateVisualSelectionHighlights);

function updateVisualSelectionHighlights() {
    let start = parseInt(startSlider.value);
    let end = parseInt(endSlider.value);

    // Swap normalization if user drags boundaries past each other
    if (start > end) {
        const temp = start;
        start = end;
        end = temp;
    }

    const selectedWords = [];

    // Clear previous selection states
    document.querySelectorAll('[data-word-idx]').forEach(el => {
        el.classList.remove('active-selection', 'stick-start', 'stick-end');
        
        const idx = parseInt(el.getAttribute('data-word-idx'));
        if (idx >= start && idx <= end) {
            el.classList.add('active-selection');
            selectedWords.push(el.innerText.trim());

            if (idx === start) el.classList.add('stick-start');
            if (idx === end) el.classList.add('stick-end');
        }
    });

    // Compile text string to send to Gemini
    selectedSourceText = selectedWords.join(" ");
}

function openAiChat() {
    if (!selectedSourceText) return alert("Use the sliders to select text first!");
    document.getElementById('contextTextPreview').innerText = selectedSourceText;
    document.getElementById('chatMessages').innerHTML = ""; 
    document.getElementById('chatDrawer').classList.add('open');
}

function closeAiChat() {
    document.getElementById('chatDrawer').classList.remove('open');
}

async function submitAiQuestion() {
    const inputField = document.getElementById('chatQuestionInput');
    const questionText = inputField.value.trim();
    if (!questionText) return;

    const messagesContainer = document.getElementById('chatMessages');

    const userMsg = document.createElement('div');
    userMsg.className = 'msg user';
    userMsg.innerText = questionText;
    messagesContainer.appendChild(userMsg);
    inputField.value = ""; 

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
        if (loadingMsg.parentNode) messagesContainer.removeChild(loadingMsg);

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