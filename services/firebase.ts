import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCTGiqR7RSk2rbGuSlfXKYLV8-n548Q77c",
  authDomain: "facepass-d99c6.firebaseapp.com",
  projectId: "facepass-d99c6",
  storageBucket: "facepass-d99c6.firebasestorage.app",
  messagingSenderId: "526581774824",
  appId: "1:526581774824:web:fb09f6166ae7371eb7cc5d"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
