// ====================================
// KOI DASHBOARD - UI MANAGEMENT
// File: js/ui.js - Versione ottimizzata e sicura
// ====================================

// Business Logic separata dalla UI
const KoiBusinessLogic = {
    /**
     * Calcola statistiche clienti
     */
    calculateCustomerStats: function(reservations) {
        const clientsMap = {};
        
        reservations.forEach(res => {
            const key = res.telefono;
            if (!clientsMap[key]) {
                clientsMap[key] = {
                    nome: res.nome,
                    cognome: res.cognome,
                    telefono: res.telefono,
                    email: res.email || '',
                    visite: 0,
                    ultimaVisita: new Date(res.data),
                    note: ''
                };
            }
            clientsMap[key].visite++;
            
            const resDate = new Date(res.data);
            if (resDate > clientsMap[key].ultimaVisita) {
                clientsMap[key].ultimaVisita = resDate;
            }
        });
        
        // Formatta le date per la visualizzazione
        Object.values(clientsMap).forEach(client => {
            client.ultimaVisita = client.ultimaVisita.toLocaleDateString('it-IT');
        });
        
        return Object.values(clientsMap);
    },
    
    /**
     * Filtra prenotazioni per data e stato
     */
    filterReservations: function(reservations, dateFilter, statusFilter) {
        let filtered = [...reservations];
        
        if (dateFilter) {
            filtered = filtered.filter(r => {
                const resDate = new Date(r.data).toLocaleDateString('it-IT');
                const filterDate = new Date(dateFilter).toLocaleDateString('it-IT');
                return resDate === filterDate;
            });
        }
        
        if (statusFilter) {
            // Gestisci sia singolare che plurale per compatibilità
            const normalizedStatus = statusFilter.replace('Confermate', 'Confermata')
                                                 .replace('Cancellate', 'Cancellata');
            filtered = filtered.filter(r => {
                const resStatus = r.stato || 'Confermata';
                return resStatus === normalizedStatus;
            });
        }
        
        return filtered;
    },
    
    /**
     * Valida dati prenotazione
     */
    validateReservation: function(data) {
        const errors = [];
        
        if (!data.nome || data.nome.trim().length < 2) {
            errors.push('Nome non valido');
        }
        
        if (!data.cognome || data.cognome.trim().length < 2) {
            errors.push('Cognome non valido');
        }
        
        if (!data.telefono || !data.telefono.match(/^[\d\s+()-]+$/)) {
            errors.push('Numero di telefono non valido');
        }
        
        if (data.email && !data.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            errors.push('Email non valida');
        }
        
        if (!data.persone || data.persone < 1 || data.persone > 20) {
            errors.push('Numero persone non valido (1-20)');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
};

const KoiUI = {
    
    // ===== UTILITY FUNCTIONS =====
    
    /**
     * Funzione helper per escape HTML (protezione XSS)
     */
    escapeHtml: function(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    },

    /**
     * Wrapper per gestione errori
     */
    safeExecute: function(fn, context, errorMessage) {
        try {
            return fn.call(context);
        } catch (error) {
            console.error(`KoiUI Error: ${errorMessage}`, error);
            this.showToast(errorMessage || 'Si è verificato un errore', 'error');
            return null;
        }
    },
    
    // ===== NAVIGATION =====
    
    /**
     * Naviga a una pagina specifica - CON FIX PER DATA FILTRO
     */
    navigateToPage: function(page) {
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        document.getElementById(page + 'Page')?.classList.add('active');

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

        window.KoiApp.currentPage = page;
        
        // Se vai su prenotazioni, inizializza il form E IL FILTRO DATA
        if (page === 'reservations') {
            // Inizializza form nuova prenotazione
            const dateInput = document.querySelector('#newReservationForm [name="data"]');
            if (dateInput) {
                const todayISO = KoiUtils.getTodayISO();
                dateInput.min = todayISO;
                dateInput.value = todayISO;
            }
            
            // IMPORTANTE: Inizializza anche il filtro data con oggi
            const filterDateInput = document.getElementById('filterDate');
            if (filterDateInput) {
                const todayISO = KoiUtils.getTodayISO();
                filterDateInput.value = todayISO;
                console.log('Data filtro impostata:', todayISO);
            }
            
            this.updateTimeOptions();
        }
        
        this.loadPageData(page);
    },

    /**
     * Carica dati specifici per pagina
     */
    loadPageData: function(page) {
        switch(page) {
            case 'reservations':
                this.loadReservations();
                break;
            case 'customers':
                this.loadCustomers();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    },

    // ===== THEME MANAGEMENT =====
    
    /**
     * Toggle tema dark/light
     */
    toggleTheme: function() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', newTheme);
        KoiUtils.saveTheme(newTheme);
        this.updateThemeToggle(newTheme);
    },

    /**
     * Aggiorna icona toggle tema
     */
    updateThemeToggle: function(theme) {
        document.getElementById('themeToggle').textContent = theme === 'light' ? '🌙' : '☀️';
    },

    // ===== TOAST NOTIFICATIONS =====
    
    /**
     * Mostra notifica toast (versione sicura con protezione XSS)
     */
    showToast: function(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) {
            console.warn('KoiUI: Toast container non trovato');
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️'
        };
        
        // Creare elementi DOM invece di innerHTML per sicurezza
        const iconSpan = document.createElement('span');
        iconSpan.textContent = icons[type] || icons.info;
        
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message; // textContent previene XSS
        
        toast.appendChild(iconSpan);
        toast.appendChild(messageSpan);
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // ===== MODAL MANAGEMENT =====
    
    /**
     * Apri modal generico
     */
    openModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`KoiUI: Modal ${modalId} non trovato`);
            return;
        }
        modal.classList.add('active');
    },

    /**
     * Chiudi modal
     */
    closeModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`KoiUI: Modal ${modalId} non trovato`);
            return;
        }
        modal.classList.remove('active');
    },

    // ===== KPI & STATISTICS =====
    
    /**
     * Aggiorna KPI dashboard
     */
    updateKPIs: function() {
        try {
            const stats = KoiUtils.calculateStats(window.KoiApp.data.reservations);
            
            const kpiToday = document.getElementById('kpiToday');
            const kpiWeek = document.getElementById('kpiWeek');
            
            if (kpiToday) kpiToday.textContent = stats.todayCount;
            if (kpiWeek) kpiWeek.textContent = stats.weekCovers;
        } catch (error) {
            console.error('KoiUI: Errore aggiornamento KPI', error);
        }
    },

    /**
     * Aggiorna badge notifiche
     */
    updateNotificationBadge: function() {
        try {
            const today = KoiUtils.getTodayItalian();
            const todayCount = window.KoiApp.data.reservations.filter(r => {
                const resDate = new Date(r.data).toLocaleDateString('it-IT');
                return resDate === today && r.stato === 'Confermata';
            }).length;
            
            const badge = document.getElementById('notificationBadge');
            if (badge) badge.textContent = todayCount;
        } catch (error) {
            console.error('KoiUI: Errore aggiornamento badge', error);
        }
    },

    // ===== RESERVATION CARDS =====

    /**
     * Crea card prenotazione con animazione e stati plurali
     */
    createReservationCard: function(res) {
        const card = document.createElement('div');
        card.className = 'reservation-card animate-in';
        card.setAttribute('data-reservation-id', res.id);
        
        // Rimuove la classe dopo l'animazione
        setTimeout(() => {
            card.classList.remove('animate-in');
        }, 400);
        
        // Escape dei dati utente per sicurezza
        const nome = this.escapeHtml(res.nome);
        const cognome = this.escapeHtml(res.cognome);
        const telefono = this.escapeHtml(res.telefono);
        const orario = this.escapeHtml(res.orario);
        
        // IMPORTANTE: Stati al plurale nelle card
        const statoOriginale = res.stato || 'Confermata';
        const statoSingolare = statoOriginale.toLowerCase();
        const statoPlurale = statoSingolare === 'cancellata' ? 'Cancellate' : 'Confermate';
        
        // Formatta la data per la visualizzazione
        let dataVisualizzata;
        try {
            dataVisualizzata = new Date(res.data).toLocaleDateString('it-IT');
        } catch (e) {
            dataVisualizzata = res.data;
        }
        
        card.innerHTML = `
            <div class="reservation-card-header">
                <div class="reservation-card-name">${nome} ${cognome}</div>
                <div class="reservation-card-time">${orario}</div>
            </div>
            <div class="reservation-card-details">
                <div>📅 ${dataVisualizzata}</div>
                <div>👥 ${res.persone} persone</div>
                <div>📞 <a href="tel:${telefono}" style="color: inherit; text-decoration: none;">${telefono}</a></div>
            </div>
            <div class="reservation-card-actions">
                <button class="btn-icon" onclick="KoiUI.editReservation(${res.id})" aria-label="Modifica prenotazione">✏️</button>
                <button class="btn-icon" onclick="KoiAPI.deleteReservation(${res.id})" aria-label="Elimina prenotazione">🗑️</button>
                <span class="status-badge status-${statoSingolare}">${statoPlurale}</span>
            </div>
        `;
        
        return card;
    },

    /**
     * Aggiorna prenotazioni di oggi con separazione pranzo/cena
     */
    updateRecentReservations: function() {
        const container = document.getElementById('recentReservationsCards');
        if (!container) {
            console.warn('KoiUI: Container prenotazioni di oggi non trovato');
            return;
        }
        
        try {
            container.innerHTML = '';
            
            if (!window.KoiApp?.data?.reservations) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Dati non disponibili</p>';
                return;
            }
            
            // Filtra solo prenotazioni di oggi
            const today = new Date().toLocaleDateString('it-IT');
            const todayReservations = window.KoiApp.data.reservations.filter(r => {
                const resDate = new Date(r.data).toLocaleDateString('it-IT');
                return resDate === today;
            });
            
            // Separa pranzo e cena
            const pranzo = todayReservations.filter(r => {
                const hour = parseInt(r.orario.split(':')[0]);
                return hour < 17;
            }).sort((a, b) => a.orario.localeCompare(b.orario));
            
            const cena = todayReservations.filter(r => {
                const hour = parseInt(r.orario.split(':')[0]);
                return hour >= 17;
            }).sort((a, b) => a.orario.localeCompare(b.orario));
            
            if (todayReservations.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Nessuna prenotazione per oggi</p>';
                return;
            }
            
            // Aggiungi prenotazioni pranzo
            if (pranzo.length > 0) {
                const pranzoHeader = document.createElement('div');
                pranzoHeader.innerHTML = '<div style="background: var(--oro); color: white; padding: 8px 12px; border-radius: 8px; margin-bottom: 12px; font-weight: 600; font-size: 14px;">🍽️ PRANZO (' + pranzo.length + ')</div>';
                container.appendChild(pranzoHeader);
                
                pranzo.forEach(res => {
                    const card = this.createReservationCard(res);
                    container.appendChild(card);
                });
            }
            
            // Aggiungi prenotazioni cena
            if (cena.length > 0) {
                const cenaHeader = document.createElement('div');
                cenaHeader.innerHTML = '<div style="background: var(--oro); color: white; padding: 8px 12px; border-radius: 8px; margin: 16px 0 12px 0; font-weight: 600; font-size: 14px;">🌙 CENA (' + cena.length + ')</div>';
                container.appendChild(cenaHeader);
                
                cena.forEach(res => {
                    const card = this.createReservationCard(res);
                    container.appendChild(card);
                });
            }
            
        } catch (error) {
            console.error('KoiUI: Errore aggiornamento prenotazioni di oggi', error);
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Errore nel caricamento</p>';
        }
    },

    // ===== RESERVATION MANAGEMENT =====
    
    /**
     * Carica tutte le prenotazioni
     */
    loadReservations: function() {
        const container = document.getElementById('allReservationsCards');
        
        if (!container) {
            console.warn('KoiUI: Container prenotazioni non trovato (allReservationsCards)');
            return;
        }
        
        try {
            container.innerHTML = '';
            
            if (!window.KoiApp?.data?.reservations) {
                console.error('KoiUI: Dati prenotazioni non disponibili');
                container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Errore nel caricamento dati</p>';
                return;
            }
            
            const sortedReservations = [...window.KoiApp.data.reservations].sort(KoiUtils.sortByDateTimeDesc);
            
            if (sortedReservations.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Nessuna prenotazione disponibile</p>';
                return;
            }
            
            sortedReservations.forEach(res => {
                const card = this.createReservationCard(res);
                container.appendChild(card);
            });
            
            console.log(`KoiUI: Caricate ${sortedReservations.length} prenotazioni`);
            
        } catch (error) {
            console.error('KoiUI: Errore nel caricamento prenotazioni', error);
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Errore nel caricamento delle prenotazioni</p>';
            this.showToast('Errore nel caricamento delle prenotazioni', 'error');
        }
    },

    /**
     * Filtra prenotazioni
     */
    filterReservations: function() {
        const dateFilter = document.getElementById('filterDate')?.value;
        const statusFilter = document.getElementById('filterStatus')?.value;
        
        if (!window.KoiApp?.data?.reservations) {
            console.error('KoiUI: Dati prenotazioni non disponibili per filtro');
            return;
        }
        
        try {
            const filtered = KoiBusinessLogic.filterReservations(
                window.KoiApp.data.reservations,
                dateFilter,
                statusFilter
            );
            
            filtered.sort(KoiUtils.sortByDateTimeDesc);
            
            const container = document.getElementById('allReservationsCards');
            if (!container) return;
            
            container.innerHTML = '';
            
            if (filtered.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Nessuna prenotazione trovata con i filtri selezionati</p>';
                return;
            }
            
            filtered.forEach(res => {
                const card = this.createReservationCard(res);
                container.appendChild(card);
            });
        } catch (error) {
            console.error('KoiUI: Errore nel filtraggio prenotazioni', error);
            this.showToast('Errore nel filtraggio', 'error');
        }
    },

    /**
     * Apri modal modifica prenotazione
     */
    editReservation: function(id) {
        const res = window.KoiApp.data.reservations.find(r => r.id === id);
        if (!res) {
            this.showToast('Prenotazione non trovata', 'error');
            return;
        }
        
        // Debug: vediamo cosa contiene la prenotazione
        console.log('Modifica prenotazione:', res);
        
        try {
            // Popola il form con i dati esistenti
            document.getElementById('editId').value = res.id;
            document.getElementById('editNome').value = res.nome;
            document.getElementById('editCognome').value = res.cognome;
            document.getElementById('editTelefono').value = res.telefono;
            document.getElementById('editEmail').value = res.email || '';
            document.getElementById('editPersone').value = res.persone;
            document.getElementById('editNote').value = res.note || '';
            document.getElementById('editStato').value = res.stato || 'Confermata';
            
            // Gestisci diversi formati di data con più robustezza
            let isoDate;
            try {
                if (res.data.includes('/')) {
                    // Formato dd/mm/yyyy
                    const parts = res.data.split('/');
                    if (parts.length === 3) {
                        const [day, month, year] = parts;
                        isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    }
                } else if (res.data.includes('T')) {
                    // Formato ISO con timestamp
                    isoDate = res.data.split('T')[0];
                } else if (res.data.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    // Già in formato yyyy-mm-dd
                    isoDate = res.data;
                } else {
                    // Prova a parsare come data
                    const date = new Date(res.data);
                    if (!isNaN(date.getTime())) {
                        isoDate = date.toISOString().split('T')[0];
                    } else {
                        console.error('Formato data non riconosciuto:', res.data);
                        isoDate = KoiUtils.getTodayISO();
                    }
                }
            } catch (e) {
                console.error('Errore nel parsing della data:', e, res.data);
                isoDate = KoiUtils.getTodayISO();
            }
            
            console.log('Data convertita per il form:', isoDate);
            document.getElementById('editData').value = isoDate;
            
            // Popola gli orari disponibili
            this.updateEditTimeOptions(isoDate, res.orario);
            
            // Apri il modal
            this.openModal('editReservationModal');
            
        } catch (error) {
            console.error('KoiUI: Errore apertura modal modifica', error);
            this.showToast('Errore nell\'apertura del form di modifica', 'error');
        }
    },

    // ===== TIME SLOT MANAGEMENT (DRY) =====
    
    /**
     * Funzione helper unificata per generare opzioni orario
     */
    generateTimeOptions: function(selectElement, dateStr, currentTime = null) {
        if (!selectElement) {
            console.warn('KoiUI: Select element non trovato');
            return false;
        }
        
        try {
            const slots = KoiUtils.buildSlotsFromSettings();
            const exc = KoiUtils.getExceptions();
            const blocked = new Set(exc[dateStr] || []);
            
            selectElement.innerHTML = '';
            
            // Check se tutto il giorno è bloccato
            if (blocked.has('TUTTO')) {
                if (currentTime) {
                    selectElement.add(new Option(currentTime + ' (giorno chiuso)', currentTime));
                } else {
                    const opt = new Option('Nessuno slot disponibile', '');
                    opt.disabled = true;
                    opt.selected = true;
                    selectElement.add(opt);
                }
                return false;
            }
            
            // Aggiungi orario corrente se in modalità edit
            if (currentTime) {
                selectElement.add(new Option(currentTime + ' (attuale)', currentTime));
            } else {
                selectElement.add(new Option('Seleziona orario', ''));
            }
            
            // Genera le opzioni con optgroup
            let lastWasLunch = false;
            let lastWasDinner = false;
            let addedCount = 0;
            
            slots.forEach(hhmm => {
                if (!blocked.has(hhmm) && hhmm !== currentTime) {
                    const hour = parseInt(hhmm.split(':')[0]);
                    
                    // Aggiungi optgroup per pranzo
                    if (hour < 17 && !lastWasLunch) {
                        const optGroup = document.createElement('optgroup');
                        optGroup.label = '--- PRANZO ---';
                        selectElement.add(optGroup);
                        lastWasLunch = true;
                    }
                    
                    // Aggiungi optgroup per cena
                    if (hour >= 17 && !lastWasDinner) {
                        const optGroup = document.createElement('optgroup');
                        optGroup.label = '--- CENA ---';
                        selectElement.add(optGroup);
                        lastWasDinner = true;
                    }
                    
                    selectElement.add(new Option(hhmm, hhmm));
                    addedCount++;
                }
            });
            
            // Se non ci sono slot disponibili
            if (!currentTime && addedCount === 0) {
                selectElement.innerHTML = '';
                const opt = new Option('Nessuno slot disponibile', '');
                opt.disabled = true;
                opt.selected = true;
                selectElement.add(opt);
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.error('KoiUI: Errore generazione opzioni orario', error);
            return false;
        }
    },

    /**
     * Aggiorna opzioni orario per form nella pagina prenotazioni
     */
    updateTimeOptions: function() {
        const dateInput = document.querySelector('#newReservationForm [name="data"]');
        const timeSelect = document.getElementById('timeSelect');
        
        if (!dateInput || !timeSelect || !dateInput.value) {
            console.warn('KoiUI: Impossibile aggiornare opzioni orario - elementi mancanti');
            return;
        }
        
        const dateStr = KoiUtils.formatDateForAPI(dateInput.value);
        this.generateTimeOptions(timeSelect, dateStr);
    },

    /**
     * Aggiorna opzioni orario per modifica prenotazione
     */
    updateEditTimeOptions: function(dateISO, currentTime) {
        const timeSelect = document.getElementById('editOrario');
        
        if (!timeSelect) {
            console.warn('KoiUI: Select orario modifica non trovato');
            return;
        }
        
        const dateStr = KoiUtils.formatDateForAPI(dateISO);
        this.generateTimeOptions(timeSelect, dateStr, currentTime);
    },

    // ===== CUSTOMER MANAGEMENT =====
    
    /**
     * Carica lista clienti
     */
    loadCustomers: function() {
        try {
            if (!window.KoiApp?.data?.reservations) {
                console.error('KoiUI: Dati prenotazioni non disponibili per calcolo clienti');
                this.showToast('Errore nel caricamento clienti', 'error');
                return;
            }
            
            // Usa la business logic separata
            window.KoiApp.data.customers = KoiBusinessLogic.calculateCustomerStats(window.KoiApp.data.reservations);
            
            this.updateCustomersDisplay();
            
            console.log(`KoiUI: Caricati ${window.KoiApp.data.customers.length} clienti`);
            
        } catch (error) {
            console.error('KoiUI: Errore nel caricamento clienti', error);
            this.showToast('Errore nel caricamento dei clienti', 'error');
        }
    },

    /**
     * Aggiorna visualizzazione clienti
     */
    updateCustomersDisplay: function() {
        const container = document.getElementById('clientsCards');
        if (!container) {
            console.warn('KoiUI: Container clienti non trovato');
            return;
        }
        
        try {
            container.innerHTML = '';
            
            if (!window.KoiApp?.data?.customers || window.KoiApp.data.customers.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Nessun cliente trovato</p>';
                return;
            }
            
            window.KoiApp.data.customers.forEach(client => {
                const card = document.createElement('div');
                card.className = 'client-card';
                
                // Escape dei dati per sicurezza
                const nome = this.escapeHtml(client.nome);
                const cognome = this.escapeHtml(client.cognome);
                const telefono = this.escapeHtml(client.telefono);
                const email = this.escapeHtml(client.email);
                
                card.innerHTML = `
                    <div class="client-name">${nome} ${cognome}</div>
                    <div class="client-info">📞 ${telefono}</div>
                    <div class="client-info">✉️ ${email || 'N/D'}</div>
                    <div class="client-info">Visite: ${client.visite} | Ultima: ${client.ultimaVisita}</div>
                    <div class="client-tags">
                        ${client.visite > 5 ? '<span class="tag vip">VIP</span>' : ''}
                    </div>
                `;
                container.appendChild(card);
            });
        } catch (error) {
            console.error('KoiUI: Errore visualizzazione clienti', error);
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Errore nel caricamento</p>';
        }
    },

    /**
     * Cerca clienti
     */
    searchClients: function(e) {
        const query = e.target.value.toLowerCase();
        
        if (!window.KoiApp?.data?.customers) {
            console.warn('KoiUI: Nessun cliente da cercare');
            return;
        }
        
        try {
            const filtered = window.KoiApp.data.customers.filter(c => 
                c.nome.toLowerCase().includes(query) ||
                c.cognome.toLowerCase().includes(query) ||
                c.telefono.includes(query)
            );
            
            const container = document.getElementById('clientsCards');
            if (!container) return;
            
            container.innerHTML = '';
            
            if (filtered.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Nessun cliente trovato</p>';
                return;
            }
            
            filtered.forEach(client => {
                const card = document.createElement('div');
                card.className = 'client-card';
                
                const nome = this.escapeHtml(client.nome);
                const cognome = this.escapeHtml(client.cognome);
                const telefono = this.escapeHtml(client.telefono);
                
                card.innerHTML = `
                    <div class="client-name">${nome} ${cognome}</div>
                    <div class="client-info">📞 ${telefono}</div>
                    <div class="client-info">Visite: ${client.visite}</div>
                `;
                container.appendChild(card);
            });
        } catch (error) {
            console.error('KoiUI: Errore ricerca clienti', error);
        }
    },

    // ===== SETTINGS MANAGEMENT =====
    
    /**
     * Carica impostazioni
     */
    loadSettings: function() {
        this.populateAllTimeSelects();
        this.renderBlockedList();
    },

    /**
     * Popola tutti i select degli orari
     */
    populateAllTimeSelects: function() {
        try {
            const settings = KoiUtils.loadSettings();

            const lunchStartTime = settings.lunchStart || '12:00';
            const lunchEndTime = settings.lunchEnd || '15:00';
            const dinnerStartTime = settings.dinnerStart || '19:00';
            const dinnerEndTime = settings.dinnerEnd || '23:00';

            const extendedLunchSlots = KoiUtils.toSlots('11:00', '16:00');
            const extendedDinnerSlots = KoiUtils.toSlots('18:00', '23:30');

            const fillSelect = (selectId, slots, defaultValue) => {
                const select = document.getElementById(selectId);
                if (!select) {
                    console.warn(`KoiUI: Select ${selectId} non trovato`);
                    return;
                }

                select.innerHTML = '';
                slots.forEach(slot => {
                    const opt = new Option(slot, slot);
                    if (slot === defaultValue) opt.selected = true;
                    select.add(opt);
                });
            };

            fillSelect('lunchStart', extendedLunchSlots, lunchStartTime);
            fillSelect('lunchEnd', extendedLunchSlots, lunchEndTime);
            fillSelect('dinnerStart', extendedDinnerSlots, dinnerStartTime);
            fillSelect('dinnerEnd', extendedDinnerSlots, dinnerEndTime);

            const actualLunchSlots = KoiUtils.toSlots(lunchStartTime, lunchEndTime);
            const actualDinnerSlots = KoiUtils.toSlots(dinnerStartTime, dinnerEndTime);

            // Popola select per blocchi orari
            const blockFrom = document.getElementById('blockFrom');
            const blockTo = document.getElementById('blockTo');

            if (blockFrom) {
                blockFrom.innerHTML = '<option value="">Da orario</option>';
                if (actualLunchSlots.length > 0) {
                    const optGroupLunch = document.createElement('optgroup');
                    optGroupLunch.label = 'PRANZO';
                    actualLunchSlots.forEach(slot => {
                        const opt = new Option(slot, slot);
                        optGroupLunch.appendChild(opt);
                    });
                    blockFrom.appendChild(optGroupLunch);
                }
                if (actualDinnerSlots.length > 0) {
                    const optGroupDinner = document.createElement('optgroup');
                    optGroupDinner.label = 'CENA';
                    actualDinnerSlots.forEach(slot => {
                        const opt = new Option(slot, slot);
                        optGroupDinner.appendChild(opt);
                    });
                    blockFrom.appendChild(optGroupDinner);
                }
            }

            if (blockTo) {
                blockTo.innerHTML = '<option value="">A orario</option>';
                if (actualLunchSlots.length > 0) {
                    const optGroupLunch = document.createElement('optgroup');
                    optGroupLunch.label = 'PRANZO';
                    actualLunchSlots.forEach(slot => {
                        const opt = new Option(slot, slot);
                        optGroupLunch.appendChild(opt);
                    });
                    blockTo.appendChild(optGroupLunch);
                }
                if (actualDinnerSlots.length > 0) {
                    const optGroupDinner = document.createElement('optgroup');
                    optGroupDinner.label = 'CENA';
                    actualDinnerSlots.forEach(slot => {
                        const opt = new Option(slot, slot);
                        optGroupDinner.appendChild(opt);
                    });
                    blockTo.appendChild(optGroupDinner);
                }
            }
        } catch (error) {
            console.error('KoiUI: Errore popolamento select orari', error);
        }
    },

    /**
     * Renderizza lista blocchi orari
     */
    renderBlockedList: function() {
        const container = document.getElementById('blockedList');
        if (!container) {
            console.warn('KoiUI: Container blocchi non trovato');
            return;
        }
        
        try {
            const exc = KoiUtils.getExceptions();
            const keys = Object.keys(exc).sort((a, b) => KoiUtils.parseItalianDate(b) - KoiUtils.parseItalianDate(a));

            if (!keys.length) {
                container.innerHTML = '<div style="color:var(--text-secondary);font-size:14px;">Nessun blocco attivo</div>';
                return;
            }

            container.innerHTML = '';
            keys.forEach(dateStr => {
                const arr = exc[dateStr];
                let label = '';
                
                if (arr.includes('TUTTO')) {
                    label = '🚫 Chiuso tutto il giorno';
                } else {
                    const sorted = arr.slice().sort();
                    const ranges = [];
                    let start = sorted[0], prev = sorted[0];
                    
                    for (let i = 1; i < sorted.length; i++) {
                        const cur = sorted[i];
                        if (KoiUtils.add30Minutes(prev) === cur) {
                            prev = cur;
                        } else {
                            ranges.push([start, KoiUtils.add30Minutes(prev)]);
                            start = cur;
                            prev = cur;
                        }
                    }
                    ranges.push([start, KoiUtils.add30Minutes(prev)]);
                    label = '⏰ ' + ranges.map(([s, e]) => `${s}-${e}`).join(', ');
                }

                const div = document.createElement('div');
                div.className = 'reservation-card';
                
                // Escape della data per sicurezza
                const safeDate = this.escapeHtml(dateStr);
                
                div.innerHTML = `
                    <div class="reservation-card-header">
                        <div class="reservation-card-name">📅 ${safeDate}</div>
                        <button class="btn-icon" aria-label="Rimuovi blocco" onclick="KoiUI.removeExceptionDate('${safeDate}')">🗑️</button>
                    </div>
                    <div class="reservation-card-details">${label}</div>
                `;
                container.appendChild(div);
            });
        } catch (error) {
            console.error('KoiUI: Errore renderizzazione blocchi', error);
            container.innerHTML = '<div style="color:var(--text-secondary);font-size:14px;">Errore nel caricamento blocchi</div>';
        }
    },

    /**
     * Rimuovi eccezione data
     */
    removeExceptionDate: function(dateStr) {
        if (!confirm(`Rimuovere il blocco per ${dateStr}?`)) return;
        
        try {
            const ex = KoiUtils.getExceptions();
            delete ex[dateStr];
            KoiUtils.saveExceptions(ex);
            this.renderBlockedList();
            this.showToast(`Blocco rimosso per ${dateStr}`, 'success');
        } catch (error) {
            console.error('KoiUI: Errore rimozione blocco', error);
            this.showToast('Errore nella rimozione del blocco', 'error');
        }
    },

    /**
     * Funzione di debug per controllare i dati di una prenotazione
     */
    debugReservation: function(id) {
        const res = window.KoiApp.data.reservations.find(r => r.id === id);
        if (res) {
            console.log('Dati prenotazione completi:', {
                id: res.id,
                nome: res.nome,
                cognome: res.cognome,
                data: res.data,
                dataType: typeof res.data,
                orario: res.orario,
                telefono: res.telefono,
                email: res.email,
                persone: res.persone,
                note: res.note,
                stato: res.stato
            });
        } else {
            console.log('Prenotazione non trovata con ID:', id);
        }
    }
};

// ===== EVENT LISTENERS GLOBALI =====
// Gestione click su modal (solo per edit)
document.addEventListener('click', function(e) {
    // Gestione chiusura modal
    if (e.target.classList.contains('modal-close')) {
        const modalId = e.target.getAttribute('data-modal');
        if (modalId) {
            KoiUI.closeModal(modalId);
        }
    }
});

// Esporta per uso globale
window.KoiUI = KoiUI;
window.KoiBusinessLogic = KoiBusinessLogic;