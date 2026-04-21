// Global variables as specified
window.APPID = '7ede2ad0a74412e15d2bfb4e9e416469'
window.APIURL = 'https://api.openweathermap.org/data/2.5'
window.ICONURL = 'https://openweathermap.org/img/wn'

// State management
let currentCity = '';
let currentWeatherData = null;
let forecastData = null;
let selectedDayIndex = 0;

// Initialize the app when window loads
window.onload = () => {
    // Initialize tabs
    initializeTabs();
    
    // Get user's geolocation
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            console.log(position)
            let lat = position.coords.latitude
            let lon = position.coords.longitude
            let url = `${APIURL}/weather?lat=${lat}&lon=${lon}&appid=${APPID}&units=metric`
            loadApiData(url)
        }, (error) => {
            console.error('Geolocation error:', error);
            // Default to a city if geolocation fails
            loadApiData(`${APIURL}/weather?q=Baku&appid=${APPID}&units=metric`);
        })
    } else {
        // Browser doesn't support geolocation
        loadApiData(`${APIURL}/weather?q=Baku&appid=${APPID}&units=metric`);
    }
    
    // Add search button and enter key event listeners
    const searchBox = document.querySelector('#searchBox');
    const executeSearch = () => {
        if (searchBox.value.trim()) {
            loadApiData(`${APIURL}/weather?q=${searchBox.value}&appid=${APPID}&units=metric`);
        }
    };
    
    document.querySelector('#searchButton').addEventListener('click', executeSearch);
    searchBox.addEventListener('keypress', (e) => e.key === 'Enter' && executeSearch());
}

// Initialize tabs functionality
function initializeTabs() {
    const tabs = document.querySelectorAll('.tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab');
            
            // Only activate content if error page is not shown
            const errorPage = document.querySelector('#errorPage');
            if (errorPage && errorPage.style.display !== 'flex') {
                document.getElementById(tabId).classList.add('active');
                
                // Load forecast data if switching to forecast tab
                if (tabId === 'forecast' && currentCity) {
                    loadForecastData(currentCity);
                }
            }
        });
    });
}

// Load API data for current weather
function loadApiData(url) {
    fetch(url).then(res => {
        if (!res.ok) {
            if (res.status === 404) {
                showError("City not found. Please check your spelling and try again.");
                throw new Error('404 Not Found');
            }
            throw new Error(`Error: ${res.status}`);
        }
        return res.json();
    }).then(data => {
        if (!data) return;
        if (!data.weather) {
            showError("LOCATION NOT FOUND!");
            return;
        }
        
        hideError();
        
        // Store current weather data
        currentWeatherData = data;
        currentCity = data.name;
        document.querySelector('#searchBox').value = `${data.name}, ${data.sys.country}`;
        
        // Update current weather display
        updateCurrentWeather(data);
        
        // Load hourly forecast
        loadHourlyForecast(currentCity);
        
        // Load nearby places
        loadNearbyPlaces(data.coord.lat, data.coord.lon, data.name);
        
        // Load 5-day forecast data (for when user switches to forecast tab)
        loadForecastData(currentCity);
    }).catch(error => {
        console.error(error);
        if (error.message !== '404 Not Found') {
            document.querySelector('#errorMessage').style.display = 'flex';
            document.querySelector('#errorMessage').innerHTML = `<i class="fas fa-exclamation-triangle"></i><div>${error.message || 'An unexpected error occurred'}</div>`;
        }
    });
}

function showError(message) {
    document.querySelector('#errorPage').style.display = 'flex';
    document.querySelector('#errorMessage').style.display = 'none';
    document.querySelector('.tabs').style.display = 'flex';
    document.querySelectorAll('.content').forEach(c => {
        if (c.id !== 'errorPage') c.classList.remove('active');
    });
    
    const errorMsgElem = document.querySelector('#errorPage .error-msg');
    if(errorMsgElem) errorMsgElem.textContent = message;
}

function hideError() {
    const errorPage = document.querySelector('#errorPage');
    if (errorPage) errorPage.style.display = 'none';
    
    const errorMessage = document.querySelector('#errorMessage');
    if (errorMessage) {
        errorMessage.style.display = 'none';
        errorMessage.innerHTML = '';
    }
    
    document.querySelector('.tabs').style.display = 'flex';
    
    const activeTab = document.querySelector('.tab.active');
    if (activeTab) {
        const tabId = activeTab.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
    } else {
        document.getElementById('today').classList.add('active');
        document.querySelector('.tab[data-tab="today"]').classList.add('active');
    }
}

