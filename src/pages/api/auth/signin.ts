// Con `output: 'static'` configurado:
// export const prerender = false;
import type { APIRoute } from "astro";
import { supabase } from "@/lib/supabase";

export const prerender = false

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return new Response(JSON.stringify({ error: "Correo electrónico y contraseña obligatorios" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { access_token, refresh_token } = data.session;
  cookies.set("sb-access-token", access_token, {
    path: "/",
  });
  cookies.set("sb-refresh-token", refresh_token, {
    path: "/",
  });
  
  return redirect("/admin");
};
