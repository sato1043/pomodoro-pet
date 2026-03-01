import { useEffect } from 'react'
import { useAppDeps } from './AppContext'
import { OverlayGallery } from './OverlayGallery'
import { GalleryExitButton } from './GalleryExitButton'

export function SceneGallery(): JSX.Element {
  const { galleryCoordinator } = useAppDeps()

  useEffect(() => {
    galleryCoordinator.applyCharacterOffset()
    return () => galleryCoordinator.resetCharacterOffset()
  }, [galleryCoordinator])

  return (
    <>
      <OverlayGallery />
      <GalleryExitButton />
    </>
  )
}
