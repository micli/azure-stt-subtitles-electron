const { app, BrowserWindow } = require('electron');
const { ipcMain } = require('electron');
let subtitlesWindow;

function createMainWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 800,
        height: 800,
        minWidth: 500,
        minHeight: 800,
        transparent: false,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true
        }
    })

    // // and load the index.html of the app.
    mainWindow.loadURL(`file://${__dirname}/html/index.html`)

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })
}

function createSubtitlesWindow() {
    // Create the subtitles window.
    subtitlesWindow = new BrowserWindow({
        width: 800,
        height: 120,
        minWidth: 500,
        minHeight: 120,
        transparent: true,
        alwaysOnTop: true,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true
        }
    })

    // and load the index.html of the app.
    subtitlesWindow.loadURL(`file://${__dirname}/html/subtitles.html`)

    // Open the DevTools.
    // subtitlesWindow.webContents.openDevTools()

    // Emitted when the window is closed.
    subtitlesWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        this.subtitlesWindow = null
    })

    subtitlesWindow.center();
    var pos = subtitlesWindow.getPosition();
    pos[1] += 600;
    subtitlesWindow.setPosition(pos[0], pos[1]);
    subtitlesWindow.show();
}


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow()
    }
})

ipcMain.on('subtitles-start', (event, arg) => {
    console.log(arg); // prints "ping"
    mainWindow.minimize();
    if (this.subtitlesWindow === undefined || this.subtitlesWindow === null) {
        createSubtitlesWindow();
    }
})

ipcMain.on('subtitles-stop', (event, arg) => {
    console.log(arg); // prints "pong"
    if (subtitlesWindow != null) {
        subtitlesWindow.destroy();
    }
})