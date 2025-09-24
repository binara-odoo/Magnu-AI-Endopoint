// routes/api/validate-company.ts
import { Handlers } from "$fresh/server.ts";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const handler: Handlers = {
  async POST(req) {
    try {
      const requestBody = await req.json();
      const { email, phone, name, companyData, website, industry, size, city, country, owner_name } = requestBody;

      console.log("=== COMPANY VALIDATION REQUEST ===");
      console.log("Full request body:", JSON.stringify(requestBody, null, 2));
      console.log("Email:", email);
      console.log("Phone:", phone);
      console.log("Name:", name);
      console.log("Website:", website);
      console.log("Industry:", industry);
      console.log("Size:", size);
      console.log("City:", city);
      console.log("Country:", country);
      console.log("Owner name:", owner_name);
      console.log("Company Data (raw):", companyData);
      console.log("Company Data type:", typeof companyData);

      let duplicates: { email: any | null; phone: any | null; name: any | null } = {
        email: null,
        phone: null,
        name: null,
      };

      // 🔹 Validar email
      if (email) {
        const { data: emailData, error: emailError } = await supabase
          .from("companies")
          .select("id, name, email, phone")
          .eq("email", email);

        if (emailError) {
          console.error("Error validando email:", emailError);
          return new Response(
            JSON.stringify({ error: "Error en la validación" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        if (emailData && emailData.length > 0) {
          duplicates.email = emailData[0];
          console.log("Email duplicado encontrado:", emailData[0]);
          console.log("Total de emails duplicados:", emailData.length);
        }
      }

      // 🔹 Validar teléfono
      if (phone) {
        const { data: phoneData, error: phoneError } = await supabase
          .from("companies")
          .select("id, name, email, phone")
          .eq("phone", phone);

        if (phoneError) {
          console.error("Error validando teléfono:", phoneError);
          return new Response(
            JSON.stringify({ error: "Error en la validación" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        if (phoneData && phoneData.length > 0) {
          duplicates.phone = phoneData[0];
          console.log("Teléfono duplicado encontrado:", phoneData[0]);
          console.log("Total de teléfonos duplicados:", phoneData.length);
        }
      }

      // 🔹 Validar nombre de empresa
      if (name) {
        const { data: nameData, error: nameError } = await supabase
          .from("companies")
          .select("id, name, email, phone")
          .eq("name", name);

        if (nameError) {
          console.error("Error validando nombre:", nameError);
          return new Response(
            JSON.stringify({ error: "Error en la validación" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        if (nameData && nameData.length > 0) {
          duplicates.name = nameData[0];
          console.log("Nombre duplicado encontrado:", nameData[0]);
          console.log("Total de nombres duplicados:", nameData.length);
        }
      }

      const isValid = !duplicates.email && !duplicates.phone && !duplicates.name;
      console.log("Validation result:", { isValid, duplicates });

      // 🔹 Empresa válida → preparar datos de registro
      if (isValid && companyData) {
        let parsedCompanyData = companyData;
        if (typeof companyData === "string") {
          try {
            parsedCompanyData = JSON.parse(companyData);
            console.log("✅ CompanyData parseado:", parsedCompanyData);
          } catch (e) {
            console.error("❌ Error parseando companyData:", e);

            // Extraer datos del string usando regex más robusto
            const nameMatch = companyData.match(/name:\s*([^,]+)/);
            const emailMatch = companyData.match(/email:\s*([^,]+)/);
            const phoneMatch = companyData.match(/phone:\s*([^,]+)/);
            const websiteMatch = companyData.match(/website:\s*([^,]+)/);
            const industryMatch = companyData.match(/industry:\s*([^,]+)/);
            const sizeMatch = companyData.match(/size:\s*([^,]+)/);
            const cityMatch = companyData.match(/city:\s*([^,]+)/);
            const countryMatch = companyData.match(/country:\s*([^,]+)/);
            const ownerNameMatch = companyData.match(/owner_name:\s*([^,]+)/);

            parsedCompanyData = {
              name: nameMatch ? nameMatch[1].trim() : undefined,
              email: emailMatch ? emailMatch[1].trim() : undefined,
              phone: phoneMatch ? phoneMatch[1].trim() : undefined,
              website: websiteMatch ? websiteMatch[1].trim() : undefined,
              industry: industryMatch ? industryMatch[1].trim() : undefined,
              size: sizeMatch ? sizeMatch[1].trim() : undefined,
              city: cityMatch ? cityMatch[1].trim() : undefined,
              country: countryMatch ? countryMatch[1].trim() : undefined,
              owner_name: ownerNameMatch ? ownerNameMatch[1].trim() : undefined,
            };
            console.log("✅ CompanyData extraído del string:", parsedCompanyData);
          }
        }

        const registrationData = {
          name: parsedCompanyData.name || parsedCompanyData.nombre || name,
          email: parsedCompanyData.email || parsedCompanyData.correo || email,
          phone: parsedCompanyData.phone || parsedCompanyData.telefono || phone,
          website: parsedCompanyData.website || parsedCompanyData.sitio_web || website || "",
          industry: parsedCompanyData.industry || parsedCompanyData.industria || industry || "",
          size: parsedCompanyData.size || parsedCompanyData.tamaño || size || "",
          city: parsedCompanyData.city || parsedCompanyData.ciudad || city || "",
          country: parsedCompanyData.country || parsedCompanyData.país || country || "",
          owner_name: parsedCompanyData.owner_name || parsedCompanyData.nombre_propietario || owner_name || "",
          stage: "prospect",
          notes: "",
        };

        console.log("✅ Empresa válida, datos para registro:", registrationData);

        return new Response(
          JSON.stringify({
            isValid,
            duplicates,
            registrationData,
            message: "Empresa válida, listo para registro",
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      // 🔹 Empresa duplicada
      if (!isValid) {
        let errorMessage = "No se puede registrar la empresa porque:";

        if (duplicates.name) {
          errorMessage += `\n El nombre "${duplicates.name.name}" ya está registrado`;
        }
        if (duplicates.email) {
          errorMessage += `\n El correo "${duplicates.email.email}" ya está registrado`;
        }
        if (duplicates.phone) {
          errorMessage += `\n El teléfono "${duplicates.phone.phone}" ya está registrado`;
        }

        errorMessage +=
          "\n\nPor favor, proporciona un nombre, correo y teléfono diferentes para continuar con el registro.";

        return new Response(
          JSON.stringify({
            isValid,
            duplicates,
            errorMessage,
            requiresNewData: true,
            fieldsToChange: [
              ...(duplicates.name ? ["nombre"] : []),
              ...(duplicates.email ? ["correo"] : []),
              ...(duplicates.phone ? ["teléfono"] : []),
            ],
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      // 🔹 Solo validación
      return new Response(
        JSON.stringify({ isValid, duplicates }),
        { headers: { "Content-Type": "application/json" } },
      );
    } catch (error) {
      console.error("Error en validación:", error);
      return new Response(
        JSON.stringify({ error: "Error interno" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },
};
