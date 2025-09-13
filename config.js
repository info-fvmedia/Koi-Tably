// ====================================
// CONFIGURAZIONE KOI RESTAURANT
// File: config.js
// ====================================

const KOI_CONFIG = {
    // URL del tuo deployment Google Apps Script
    API_URL: 'https://startappfood.com/koi-admin/proxy.php',
    
    // Token di sicurezza (deve corrispondere a quello in Apps Script)
    API_TOKEN: 'KOI2025_XYZ888',
    
    // Informazioni ristorante
    RESTAURANT: {
        nome: 'KOI Restaurant',
        indirizzo: 'Via Secondo Frola, 4 Torino',
        telefono: '+39 011 543957',
        email: 'info@koirestaurant.it',
        sito: 'https://ristorantekoi.it/'
    },
    
    // Green API per WhatsApp
    GREEN_API: {
        instanceId: '7105298689',
        apiToken: 'f545b871a917441984254b827ccf81747944373b05e14aab94',
        enabled: true
    },
    
    // Impostazioni dashboard
    DASHBOARD: {
        refreshInterval: 30000, // Aggiorna ogni 30 secondi
        maxReservationsDisplay: 50,
        defaultView: 'dashboard',
        language: 'it'
    },
    
    // Debug e logging
    DEBUG_MODE: false, // Metti true in sviluppo per logging dettagliato
    ERROR_REPORTING_URL: '', // URL servizio di logging esterno (es: Sentry, LogRocket)
    
    // Feature flags - abilita/disabilita funzionalità
    FEATURES: {
        NOTIFICATIONS: true,      // Sistema notifiche campanellino
        WHATSAPP: true,           // Integrazione WhatsApp
        CHARTS: true,             // Grafici dashboard
        OFFLINE_MODE: true,       // Modalità offline con cache
        AUTO_REFRESH: true,       // Refresh automatico dashboard
        PULL_TO_REFRESH: true     // Pull-to-refresh su mobile
    },
    
    // Impostazioni cache e performance
    CACHE: {
        TTL: 3600000,            // Time to live cache: 1 ora (in millisecondi)
        MAX_SIZE: 100,           // Max numero prenotazioni in cache
        AUTO_CLEAN: true         // Pulizia automatica cache vecchia
    },
    
    // NUOVE IMPOSTAZIONI CACHE PER PERFORMANCE
    CACHE_SETTINGS: {
        CACHE_TTL: 30000,        // 30 secondi di cache prima di refresh
        CACHE_FIRST: true,       // Usa sempre cache prima, poi aggiorna
        REFRESH_ON_FOCUS: true,  // Aggiorna quando torni sull'app
        STALE_WARNING: 3600000,  // Mostra avviso se cache > 1 ora
        ENABLE_SKELETON: true    // Mostra skeleton mentre carica
    },
    
    // Filtro prenotazioni vecchie
    FILTER_DAYS: 14,            // Mostra solo ultimi 14 giorni + future
    
    // Impostazioni notifiche
    NOTIFICATIONS: {
        CHECK_INTERVAL: 30000,   // Controlla nuove prenotazioni ogni 30 secondi
        SHOW_TOAST: true,        // Mostra toast per nuove prenotazioni
        SOUND_ENABLED: false,    // Suono notifiche (futura implementazione)
        VIBRATE: false           // Vibrazione mobile (futura implementazione)
    },
    
    // Limiti e validazioni
    LIMITS: {
        MAX_PERSONE: 20,         // Max persone per prenotazione
        MIN_PERSONE: 1,          // Min persone per prenotazione
        MAX_NOTE_LENGTH: 500,    // Max caratteri nelle note
        BOOKING_DAYS_AHEAD: 90   // Giorni futuri prenotabili
    },
    
    // Orari default ristorante
    DEFAULT_HOURS: {
        LUNCH_START: '12:00',
        LUNCH_END: '15:00',
        DINNER_START: '19:00',
        DINNER_END: '23:00',
        SLOT_DURATION: 30        // Durata slot in minuti
    },
    
    // Personalizzazione UI
    UI: {
        THEME: 'auto',           // 'light', 'dark', 'auto'
        PRIMARY_COLOR: '#C1A875', // Colore oro principale
        ANIMATIONS: true,        // Abilita animazioni
        COMPACT_MODE: false,     // Modalità compatta per schermi piccoli
        LAZY_LOAD_CHARTS: true   // Carica grafici solo quando visibili
    },
    
    // Performance optimizations
    PERFORMANCE: {
        ENABLE_CACHE_FIRST: true,    // Priorità cache su fetch
        LAZY_LOAD_MODULES: true,     // Carica moduli quando servono
        PREFETCH_DATA: true,          // Precarica dati in background
        COMPRESS_CACHE: false,        // Comprimi dati in localStorage
        MAX_CONCURRENT_REQUESTS: 2,  // Max richieste parallele
        DEBOUNCE_SEARCH: 300         // Debounce ricerca (ms)
    },
    
    // Backup e sicurezza
    SECURITY: {
        SESSION_TIMEOUT: 0,      // 0 = nessun timeout, altrimenti minuti
        REQUIRE_HTTPS: true,     // Forza HTTPS in produzione
        ENCRYPT_CACHE: false     // Cripta dati in localStorage
    },
    
    // Analytics (per future implementazioni)
    ANALYTICS: {
        ENABLED: false,
        GOOGLE_ANALYTICS_ID: '',
        TRACK_ERRORS: false,
        TRACK_PERFORMANCE: false
    },
    
    // Ambiente
    ENVIRONMENT: window.location.hostname === 'localhost' ? 'development' : 'production',
    
    // Versione app
    VERSION: '1.2.0',
    BUILD_DATE: '2024-11-09'
};

