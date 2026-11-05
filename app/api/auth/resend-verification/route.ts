import { NextResponse } from "next/server";
import { resendVerificationEmail } from "@/app/actions/auth";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ success: false, error: "Adresse email requise." }, { status: 400 });
    }
    const result = await resendVerificationEmail(email);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Erreur serveur lors du renvoi." },
      { status: 500 }
    );
  }
}
