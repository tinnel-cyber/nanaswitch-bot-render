import { NextResponse } from "next/server";
import { registerUserAndSendVerification } from "@/app/actions/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, fullName, name, whatsapp, sellerMode } = body || {};

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Veuillez fournir une adresse e-mail valide." },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Le mot de passe doit comporter au moins 6 caractères." },
        { status: 400 }
      );
    }

    const result = await registerUserAndSendVerification({
      email,
      password,
      name: fullName || name,
      fullName: fullName || name,
      whatsapp,
      sellerMode: sellerMode || "merchant_ecommerce",
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    console.error("[API_AUTH_REGISTER_ERROR]", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Erreur technique lors de l'inscription." },
      { status: 500 }
    );
  }
}
