// ====================================
// KOI DASHBOARD - UNIFIED COMPLETE VERSION
// Con gestione errori, cache locale e WhatsApp
// ====================================

console.log('📜 KOI Dashboard Unified v2.0 - ISO Data Support');

// =========================
// Utilities & Helpers
// =========================
const KoiUtils = {
    // Parse date da formato ISO o DD/MM/YYYY
    parseDate(str) {
        if (!str) return new Date();
        
        const dateStr = String(str);
        
        // Formato ISO: "2025-09-15T07:00:00.000Z"
        if (dateStr.includes('T')) {
            return new Date(dateStr);
        }
        
        // Formato DD/MM/YYYY: "10/09/2025"
        if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                const [day, month, year] = parts.map(Number);
                return new Date(year, month - 1, day, 12, 0, 0);
            }
        }
        
        // Formato YYYY-MM-DD: "2025-09-15"
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = dateStr.split('-').map(Number);
            return new Date(year, month - 1, day, 12, 0, 0);
        }
        
        return new Date(dateStr);
    },

    // Converte qualsiasi data in formato DD/MM/YYYY
    formatDateForDisplay(str) {
        const date = this.parseDate(str);
        return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;
    },

    // Formatta orario da qualsiasi formato
    formatTime(str) {
        if (!str) return '';
        // Se è già HH:MM, mantienilo
        if (/^\d{2}:\d{2}$/.test(str)) return str;
        // Se è ISO, estrai l'orario
        if (str.includes('T')) {
            const date = new Date(str);
            return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        }
        return str;
    },

    // Formatta data per visualizzazione (es: "ven 13/09")
    formatDateShort(str) {
        const date = this.parseDate(str);
        return date.toLocaleDateString('it-IT', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit'
        });
    },

    // Controlla se due date sono lo stesso giorno
    isSameDay(date1, date2) {
        const d1 = this.parseDate(date1);
        const d2 = this.parseDate(date2);
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    },

    // Telefono come stringa (il tuo Apps Script lo invia come number)
    formatPhone(phone) {
        if (!phone) return '';
        return String(phone);
    }
};

