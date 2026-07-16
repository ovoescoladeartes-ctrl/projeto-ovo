import "dotenv/config";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

async function main() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? "";
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? "";
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

  console.log("projectId:", JSON.stringify(projectId));
  console.log("clientEmail:", JSON.stringify(clientEmail));
  console.log("privateKey starts with:", JSON.stringify(privateKey.slice(0, 30)));
  console.log("privateKey ends with:", JSON.stringify(privateKey.slice(-30)));
  console.log("privateKey length:", privateKey.length);
  console.log("has real newlines:", privateKey.includes("\n"));

  if (getApps().length === 0) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }

  try {
    const result = await getAuth().listUsers(1);
    console.log("OK — Admin SDK conectou. Usuários encontrados:", result.users.length);
  } catch (err) {
    console.error("ERRO ao chamar listUsers:", err);
  }
}

main();
