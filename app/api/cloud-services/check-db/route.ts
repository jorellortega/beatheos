import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Try to query the cloud_services table to see if it exists
    const { data, error } = await supabase
      .from('cloud_services')
      .select('id')
      .limit(1)

    if (error) {
      // Check if it's a "table doesn't exist" error
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({
          exists: false,
          message: 'cloud_services table does not exist. Please run migrations 084 and 085.'
        })
      }
      
      return NextResponse.json({
        exists: true,
        error: error.message
      })
    }

    return NextResponse.json({
      exists: true,
      message: 'Database tables are set up correctly'
    })
  } catch (error: any) {
    return NextResponse.json({
      exists: false,
      error: error.message || 'Unknown error checking database'
    }, { status: 500 })
  }
}