// Applica configurazioni ambiente-specifiche
if (KOI_CONFIG.ENVIRONMENT === 'development') {
    KOI_CONFIG.DEBUG_MODE = true;
    KOI_CONFIG.DASHBOARD.refreshInterval = 60000; // Refresh meno frequente in dev
    console.log('🔧 Modalità sviluppo attiva');
}

// Validazione configurazione
(function validateConfig() {
    const required = ['API_URL', 'API_TOKEN'];
    const missing = required.filter(key => !KOI_CONFIG[key]);
    
    if (missing.length > 0) {
        console.error('❌ Configurazione mancante:', missing.join(', '));
    }
    
    // Avvisi per funzionalità disabilitate
    if (!KOI_CONFIG.FEATURES.OFFLINE_MODE) {
        console.warn('⚠️ Modalità offline disabilitata');
    }
    
    if (!KOI_CONFIG.CACHE_SETTINGS.CACHE_FIRST) {
        console.warn('⚠️ Cache-first disabilitata - performance ridotte');
    }
    
    if (KOI_CONFIG.DEBUG_MODE) {
        console.group('📋 Configurazione KOI');
        console.log('Versione:', KOI_CONFIG.VERSION);
        console.log('Ambiente:', KOI_CONFIG.ENVIRONMENT);
        console.log('API URL:', KOI_CONFIG.API_URL);
        console.log('Cache-first:', KOI_CONFIG.CACHE_SETTINGS.CACHE_FIRST);
        console.log('Filtro giorni:', KOI_CONFIG.FILTER_DAYS);
        console.log('Features attive:', Object.entries(KOI_CONFIG.FEATURES)
            .filter(([_, v]) => v)
            .map(([k, _]) => k)
            .join(', '));
        console.groupEnd();
    }
})();

// Setup performance monitoring
if (KOI_CONFIG.PERFORMANCE.ENABLE_CACHE_FIRST) {
    // Aggiungi listener per refresh on focus
    if (KOI_CONFIG.CACHE_SETTINGS.REFRESH_ON_FOCUS) {
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden && window.KoiAPI) {
                console.log('🔄 App tornata in focus - refresh dati');
                setTimeout(() => {
                    window.KoiAPI.loadDashboardData(false);
                }, 500);
            }
        });
    }
}

// Esporta configurazione globalmente
window.KOI_CONFIG = KOI_CONFIG;