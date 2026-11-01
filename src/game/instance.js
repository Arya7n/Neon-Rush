import * as THREE from 'three'

const posed = new THREE.Object3D()
const fast = new THREE.Matrix4()
const e = fast.elements

/**
 * Write one instance matrix. A still prop skips the euler/quaternion work
 * Object3D.updateMatrix does on every call.
 */
export function writeInstance(mesh, index, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  if (!mesh) return
  if (rx === 0 && ry === 0 && rz === 0) {
    e[0] = sx
    e[1] = 0
    e[2] = 0
    e[3] = 0
    e[4] = 0
    e[5] = sy
    e[6] = 0
    e[7] = 0
    e[8] = 0
    e[9] = 0
    e[10] = sz
    e[11] = 0
    e[12] = x
    e[13] = y
    e[14] = z
    e[15] = 1
    mesh.setMatrixAt(index, fast)
    return
  }
  posed.position.set(x, y, z)
  posed.rotation.set(rx, ry, rz)
  posed.scale.set(sx, sy, sz)
  posed.updateMatrix()
  mesh.setMatrixAt(index, posed.matrix)
}

/** Hide an empty batch without uploading a matrix buffer that nothing draws. */
export function showInstances(mesh, count) {
  if (!mesh) return
  mesh.count = count
  if (count > 0) mesh.instanceMatrix.needsUpdate = true
}
