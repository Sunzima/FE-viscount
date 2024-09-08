  // Import the functions you need from the SDKs you need

  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";

  import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-analytics.js";

  // TODO: Add SDKs for Firebase products that you want to use

  // https://firebase.google.com/docs/web/setup#available-libraries


  // Your web app's Firebase configuration

  // For Firebase JS SDK v7.20.0 and later, measurementId is optional

  const firebaseConfig = {

    apiKey: "AIzaSyCnT130Shbfc79aoH4UNeplhGBbMiMPM7Y",

    authDomain: "ta-peoplecountdash230724.firebaseapp.com",

    projectId: "ta-peoplecountdash230724",

    storageBucket: "ta-peoplecountdash230724.appspot.com",

    messagingSenderId: "547373041950",

    appId: "1:547373041950:web:9c7268f96daa353776210f",

    measurementId: "G-WW3MX7LEEW"

  };


  // Initialize Firebase

  const app = initializeApp(firebaseConfig);

  const analytics = getAnalytics(app);

// Global Variables and Constants
let lastEntryId = 0;
const charts = {};
const channelId = '2585584';
const apiKey = 'JXGI8ZK57A6644T7';

const indicatorLight = document.getElementById('indicator-light');
const timestamp = document.getElementById('timestamp');
const setupPopup = document.getElementById('setup-popup');
const alertSound = document.getElementById('alertSound');
let alertSettings = {
    condition: 'greater',
    threshold: 0,
    interval: 5,
    color: '#ff0000',
    enableAudio: false
};

// Utility Functions
function openModal() {
    document.getElementById('timeRangeModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('timeRangeModal').style.display = 'none';
}

function updateDateTime() {
    var currentDate = new Date();
    var optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    var optionsTime = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    var formattedDate = currentDate.toLocaleDateString('id', optionsDate);
    var formattedTime = currentDate.toLocaleTimeString('id', optionsTime);
    document.getElementById('date').textContent = 'Hari Ini ' + formattedDate;
    document.getElementById('time').textContent = 'Jam ' + formattedTime;
}

// ThingSpeak API Functions
function checkForNewData() {
    const url = `https://api.thingspeak.com/channels/${channelId}/feeds/last_data_age.json?api_key=${apiKey}`;
    return $.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        cache: false,
        success: function (data) {
            return data.entry_id > lastEntryId ? (lastEntryId = data.entry_id, true) : false;
        }
    });
}

function getData() {
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${apiKey}&start=${startDate}&end=${endDate}`;
    return $.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        cache: false
    });
}

function fetchThingSpeakData() {
    const url = `https://api.thingspeak.com/channels/${channelId}/feeds/last.json?api_key=${apiKey}`;
    return $.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        cache: false
    });
}

// Data Processing and Display Functions
function updateDisplays() {
    return fetchThingSpeakData()
        .then(function (channelData) {
            const inCount = (parseFloat(channelData.field1) || 0) + (parseFloat(channelData.field5) || 0);
            const outCount = (parseFloat(channelData.field2) || 0) + (parseFloat(channelData.field6) || 0);
            const occupancy = (parseFloat(channelData.field3) || 0) + (parseFloat(channelData.field7) || 0);

            $('#inDisplay').text(inCount.toFixed(0).padStart(4, '0'));
            $('#outDisplay').text(outCount.toFixed(0).padStart(4, '0'));
            $('#occupancyDisplay').text(occupancy.toFixed(0).padStart(4, '0'));
            console.log('Displays updated');
            return occupancy;
        })
        .catch(function (error) {
            console.error('Error updating displays:', error);
            return null;
        });
}

function updateIfNewData() {
    checkForNewData().then(function (hasNewData) {
        if (hasNewData) {
            getData().then(updateAllCharts);
            updateDisplays();
        }
    });
}

// CSV Export Function
async function fetchThingSpeakDataForSave(startDate, endDate, results = 8000) {
    const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${apiKey}&start=${startDate}&end=${endDate}&results=${results}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.feeds;
}

