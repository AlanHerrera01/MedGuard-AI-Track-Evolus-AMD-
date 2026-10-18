// API client for MedGuard AI backend
import { translations } from "../i18n";

const API_BASE_URL =
  (import.meta && import.meta.env && (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL)) || "";

export async function auditDocument(documentText, lang = "en") {
  if (!documentText || documentText.trim() === "") {
    throw new Error(translations[lang].emptyDoc);
  }
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/audit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_text: documentText }),
    });
    if (!response.ok) {
      let detail = response.statusText;
      try {
        const err = await response.json();
        detail = err.message || err.detail || JSON.stringify(err);
      } catch (e) {
        try { detail = await response.text(); } catch (e2) { detail = response.statusText; }
      }
      throw new Error(`${translations[lang].auditFailed} (${response.status}): ${detail}`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(translations[lang].auditFailed)) throw error;
    throw new Error(`${translations[lang].networkError} ${API_BASE_URL}: ${error.message}`);
  }
}

export async function extractDocumentFile(file, lang = "en") {
  if (!file) {
    throw new Error("No file provided");
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/extract-document`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const err = await response.json();
        detail = err.message || err.detail || JSON.stringify(err);
      } catch (e) {
        try {
          detail = await response.text();
        } catch (e2) {
          detail = response.statusText;
        }
      }
      throw new Error(`Error (${response.status}): ${detail}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Error (")) throw error;
    const netErr = translations[lang]?.networkError || "Network error connecting to";
    throw new Error(`${netErr} ${API_BASE_URL}: ${error.message}`);
  }
}
