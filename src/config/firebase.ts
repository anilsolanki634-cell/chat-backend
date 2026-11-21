import dotenv from "dotenv";
import {
  applicationDefault,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config();

const firebaseApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });

export const firestore = getFirestore(firebaseApp);