// Update current weather display
function updateCurrentWeather(data) {
    let icon = data.weather[0].icon;
    console.log('data', data, 'icon', icon);
    
    // Set current date and time relative to city timezone
    const cityTimeMs = Date.now() + (data.timezone * 1000);
    const timeOpts = { timeZone: 'UTC', hour: 'numeric', minute: '2-digit', hour12: true };
    document.getElementById('currentDate').textContent = new Date(cityTimeMs).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if(document.getElementById('currentTime')) document.getElementById('currentTime').textContent = new Date(cityTimeMs).toLocaleTimeString('en-US', timeOpts);
    
    // Update weather info
    document.querySelector('#weatherIcon').src = `${ICONURL}/${icon}@4x.png`;
    document.querySelector('#temperature').innerHTML = `${Math.round(data.main.temp)}&#176;`;
    document.querySelector('#weatherDescription').textContent = data.weather[0].description;
    document.querySelector('#feelsLike').textContent = `Feels like: ${Math.round(data.main.feels_like)}`;
    
    // Update sunrise and sunset time
    document.querySelector('#sunRise').textContent = new Date((data.sys.sunrise + data.timezone) * 1000).toLocaleTimeString('en-US', timeOpts);
    document.querySelector('#sunSet').textContent = new Date((data.sys.sunset + data.timezone) * 1000).toLocaleTimeString('en-US', timeOpts);
    
    // Update day length
    let durationMs = (data.sys.sunset - data.sys.sunrise) * 1000;
    let durationHours = Math.floor(durationMs / 3600000);
    let durationMinutes = Math.floor((durationMs % 3600000) / 60000);
    document.querySelector('#duration').textContent = `${durationHours}:${durationMinutes.toString().padStart(2, '0')}`;
}

// Load hourly forecast for today
function loadHourlyForecast(cityName) {
    const url = `${APIURL}/forecast?q=${cityName}&appid=${APPID}&units=metric`;
    
    fetch(url).catch(error => {
        console.error('Error fetching hourly forecast:', error);
        document.getElementById('hourlyForecast').innerHTML = '<p>Unable to load hourly forecast</p>';
    }).then(res => {
        if (!res.ok) {
            throw new Error('Hourly forecast data not found');
        }
        return res.json();
    }).then(data => {
        if (!data.list) {
            document.getElementById('hourlyForecast').innerHTML = '<p>No hourly forecast data available</p>';
            return;
        }
        
        const timezoneOffset = data.city.timezone;
        const hourlyData = interpolateHourlyData(data.list);
        
        const currentCityTimeMs = Date.now() + (timezoneOffset * 1000);
        const currentDayKey = new Date(currentCityTimeMs).toISOString().split('T')[0];
        
        const startFilterMs = currentCityTimeMs - (60 * 60 * 1000);
        let todayForecast = hourlyData.filter(item => {
            const itemLocalMs = (item.dt + timezoneOffset) * 1000;
            const itemDayKey = new Date(itemLocalMs).toISOString().split('T')[0];
            return itemDayKey === currentDayKey && itemLocalMs >= startFilterMs;
        });
        
        const hourlyContainer = document.getElementById('hourlyForecast');
        hourlyContainer.innerHTML = generateHourlyTableHTML(todayForecast, timezoneOffset);
    });
}

// Load nearby places
function loadNearbyPlaces(lat, lon, currentCityName = '') {
    const nearbyContainer = document.getElementById('nearbyPlaces');
    
    const url = `${APIURL}/find?lat=${lat}&lon=${lon}&cnt=6&appid=${APPID}&units=metric`;
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (!data.list || data.list.length === 0) {
                nearbyContainer.innerHTML = '<p>No nearby places found</p>';
                return;
            }
            
            // Filter out the exact searched city and limit to 4 places
            const nearbyPlaces = data.list
                .filter(place => place.name.toLowerCase() !== currentCityName.toLowerCase())
                .slice(0, 4);
            
            nearbyContainer.innerHTML = nearbyPlaces.map(place => {
                const { name, main} = place;
                const { temp } = main;
                
                return `
                    <div class="place-item" data-city="${name}">
                        <div class="place-name">${name}</div>
                        <div class="place-temp">${Math.round(temp)}&#176;</div>
                    </div>
                `;
            }).join('');
            
            // Add click event to place items
            document.querySelectorAll('.place-item').forEach(item => {
                item.addEventListener('click', () => {
                    const cityName = item.getAttribute('data-city');
                    document.querySelector('#searchBox').value = cityName;
                    loadApiData(`${APIURL}/weather?q=${cityName}&appid=${APPID}&units=metric`);
                });
            });
        })
        .catch(error => {
            console.error(error);
            nearbyContainer.innerHTML = '<p>Unable to load nearby places data</p>';
        });
}