// =========================
// Sistema Filtri
// =========================
const KoiFilters = {
    _initialized: false,
    currentFilters: {
        status: 'all',
        date: null,
        dateRange: null,
        searchText: ''
    },

    init() {
        if (this._initialized) return;

        const tabs = document.querySelectorAll('.filter-tabs .tab');
        const buttons = document.querySelectorAll('.quick-filters button');
        const search = document.getElementById('searchReservations');

        // Tab stati (Tutte, Confermate, Cancellate)
        tabs.forEach(tab => {
            tab.onclick = (e) => {
                e.preventDefault();
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentFilters.status = tab.dataset.status;
                this.applyFilters();
            };
        });

        // Filtri rapidi (Oggi, Domani, ecc.)
        buttons.forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.applyQuickFilter(btn.dataset.filter);
            };
        });

        // Ricerca
        if (search) {
            search.oninput = (e) => {
                this.currentFilters.searchText = e.target.value.toLowerCase();
                this.applyFilters();
            };
        }

        // Default: filtro "Oggi" attivo
        const todayBtn = document.querySelector('[data-filter="today"]');
        if (todayBtn) {
            todayBtn.classList.add('active');
            this.currentFilters.date = new Date();
            this.currentFilters.date.setHours(0, 0, 0, 0);
        }

        this._initialized = true;
        console.log('✅ KoiFilters inizializzato con filtro OGGI');
        this.applyFilters();
    },

    applyQuickFilter(type) {
        this.currentFilters.date = null;
        this.currentFilters.dateRange = null;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch (type) {
            case 'today':
                this.currentFilters.date = today;
                break;
            case 'tomorrow':
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);
                this.currentFilters.date = tomorrow;
                break;
            case 'thisWeek':
                const startWeek = new Date(today);
                const day = startWeek.getDay();
                const diff = startWeek.getDate() - day + (day === 0 ? -6 : 1);
                startWeek.setDate(diff);
                startWeek.setHours(0, 0, 0, 0);
                const endWeek = new Date(startWeek);
                endWeek.setDate(startWeek.getDate() + 6);
                endWeek.setHours(23, 59, 59, 999);
                this.currentFilters.dateRange = { start: startWeek, end: endWeek };
                break;
            case 'next7Days':
                const start7 = new Date(today);
                const end7 = new Date(today);
                end7.setDate(today.getDate() + 6);
                end7.setHours(23, 59, 59, 999);
                this.currentFilters.dateRange = { start: start7, end: end7 };
                break;
        }
        
        this.applyFilters();
    },

    applyFilters() {
        if (!window.KoiApp?.data?.reservations) {
            console.log('⏳ Dati non ancora pronti per filtri');
            return;
        }

        let list = [...window.KoiApp.data.reservations];
        console.log(`📊 Filtro su ${list.length} prenotazioni totali`);

        // Filtro per stato
        if (this.currentFilters.status !== 'all') {
            let targetStatus = this.currentFilters.status;
            if (targetStatus === 'Confermate') targetStatus = 'Confermata';
            if (targetStatus === 'Cancellate') targetStatus = 'Cancellata';
            
            list = list.filter(r => (r.stato || 'Confermata') === targetStatus);
            console.log(`   Dopo filtro stato (${targetStatus}): ${list.length}`);
        }

        // Filtro per data singola
        if (this.currentFilters.date) {
            const filterDate = this.currentFilters.date;
            list = list.filter(r => {
                return KoiUtils.isSameDay(r.data, filterDate);
            });
            console.log(`   Dopo filtro data: ${list.length}`);
        }
        
        // Filtro per range di date
        else if (this.currentFilters.dateRange) {
            const { start, end } = this.currentFilters.dateRange;
            list = list.filter(r => {
                const resDate = KoiUtils.parseDate(r.data);
                resDate.setHours(0, 0, 0, 0);
                return resDate >= start && resDate <= end;
            });
            console.log(`   Dopo filtro range: ${list.length}`);
        }

        // Filtro per ricerca
        if (this.currentFilters.searchText) {
            const search = this.currentFilters.searchText;
            list = list.filter(r => {
                const fullName = `${r.nome || ''} ${r.cognome || ''}`.toLowerCase();
                const phone = KoiUtils.formatPhone(r.telefono).toLowerCase();
                return fullName.includes(search) || phone.includes(search);
            });
            console.log(`   Dopo filtro ricerca: ${list.length}`);
        }

        console.log(`✅ Risultato finale: ${list.length} prenotazioni`);
        this.renderReservations(list);
        this.updateCounter(list.length);
        
        // Aggiorna anche la home se siamo nella dashboard
        if (window.KoiApp.currentPage === 'dashboard') {
            KoiDashboard.updateRecentReservations();
        }
    },

    renderReservations(list) {
        const container = document.getElementById('allReservationsCards');
        if (!container) return;

        if (list.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #999;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📅</div>
                    <div>Nessuna prenotazione trovata</div>
                    <div style="font-size: 14px; margin-top: 8px;">Prova a cambiare i filtri</div>
                </div>
            `;
            return;
        }

        // 🔧 MODIFICA 1: Aggiungi ID univoco se mancante
        list = list.map(res => {
            if (!res.id) {
                const base = `${res.nome || ''}-${res.telefono || ''}-${res.data || ''}`;
                res.id = base.replace(/\s+/g, '').replace(/[^\w-]/g, '').toLowerCase();
            }
            return res;
        });

        // 🔍 DEBUG: Rendering prenotazioni con ID
        console.log("🎨 Rendering prenotazioni:", list.map(r => r.id));

        // Ordina: data più recente prima, poi per orario
        list.sort((a, b) => {
            const dateA = KoiUtils.parseDate(a.data);
            const dateB = KoiUtils.parseDate(b.data);
            
            if (dateA.getTime() !== dateB.getTime()) {
                return dateB - dateA; // Data più recente prima
            }
            
            // Stessa data: ordina per orario
            const [hA, mA] = (a.orario || '00:00').split(':').map(Number);
            const [hB, mB] = (b.orario || '00:00').split(':').map(Number);
            return (hA * 60 + mA) - (hB * 60 + mB);
        });

        const html = list.map(r => {
            const badgeClass = r.stato === 'Confermata' ? 'badge-success' : 'badge-danger';
            const phoneFormatted = KoiUtils.formatPhone(r.telefono);
            
            return `
                <div class="reservation-card animate-in" data-reservation-id="${r.id}">
                    <div class="reservation-card-header">
                        <div class="reservation-card-name">
                            ${r.nome} ${r.cognome}
                        </div>
                        <div class="reservation-card-time">
                            ${KoiUtils.formatTime(r.orario)}
                        </div>
                    </div>
                    <div class="reservation-card-details">
                        <div>📅 ${KoiUtils.formatDateShort(r.data)}</div>
                        <div>👥 ${r.persone} persone</div>
                        ${phoneFormatted ? `<div>📞 <a href="tel:${phoneFormatted}" style="color: var(--oro); text-decoration: none;">${phoneFormatted}</a></div>` : ''}
                        ${r.email ? `<div>✉️ ${r.email}</div>` : ''}
                        ${r.note ? `<div>📝 ${r.note}</div>` : ''}
                        <div style="margin-top: 8px;">
                            <span class="badge ${badgeClass}">${r.stato || 'Confermata'}</span>
                            ${r.waInviato ? '<span class="badge" style="background: #25d366; color: white; margin-left: 4px;">WA ✔</span>' : ''}
                        </div>
                    </div>
                    <div class="reservation-card-actions">
                        <button class="btn-icon btn-edit" data-id="${r.id}" title="Modifica">
                            ✏️
                        </button>
                        <button class="btn-icon" onclick="KoiAPI.deleteReservation('${r.id}')" title="Cancella">
                            🗑️
                        </button>
                        <button class="btn-icon" onclick="KoiAPI.sendWhatsApp('${r.id}')" title="WhatsApp">
                            📱
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
        
        // 🔍 DEBUG: Bottoni generati con data-id
        document.querySelectorAll('.btn-edit').forEach(btn => {
            console.log("✏️ Bottone generato - data-id:", btn.dataset.id);
        });
        document.querySelectorAll('.btn-icon[onclick*="deleteReservation"]').forEach(btn => {
            console.log("🗑️ Bottone generato - delete data-id:", btn.getAttribute("onclick"));
        });
    },

    updateCounter(count) {
        const counter = document.getElementById('reservationCounter');
        if (counter) {
            const total = window.KoiApp?.data?.reservations?.length || 0;
            counter.innerHTML = `
                Mostrate <strong>${count}</strong> di <strong>${total}</strong> prenotazioni
            `;
        }
    }
};

