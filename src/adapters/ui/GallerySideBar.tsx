import { createPortal } from 'react-dom'
import * as styles from './styles/gallery.css'

export interface GallerySideBarItem {
  readonly key: string
  readonly label: string
  readonly description: string
}

interface GallerySideBarProps {
  items: readonly GallerySideBarItem[]
  selectedIndex: number
  onSelect: (index: number) => void
}

export function GallerySideBar({ items, selectedIndex, onSelect }: GallerySideBarProps): JSX.Element {
  return createPortal(
    <div className={styles.overlayContainer}>
      <div className={styles.sideList}>
        {items.map((item, i) => (
          <button
            key={item.key}
            className={`${styles.listItem} ${i === selectedIndex ? styles.listItemActive : ''}`}
            onClick={() => onSelect(i)}
            data-testid={`gallery-item-${item.key}`}
            title={item.description || undefined}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>,
    document.body
  )
}