// Load 5-day forecast data
function loadForecastData(cityName) {
    const url = `${APIURL}/forecast?q=${cityName}&appid=${APPID}&units=metric`;
    
    fetch(url).catch(error => {
        console.error('Error fetching forecast:', error);
        document.getElementById('forecastDays').innerHTML = '<p>Unable to load forecast data</p>';
    }).then(res => {
        if (!res.ok) {
            throw new Error('Forecast data not found');
        }
        return res.json();
    }).then(data => {
        if (!data.list) {
            document.getElementById('forecastDays').innerHTML = '<p>No forecast data available</p>';
            return;
        }
        
        // Store forecast data
        forecastData = data;
        
        const timezoneOffset = data.city.timezone;
        // Group forecast data by day
        const dailyForecasts = {};
        
        data.list.forEach(item => {
            const date = new Date((item.dt + timezoneOffset) * 1000);
            const dateKey = date.toISOString().split('T')[0];
            
            if (!dailyForecasts[dateKey]) {
                dailyForecasts[dateKey] = {
                    date: date,
                    items: [],
                    minTemp: Infinity,
                    maxTemp: -Infinity
                };
            }
            
            dailyForecasts[dateKey].items.push(item);
            dailyForecasts[dateKey].minTemp = Math.min(dailyForecasts[dateKey].minTemp, item.main.temp);
            dailyForecasts[dateKey].maxTemp = Math.max(dailyForecasts[dateKey].maxTemp, item.main.temp);
        });
        
        // Get the next 5 days
        const days = Object.values(dailyForecasts).slice(0, 5);
        
        // Create day cards
        const dayCards = days.map((day, index) => {
            const { date, items, minTemp, maxTemp } = day;
            const dayName = date.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short' });
            const dayDate = date.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
            
            // Find forecast item closest to the current local hour
            const currentLocalHour = new Date(Date.now() + (timezoneOffset * 1000)).getUTCHours();
            let closestItem = items[0];
            let minDiff = 24;
            items.forEach(item => {
                const itemHour = new Date((item.dt + timezoneOffset) * 1000).getUTCHours();
                const diff = Math.abs(itemHour - currentLocalHour);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestItem = item;
                }
            });
            const { main, description, icon } = closestItem.weather[0];
            
            return `
                <div class="day-item ${index === selectedDayIndex ? 'selected' : ''}" data-day-index="${index}">
                    <div class="day-name">${dayName}</div>
                    <div class="day-date">${dayDate}</div>
                    <div class="day-icon">
                        <img src="${ICONURL}/${icon}@2x.png" alt="${description}">
                    </div>
                    <div class="day-temp-range">${Math.round(minTemp)}&#176; - ${Math.round(maxTemp)}&#176;</div>
                    <div class="day-desc">${description}</div>
                </div>
            `;
        }).join('');
        
        document.getElementById('forecastDays').innerHTML = dayCards;
        
        // Add click event to day cards
        document.querySelectorAll('.day-item').forEach(card => {
            card.addEventListener('click', () => {
                // Remove selected class from all cards
                document.querySelectorAll('.day-item').forEach(c => c.classList.remove('selected'));
                
                // Add selected class to clicked card
                card.classList.add('selected');
                
                // Update selected day index
                selectedDayIndex = parseInt(card.getAttribute('data-day-index'));
                
                // Load hourly forecast for selected day
                loadSelectedDayHourlyForecast(selectedDayIndex);
            });
        });
        
        // Load hourly forecast for the first day (today)
        loadSelectedDayHourlyForecast(selectedDayIndex);
    });
}