// =========================
// Dashboard Home Updates
// =========================
const KoiDashboard = {
    updateRecentReservations() {
        const container = document.getElementById('recentReservationsCards');
        if (!container) return;

        const reservations = window.KoiApp?.data?.reservations || [];
        
        // Filtra solo prenotazioni di oggi
        const today = new Date();
        const todayReservations = reservations.filter(r => 
            KoiUtils.isSameDay(r.data, today) && 
            (r.stato || 'Confermata') === 'Confermata'
        );
        
        if (todayReservations.length === 0) {
            // Se non ci sono prenotazioni oggi, mostra le prossime 3
            const futureReservations = reservations
                .filter(r => {
                    const resDate = KoiUtils.parseDate(r.data);
                    return resDate >= today && (r.stato || 'Confermata') === 'Confermata';
                })
                .sort((a, b) => KoiUtils.parseDate(a.data) - KoiUtils.parseDate(b.data))
                .slice(0, 3);
            
            if (futureReservations.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #999;">Nessuna prenotazione in programma</p>';
                return;
            }
            
            container.innerHTML = futureReservations.map(r => {
                const phoneFormatted = KoiUtils.formatPhone(r.telefono);
                return `
                    <div class="reservation-card" style="padding: 12px; margin-bottom: 8px; border: 1px solid #ddd; border-radius: 8px;">
                        <div style="font-weight: bold; margin-bottom: 4px;">
                            ${r.nome} ${r.cognome}
                        </div>
                        <div style="color: #666; font-size: 14px;">
                            📅 ${KoiUtils.formatDateShort(r.data)} - ${KoiUtils.formatTime(r.orario)} | 👥 ${r.persone} persone
                        </div>
                        ${phoneFormatted ? `<div style="color: #666; font-size: 14px;">📞 ${phoneFormatted}</div>` : ''}
                    </div>
                `;
            }).join('');
            return;
        }

        // Mostra le prenotazioni di oggi
        container.innerHTML = todayReservations.map(r => {
            const phoneFormatted = KoiUtils.formatPhone(r.telefono);
            return `
                <div class="reservation-card" style="padding: 12px; margin-bottom: 8px; border: 1px solid #ddd; border-radius: 8px;">
                    <div style="font-weight: bold; margin-bottom: 4px;">
                        ${r.nome} ${r.cognome}
                    </div>
                    <div style="color: #666; font-size: 14px;">
                        ⏰ ${KoiUtils.formatTime(r.orario)} | 👥 ${r.persone} persone
                    </div>
                    ${phoneFormatted ? `<div style="color: #666; font-size: 14px;">📞 ${phoneFormatted}</div>` : ''}
                </div>
            `;
        }).join('');
    },

    updateKPIs() {
        const reservations = window.KoiApp?.data?.reservations || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // KPI Oggi - VERSIONE SEMPLICE E SICURA
        const todayReservations = reservations.filter(r => 
            KoiUtils.isSameDay(r.data, today) && (r.stato || 'Confermata') === 'Confermata'
        );
        
        const kpiTodayEl = document.getElementById('kpiToday');
        if (kpiTodayEl) {
            kpiTodayEl.textContent = todayReservations.length;
        }

        // KPI Settimana (coperti totali) - VERSIONE ORIGINALE
        const weekReservations = reservations.filter(r => (r.stato || 'Confermata') === 'Confermata');
        const totalCovers = weekReservations.reduce((sum, r) => sum + (parseInt(r.persone) || 0), 0);
        
        const kpiWeekEl = document.getElementById('kpiWeek');
        if (kpiWeekEl) {
            kpiWeekEl.textContent = totalCovers;
        }
        
        // KPI Domani - PLACEHOLDER
        const kpiTomorrowEl = document.getElementById('kpiTomorrow');
        if (kpiTomorrowEl) {
            kpiTomorrowEl.textContent = '-';
        }
        
        // KPI Mese - PLACEHOLDER
        const kpiMonthEl = document.getElementById('kpiMonth');
        if (kpiMonthEl) {
            kpiMonthEl.textContent = '-';
        }
    }
};

