// ====================================
// KOI DASHBOARD - CHARTS MANAGEMENT
// File: js/charts.js
// Version: 2.0 - Mobile Optimized
// ====================================

const KoiCharts = {
    
    // Stato inizializzazione
    initialized: false,
    monthlyInitialized: false,
    
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
     * Inizializza i grafici - versione ottimizzata mobile
     */
    initializeCharts: function() {
        console.log('📊 Inizializzazione grafici...');
        
        if (this.initialized) {
            console.log('Grafici già inizializzati');
            return;
        }
        
        // Verifica Chart.js
        if (typeof Chart === 'undefined') {
            console.log('⏳ Chart.js non ancora caricato...');
            setTimeout(() => this.initializeCharts(), 300);
            return;
        }
        
        // Verifica dati
        if (!window.KoiApp?.data?.reservations) {
            console.log('⏳ Dati non ancora disponibili...');
            setTimeout(() => this.initializeCharts(), 500);
            return;
        }
        
        this.initialized = true;
        
        // Inizializza SOLO il grafico settimanale (primo visibile)
        this.initTrendChart();
        
        // Setup listener per carousel slides
        this.setupCarouselListener();
        
        console.log('✅ Sistema grafici pronto!');
    },

    /**
     * Setup listener per il carousel
     */
    setupCarouselListener: function() {
        // Listener per swipe/touch events
        const carousel = document.querySelector('.charts-carousel');
        if (!carousel) return;
        
        let touchStartX = 0;
        let touchEndX = 0;
        
        carousel.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });
        
        carousel.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        });
        
        // Gestione swipe
        this.handleSwipe = () => {
            const swipeThreshold = 50;
            const diff = touchStartX - touchEndX;
            
            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    // Swipe left - mostra grafico mensile
                    this.showMonthlyChart();
                } else {
                    // Swipe right - mostra grafico settimanale  
                    this.showWeeklyChart();
                }
            }
        };
        
        // Listener per click su indicatori (se presenti)
        document.addEventListener('click', (e) => {
            if (e.target.closest('.chart-indicator')) {
                const indicator = e.target.closest('.chart-indicator');
                const text = indicator.textContent;
                if (text.includes('2/2')) {
                    this.showMonthlyChart();
                } else {
                    this.showWeeklyChart();
                }
            }
        });
    },

    /**
     * Mostra grafico settimanale
     */
    showWeeklyChart: function() {
        const slides = document.querySelectorAll('.chart-slide');
        if (slides.length >= 2) {
            slides[0].classList.add('active');
            slides[1].classList.remove('active');
        }
    },

    /**
     * Mostra grafico mensile e inizializza se necessario
     */
    showMonthlyChart: function() {
        const slides = document.querySelectorAll('.chart-slide');
        if (slides.length >= 2) {
            slides[0].classList.remove('active');
            slides[1].classList.add('active');
            
            // Inizializza grafico mensile al primo accesso
            if (!this.monthlyInitialized) {
                console.log('📊 Inizializzo grafico mensile...');
                setTimeout(() => {
                    this.initMonthlyChart();
                    this.monthlyInitialized = true;
                }, 100);
            }
        }
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

        // Distruggi grafico esistente
        if (this.instances.trend) {
            this.instances.trend.destroy();
        }

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
                    duration: 750
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
        
        console.log('✅ Grafico settimanale inizializzato');
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
        const reservations = window.KoiApp?.data?.reservations || [];
        
        reservations.forEach(res => {
            if (!res.stato || res.stato.toLowerCase() !== 'confermata') {
                return;
            }
            
            const d = new Date(res.data);
            if (isNaN(d.getTime())) return;
            
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
        
        // Crea nuovo chart
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
                    duration: 750
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
        
        console.log('✅ Grafico mensile inizializzato');
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
     * Ottieni dati per trend settimanale
     */
    getTrendData: function() {
        const data = [];
        const reservations = window.KoiApp?.data?.reservations || [];
        
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
                
                const resDate = new Date(r.data);
                if (isNaN(resDate.getTime())) return false;
                
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
        if (!this.initialized) {
            console.log('Grafici non ancora pronti');
            return;
        }
        
        console.log('📊 Aggiornamento grafici...');
        
        // Aggiorna grafico settimanale
        if (this.instances.trend && document.getElementById('trendChart')) {
            this.instances.trend.data.labels = this.getWeekDaysFromMonday();
            this.instances.trend.data.datasets[0].data = this.getTrendData();
            this.instances.trend.update('active');
        }
        
        // Aggiorna grafico mensile solo se inizializzato
        if (this.monthlyInitialized && document.getElementById('monthlyChart')) {
            this.initMonthlyChart();
        }
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
        this.monthlyInitialized = false;
    },

    /**
     * Aggiorna tema grafici (dark/light mode)
     */
    updateChartsTheme: function(isDarkMode) {
        const textColor = isDarkMode ? '#ffffff' : '#6c757d';
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
        
        this.colors.text = textColor;
        this.colors.grid = gridColor;
        
        if (!this.initialized) return;
        
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

// Auto-init quando DOM è pronto
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        KoiCharts.initializeCharts();
    }, 1000);
});

// Gestione evento koiDataLoaded
window.addEventListener('koiDataLoaded', () => {
    if (window.KoiCharts) {
        setTimeout(() => {
            if (!KoiCharts.initialized) {
                KoiCharts.initializeCharts();
            } else {
                KoiCharts.updateCharts();
            }
        }, 500);
    }
});

// Funzione globale per aggiornamento grafici (retrocompatibilità)
window.updateCharts = function(reservations) {
    if (window.KoiCharts) {
        window.KoiCharts.updateCharts();
    }
};
