import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppDeps } from './AppContext'
import { CompactHeader } from './CompactHeader'
import { GalleryTopBar, type GalleryMode } from './GalleryTopBar'
import { GallerySideBar, type GallerySideBarItem } from './GallerySideBar'
import { GALLERY_CLIPS, GALLERY_STATES, GALLERY_RULES } from '../../application/gallery/GalleryAnimationData'
import { STATE_CONFIGS } from '../../domain/character/value-objects/CharacterState'
import type { GalleryStateItem } from '../../application/gallery/GalleryAnimationData'
import * as styles from './styles/gallery.css'

export function OverlayGallery(): JSX.Element {
  const { galleryCoordinator } = useAppDeps()
  const [mode, setMode] = useState<GalleryMode>('clips')
  const [selectedIndex, setSelectedIndex] = useState(0)

  function playGalleryState(item: GalleryStateItem): void {
    if (item.loop !== undefined) {
      const config = STATE_CONFIGS[item.state]
      galleryCoordinator.playAnimationSelection({ clipName: config.animationClip, loop: item.loop })
    } else {
      galleryCoordinator.playState(item.state)
    }
  }

  function handleSelect(index: number): void {
    setSelectedIndex(index)
    if (mode === 'clips') {
      const item = GALLERY_CLIPS[index]
      galleryCoordinator.playAnimationSelection({ clipName: item.clipName, loop: item.loop })
    } else if (mode === 'states') {
      playGalleryState(GALLERY_STATES[index])
    } else {
      const item = GALLERY_RULES[index]
      galleryCoordinator.playAnimationSelection(item.selection)
    }
  }

  function handleModeChange(newMode: GalleryMode): void {
    setMode(newMode)
    setSelectedIndex(0)
    if (newMode === 'clips') {
      const item = GALLERY_CLIPS[0]
      galleryCoordinator.playAnimationSelection({ clipName: item.clipName, loop: item.loop })
    } else if (newMode === 'states') {
      playGalleryState(GALLERY_STATES[0])
    } else {
      galleryCoordinator.playAnimationSelection(GALLERY_RULES[0].selection)
    }
  }

  function getSideBarItems(): readonly GallerySideBarItem[] {
    if (mode === 'clips') return GALLERY_CLIPS.map((c) => ({ key: c.clipName, label: c.label, description: '' }))
    if (mode === 'states') return GALLERY_STATES.map((s) => ({ key: s.state, label: s.label, description: '' }))
    return GALLERY_RULES.map((r) => ({ key: r.name, label: r.label, description: '' }))
  }

  function getInfoText(): { description: string; label: string; clip: string; loop: string; speed: string } {
    if (mode === 'clips') {
      const item = GALLERY_CLIPS[selectedIndex]
      const fbxAction = item.description.replace(/^ms\d+_/, '').replace(/\.FBX$/i, '').replace(/_/g, ' ')
      return {
        description: item.label,
        label: item.label,
        clip: fbxAction,
        loop: item.loop ? 'Yes' : 'No',
        speed: '1.0',
      }
    }
    if (mode === 'states') {
      const item = GALLERY_STATES[selectedIndex]
      const config = STATE_CONFIGS[item.state]
      return {
        description: item.description,
        label: item.label,
        clip: config.animationClip,
        loop: (item.loop ?? config.loop) ? 'Yes' : 'No',
        speed: '1.0',
      }
    }
    const item = GALLERY_RULES[selectedIndex]
    return {
      description: item.description,
      label: item.label,
      clip: item.selection.clipName,
      loop: item.selection.loop ? 'Yes' : 'No',
      speed: String(item.selection.speed ?? 1.0),
    }
  }

  const sideBarItems = getSideBarItems()
  const info = getInfoText()

  return createPortal(
    <div data-testid="overlay-gallery">
      <CompactHeader />
      <GalleryTopBar mode={mode} onModeChange={handleModeChange} />
      <GallerySideBar items={sideBarItems} selectedIndex={selectedIndex} onSelect={handleSelect} />
      <div className={styles.infoBar} data-testid="gallery-info">
        <div className={styles.infoRow}>{info.description}</div>
        <div className={styles.infoRow}>
          {mode === 'states' && <span><span className={styles.infoLabel}>State:</span> <span className={styles.infoValue}>{info.label}</span></span>}
          {mode !== 'rules' && <span><span className={styles.infoLabel}>Clip:</span> <span className={styles.infoValue}>{info.clip}</span></span>}
          <span><span className={styles.infoLabel}>Loop:</span> <span className={styles.infoValue}>{info.loop}</span></span>
          <span><span className={styles.infoLabel}>Speed:</span> <span className={styles.infoValue}>{info.speed}</span></span>
        </div>
      </div>
    </div>,
    document.body
  )
}