async function fetchAllThingSpeakDataForSave(startDate, endDate) {
    let allData = [];
    let currentStartDate = new Date(startDate);
    const finalEndDate = new Date(endDate);

    while (currentStartDate < finalEndDate) {
        let currentEndDate = new Date(currentStartDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        if (currentEndDate > finalEndDate) {
            currentEndDate = finalEndDate;
        }

        const data = await fetchThingSpeakDataForSave(
            currentStartDate.toISOString(),
            currentEndDate.toISOString()
        );

        allData = allData.concat(data);
        currentStartDate = new Date(currentEndDate.getTime() + 1000);
    }

    return allData;
}

async function saveOccupancyData() {
    try {
        const startDate = document.getElementById('startDate').value + 'T00:00:00Z';
        const endDate = document.getElementById('endDate').value + 'T23:59:59Z';

        document.getElementById('saveStatus').textContent = 'Loading...';
        closeModal();

        const channelData = await fetchAllThingSpeakDataForSave(startDate, endDate);

        const csvContent = [
            ['Timestamp', 'In Count Total', 'Out Count Total', 'Current Occupancy']
        ];

        channelData.forEach(entry => {
            const inCount = (parseFloat(entry.field1) || 0) + (parseFloat(entry.field5) || 0);
            const outCount = (parseFloat(entry.field2) || 0) + (parseFloat(entry.field6) || 0);
            const occupancy = (parseFloat(entry.field3) || 0) + (parseFloat(entry.field7) || 0);

            csvContent.push([
                entry.created_at,
                entry.field1 || '',
                entry.field2 || '',
                entry.field3 || '',
                entry.field5 || '',
                entry.field6 || '',
                entry.field7 || '',
                inCount.toFixed(0),
                outCount.toFixed(0),
                occupancy.toFixed(0)
            ]);
        });

        const csvString = csvContent.map(row => row.join(',')).join('\n');

        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'occupancy_data.csv';
        a.click();
        URL.revokeObjectURL(a.href);

        document.getElementById('saveStatus').textContent = 'Data saved successfully!';
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('saveStatus').textContent = 'Error saving data';
    }
}

// Chart Functions
function createOrUpdateChart(chartId, field1, field2, data) {
    const ctx = document.getElementById(chartId).getContext('2d');
    const timestamps = data.feeds.map(feed => new Date(feed.created_at));
    const field1Values = data.feeds.map(feed => parseFloat(feed[field1]) || null);
    const field2Values = data.feeds.map(feed => parseFloat(feed[field2]) || null);

    if (charts[chartId]) {
        charts[chartId].data.labels = timestamps;
        charts[chartId].data.datasets[0].data = field1Values;
        charts[chartId].data.datasets[1].data = field2Values;
        charts[chartId].update();
    } else {
        charts[chartId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timestamps,
                datasets: [{
                    label: 'Gate 1',
                    data: field1Values,
                    borderColor: '#84bd00',
                    backgroundColor: 'rgba(132, 189, 0, 0.2)',
                    borderWidth: 1,
                    fill: false
                },
                {
                    label: 'Gate 2',
                    data: field2Values,
                    borderColor: '#00205b',
                    backgroundColor: 'rgba(0, 32, 91, 0.2)',
                    borderWidth: 1,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: {
                                day: 'MMM d'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Value'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        });
    }
}

function updateAllCharts(data) {
    createOrUpdateChart('entryChart', 'field1', 'field5', data);
    createOrUpdateChart('exitChart', 'field2', 'field6', data);
    createOrUpdateChart('occupantChart', 'field3', 'field7', data);
}

// Initialization and Polling Functions
function startPolling() {
    setInterval(updateIfNewData, 15000);
}

// Alarm Functions
// Load settings from session storage when the page loads
function loadSettings() {
    const storedSettings = sessionStorage.getItem('alertSettings');
    if (storedSettings) {
        alertSettings = JSON.parse(storedSettings);
        updateSetupForm();
    }
}

// Update the setup form with current settings
function updateSetupForm() {
    document.getElementById('condition').value = alertSettings.condition;
    document.getElementById('threshold').value = alertSettings.threshold;
    document.getElementById('interval').value = alertSettings.interval;
    document.getElementById('color').value = alertSettings.color;
    document.getElementById('enableAudio').checked = alertSettings.enableAudio;
}

function openSetupPopup() {
    setupPopup.style.display = 'block';
    updateSetupForm();
}

function closeSetupPopup() {
    setupPopup.style.display = 'none';
}

function saveSettings() {
    alertSettings.condition = document.getElementById('condition').value;
    alertSettings.threshold = parseInt(document.getElementById('threshold').value);
    alertSettings.interval = parseInt(document.getElementById('interval').value);
    alertSettings.color = document.getElementById('color').value;
    alertSettings.enableAudio = document.getElementById('enableAudio').checked;

    // Save settings to session storage
    sessionStorage.setItem('alertSettings', JSON.stringify(alertSettings));

    closeSetupPopup();
    startMonitoring();
}

function startMonitoring() {
    setInterval(checkCondition, alertSettings.interval * 1000);
}

function checkCondition() {
    const occupancyValue = parseInt(document.getElementById('occupancyDisplay').textContent);

    let conditionMet = false;
    switch (alertSettings.condition) {
        case 'greater':
            conditionMet = occupancyValue > alertSettings.threshold;
            break;
        case 'less':
            conditionMet = occupancyValue < alertSettings.threshold;
            break;
        case 'equal':
            conditionMet = occupancyValue === alertSettings.threshold;
            break;
        case 'greater or equal to':
            conditionMet = occupancyValue >= alertSettings.threshold;
            break;
        case 'less or equal to':
            conditionMet = occupancyValue <= alertSettings.threshold;
            break;
    }

    if (conditionMet) {
        indicatorLight.style.backgroundColor = alertSettings.color;
        if (alertSettings.enableAudio) {
            playAlertSound();
        }
    } else {
        indicatorLight.style.backgroundColor = '#ccc';
        stopAlertSound();
    }

    timestamp.textContent = new Date().toLocaleString();

    function playAlertSound() {
        alertSound.play();
    }

    function stopAlertSound() {
        alertSound.pause();
        alertSound.currentTime = 0;
    }
}
function init() {
    loadSettings();
    updateSetupForm();
    startMonitoring();
}

document.addEventListener('DOMContentLoaded', init);
// Document Ready Function
$(document).ready(function () {
    getData().then(function (data) {
        updateAllCharts(data);
        updateDisplays();
        startPolling();
        setInterval(updateDateTime, 1000);
        updateDateTime();
    });
});

// Event Listeners
window.onclick = function (event) {
    if (event.target == document.getElementById('timeRangeModal')) {
        closeModal();
    }
}

// Expose necessary functions to global scope
window.openModal = openModal;
window.closeModal = closeModal;
window.saveOccupancyData = saveOccupancyData;