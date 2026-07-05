// A quick static array of English Surah Names to make the UI friendly
const surahNames = [
    "Al-Fatihah","Al-Baqarah","Al-Imran","An-Nisa","Al-Ma'idah","Al-An'am","Al-A'raf","Al-Anfal","At-Tawbah","Yunus","Hud","Yusuf","Ar-Ra'd","Ibrahim","Al-Hijr","An-Nahl","Al-Isra","Al-Kahf","Maryam","Ta-Ha","Al-Anbiya","Al-Hajj","Al-Mu'minun","An-Nur","Al-Furqan","Ash-Shu'ara","An-Naml","Al-Qasas","Al-Ankabut","Ar-Rum","Luqman","As-Sajdah","Al-Ahzab","Saba","Fatir","Ya-Sin","As-Saffat","Sad","Az-Zumar","Ghafir","Fussilat","Ash-Shura","Az-Zukhruf","Ad-Dukhan","Al-Jathiyah","Al-Ahqaf","Muhammad","Al-Fath","Al-Hujurat","Qaf","Adh-Dhariyat","At-Tur","An-Najm","Al-Qamar","Ar-Rahman","Al-Waqi'ah","Al-Hadid","Al-Mujadilah","Al-Hashr","Al-Mumtahanah","As-Saff","Al-Jumu'ah","Al-Munafiqun","At-Taghabun","At-Talaq","At-Tahrim","Al-Mulk","Al-Qalam","Al-Haqqah","Al-Ma'arij","Nuh","Al-Jinn","Al-Muzzammil","Al-Muddaththir","Al-Qiyamah","Al-Insan","Al-Mursalat","An-Naba","An-Nazi'at","Abasa","At-Takwir","Al-Infitar","Al-Mutaffifin","Al-Inshiqaq","Al-Buruj","At-Tariq","Al-A'la","Al-Ghashiyah","Al-Fajr","Al-Balad","Ash-Shams","Al-Layl","Ad-Duha","Ash-Sharh","At-Tin","Al-Alaq","Al-Qadr","Al-Bayyinah","Az-Zalzalah","Al-Adiyat","Al-Qari'ah","At-Takathur","Al-Asr","Al-Humazah","Al-Fil","Quraysh","Al-Ma'un","Al-Kauthar","Al-Kafirun","An-Nasr","Al-Masad","Al-Ikhlas","Al-Falaq","An-Nas"
];

const surahSelect = document.getElementById('surahSelect');
const smartSearchInput = document.getElementById('smartSearchInput');
const searchBtn = document.getElementById('searchBtn');
const menu = document.getElementById('highlightMenu');

let selectedSourceText = ""; 

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

            if (highlightIndices) {
                // Split the text into individual words by spaces
                const wordsArray = ayah.text.split(" ");
                textSpan.innerHTML = ""; // Clear plain text to append word blocks

                wordsArray.forEach((word, index) => {
                    const wordSpan = document.createElement('span');
                    wordSpan.innerText = word + " ";

                    // Check if the current word's index matches our database highlights array
                    if (highlightIndices.includes(index)) {
                        wordSpan.style.backgroundColor = '#ffeb3b'; // Highlight yellow background
                        wordSpan.style.color = '#000';              // Readable black text
                        wordSpan.style.borderRadius = '4px';
                        wordSpan.style.padding = '0 4px';
                        wordSpan.style.display = 'inline-block';
                    }
                    textSpan.appendChild(wordSpan);
                });
            } else {
                // Fallback default plain text rendering if no rule matching data array exists
                textSpan.innerText = ayah.text;
            }

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
    } catch (err) { 
        console.error("Error connecting to DB Stream:", err); 
        document.getElementById('surahName').innerText = "Server Offline";
    }
}

// 3. Floating Button Highlight Reader Track Event
document.addEventListener('mouseup', () => {
    const selection = window.getSelection();
    const cleanText = selection.toString().trim();

    if (cleanText.length > 0) {
        selectedSourceText = cleanText; 
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        menu.style.display = 'block';
        menu.style.left = `${rect.left + window.scrollX + (rect.width / 2) - (menu.offsetWidth / 2)}px`;
        menu.style.top = `${rect.top + window.scrollY - menu.offsetHeight - 10}px`;
    } else {
        menu.style.display = 'none';
    }
});

// 4. Interactive Sidebar Interface Actions
function openAiChat() {
    document.getElementById('contextTextPreview').innerText = selectedSourceText;
    document.getElementById('chatMessages').innerHTML = ""; // Clear old message chains
    document.getElementById('chatDrawer').classList.add('open');
    menu.style.display = 'none';
}

function closeAiChat() {
    document.getElementById('chatDrawer').classList.remove('open');
    window.getSelection().removeAllRanges();
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
        if(loadingMsg.parentNode) messagesContainer.removeChild(loadingMsg);
        console.error(err);
    }
}

// Initial Bootup Configuration Hook load
loadLiveSurah(1);