import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export const useCurrentUserImage = () => {
  const [image, setImage] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserImage = async () => {
      const { data, error } = await createClient().auth.getSession()
      if (error) {
        console.error(error)
      }

      const avatarUrl = data.session?.user.user_metadata.avatar_url

      // Wrap Google profile images with proxy to bypass ORB restrictions
      if (avatarUrl) {
        const proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(avatarUrl)}`
        setImage(proxiedUrl)
      } else {
        setImage(null)
      }
    }
    fetchUserImage()
  }, [])

  return image
}