// =========================
// API Calls con Patch Sicurezza
// =========================
const KoiAPI = {
    _loading: false,
    _savingReservation: false,

    async loadDashboardData(showToast = true) {
        if (this._loading) return;
        this._loading = true;

        try {
            console.log('📄 Caricamento dati dashboard...');

            const url = KOI_CONFIG.API_URL;

            let response;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 9000);

            try {
                response = await fetch(url, {
                    method: 'POST',
                    signal: controller.signal,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'lista',
                        token: KOI_CONFIG.API_TOKEN
                    })
                });
                clearTimeout(timeoutId);
            } catch (err) {
                console.warn('⚠️ Fetch fallito o timeout:', err);
                throw new Error('Timeout o errore connessione API');
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            // Parse JSON con fallback
            let result;
            try {
                result = await response.json();
            } catch (err) {
                console.warn('⚠️ JSON non valido ricevuto:', err);
                result = { success: false, data: [] };
            }

            console.log('📦 Dati ricevuti:', result);

            if (!result.success || !result.data) {
                console.warn('⚠️ API non ha restituito dati validi');
                result.data = [];
            }

            // Assicura che KoiApp.data e reservations esistano sempre
            window.KoiApp = window.KoiApp || { currentPage: 'dashboard' };
            window.KoiApp.data = window.KoiApp.data || {};
            window.KoiApp.data.reservations = Array.isArray(result.data) ? result.data : [];

            // 🔧 MODIFICA 1: Aggiungi ID univoco a ogni prenotazione se mancante
            window.KoiApp.data.reservations = window.KoiApp.data.reservations.map(res => {
                if (!res.id) {
                    const base = `${res.nome || ''}-${res.telefono || ''}-${res.data || ''}`;
                    res.id = base.replace(/\s+/g, '').replace(/[^\w-]/g, '').toLowerCase();
                }
                return res;
            });

            console.log(`✅ ${window.KoiApp.data.reservations.length} prenotazioni caricate`);
            
            // 🔍 DEBUG: Lista ID prenotazioni caricate
            console.log("📋 Lista ID prenotazioni caricate:", window.KoiApp.data.reservations.map(r => r.id));

            // Salva in cache locale se ci sono dati
            if (window.KoiApp.data.reservations.length > 0) {
                try {
                    localStorage.setItem('koiReservationsCache', JSON.stringify(window.KoiApp.data.reservations));
                    localStorage.setItem('koiCacheTime', new Date().toISOString());
                    console.log('💾 Cache locale aggiornata');
                } catch (err) {
                    console.warn('⚠️ Impossibile salvare cache locale:', err);
                }
            }

            // Aggiorna interfaccia
            KoiDashboard.updateKPIs();
            KoiDashboard.updateRecentReservations();
            this.updateSystemStatus();

            // Applica filtri se siamo nella pagina prenotazioni
            if (window.KoiApp && window.KoiApp.currentPage === 'reservations') {
                if (!KoiFilters._initialized) {
                    KoiFilters.init();
                }
                KoiFilters.applyFilters();
            }

            if (showToast) {
                this.showToast(`✅ ${window.KoiApp.data.reservations.length} prenotazioni caricate`, 'success');
            }

            // Lancia evento per grafici
            window.dispatchEvent(new Event('koiDataLoaded'));
            
            // Aggiorna grafici direttamente se già inizializzati
            if (window.KoiCharts && window.KoiCharts.chartsReady) {
                KoiCharts.updateCharts();
            }

            return true;

        } catch (error) {
            console.error('❌ Errore caricamento dati (gestito fallback):', error);

            // Prova a leggere cache locale
            let cachedReservations = [];
            let cacheTime = null;
            
            try {
                const cacheStr = localStorage.getItem('koiReservationsCache');
                cacheTime = localStorage.getItem('koiCacheTime');
                
                if (cacheStr) {
                    cachedReservations = JSON.parse(cacheStr);
                    console.log(`📦 Caricato fallback locale: ${cachedReservations.length} prenotazioni`);
                }
            } catch (err) {
                console.warn('⚠️ Errore lettura cache locale:', err);
            }

            // Assicura struttura dati anche in fallback
            window.KoiApp = window.KoiApp || { currentPage: 'dashboard' };
            window.KoiApp.data = window.KoiApp.data || {};
            window.KoiApp.data.reservations = Array.isArray(cachedReservations) ? cachedReservations : [];

            // Mostra messaggio appropriato
            const hasCache = window.KoiApp.data.reservations.length > 0;
            const container = document.getElementById('recentReservationsCards');
            
            if (container && !hasCache) {
                container.innerHTML = `
                    <div style="text-align:center; padding:40px; color:#999;">
                        <p style="font-size:18px;">⚠️ Errore caricamento dati</p>
                        <p style="font-size:14px; margin-top:10px;">
                            Controlla la connessione o riprova più tardi.
                        </p>
                    </div>
                `;
            }

            // Aggiorna interfaccia con dati cache se disponibili
            if (hasCache) {
                KoiDashboard.updateKPIs();
                KoiDashboard.updateRecentReservations();
                this.updateSystemStatus();
                
                if (KoiFilters._initialized) {
                    KoiFilters.applyFilters();
                }
                
                const cacheDate = cacheTime ? new Date(cacheTime).toLocaleString('it-IT') : 'sconosciuta';
                
                if (showToast) {
                    this.showToast(`⚠️ Modalità offline - Dati del ${cacheDate}`, 'warning');
                }
            } else {
                if (showToast) {
                    this.showToast('⚠️ Errore connessione, nessuna cache disponibile', 'error');
                }
            }

            return false;

        } finally {
            this._loading = false;
        }
    },

    // Aggiorna stato sistema nelle impostazioni
    updateSystemStatus() {
        const statusEl = document.getElementById('systemStatus');
        if (statusEl && window.KoiApp?.data?.reservations) {
            const count = window.KoiApp.data.reservations.length;
            const isOffline = !navigator.onLine;
            const cacheTime = localStorage.getItem('koiCacheTime');
            
            let statusText = `Stato: <span style="color: #28a745;">Operativo ✅</span> - ${count} prenotazioni`;
            
            if (isOffline && cacheTime) {
                const cacheDate = new Date(cacheTime).toLocaleString('it-IT');
                statusText += ` <br><small style="color: #ff9800;">⚠️ Modalità offline - Cache: ${cacheDate}</small>`;
            }
            
            statusEl.innerHTML = statusText;
        }
    },

    // Gestione nuova prenotazione con WhatsApp automatico
    async handleNewReservation(formData) {
        if (this._savingReservation) return false;
        this._savingReservation = true;
        
        const data = {
            action: 'crea',
            token: KOI_CONFIG.API_TOKEN,
            nome: formData.get('nome'),
            cognome: formData.get('cognome'),
            telefono: formData.get('telefono'),
            email: formData.get('email'),
            data: formData.get('data'),
            orario: formData.get('orario'),
            persone: formData.get('persone'),
            note: formData.get('note'),
            origine: 'Dashboard',
            inviaWhatsApp: true // Attiva invio automatico WhatsApp
        };
        
        // Converti data in formato DD/MM/YYYY per API
        if (data.data) {
            const [year, month, day] = data.data.split('-');
            data.data = `${day}/${month}/${year}`;
        }
        
        try {
            const response = await fetch(KOI_CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('✅ Prenotazione creata con successo!', 'success');
                
                // Reset form
                document.getElementById('newReservationForm').reset();
                
                // Notifica WhatsApp se inviato
                if (result.whatsappSent) {
                    setTimeout(() => {
                        this.showToast('📱 Conferma WhatsApp inviata al cliente', 'success');
                    }, 1000);
                }
                
                // Ricarica dati dopo 1 secondo
                setTimeout(() => {
                    this.loadDashboardData(false);
                }, 1500);
                
                return true;
            } else {
                this.showToast('❌ Errore: ' + (result.error || 'Creazione fallita'), 'error');
                return false;
            }
        } catch (error) {
            this.showToast('❌ Errore nella creazione', 'error');
            console.error('Errore creazione:', error);
            return false;
        } finally {
            this._savingReservation = false;
        }
    },

    // Invio WhatsApp per prenotazione esistente
    async sendWhatsAppConfirmation(id) {
        const reservation = window.KoiApp.data.reservations.find(r => String(r.id) === String(id));
        if (!reservation) {
            this.showToast('❌ Prenotazione non trovata', 'error');
            return;
        }
        
        try {
            this.showToast('📤 Invio WhatsApp in corso...', 'info');
            
            const response = await fetch(KOI_CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'inviaWhatsApp',
                    token: KOI_CONFIG.API_TOKEN,
                    reservationId: id
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('✅ WhatsApp inviato con successo!', 'success');
                
                // Aggiorna stato locale
                reservation.waInviato = true;
                
                // Riapplica filtri per aggiornare UI
                if (KoiFilters._initialized) {
                    KoiFilters.applyFilters();
                }
                
                return true;
            } else {
                this.showToast('❌ Errore invio WhatsApp: ' + (result.error || 'Invio fallito'), 'error');
                return false;
            }
        } catch (error) {
            console.error('Errore invio WhatsApp:', error);
            this.showToast('❌ Errore connessione WhatsApp', 'error');
            return false;
        }
    },

    // Modifica bottone WhatsApp per usare conferma automatica o manuale
    sendWhatsApp(id) {
        const reservation = window.KoiApp.data.reservations.find(r => String(r.id) === String(id));
        if (!reservation) return;
        
        // Se già inviato, chiedi conferma per reinvio
        if (reservation.waInviato) {
            if (confirm(`WhatsApp già inviato a ${reservation.nome} ${reservation.cognome}.\nVuoi inviare nuovamente la conferma?`)) {
                this.sendWhatsAppConfirmation(id);
            }
        } else {
            // Prima volta, invia direttamente
            if (confirm(`Inviare conferma WhatsApp a ${reservation.nome} ${reservation.cognome}?`)) {
                this.sendWhatsAppConfirmation(id);
            }
        }
    },

    // Funzione modifica prenotazione (placeholder)
    editReservation(id) {
        const reservation = window.KoiApp.data.reservations.find(r => String(r.id) === String(id));
        if (reservation) {
            alert(`Modifica prenotazione:\n${reservation.nome} ${reservation.cognome}\n${KoiUtils.formatDateShort(reservation.data)} - ${KoiUtils.formatTime(reservation.orario)}`);
        }
    },

    // Cancellazione prenotazione - FIX con conversione stringa
    async deleteReservation(id) {
        if (!confirm('Cancellare questa prenotazione?')) return;
        
        const reservation = window.KoiApp.data.reservations.find(r => String(r.id) === String(id));
        if (reservation) {
            try {
                // Chiamata API per cancellazione
                const response = await fetch(KOI_CONFIG.API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'cancella',
                        token: KOI_CONFIG.API_TOKEN,
                        id: id
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Aggiorna stato locale
                    reservation.stato = 'Cancellata';
                    
                    // Riapplica filtri immediatamente
                    if (KoiFilters._initialized) {
                        KoiFilters.applyFilters();
                    }
                    
                    this.showToast('✅ Prenotazione cancellata', 'success');
                    
                    // Ricarica dati dopo 1 secondo
                    setTimeout(() => {
                        this.loadDashboardData(false);
                    }, 1000);
                } else {
                    this.showToast('❌ Errore cancellazione', 'error');
                }
            } catch (error) {
                console.error('Errore cancellazione:', error);
                this.showToast('❌ Errore durante la cancellazione', 'error');
            }
        }
    },

    showToast(message, type = 'info') {
        console.log(`Toast [${type}]: ${message}`);
        
        // Crea toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-size: 14px;
            z-index: 9999;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ff9800' : '#17a2b8'};
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
};

