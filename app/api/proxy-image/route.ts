import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')

  // Validate URL parameter
  if (!imageUrl) {
    return new NextResponse('Missing url parameter', { status: 400 })
  }

  // Validate that it's a valid URL
  try {
    new URL(imageUrl)
  } catch {
    return new NextResponse('Invalid URL', { status: 400 })
  }

  // Only allow Google profile images for security
  if (!imageUrl.includes('googleusercontent.com')) {
    return new NextResponse('Unauthorized domain', { status: 403 })
  }

  try {
    // Fetch the image from Google's servers (server-side, bypassing browser ORB)
    const response = await fetch(imageUrl)

    if (!response.ok) {
      return new NextResponse('Failed to fetch image', { status: response.status })
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache for 24 hours
      },
    })
  } catch (error) {
    console.error('Error fetching image:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
