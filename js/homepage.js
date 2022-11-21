const { remote, BrowserWindow } = require('electron');
const { ipcRenderer } = require('electron');
const settings = getSettings();
const fs = require('fs');
const { inspect } = require('util');

const window = remote.getCurrentWindow();
/* Note this is different to the
html global `window` variable */

//form
const minimizeWindowBtn = document.getElementById('minimize');
const maximizeWindowBtn = document.getElementById('maximize');
const closeWindowBtn = document.getElementById('close');

const form = document.getElementById("settingsForm");
const azureKeyInput = document.getElementById('azureKey');
const azureRegionInput = document.getElementById('azureRegion');
const sourceLangInput = document.getElementById('sourceLang');
const destLangInput = document.getElementById('destLang');

const punctuationCheckbox = document.getElementById('punctuationChkBx');
const profanityCheckbox = document.getElementById('profanityChkBx');

const maxWordsInput = document.getElementById('maxWords');
const clearTimeInput = document.getElementById('clearTime');
const bgColorSelect = document.getElementById('backgroundColor');
const customStyleInput = document.getElementById('customStyle');
const blacklistWords = document.getElementById('blacklistWords')

const subtitlesBtn = document.getElementById('subtitlesBtn');
let subtitlesWindow;

function getSettings() {
    return {
        autoPunctuation: true,
        autoShutoffTimeMinutes: 30,
        backgroundColor: 'transparent',
        clearTimeSeconds: '4',
        maxWords: '150',
        profanityFilter: true,
        azureKey: '',
        azureRegion: '',
        sourceLang: 'zh-CN',
        destLang: 'en-US',
        customStyle: '#FEFEFE',
        blacklistWords: ''
    }
};

document.onreadystatechange = (event) => {
    if (document.readyState == "complete") {
        handleWindowControls();
        initSettings();
    }
};

function handleForm(event) {
    event.preventDefault();
    saveSettings();
}

// Starting subtitles windows
function onStartSubtitles(event) {
    ipcRenderer.send('subtitles-start', 'ping')
}

function handleWindowControls() {
    minimizeWindowBtn.addEventListener("click", event => {
        window.minimize();
    });

    maximizeWindowBtn.addEventListener("click", event => {
        if (!window.isMaximized()) {
            window.maximize();
        } else {
            window.unmaximize();
        }
    });

    closeWindowBtn.addEventListener("click", event => {
        window.close();
    });

    form.addEventListener('submit', handleForm);
    subtitlesBtn.addEventListener('click', onStartSubtitles);
}

function initSettings() {
    azureKeyInput.value = settings.azureKey || '';
    azureRegionInput.value = settings.azureRegion || '';
    sourceLangInput.value = settings.sourceLang || 'zh-CN';
    destLangInput.value = settings.destLang || 'en-US';

    clearTimeInput.value = settings.clearTimeSeconds || 4;
    maxWordsInput.value = settings.maxWords || 150;

    punctuationCheckbox.checked = settings.autoPunctuation || true;
    profanityCheckbox.checked = settings.profanityFilter || true;

    bgColorSelect.value = settings.backgroundColor || '';
    customStyleInput.value = settings.customStyle || '';
    blacklistWords.value = settings.blacklistWords || '';

    M.updateTextFields();
}

function saveSettings() {
    let newSettings = {
        ...settings
    }

    newSettings.azureKey = azureKeyInput.value;
    newSettings.azureRegion = azureRegionInput.value;
    newSettings.sourceLang = sourceLangInput.value;
    newSettings.destLang = destLangInput.value;

    newSettings.clearTimeSeconds = clearTimeInput.value;
    newSettings.maxWords = maxWordsInput.value;

    newSettings.autoPunctuation = punctuationCheckbox.checked;
    newSettings.profanityFilter = profanityCheckbox.checked;

    newSettings.backgroundColor = bgColorSelect.value;
    newSettings.customStyle = customStyleInput.value;

    newSettings.blacklistWords = blacklistWords.value.replace(/\s/g, '');

    fs.writeFile(__dirname + '/settings.js', 'function getSettings() { return ' + inspect(newSettings) + '}', function(err) {
        if (err) throw err;
    });
}

window.on('restore', (event, arg) => {
    ipcRenderer.send('subtitles-stop', 'pong')
});