// Load hourly forecast for selected day
function loadSelectedDayHourlyForecast(dayIndex) {
    if (!forecastData) return;
    
    const hourlyContainer = document.getElementById('selectedDayHourlyForecast');
    
    // Interpolate 3-hour data to get 1-hour data
    const hourlyData = interpolateHourlyData(forecastData.list);
    
    const timezoneOffset = forecastData.city.timezone;
    // Group forecast data by day
    const dailyForecasts = {};
    
    hourlyData.forEach(item => {
        const date = new Date((item.dt + timezoneOffset) * 1000);
        const dateKey = date.toISOString().split('T')[0];
        
        if (!dailyForecasts[dateKey]) {
            dailyForecasts[dateKey] = {
                date: date,
                items: []
            };
        }
        
        dailyForecasts[dateKey].items.push(item);
    });
    
    // Get the selected day
    const days = Object.values(dailyForecasts).slice(0, 5);
    const selectedDay = days[dayIndex];
    
    if (!selectedDay) return;
    
    // Get day name for display
    const dayName = selectedDay.date.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long' });
    document.querySelector('#forecast .section-title').textContent = `HOURLY - ${dayName}`;
    
    // Render hourly forecast for selected day
    hourlyContainer.innerHTML = generateHourlyTableHTML(selectedDay.items, timezoneOffset);
}

// Helper function to generate table HTML for hourly forecast
function generateHourlyTableHTML(items, timezoneOffset) {
    if (!items || items.length === 0) return '<p>No data available</p>';
    
    let timeHtml = '';
    let descHtml = '';
    let iconHtml = '';
    let tempHtml = '';
    let feelsHtml = '';
    let windHtml = '';
    
    items.forEach(item => {
        const formattedTime = new Date((item.dt + timezoneOffset) * 1000).toLocaleTimeString('en-US', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit', hour12: true });
        
        const { temp, feels_like } = item.main;
        const { description, icon } = item.weather[0];
        const { speed, deg } = item.wind;
        const windDirection = getWindDirection(deg);
        
        timeHtml += `<td><div class="hourly-time">${formattedTime}</div></td>`;
        descHtml += `<td><div class="hourly-desc">${description}</div></td>`;
        iconHtml += `<td><div class="hourly-icon"><img src="${ICONURL}/${icon}.png" alt="${description}"></div></td>`;
        tempHtml += `<td><div class="hourly-temp">${Math.round(temp)}&#176;</div></td>`;
        feelsHtml += `<td><div class="hourly-details">Feels like ${Math.round(feels_like)}&#176;</div></td>`;
        windHtml += `<td><div class="hourly-details">${Math.round(speed * 3.6)} km/h ${windDirection}</div></td>`;
    });
    
    return `
        <div class="hourly-table-container">
            <table class="hourly-table">
                <tbody>
                    <tr><th>Time</th>${timeHtml}</tr>
                    <tr><th>Forecast</th>${descHtml}</tr>
                    <tr><th></th>${iconHtml}</tr>
                    <tr><th>Temp(°C)</th>${tempHtml}</tr>
                    <tr><th>Feels Like</th>${feelsHtml}</tr>
                    <tr><th>Wind(km/h)</th>${windHtml}</tr>
                </tbody>
            </table>
        </div>
    `;
}

// Helper function to get wind direction
function getWindDirection(degrees) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
}

// Helper function to interpolate 1-hour intervals
function interpolateHourlyData(list) {
    const hourlyData = [];
    for (let i = 0; i < list.length - 1; i++) {
        const current = list[i];
        const next = list[i + 1];
        
        const timeDiff = (next.dt - current.dt);
        const steps = Math.floor(timeDiff / 3600);
        
        hourlyData.push(current);
        
        if (steps > 1) {
            for (let j = 1; j < steps; j++) {
                const ratio = j / steps;
                const interpolated = {
                    dt: current.dt + (j * 3600),
                    main: {
                        temp: current.main.temp + (next.main.temp - current.main.temp) * ratio,
                        feels_like: current.main.feels_like + (next.main.feels_like - current.main.feels_like) * ratio,
                    },
                    weather: current.weather,
                    wind: {
                        speed: current.wind.speed + (next.wind.speed - current.wind.speed) * ratio,
                        deg: current.wind.deg + (next.wind.deg - current.wind.deg) * ratio
                    }
                };
                hourlyData.push(interpolated);
            }
        }
    }
    if (list.length > 0) {
        hourlyData.push(list[list.length - 1]);
    }
    return hourlyData;
}