// =========================
// Navigation & Init
// =========================
const KoiApp = {
    currentPage: 'dashboard',
    
    init() {
        console.log('🚀 Inizializzazione KOI Dashboard...');
        
        // Setup navigazione
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.getAttribute('data-page');
                this.showPage(page);
            });
        });
        
        // Setup form nuova prenotazione con WhatsApp
        document.getElementById('newReservationForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await KoiAPI.handleNewReservation(formData);
        });
        
        // Carica dati iniziali
        KoiAPI.loadDashboardData();
        
        // Auto-refresh ogni 30 secondi
        setInterval(() => {
            if (this.currentPage === 'dashboard') {
                KoiAPI.loadDashboardData(false);
            }
        }, 30000);
        
        // Monitora stato connessione
        window.addEventListener('online', () => {
            console.log('✅ Connessione ripristinata');
            KoiAPI.showToast('✅ Connessione ripristinata', 'success');
            KoiAPI.loadDashboardData(false);
        });
        
        window.addEventListener('offline', () => {
            console.log('⚠️ Connessione persa');
            KoiAPI.showToast('⚠️ Modalità offline - Utilizzo cache locale', 'warning');
            KoiAPI.updateSystemStatus();
        });
        
        console.log('✅ KOI Dashboard inizializzato');
    },
    
    showPage(pageName) {
        // Nascondi tutte le pagine
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });
        
        // Mostra la pagina target
        const targetPage = document.getElementById(pageName + 'Page');
        if (targetPage) {
            targetPage.classList.add('active');
        }
        
        // Aggiorna nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === pageName) {
                item.classList.add('active');
            }
        });
        
        this.currentPage = pageName;
        
        // Inizializza filtri se andiamo su prenotazioni
        if (pageName === 'reservations') {
            setTimeout(() => {
                KoiFilters.init();
            }, 100);
        }
        
        // Aggiorna stato sistema se andiamo su impostazioni
        if (pageName === 'settings') {
            KoiAPI.updateSystemStatus();
        }
    }
};

