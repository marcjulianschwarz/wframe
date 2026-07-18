import type { en } from "./en";

/** German UI strings. Must provide exactly the keys `en` defines — the
 * `Record<keyof typeof en, string>` annotation makes a missing/extra key a
 * compile error. "View" → "Ansicht" throughout. */
export const de: Record<keyof typeof en, string> = {
  // --- generic / actions --- //
  "action.save": "Speichern",
  "action.saving": "Speichern…",
  "action.saved": "Gespeichert",
  "action.cancel": "Abbrechen",
  "action.delete": "Löschen",
  "action.copy": "Kopieren",
  "action.copied": "Kopiert",
  "action.create": "Erstellen",
  "action.creating": "Wird erstellt…",

  // --- nav / home --- //
  "nav.device": "Gerät",
  "nav.views": "Ansichten",
  "nav.manageViews": "Ansichten verwalten",
  "nav.addEpaper": "Ein E-Paper hinzufügen",
  "nav.settings": "Einstellungen",
  "nav.signOut": "Abmelden",
  "nav.signOutAs": "Abmelden ({email})",
  "home.noDevices": "Noch keine Geräte — füge eines hinzu, um zu starten.",
  "home.addedEpaper": "E-Paper hinzugefügt",
  "home.newEpaper": "Neues E-Paper",

  // --- device card / page --- //
  "device.open": "{name} öffnen",
  "device.preview": "Vorschau von {name}",
  "device.rendering": "Wird gerendert…",
  "device.noViewYet": "Noch keine Ansicht",
  "device.refreshNow": "Jetzt aktualisieren",
  "device.refresh": "Aktualisieren",
  "device.resume": "Fortsetzen",
  "device.pause": "Pausieren",
  "device.stop": "Stoppen",
  "device.stopClear": "Stoppen — die Ansicht von diesem Gerät entfernen",
  "device.refreshRate": "Aktualisierungsrate",
  "device.geometry": "Geometrie",
  "device.notExist": "Dieses Gerät existiert nicht.",
  "device.backToDevices": "Zurück zu den Geräten",
  "device.live": "Live",
  "device.paused": "Pausiert",
  "device.noView": "Keine Ansicht",
  "device.statusNoView": "Keine Ansicht",
  "device.statusLiveContinuous": "Live · aktualisiert laufend",
  "device.statusLiveNext": "Live · nächste Aktualisierung {countdown}",
  "device.whatShowing": "Was angezeigt wird",
  "device.pickView": "Wähle eine Ansicht zum Anzeigen. Eine rotierende Playlist kommt bald.",
  "device.noViewsAdd": "Noch keine Ansichten — füge im Store auf der Startseite eine hinzu.",
  "device.showingTapClear": "Wird angezeigt — tippen zum Entfernen",
  "device.showView": "„{name}“ anzeigen",
  "device.liveNow": "Jetzt live",
  "device.refreshing": "Wird aktualisiert…",
  "device.refreshingName": "{name} wird aktualisiert…",
  "device.resumedName": "{name} fortgesetzt",
  "device.pausedName": "{name} pausiert",
  "device.stoppedName": "{name} gestoppt",
  "device.clearedView": "Ansicht entfernt",
  "device.showingName": "„{name}“ wird angezeigt",
  "device.savedGeometry": "Geometrie gespeichert",
  "device.savedRefresh": "Aktualisierungseinstellungen gespeichert",
  "device.savedDevice": "Gerät gespeichert",
  "device.geometryTitle": "Geometrie — {name}",
  "device.refreshTitle": "Aktualisierung — {name}",
  "device.settingsTitle": "Einstellungen — {name}",

  // --- epaper settings modal --- //
  "epaper.name": "Name",
  "epaper.deviceUrl": "Geräte-URL",
  "epaper.urlHint":
    "Füge sie in deine ESPHome-Konfiguration als streaming_bmp.url ein oder lade das fertige Paket herunter. Halte sie privat — es ist eine geheime URL.",
  "epaper.downloadPackage": "wframe.yaml herunterladen",
  "epaper.deleteConfirm": "„{name}“ löschen? Das kann nicht rückgängig gemacht werden.",
  "epaper.deletedName": "„{name}“ gelöscht",
  "epaper.needOne": "Du brauchst mindestens ein E-Paper",
  "epaper.deleteThis": "Dieses E-Paper löschen",

  // --- views library --- //
  "views.title": "Ansichten",
  "views.backToDevices": "Zurück zu den Geräten",
  "views.store": "Store",
  "views.custom": "Eigene",
  "views.createCustom": "Eine eigene Ansicht erstellen",
  "views.createTitle": "Ansicht erstellen",
  "views.createdName": "„{name}“ erstellt",
  "views.editTitle": "Ansicht bearbeiten",
  "views.noneYet": "Noch keine Ansichten — füge eine aus dem Store hinzu oder erstelle deine eigene.",
  "views.stoppedName": "„{name}“ gestoppt",
  "views.savedName": "„{name}“ gespeichert",
  "views.deletedName": "„{name}“ gelöscht",
  "views.deleteConfirm": "„{name}“ löschen? Das kann nicht rückgängig gemacht werden.",
  "views.stopEverywhere": "Überall stoppen",
  "views.stopShort": "Stopp",
  "views.devicesCount": "{count} Geräte",
  "views.custom.fallback": "eigene",

  // --- create custom view form --- //
  "custom.name": "Name",
  "custom.namePlaceholder": "Meine Ansicht",
  "custom.description": "Beschreibung (optional)",
  "custom.descriptionPlaceholder": "Was hier angezeigt wird",
  "custom.slug": "Slug",
  "custom.slugPlaceholder": "meine-ansicht",
  "custom.url": "URL",
  "custom.urlPlaceholder": "https://example.com/my-page",
  "custom.urlInvalid": "Gib eine vollständige URL ein, die mit http:// oder https:// beginnt",
  "custom.createView": "Ansicht erstellen",

  // --- store --- //
  "store.title": "Store",
  "store.tapToAdd": "Tippen, um eine eingebaute Ansicht zu deinem Schreibtisch hinzuzufügen.",
  "store.addedName": "„{name}“ hinzugefügt",
  "store.previewOf": "Vorschau von {type}",
  "store.searchPlaceholder": "Ansichten suchen…",
  "store.searchLabel": "Store durchsuchen",
  "store.noResults": "Keine Ansichten passen zu „{query}“.",
  "store.backToDevices": "Zurück zu den Geräten",
  "store.add": "Hinzufügen",
  "store.adding": "Wird hinzugefügt…",

  // Store catalog, keyed by dashboard type.
  "store.dashboard.title": "Übersicht",
  "store.dashboard.description": "Wetter, Kalender, Statistiken und ein tägliches Zitat.",
  "store.hn_zeitung.title": "HN Zeitung",
  "store.hn_zeitung.description":
    "Top-Hacker-News-Geschichten im Zeitungsstil mit KI-Zusammenfassungen.",
  "store.life.title": "Life",
  "store.life.description": "Conways Spiel des Lebens — ein sich entwickelnder Zellularautomat.",
  "store.custom_url.title": "Eigene URL",
  "store.custom_url.description": "Rendere jede Webseite deiner Wahl als Bitmap.",
  "store.weather.title": "Wetter",
  "store.weather.description":
    "Live-Temperaturverlauf über 24 Stunden und Statistiken für deinen Standort.",
  "store.github.title": "GitHub",
  "store.github.description": "Eine öffentliche Profilkarte: Sterne, Top-Repos und Sprachen.",
  "store.homeassistant.title": "Home Assistant — Lichter",
  "store.homeassistant.description":
    "Deine Lichter und ihre Helligkeit, live von Home Assistant übertragen.",
  "store.homeassistant_temp.title": "Home Assistant — Temperatur",
  "store.homeassistant_temp.description":
    "Ein 24-Stunden-Temperaturverlauf von einem Home-Assistant-Sensor.",
  "store.image.title": "Bild",
  "store.image.description":
    "Zeige ein hochgeladenes Bild im Vollbild, gedithert fürs E-Paper.",
  "store.vag.title": "VAG Abfahrten",
  "store.vag.description":
    "Live-Abfahrten für deine VGN-Haltestelle (Nürnberg), mit Echtzeit-Verspätungen.",
  "store.font_test.title": "Schrifttest",
  "store.font_test.description":
    "Ein Musterblatt, das Schriften in mehreren Größen auf deinem E-Paper vergleicht.",
  "store.welcome.title": "Willkommen",
  "store.welcome.description":
    "Eine große Willkommensüberschrift mit deinem eigenen Text darunter — in jeder Sprache.",
  "store.calendar.title": "Kalender",
  "store.calendar.description":
    "Deine bevorstehenden Termine aus einem veröffentlichten iCalendar-Link (ICS/webcal).",

  // --- geometry form --- //
  "geometry.intro":
    "Bildschirmgröße in Pixeln sowie Größe und Position der darauf gerenderten Ansicht.",
  "geometry.screenWidth": "Bildschirmbreite",
  "geometry.screenHeight": "Bildschirmhöhe",
  "geometry.imageWidth": "Bildbreite",
  "geometry.imageHeight": "Bildhöhe",
  "geometry.imageX": "Bild X",
  "geometry.imageY": "Bild Y",
  "geometry.rotation": "Drehung",
  "geometry.overflowRight": "Das Bild ragt über den rechten Bildschirmrand hinaus.",
  "geometry.overflowBottom": "Das Bild ragt über den unteren Bildschirmrand hinaus.",

  // --- refresh control --- //
  "refresh.stopped": "Gestoppt — die Anzeige ist auf ihrem letzten Bild eingefroren.",
  "refresh.running": "Läuft — die Anzeige wird im untenstehenden Intervall neu gezeichnet.",
  "refresh.stop": "Stoppen",
  "refresh.resume": "Fortsetzen",
  "refresh.interval": "Aktualisierungsintervall (Sekunden)",
  "refresh.intervalHint":
    "0 zeichnet bei jeder Geräteabfrage neu (~5s). Höhere Werte schonen das Panel.",

  // --- settings page --- //
  "settings.title": "Einstellungen",
  "settings.language": "Sprache",
  "settings.languageHint": "Wähle die Sprache für die wframe-Web-App.",
  "settings.backToDevices": "Zurück zu den Geräten",

  // --- auth --- //
  "auth.createAccount": "Konto erstellen",
  "auth.signIn": "Anmelden",
  "auth.emailPlaceholder": "du@beispiel.de",
  "auth.passwordPlaceholder": "Passwort",
  "auth.minChars": "Mindestens 8 Zeichen.",
  "auth.haveAccount": "Schon ein Konto? Anmelden",
  "auth.createAccountLink": "Konto erstellen",
  "auth.register": "Registrieren",

  // --- view edit modal fields --- //
  "viewEdit.name": "Name",
  "viewEdit.url": "URL",

  // --- view detail page --- //
  "viewPage.notExist": "Diese Ansicht existiert nicht.",
  "viewPage.backToViews": "Zurück zu den Ansichten",
  "viewPage.preview": "Vorschau",
  "viewPage.configuration": "Konfiguration",
  "viewPage.unsavedHint": "Änderungen werden erst mit Speichern übernommen.",
  "viewPage.saved": "„{name}“ gespeichert",
  "viewPage.deleted": "„{name}“ gelöscht",
  "viewPage.deleteConfirm": "„{name}“ löschen? Das kann nicht rückgängig gemacht werden.",
  "viewPage.welcomeEyebrow": "Kicker (kleine Zeile über der Überschrift)",
  "viewPage.welcomeHeading": "Überschrift",
  "viewPage.welcomeBody": "Text (je eine Zeile)",
  "viewPage.welcomeFooter": "Fußzeile (kleine Zeile unten)",
  "viewPage.calendarUrl": "Kalender-Feed (ICS-Link)",
  "viewPage.calendarHint":
    "Füge einen veröffentlichten iCalendar-Link ein (iCloud, Google Kalender). Halte ihn privat — jeder mit dem Link kann den Kalender lesen.",
  "viewPage.githubUsername": "GitHub-Benutzername",
  "viewPage.vagStop": "VGN-Haltestelle",
  "viewPage.configImmediateNote": "Diese Einstellungen werden sofort gespeichert.",
};
