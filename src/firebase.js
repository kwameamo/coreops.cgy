import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signInWithApple = () => signInWithPopup(auth, appleProvider);
export const logout = () => signOut(auth);

// ─── Invoice functions ───────────────────────────────────────────────────────

export const getUserInvoices = async (userId) => {
  try {
    const invoicesRef = collection(db, 'invoices');
    const q = query(invoicesRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const invoices = [];
    querySnapshot.forEach((doc) => {
      invoices.push({ id: doc.id, ...doc.data() });
    });
    return invoices.sort((a, b) => {
      const dateA = a.savedDate || a.invoiceDate || '';
      const dateB = b.savedDate || b.invoiceDate || '';
      return dateB.localeCompare(dateA);
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }
};

export const saveInvoice = async (invoice) => {
  try {
    const invoiceId = invoice.id;
    const { id, ...invoiceData } = invoice;
    const cleanData = Object.fromEntries(
      Object.entries(invoiceData).filter(([_, value]) => value !== undefined)
    );
    const invoiceRef = doc(db, 'invoices', invoiceId);
    await setDoc(invoiceRef, cleanData, { merge: true });
    return invoice;
  } catch (error) {
    console.error('Error saving invoice:', error);
    throw error;
  }
};

export const deleteInvoice = async (invoiceId) => {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    await deleteDoc(invoiceRef);
  } catch (error) {
    console.error('Error deleting invoice:', error);
    throw error;
  }
};

export const getUserCounter = async (userId) => {
  try {
    const counterRef = doc(db, 'counters', userId);
    const counterSnap = await getDoc(counterRef);
    if (counterSnap.exists()) {
      return counterSnap.data().value || 1;
    }
    return 1;
  } catch (error) {
    console.error('Error fetching counter:', error);
    return 1;
  }
};

export const updateUserCounter = async (userId, value) => {
  try {
    const counterRef = doc(db, 'counters', userId);
    await setDoc(counterRef, { value }, { merge: true });
  } catch (error) {
    console.error('Error updating counter:', error);
    throw error;
  }
};

// ─── Contract functions ──────────────────────────────────────────────────────

export const getUserContracts = async (userId) => {
  try {
    const contractsRef = collection(db, 'contracts');
    const q = query(contractsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const contracts = [];
    querySnapshot.forEach((docSnap) => {
      contracts.push({ id: docSnap.id, ...docSnap.data() });
    });
    return contracts.sort((a, b) => {
      const dateA = a.savedDate || a.contractDate || '';
      const dateB = b.savedDate || b.contractDate || '';
      return dateB.localeCompare(dateA);
    });
  } catch (error) {
    console.error('Error fetching contracts:', error);
    throw error;
  }
};

export const saveContract = async (contract) => {
  try {
    const contractId = contract.id;
    const { id, ...contractData } = contract;
    // Clean undefined values — Firestore rejects them
    const cleanData = Object.fromEntries(
      Object.entries(contractData).filter(([_, v]) => v !== undefined)
    );
    const contractRef = doc(db, 'contracts', contractId);
    await setDoc(contractRef, cleanData, { merge: true });
    return contract;
  } catch (error) {
    console.error('Error saving contract:', error);
    throw error;
  }
};

export const deleteContract = async (contractId) => {
  try {
    const contractRef = doc(db, 'contracts', contractId);
    await deleteDoc(contractRef);
  } catch (error) {
    console.error('Error deleting contract:', error);
    throw error;
  }
};

export const getUserContractCounter = async (userId) => {
  try {
    const counterRef = doc(db, 'contractCounters', userId);
    const counterSnap = await getDoc(counterRef);
    if (counterSnap.exists()) {
      return counterSnap.data().value || 1;
    }
    return 1;
  } catch (error) {
    console.error('Error fetching contract counter:', error);
    return 1;
  }
};

export const updateUserContractCounter = async (userId, value) => {
  try {
    const counterRef = doc(db, 'contractCounters', userId);
    await setDoc(counterRef, { value }, { merge: true });
  } catch (error) {
    console.error('Error updating contract counter:', error);
    throw error;
  }
};