import type { Metadata } from "next";
import type { ManagedPageSection } from "@/lib/firebase-models";

type FirestoreDocument = { document?: { fields?: Record<string, { stringValue?: string }> } };

export async function managedPageMetadata(section: ManagedPageSection, slug: string): Promise<Metadata> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!projectId || !apiKey) return {};
  try {
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`, {
      method: "POST", cache: "no-store", headers: { "content-type": "application/json" },
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "pages" }], where: { compositeFilter: { op: "AND", filters: [
        { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "published" } } },
        { fieldFilter: { field: { fieldPath: "section" }, op: "EQUAL", value: { stringValue: section } } },
        { fieldFilter: { field: { fieldPath: "slug" }, op: "EQUAL", value: { stringValue: slug } } },
      ] } }, limit: 1 } }),
    });
    if (!response.ok) return {};
    const rows = await response.json() as FirestoreDocument[];
    const fields = rows.find((row) => row.document)?.document?.fields;
    if (!fields) return {};
    const title = fields.metaTitle?.stringValue || fields.title?.stringValue || "Kroon Luxe";
    const description = fields.metaDescription?.stringValue || `Read ${fields.title?.stringValue ?? "this page"} from Kroon Luxe.`;
    return { title, description, openGraph: { title, description } };
  } catch { return {}; }
}
