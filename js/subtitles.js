(e => {
    'use strict';

    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    // Settings
    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

    const settings = getSettings();
    const azureCognitionSubscriptionKey = settings.azureKey || '';
    const azureRegion = settings.azureRegion || '';
    const sourceLang = settings.sourceLang || 'en-US'
    const destLang = settings.destLang || 'zh-CN'
    const backgroundColor = settings.backgroundColor || 'transparent';
    const clearTime = settings.clearTimeSeconds || 4;
    const maxWords = settings.maxWords || 250;
    const autopunctuation = settings.autoPunctuation;
    const profanityFilter = settings.profanityFilter;
    const autoShutoffTime = settings.autoShutoffTimeMinutes || 30;
    const blacklistWordsString = settings.blacklistWords || '';
    let blacklistRegex = undefined;
    if (blacklistWordsString !== '') {
        let regex = (blacklistWordsString.replace(/,/g, '|')).replace(/\*/g, '([a-z]+)?');
        blacklistRegex = new RegExp('(\\b)(' + regex + ')(\\b)', 'gi');
    }
    let urlStyle = uripart('style') || undefined;
    let subtitleStyle = urlStyle || settings.customStyle;

    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    // LOGIC
    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    var SpeechSDK;
    var recognizer;
    var idleTimeout;
    var connectTimeout;
    var subtitles = document.querySelector('#subtitle');

    document.body.style.backgroundColor = backgroundColor;
    document.addEventListener("DOMContentLoaded", function() {
        if (!!window.SpeechSDK)
            SpeechSDK = window.SpeechSDK;

        var speechConfig;
        try {
            if (sourceLang === destLang) {
                speechConfig = SpeechSDK.SpeechConfig.fromSubscription(azureCognitionSubscriptionKey, azureRegion);
            } else {
                speechConfig = SpeechSDK.SpeechTranslationConfig.fromSubscription(azureCognitionSubscriptionKey, azureRegion);
            }
        } catch (err) {
            subtitles.innerHTML = 'Connection refused. Please check subscription key + region and reconnect.';
        }

        speechConfig.enableDictation();
        speechConfig.speechRecognitionLanguage = sourceLang;
        if (autopunctuation !== true)
            speechConfig.setServiceProperty('punctuation', 'explicit', SpeechSDK.ServicePropertyChannel.UriQueryParameter);
        speechConfig.setProfanity(profanityFilter === true ? SpeechSDK.ProfanityOption.Masked : SpeechSDK.ProfanityOption.Raw);
        var audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        if (sourceLang === destLang) {
            recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
        } else {
            speechConfig.speechRecognitionLanguage = sourceLang;
            speechConfig.addTargetLanguage(destLang);
            recognizer = new SpeechSDK.TranslationRecognizer(speechConfig, audioConfig);
        }


        // Set styles of subtitles text
        updateSubtitleStyle(subtitleStyle);

        recognizer.recognizing = (s, e) => {
            var subtitles = getSubtitlesFromResult(e.result);
            // console.log(`RECOGNIZING: Text=${subtitles}`);
            updateSubtitles(subtitles, true);
            if (idleTimeout) {
                clearTimeout(idleTimeout);
                idleTimeout = null;
            }
            idleTimeout = setTimeout(function() {
                recognizer.stopContinuousRecognitionAsync();
            }, autoShutoffTime * 60 * 1000);
        };

        recognizer.recognized = (s, e) => {
            // console.log(`RECOGNIZED: Text=${JSON.stringify(e.result)}`);
            if (e.result.reason !== SpeechSDK.ResultReason.NoMatch) {
                var subtitles = getSubtitlesFromResult(e.result);
                updateSubtitles(subtitles, false);
            };
        };

        recognizer.canceled = (s, e) => {
            recognizer.stopContinuousRecognitionAsync();
            subtitles.innerHTML = 'Connection refused. Please check subscription key + region and reconnect.';
        };

        recognizer.sessionStopped = (s, e) => {
            recognizer.stopContinuousRecognitionAsync();
            updateSubtitles('Connection closed or timed out - Please reconnect.', true);
        };

        recognizer.sessionStarted = (s, e) => {
            if (connectTimeout) {
                clearTimeout(connectTimeout);
                connectTimeout = null;
            }
            updateSubtitles('Connected - Begin Speaking', true);
        };

        window.addEventListener('obsSourceActiveChanged', function(event) {
            if (event.detail.active === true) {
                location.reload();
            } else {
                recognizer.stopContinuousRecognitionAsync();
            }
        });

        connectTimeout = setTimeout(function() {
            subtitles.innerHTML = 'Unable to connect due to network issue or unable to gain microphone access.';
        }, 15000);

        var userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.indexOf(' electron/') > -1) {
            recognizer.startContinuousRecognitionAsync();
        } else {
            subtitles.innerHTML = 'Click anywhere to start.';
            document.addEventListener('click', function() {
                recognizer.startContinuousRecognitionAsync();
            });
        }
    });

    function updateSubtitleStyle(style) {
        subtitles.style = style;
    }

    function updateSubtitles(speech, timeout) {
        subtitles.innerHTML = filterBlacklist(getMaxWords(speech));

        // Clear Text after moments of silence.
        if (timeout) {
            clearTimeout(updateSubtitles.ival);
            updateSubtitles.ival = setTimeout(async ival => {
                subtitles.innerHTML = ' ';
            }, (+clearTime) * 1000);
        }
        return subtitles.innerHTML;
    }

    function getMaxWords(text) {
        let words = text.split(' ');
        return words.slice(-maxWords).join(' ');
    }

    function filterBlacklist(text) {
        if (blacklistRegex === undefined) return text;

        let newtext = text.replace(blacklistRegex, function($2) {
            return $2.replace(/./g, '*')
        });
        return newtext;
    }

    function getSubtitlesFromResult(result) {
        if (result.translations === undefined) {
            return result.text;
        } else {
            var key = result.translations.privMap.privKeys[0];
            return result.translations.get(key);
        }
    }

    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    // Get URI Parameters
    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    function uripart(key) {
        const params = {};
        const href = location.href;

        if (href.indexOf('?') < 0) return '';

        href.split('?')[1].split('&').forEach(m => {
            const kv = m.split('=');
            params[kv[0]] = kv[1];
        });

        if (key in params) return decodeURIComponent(params[key]);

        return '';
    }

})();