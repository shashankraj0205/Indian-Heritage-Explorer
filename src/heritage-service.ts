import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  bio?: string;
  role?: 'explorer' | 'admin';
  createdAt: string;
}

export interface HeritageVisit {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  monumentId: string;
  monumentName: string;
  state?: string;
  visitDate: string;
  rating: number; // 1 to 5
  notes?: string;
  createdAt: string;
}

export interface HeritageBookmark {
  id: string;
  userId: string;
  monumentId: string;
  monumentName: string;
  category?: string;
  createdAt: string;
}

// ==========================================
// USER PROFILE SERVICE
// ==========================================

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const path = `users/${profile.id}`;
  try {
    await setDoc(doc(db, 'users', profile.id), profile, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// HERITAGE VISITS JOURNAL (BACKEND EXAMPLE)
// ==========================================

export function subscribeUserVisits(
  userId: string,
  onSuccess: (visits: HeritageVisit[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'heritageVisits';
  const q = query(collection(db, 'heritageVisits'), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const visits: HeritageVisit[] = [];
      snapshot.forEach((d) => {
        visits.push(d.data() as HeritageVisit);
      });
      // Sort client-side by visitDate descending
      visits.sort((a, b) => (b.visitDate || '').localeCompare(a.visitDate || ''));
      onSuccess(visits);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e: any) {
        if (onError) onError(e);
      }
    }
  );
}

export async function addHeritageVisit(
  visitData: Omit<HeritageVisit, 'id' | 'createdAt'>
): Promise<HeritageVisit> {
  const visitId = 'visit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const path = `heritageVisits/${visitId}`;

  const visit: HeritageVisit = {
    ...visitData,
    id: visitId,
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'heritageVisits', visitId), visit);
    return visit;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateHeritageVisit(
  visitId: string,
  updates: Pick<HeritageVisit, 'visitDate' | 'rating' | 'notes'>
): Promise<void> {
  const path = `heritageVisits/${visitId}`;
  try {
    await updateDoc(doc(db, 'heritageVisits', visitId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteHeritageVisit(visitId: string): Promise<void> {
  const path = `heritageVisits/${visitId}`;
  try {
    await deleteDoc(doc(db, 'heritageVisits', visitId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// HERITAGE BOOKMARKS (BACKEND EXAMPLE)
// ==========================================

export function subscribeUserBookmarks(
  userId: string,
  onSuccess: (bookmarks: HeritageBookmark[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'bookmarks';
  const q = query(collection(db, 'bookmarks'), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const bookmarks: HeritageBookmark[] = [];
      snapshot.forEach((d) => {
        bookmarks.push(d.data() as HeritageBookmark);
      });
      onSuccess(bookmarks);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e: any) {
        if (onError) onError(e);
      }
    }
  );
}

export async function saveBookmarkToFirestore(
  userId: string,
  monumentId: string,
  monumentName: string,
  category: string = 'Monument'
): Promise<void> {
  const bookmarkId = `bm_${userId}_${monumentId}`.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const path = `bookmarks/${bookmarkId}`;

  const data: HeritageBookmark = {
    id: bookmarkId,
    userId,
    monumentId,
    monumentName,
    category,
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'bookmarks', bookmarkId), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function removeBookmarkFromFirestore(
  userId: string,
  monumentId: string
): Promise<void> {
  const bookmarkId = `bm_${userId}_${monumentId}`.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const path = `bookmarks/${bookmarkId}`;

  try {
    await deleteDoc(doc(db, 'bookmarks', bookmarkId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
