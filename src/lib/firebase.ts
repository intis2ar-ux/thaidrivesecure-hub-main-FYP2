import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBir1Z0Cjk6pbF1byF7OaniBsp-spIynDg",
  authDomain: "thaidrive-b7eb4.firebaseapp.com",
  projectId: "thaidrive-b7eb4",
  storageBucket: "thaidrive-b7eb4.firebasestorage.app",
  messagingSenderId: "67186739808",
  appId: "1:67186739808:web:79c3e1229e8af6047bd105",
  measurementId: "G-WL4TCYY9FZ"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
