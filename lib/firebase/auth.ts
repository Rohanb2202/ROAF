import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  updatePassword as firebaseUpdatePassword,
  updateEmail as firebaseUpdateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type ConfirmationResult,
} from "firebase/auth"
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "./config"

export async function signInWithEmail(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  return userCredential
}

export async function signUpWithEmail(email: string, password: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)

  // Create user document
  await setDoc(doc(db, "users", userCredential.user.uid), {
    uid: userCredential.user.uid,
    email: userCredential.user.email,
    createdAt: serverTimestamp(),
  })

  return userCredential
}

export async function setupRecaptcha(elementId: string): Promise<RecaptchaVerifier> {
  const recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
    size: "invisible",
  })
  return recaptchaVerifier
}

export async function signInWithPhone(
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier,
): Promise<ConfirmationResult> {
  return await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier)
}

export async function signOut() {
  await firebaseSignOut(auth)
}

export async function getUserData(uid: string) {
  const userDoc = await getDoc(doc(db, "users", uid))
  return userDoc.exists() ? userDoc.data() : null
}

export async function updatePassword(currentPassword: string, newPassword: string) {
  const user = auth.currentUser
  if (!user || !user.email) throw new Error("No user signed in")

  // Re-authenticate user first
  const credential = EmailAuthProvider.credential(user.email, currentPassword)
  await reauthenticateWithCredential(user, credential)

  // Update password
  await firebaseUpdatePassword(user, newPassword)
}

export async function updateEmail(currentPassword: string, newEmail: string) {
  const user = auth.currentUser
  if (!user || !user.email) throw new Error("No user signed in")

  // Re-authenticate user first
  const credential = EmailAuthProvider.credential(user.email, currentPassword)
  await reauthenticateWithCredential(user, credential)

  // Update email
  await firebaseUpdateEmail(user, newEmail)

  // Update email in Firestore
  await setDoc(doc(db, "users", user.uid), { email: newEmail }, { merge: true })
}
