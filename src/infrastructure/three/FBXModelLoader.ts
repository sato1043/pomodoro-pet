import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'

export interface LoadedModel {
  readonly group: THREE.Group
  readonly animations: THREE.AnimationClip[]
}

export async function loadFBXModel(url: string, resourcePath?: string): Promise<LoadedModel> {
  const loader = new FBXLoader()
  if (resourcePath) {
    loader.setResourcePath(resourcePath)
  }
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (group) => {
        resolve({
          group,
          animations: group.animations ?? []
        })
      },
      undefined,
      (error) => reject(error)
    )
  })
}

export async function loadFBXAnimation(url: string): Promise<THREE.AnimationClip[]> {
  const loader = new FBXLoader()
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (group) => resolve(group.animations ?? []),
      undefined,
      (error) => reject(error)
    )
  })
}
