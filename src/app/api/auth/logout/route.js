import { NextResponse } from "next/server";

export async function POST() {
  //user logout button එක click කරන කොට
  const res = NextResponse.json({ message: "Logged out" }); //browser එකට mg එක
  res.cookies.set("token", "", { maxAge: 0, path: "/" }); //cookie එකේ තියෙඅන id card එක delete වෙනවා
  return res; //logout sucessfull
}
