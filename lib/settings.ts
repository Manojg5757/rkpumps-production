import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { BUSINESS_INFO } from './config';
import { BusinessSettings } from '../types';

export const DEFAULT_SETTINGS: BusinessSettings = {
  name: BUSINESS_INFO.name,
  address1: BUSINESS_INFO.address1,
  address2: BUSINESS_INFO.address2,
  phone: BUSINESS_INFO.phone,
  email: BUSINESS_INFO.email,
  gstin: BUSINESS_INFO.gstin,
  stateCode: '33', // Tamil Nadu
  bankName: '',
  accountName: '',
  accountNumber: '',
  ifsc: '',
  upiId: '',
  invoiceTerms: 'Goods once sold will not be taken back or exchanged.\nAll disputes are subject to local jurisdiction only.',
  quotationTerms: 'Prices are subject to change after the validity period.\nThis is a price quotation only and does not constitute a tax invoice.',
};

let cache: BusinessSettings | null = null;

export async function getSettings(force = false): Promise<BusinessSettings> {
  if (cache && !force) return cache;
  try {
    const snap = await getDoc(doc(db, 'meta', 'settings'));
    cache = { ...DEFAULT_SETTINGS, ...(snap.exists() ? (snap.data() as Partial<BusinessSettings>) : {}) };
  } catch {
    cache = { ...DEFAULT_SETTINGS };
  }
  return cache;
}

export async function saveSettings(s: BusinessSettings): Promise<void> {
  await setDoc(doc(db, 'meta', 'settings'), s, { merge: true });
  cache = { ...s };
}
