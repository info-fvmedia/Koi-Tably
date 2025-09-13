// ====================================
// KOI DASHBOARD - CHARTS MANAGEMENT
// File: js/charts.js
// ====================================

const KoiCharts = {
    
    // Stato inizializzazione
    initialized: false,
    chartsReady: false,
    
    // Oggetto per memorizzare istanze dei grafici
    instances: {},
    
    // Configurazione colori tema
    colors: {
        primary: '#C1A875',
        primaryLight: 'rgba(193, 168, 117, 0.1)',
        secondary: '#888888',
        secondaryLight: 'rgba(136, 136, 136, 0.1)',
        success: '#28a745',
        danger: '#dc3545',
        text: '#6c757d',
        grid: 'rgba(0, 0, 0, 0.05)'
    },

    /**
     * Verifica se Chart.js è caricato
     */
    isChartJsLoaded: function() {
        return typeof Chart !== 'undefined';
    },

    /**
     * Inizializza i grafici con controllo lazy loading
     */
    initializeCharts: function() {
        console.log('📊 Inizializzazione grafici richiesta...');
        
        // Se già inizializzati, esci
        if (this.initialized) {
            console.log('Grafici già inizializzati');
            return;
        }
        
        // Verifica che Chart.js sia caricato
        if (!this.isChartJsLoaded()) {
            console.log('⏳ Chart.js non ancora caricato, attendo...');
            
            // Riprova tra 500ms
            setTimeout(() => {
                this.initializeCharts();
            }, 500);
            return;
        }
        
        // Verifica che ci siano dati
        if (!window.KoiApp || !window.KoiApp.data || !window.KoiApp.data.reservations) {
            console.log('⏳ Dati non ancora disponibili per i grafici');
            
            // Riprova tra 1 secondo
            setTimeout(() => {
                this.initializeCharts();
            }, 1000);
            return;
        }
        
        console.log('✅ Chart.js caricato, inizializzo grafici...');
        
        // Marca come inizializzato
        this.initialized = true;
        
        // Inizializza i grafici effettivi
        this.setupCharts();
    },

    /**
     * Setup effettivo dei grafici
     */
    setupCharts: function() {
        // Attendi che il DOM sia pronto
        const setupWhenReady = () => {
            const trendCanvas = document.getElementById('trendChart');
            const monthlyCanvas = document.getElementById('monthlyChart');
            
            if (!trendCanvas || !monthlyCanvas) {
                console.log('Canvas non ancora nel DOM, attendo...');
                setTimeout(setupWhenReady, 100);
                return;
            }
            
            console.log('🎨 Creo i grafici...');
            
            // Rimuovi skeleton se presenti
            const chartsContainer = document.getElementById('chartsContainer');
            if (chartsContainer && chartsContainer.querySelector('.skeleton')) {
                chartsContainer.innerHTML = `
                    <div class="charts-carousel">
                        <div class="chart-slide active">
                            <div class="chart-card">
                                <div class="chart-header">
                                    <h3 class="chart-title">Trend Settimanale</h3>
                                    <span class="chart-indicator">1/2</span>
                                </div>
                                <canvas id="trendChart"></canvas>
                            </div>
                        </div>
                        <div class="chart-slide">
                            <div class="chart-card">
                                <div class="chart-header">
                                    <h3 class="chart-title">Trend Mensile</h3>
                                    <span class="chart-indicator">2/2</span>
                                </div>
                                <canvas id="monthlyChart"></canvas>
                            </div>
                        </div>
                    </div>
                `;
                
                // Reinizializza carousel se necessario
                if (typeof initChartsCarousel === 'function') {
                    setTimeout(initChartsCarousel, 100);
                }
            }
            
            // Inizializza grafici
            setTimeout(() => {
                this.initTrendChart();
                this.initMonthlyChart();
                this.chartsReady = true;
                console.log('✅ Grafici pronti!');
            }, 100);
        };
        
        setupWhenReady();
    },

    /**
     * Ottieni giorni della settimana da lunedì
     */
    getWeekDaysFromMonday: function() {
        const days = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
        const today = new Date();
        const dayOfWeek = today.getDay();
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(today);
        monday.setDate(today.getDate() - daysFromMonday);
        
        const labels = [];
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(monday);
            currentDate.setDate(monday.getDate() + i);
            const dayName = days[i];
            const dayNum = currentDate.getDate();
            labels.push(`${dayName} ${dayNum}`);
        }
        
        return labels;
    },

    /**
     * Inizializza grafico trend settimanale
     */
    initTrendChart: function() {
        const ctx = document.getElementById('trendChart');
        if (!ctx) {
            console.warn('Canvas trendChart non trovato');
            return;
        }

        // Distruggi grafico esistente se presente
        if (this.instances.trend) {
            this.instances.trend.destroy();
        }

        // Configurazione ottimizzata per performance
        this.instances.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.getWeekDaysFromMonday(),
                datasets: [{
                    label: 'Prenotazioni',
                    data: this.getTrendData(),
                    borderColor: this.colors.primary,
                    backgroundColor: this.colors.primaryLight,
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: this.colors.primary,
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 750 // Animazione più veloce
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: this.colors.primary,
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return `Prenotazioni: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: this.colors.text,
                            font: {
                                size: 12
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: this.colors.grid,
                            borderDash: [5, 5]
                        },
                        ticks: {
                            color: this.colors.text,
                            font: {
                                size: 12
                            },
                            stepSize: 1,
                            callback: function(value) {
                                if (Math.floor(value) === value) {
                                    return value;
                                }
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * Inizializza grafico trend mensile
     */
    initMonthlyChart: function() {
        const ctx = document.getElementById('monthlyChart');
        if (!ctx) {
            console.warn('Canvas monthlyChart non trovato');
            return;
        }
        
        // Calcola dati per mese corrente e precedente
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Mese corrente
        const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const currentMonthData = new Array(daysInCurrentMonth).fill(0);
        
        // Mese precedente
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
        const prevMonthData = new Array(daysInPrevMonth).fill(0);
        
        // Nomi dei mesi in italiano
        const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                           'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
        
        // Conta prenotazioni per ogni giorno
        const reservations = (window.KoiApp && window.KoiApp.data && window.KoiApp.data.reservations) || [];
        
        reservations.forEach(res => {
            if (!res.stato || res.stato.toLowerCase() !== 'confermata') {
                return;
            }
            
            const d = new Date(res.data);
            const resDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            
            if (resDate.getMonth() === currentMonth && resDate.getFullYear() === currentYear) {
                const dayIndex = resDate.getDate() - 1;
                if (dayIndex >= 0 && dayIndex < currentMonthData.length) {
                    currentMonthData[dayIndex]++;
                }
            } else if (resDate.getMonth() === prevMonth && resDate.getFullYear() === prevYear) {
                const dayIndex = resDate.getDate() - 1;
                if (dayIndex >= 0 && dayIndex < prevMonthData.length) {
                    prevMonthData[dayIndex]++;
                }
            }
        });
        
        // Labels per l'asse X
        const maxDays = Math.max(daysInCurrentMonth, daysInPrevMonth);
        const labels = Array.from({ length: maxDays }, (_, i) => (i + 1).toString());
        
        // Pad arrays se necessario
        while (currentMonthData.length < maxDays) currentMonthData.push(0);
        while (prevMonthData.length < maxDays) prevMonthData.push(0);
        
        const currentMonthName = monthNames[currentMonth];
        const prevMonthName = monthNames[prevMonth];
        
        // Distruggi chart esistente se presente
        if (this.instances.monthly) {
            this.instances.monthly.destroy();
        }
        
        // Crea nuovo chart con performance ottimizzata
        this.instances.monthly = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: currentMonthName,
                        data: currentMonthData,
                        borderColor: this.colors.primary,
                        backgroundColor: this.colors.primaryLight,
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: this.colors.primary,
                        pointBorderWidth: 2
                    },
                    {
                        label: prevMonthName,
                        data: prevMonthData,
                        borderColor: this.colors.secondary,
                        backgroundColor: this.colors.secondaryLight,
                        borderWidth: 1,
                        borderDash: [5, 5],
                        tension: 0.3,
                        fill: false,
                        pointRadius: 2,
                        pointHoverRadius: 4,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: this.colors.secondary,
                        pointBorderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 750 // Animazione più veloce
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 8,
                            font: {
                                size: 11
                            },
                            color: this.colors.text
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: this.colors.primary,
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            title: function(context) {
                                return `${context[0].label} ${context[0].dataset.label}`;
                            },
                            label: function(context) {
                                return `Prenotazioni: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: {
                                size: 10
                            },
                            color: this.colors.text,
                            callback: function(value) {
                                if (Math.floor(value) === value) {
                                    return value;
                                }
                            }
                        },
                        grid: {
                            display: true,
                            color: this.colors.grid,
                            borderDash: [5, 5]
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 15,
                            font: {
                                size: 10
                            },
                            color: this.colors.text
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    },

    /**
     * Ottieni dati per trend settimanale
     */
    getTrendData: function() {
        const data = [];
        const reservations = window.KoiApp.data.reservations || [];
        
        const today = new Date();
        const dayOfWeek = today.getDay();
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(today);
        monday.setDate(today.getDate() - daysFromMonday);
        
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(monday);
            currentDate.setDate(monday.getDate() + i);
            
            const count = reservations.filter(r => {
    if (!r.stato || r.stato.toLowerCase() !== 'confermata') return false;
    
    // Gestisce sia formato ISO che DD/MM/YYYY
    let resDate;
    if (r.data.includes('T')) {
        // Formato ISO
        resDate = new Date(r.data);
    } else if (r.data.includes('/')) {
        // Formato DD/MM/YYYY
        const [d, m, y] = r.data.split('/');
        resDate = new Date(y, m - 1, d);
    } else {
        resDate = new Date(r.data);
    }
    
    if (isNaN(resDate.getTime())) return false;
    
    // Confronta solo giorno/mese/anno ignorando l'orario
    return resDate.getDate() === currentDate.getDate() &&
           resDate.getMonth() === currentDate.getMonth() &&
           resDate.getFullYear() === currentDate.getFullYear();
}).length;
            
            data.push(count);
        }
        
        return data;
    },

    /**
     * Aggiorna tutti i grafici
     */
    updateCharts: function() {
        // Se non sono ancora inizializzati, esci
        if (!this.chartsReady) {
            console.log('Grafici non ancora pronti per aggiornamento');
            return;
        }
        
        console.log('Aggiornamento grafici...');
        
        // Aggiorna grafico settimanale
        if (this.instances.trend) {
            this.instances.trend.data.labels = this.getWeekDaysFromMonday();
            this.instances.trend.data.datasets[0].data = this.getTrendData();
            this.instances.trend.update('active');
        }
        
        // Re-inizializza grafico mensile
        this.initMonthlyChart();
    },

    /**
     * Distruggi tutti i grafici (cleanup)
     */
    destroyAllCharts: function() {
        Object.keys(this.instances).forEach(key => {
            if (this.instances[key]) {
                this.instances[key].destroy();
                delete this.instances[key];
            }
        });
        
        this.initialized = false;
        this.chartsReady = false;
    },

    /**
     * Aggiorna tema grafici (dark/light mode)
     */
    updateChartsTheme: function(isDarkMode) {
        const textColor = isDarkMode ? '#ffffff' : '#6c757d';
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
        
        this.colors.text = textColor;
        this.colors.grid = gridColor;
        
        // Aggiorna solo se i grafici sono pronti
        if (!this.chartsReady) return;
        
        Object.values(this.instances).forEach(chart => {
            if (chart.options.scales) {
                if (chart.options.scales.x) {
                    chart.options.scales.x.ticks.color = textColor;
                    chart.options.scales.x.grid.color = gridColor;
                }
                if (chart.options.scales.y) {
                    chart.options.scales.y.ticks.color = textColor;
                    chart.options.scales.y.grid.color = gridColor;
                }
            }
            
            if (chart.options.plugins && chart.options.plugins.legend) {
                chart.options.plugins.legend.labels.color = textColor;
            }
            
            chart.update();
        });
    }
};

// Esporta per uso globale
window.KoiCharts = KoiCharts;