import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!
)

export async function POST(req: Request) {
  try {
    const { email, phone, clientData } = await req.json()

    console.log('=== VALIDATION REQUEST ===')
    console.log('Email:', email)
    console.log('Phone:', phone)
    console.log('Client Data (raw):', clientData)
    console.log('Client Data type:', typeof clientData)

    let duplicates: {
      email: any | null;
      phone: any | null;
    } = {
      email: null,
      phone: null
    }

    // Verificar email si se proporciona
    if (email) {
      const { data: emailData, error: emailError } = await supabase
        .from('sales_clients')
        .select('id, name, email, phone')
        .eq('email', email)

      if (emailError) {
        console.error('Error validando email:', emailError)
        return new Response(JSON.stringify({ error: 'Error en la validación' }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Si hay datos, significa que existe el email
      if (emailData && emailData.length > 0) {
        duplicates.email = emailData[0] // Tomar el primer duplicado
        console.log('Email duplicado encontrado:', emailData[0])
        console.log('Total de emails duplicados:', emailData.length)
      }
    }

    // Verificar teléfono si se proporciona
    if (phone) {
      const { data: phoneData, error: phoneError } = await supabase
        .from('sales_clients')
        .select('id, name, email, phone')
        .eq('phone', phone)

      if (phoneError) {
        console.error('Error validando teléfono:', phoneError)
        return new Response(JSON.stringify({ error: 'Error en la validación' }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Si hay datos, significa que existe el teléfono
      if (phoneData && phoneData.length > 0) {
        duplicates.phone = phoneData[0] // Tomar el primer duplicado
        console.log('Teléfono duplicado encontrado:', phoneData[0])
        console.log('Total de teléfonos duplicados:', phoneData.length)
      }
    }

    const isValid = !duplicates.email && !duplicates.phone

    console.log('Validation result:', { isValid, duplicates })

    // Si el cliente es válido y tenemos datos del cliente, devolver información para registro
    if (isValid && clientData) {
      // Parsear clientData si viene como string
      let parsedClientData = clientData
      if (typeof clientData === 'string') {
        try {
          parsedClientData = JSON.parse(clientData)
          console.log('✅ ClientData parseado:', parsedClientData)
        } catch (e) {
          console.error('❌ Error parseando clientData:', e)
          // Intentar extraer datos del string
          const nameMatch = clientData.match(/"name":\s*"([^"]+)"/)
          const emailMatch = clientData.match(/"email":\s*"([^"]+)"/)
          const phoneMatch = clientData.match(/"phone":\s*"([^"]+)"/)
          const companyMatch = clientData.match(/"company":\s*"([^"]+)"/)
          
          parsedClientData = {
            name: nameMatch ? nameMatch[1] : undefined,
            email: emailMatch ? emailMatch[1] : undefined,
            phone: phoneMatch ? phoneMatch[1] : undefined,
            company: companyMatch ? companyMatch[1] : undefined
          }
          console.log('✅ ClientData extraído del string:', parsedClientData)
        }
      }

      const registrationData = {
        name: parsedClientData.name || parsedClientData.nombre || email, // Usar email como fallback
        email: parsedClientData.email || parsedClientData.correo || email,
        phone: parsedClientData.phone || parsedClientData.telefono || phone,
        company: parsedClientData.company || parsedClientData.empresa || 'Sin empresa',
        notes: parsedClientData.address || parsedClientData.direccion || '',
        status: 'active'
      }

      console.log('✅ Cliente válido, datos para registro:', registrationData)

      return new Response(JSON.stringify({
        isValid,
        duplicates,
        registrationData,
        message: 'Cliente válido, listo para registro'
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Si hay duplicados, devolver información de error
    if (!isValid) {
      let errorMessage = 'No se puede registrar el cliente porque:'
      
      if (duplicates.email) {
        errorMessage += `\n El correo "${duplicates.email.email}" ya está registrado`
      }
      if (duplicates.phone) {
        errorMessage += `\n El teléfono "${duplicates.phone.phone}" ya está registrado`
      }
      
      errorMessage += '\n\nPor favor, proporciona un correo y teléfono diferentes para continuar con el registro.'

      return new Response(JSON.stringify({
        isValid,
        duplicates,
        errorMessage,
        requiresNewData: true,
        fieldsToChange: [
          ...(duplicates.email ? ['correo'] : []),
          ...(duplicates.phone ? ['teléfono'] : [])
        ]
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Caso por defecto (solo validación sin datos de cliente)
    return new Response(JSON.stringify({
      isValid,
      duplicates
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error en validación:', error)
    return new Response(JSON.stringify({ error: 'Error interno' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}