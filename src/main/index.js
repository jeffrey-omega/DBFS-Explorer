'use strict'

import {
  app,
  BrowserWindow,
  ipcMain,
  Menu
} from 'electron'
import Sqlite3 from './database'

// Import application menu configuration
import appMenu from './menu/menu.js'
import macMenu from './menu/macMenu.js'

const os = require('os')
const path = require('path')

// Set about panel for macOS. This will be ignored for windows
app.setAboutPanelOptions({
  applicationName: app.getName(),
  applicationVersion: app.getVersion(),
  copyright: '© 2019 Data Thirst Ltd. All rights reserved.'
})

// macOS specific menu template
if (process.platform === 'darwin') {
  appMenu.unshift(macMenu)

  appMenu[1].submenu.push(
    { type: 'separator' },
    {
      label: 'Speech',
      submenu: [
        { role: 'startspeaking' },
        { role: 'stopspeaking' }
      ]
    }
  )

  appMenu[3].submenu.push(
    { role: 'close' },
    { role: 'minimize' },
    { role: 'zoom' },
    { type: 'separator' },
    { role: 'front' }
  )
}

// Build electron Menu object from menu template
const menu = Menu.buildFromTemplate(appMenu)

// Get SQL database Instance
const db = new Sqlite3({
  path: path.join(
    os.homedir(),
    'DBFS-Explorer'
  ),
  name: 'app'
})

// Initialize SQL database
db.init()

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

// Application window
let mainWindow

// Renderer URL
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

/**
 * Creates default application window
 */
function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: 750,
    width: 1200,
    minHeight: 600,
    minWidth: 800,
    useContentSize: true,
    backgroundColor: '#FFFFFF',
    titleBarStyle: 'hiddenInset',
    show: false,
    webPreferences: {
      webSecurity: false
    }
  })

  mainWindow.loadURL(winURL)
  Menu.setApplicationMenu(menu)
  // mainWindow.webContents.openDevTools()

  mainWindow.on('closed', () => {
    mainWindow = null
  })
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

/**
 * Listen to the channel "sql", when a new message arrives listener would be called
 * with event, sql CRUD configuration
 */

ipcMain.on('sql', function (event, config) {
  // Validate SQL CRUD configuration
  if (config && config.constructor === {}.constructor &&
    'name' in config && 'data' in config &&
    'commit' in config) {
    // CRUD operation type
    switch (config.name) {
      /**
       * Read entire rows of specified table
       */
      case 'readFullTable':
        db.readFullTable(config.data, function (error, data) {
          replaySender(event.sender, config.commit, error, data)
        })
        break

      /**
       * Read table with entry/row id
       */
      case 'readTableEntryID':
        db.readTableEntryID(config.data, function (error, data) {
          replaySender(event.sender, config.commit, error, data)
        })
        break

      /**
       * Write a new entry/row of specified table
       */
      case 'writeTable':
        db.writeTable(config.data, function () {})
        break

      /**
       * Update table row of specified id
       */
      case 'UpdateTableByID':
        db.updateTableByID(config.data, function (error, data) {
          replaySender(event.sender, config.commit, error, data)
        })
        break

      /**
       * Delete table row of specified id
       */
      case 'DeleteTableById':
        db.deleteTableById(config.data, function (error, data) {
          replaySender(event.sender, config.commit, error, data)
        })
        break
      default: break
    }
  }
})

/**
 * Replay sender with SQL resultant data, error (if any)
 * and commit string for vuex store
 */
function replaySender (sender, commit, error, data) {
  sender.send('sql_ready', {
    commit: commit, // Vuex commit message
    error: error, // Error object
    data: data // Resultant data
  })
}

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
