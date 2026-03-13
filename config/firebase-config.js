// /config/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCshx_L8LxIL0PCp71kIbztppgh_ngXSq0",
    authDomain: "lucky-appliances.firebaseapp.com",
    projectId: "lucky-appliances",
    storageBucket: "lucky-appliances.firebasestorage.app",
    messagingSenderId: "72948063957",
    appId: "1:72948063957:web:0118d92ba1d78c7c788c5c",
    measurementId: "G-QMVW9NR9WZ"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const messaging = getMessaging(app);

export { app, db, auth, storage, messaging }; 