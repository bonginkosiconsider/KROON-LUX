"use client";

import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, type Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type Conversation = { id: string; customerEmail: string; customerName: string; lastMessage: string; lastUpdated: unknown; unreadByAdmin: boolean; status: "open" | "closed"; accessToken?: string; lastOutboundMessageId?: string };
export type ConversationMessage = { id: string; sender: "customer" | "admin"; text: string; timestamp: unknown; sentVia: "widget" | "manual_email" | "email" };

const conversations = collection(db, "conversations");
const conversationId = (email: string) => `email-${email.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
export const createConversationToken = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function subscribeConversations(callback: (items: Conversation[]) => void, onError?: (error: Error) => void): Unsubscribe {
  return onSnapshot(query(conversations, orderBy("lastUpdated", "desc")), (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Conversation))), onError);
}

export function subscribeConversationMessages(id: string, callback: (items: ConversationMessage[]) => void, onError?: (error: Error) => void): Unsubscribe {
  return onSnapshot(query(collection(db, `conversations/${id}/messages`), orderBy("timestamp", "asc")), (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as ConversationMessage))), onError);
}

export async function sendConversationMessage(input: { email: string; name: string; text: string; sender: "customer" | "admin"; sentVia?: "widget" | "manual_email" | "email"; conversationId?: string; accessToken?: string }) {
  const email = input.email.trim().toLowerCase();
  const id = input.conversationId ?? conversationId(email);
  const conversationRef = doc(conversations, id);
  const accessToken = input.accessToken ?? (!input.conversationId ? createConversationToken() : undefined);
  await setDoc(conversationRef, { customerEmail: email, customerName: input.name.trim() || email, lastMessage: input.text.trim(), lastUpdated: serverTimestamp(), ...(input.sender === "customer" ? { unreadByAdmin: true, lastCustomerMessageAt: serverTimestamp() } : { unreadByAdmin: false }), status: "open", ...(accessToken ? { accessToken } : {}) }, { merge: true });
  await addDoc(collection(conversationRef, "messages"), { sender: input.sender, text: input.text.trim(), timestamp: serverTimestamp(), sentVia: input.sentVia ?? "widget" });
  return id;
}

export function markConversationRead(id: string) { return updateDoc(doc(conversations, id), { unreadByAdmin: false }); }