// =========================
// Inizializzazione
// =========================
document.addEventListener('DOMContentLoaded', () => {
    console.log("📱 User Agent:", navigator.userAgent);
    
    window.KoiApp = KoiApp;
    window.KoiAPI = KoiAPI;
    window.KoiFilters = KoiFilters;
    window.KoiDashboard = KoiDashboard;
    window.KoiUtils = KoiUtils;
    
    KoiApp.init();
    
    // 🔧 MODIFICA: Apertura modale modifica prenotazione (FIX con DEBUG)
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('.btn-edit');
        if (!btn) return;
        
        const id = btn.dataset.id;
        console.log("🖱️ Bottone Modifica cliccato - data-id:", id);
        
        // 🔍 DEBUG: Lista IDs disponibili al click
        if (window.KoiApp?.data?.reservations) {
            console.log("📋 IDs disponibili:", window.KoiApp.data.reservations.map(r => r.id));
        } else {
            console.warn("⚠️ Nessuna prenotazione caricata in memoria");
        }
        
        // FIX: Converti entrambi a stringa per confronto sicuro
        const res = window.KoiApp.data.reservations.find(r => String(r.id) === String(id));
        
        if (!res) {
            console.error('Prenotazione non trovata per ID:', id);
            console.log('Tipo ID cercato:', typeof id);
            console.log('Tipi ID nel database:', window.KoiApp.data.reservations.map(r => ({ id: r.id, tipo: typeof r.id })));
            return alert('❌ Prenotazione non trovata (ID: ' + id + ')');
        }
        
        console.log('🔍 Trovata prenotazione:', res);
        
        const modal = document.getElementById('detailModal');
        if (!modal) {
            console.error('Modale detailModal non trovata nel DOM');
            return;
        }
        
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) {
            modalTitle.textContent = 'Modifica Prenotazione';
        }
        
        const modalBody = document.getElementById('modalBody');
        if (modalBody) {
            modalBody.innerHTML = `
                <form id="editReservationForm" style="display: flex; flex-direction: column; gap: 15px;">
                    <div class="form-group">
                        <label class="form-label">Nome</label>
                        <input name="nome" class="form-control" value="${res.nome || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Cognome</label>
                        <input name="cognome" class="form-control" value="${res.cognome || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input name="email" type="email" class="form-control" value="${res.email || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Telefono</label>
                        <input name="telefono" class="form-control" value="${res.telefono || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Persone</label>
                        <input name="persone" type="number" min="1" class="form-control" value="${res.persone || 2}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data</label>
                        <input name="data" type="date" class="form-control" value="${res.data ? res.data.split('T')[0].split('/').reverse().join('-') : ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Orario</label>
                        <input name="orario" type="time" class="form-control" value="${res.orario || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Note</label>
                        <textarea name="note" class="form-control" rows="3">${res.note || ''}</textarea>
                    </div>
                    <button class="btn btn-primary" type="submit">💾 Salva Modifiche</button>
                </form>
            `;
        }
        
        modal.classList.add('active');
        modal.style.display = 'flex';
        
        const editForm = document.getElementById('editReservationForm');
        if (editForm) {
            editForm.addEventListener('submit', async function (ev) {
                ev.preventDefault();
                const formData = new FormData(this);
                const updated = Object.fromEntries(formData.entries());
                updated.id = res.id;
                
                // Converte la data da YYYY-MM-DD a DD/MM/YYYY per App Script
                if (updated.data && updated.data.includes('-')) {
                    const [y, m, d] = updated.data.split('-');
                    updated.data = `${d}/${m}/${y}`;
                }
                
                try {
                    const response = await fetch(KOI_CONFIG.API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'modifica',
                            token: KOI_CONFIG.API_TOKEN,
                            data: updated
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        KoiAPI.showToast('✅ Prenotazione aggiornata', 'success');
                        modal.classList.remove('active');
                        modal.style.display = 'none';
                        setTimeout(() => KoiAPI.loadDashboardData(false), 1000);
                    } else {
                        KoiAPI.showToast('❌ Errore salvataggio: ' + (result.error || 'API fallita'), 'error');
                    }
                } catch (err) {
                    console.error('❌ Errore invio:', err);
                    KoiAPI.showToast('❌ Errore connessione', 'error');
                }
            });
        }
    });

    // Gestione chiusura modale
    document.querySelector('.modal-close')?.addEventListener('click', function() {
        const modal = document.getElementById('detailModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    });
});

// Remove loading screen when data is ready
window.addEventListener('load', () => {
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('hide');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 300);
        }
    }, 1000);
});

console.log('✅ KOI Dashboard Unified completamente caricato');

// Evento per inizializzare grafici quando dati sono pronti
window.addEventListener('koiDataLoaded', () => {
    if (window.KoiCharts && typeof KoiCharts.initializeCharts === 'function') {
        setTimeout(() => {
            KoiCharts.initializeCharts();
        }, 1000);
    }
});
