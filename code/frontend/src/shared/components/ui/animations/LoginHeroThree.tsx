import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function LoginHeroThree() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x0a0a0a, 5, 25)

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    camera.position.set(0, 0, 10)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    const envCanvas = document.createElement('canvas')
    envCanvas.width = 1024
    envCanvas.height = 512
    const envCtx = envCanvas.getContext('2d')
    if (!envCtx) return
    envCtx.fillStyle = '#000000'
    envCtx.fillRect(0, 0, 1024, 512)
    envCtx.fillStyle = '#ffffff'
    envCtx.fillRect(100, 0, 50, 512)
    envCtx.fillRect(450, 0, 150, 512)
    envCtx.fillRect(800, 0, 20, 512)
    envCtx.fillRect(0, 200, 1024, 40)
    const envMap = new THREE.CanvasTexture(envCanvas)
    envMap.mapping = THREE.EquirectangularReflectionMapping
    envMap.colorSpace = THREE.SRGBColorSpace
    scene.environment = envMap

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
    scene.add(ambientLight)
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 4.0)
    dirLight1.position.set(5, 5, 5)
    scene.add(dirLight1)
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 2.0)
    dirLight2.position.set(-5, -2, 5)
    scene.add(dirLight2)

    const material = new THREE.MeshPhysicalMaterial({
      color: 0xdddddd,
      metalness: 1.0,
      roughness: 0.02,
      envMap,
      envMapIntensity: 3.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
    })

    const numPoints = 200
    const tubularSegments = 300
    const radialSegments = 32
    const baseRadius = 0.35

    const getPathPoints = (time: number, morphPhase: number) => {
      const points: THREE.Vector3[] = []
      for (let i = 0; i <= numPoints; i += 1) {
        const t = i / numPoints
        const angle = t * Math.PI * 2
        const waveX = Math.sin(angle * 2 + time) * 3
        const waveY = Math.cos(angle * 3 + time) * 2
        const waveZ = Math.sin(angle * 1 - time) * 1.5
        const kScale = 1.6
        const knotX = (Math.sin(angle) + 2 * Math.sin(2 * angle)) * kScale
        const knotY = (Math.cos(angle) - 2 * Math.cos(2 * angle)) * kScale
        const knotZ = -Math.sin(3 * angle) * kScale
        const easeMorph =
          morphPhase < 0.5
            ? 4 * morphPhase * morphPhase * morphPhase
            : 1 - Math.pow(-2 * morphPhase + 2, 3) / 2
        const x = THREE.MathUtils.lerp(waveX, knotX, easeMorph)
        const y = THREE.MathUtils.lerp(waveY, knotY, easeMorph)
        const z = THREE.MathUtils.lerp(waveZ, knotZ, easeMorph)
        const breathe = 1 + Math.sin(time * 1.5 + angle * 4) * 0.03
        points.push(new THREE.Vector3(x * breathe, y * breathe, z * breathe))
      }
      return points
    }

    const initialPoints = getPathPoints(0, 0)
    const curve = new THREE.CatmullRomCurve3(initialPoints, true, 'centripetal')
    let geometry = new THREE.TubeGeometry(
      curve,
      tubularSegments,
      baseRadius,
      radialSegments,
      true
    )
    const tubeMesh = new THREE.Mesh(geometry, material)
    scene.add(tubeMesh)

    const resize = () => {
      const width = mount.clientWidth || 1
      const height = mount.clientHeight || 1
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    resize()

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)

    const clock = new THREE.Clock()
    let frameId = 0

    const animate = () => {
      frameId = window.requestAnimationFrame(animate)
      const elapsedTime = clock.getElapsedTime()
      const cycleDuration = 12
      const cycleTime = elapsedTime % cycleDuration
      const morphPhase =
        (Math.sin((cycleTime / cycleDuration) * Math.PI * 2 - Math.PI / 2) + 1) / 2

      const newPoints = getPathPoints(elapsedTime * 0.4, morphPhase)
      const newCurve = new THREE.CatmullRomCurve3(newPoints, true, 'centripetal')
      const nextGeometry = new THREE.TubeGeometry(
        newCurve,
        tubularSegments,
        baseRadius,
        radialSegments,
        true
      )
      tubeMesh.geometry = nextGeometry
      geometry.dispose()
      geometry = nextGeometry

      tubeMesh.rotation.y = elapsedTime * 0.12
      tubeMesh.rotation.z = Math.cos(elapsedTime * 0.08) * 0.1

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      window.cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      tubeMesh.geometry.dispose()
      material.dispose()
      envMap.dispose()
      renderer.dispose()
      scene.clear()
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div className="absolute inset-0">
      <div ref={mountRef} className="absolute inset-0" />
    </div>
  )
}
