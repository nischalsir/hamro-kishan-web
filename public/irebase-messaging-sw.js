importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// 🚨 PASTE THE EXACT SAME CONFIG HERE:
const firebaseConfig = {
  apiKey: "AIzaSyDriC0-nrAqXIn3sDmZBc76W3Yp8ZTh3fU",
  authDomain: "hamro-kisan-8d641.firebaseapp.com",
  projectId: "hamro-kisan-8d641",
  storageBucket: "hamro-kisan-8d641.firebasestorage.app",
  messagingSenderId: "1091452393179",
  appId: "1:1091452393179:web:30b78843b0d8271511defe",
  measurementId: "G-C76HMMWBLE"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// This runs in the background when the app is closed!
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png' // Make sure you have a logo.png in your public folder!
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});