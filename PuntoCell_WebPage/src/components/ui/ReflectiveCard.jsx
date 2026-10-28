import { memo, useEffect, useRef, useState } from 'react'

import './ReflectiveCard.css'

/**
 * Tarjeta con placa reflectante WebGL (React Bits · ReflectiveCard).
 *
 * Adaptada para tarjetas de producto del catálogo, donde hay decenas a la vez:
 *  - sin video ni cámara: la placa refleja un ambiente fijo (suave, sin plateado duro).
 *  - el contenido (`children`) es libre; la tarjeta sólo pone la placa detrás y la inclinación.
 *  - la placa WebGL se activa únicamente mientras la tarjeta está (casi) en pantalla. Fuera
 *    de pantalla queda el color plano `--rc-base` y se libera el contexto: los navegadores
 *    limitan los contextos WebGL vivos (~16) y el catálogo puede mostrar muchas más tarjetas.
 *  - sin WebGL2 pasa lo mismo: la tarjeta funciona igual, con el color plano.
 */

const THEMES = {
  dark: {
    '--rc-base': '#0c1f18',
    '--rc-shadow': '0 22px 44px -22px rgba(0, 0, 0, 0.8), 0 6px 16px -8px rgba(0, 0, 0, 0.5)',
    '--rc-rim': 'rgba(255, 255, 255, 0.08)',
    '--rc-rim-highlight': 'rgba(255, 255, 255, 0.12)',
  },
  light: {
    '--rc-base': '#eef2ef',
    '--rc-shadow': '0 22px 44px -26px rgba(24, 24, 27, 0.28), 0 6px 16px -12px rgba(24, 24, 27, 0.14)',
    '--rc-rim': 'rgba(24, 24, 27, 0.08)',
    '--rc-rim-highlight': 'rgba(255, 255, 255, 0.8)',
  },
}

const VIEW_DISTANCE = 900

const VERTEX = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`

const PLATE = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform vec2 uSize;
uniform float uRadius;
uniform float uScale;
uniform mat3 uRotate;
uniform float uBlur;
uniform float uRough;
uniform float uMetal;
uniform vec3 uTint;
uniform float uWarp;
uniform float uWarpScale;
uniform float uShine;
uniform float uBevel;
uniform float uGlare;
uniform vec2 uPointer;
uniform float uTheme;

const float VIEW = ${VIEW_DISTANCE.toFixed(1)};

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
}

vec3 gradientNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  vec2 ga = hash2(i);
  vec2 gb = hash2(i + vec2(1.0, 0.0));
  vec2 gc = hash2(i + vec2(0.0, 1.0));
  vec2 gd = hash2(i + vec2(1.0, 1.0));
  float va = dot(ga, f);
  float vb = dot(gb, f - vec2(1.0, 0.0));
  float vc = dot(gc, f - vec2(0.0, 1.0));
  float vd = dot(gd, f - vec2(1.0, 1.0));
  float k = va - vb - vc + vd;
  float value = va + u.x * (vb - va) + u.y * (vc - va) + u.x * u.y * k;
  vec2 slope = ga + u.x * (gb - ga) + u.y * (gc - ga) + u.x * u.y * (ga - gb - gc + gd) + du * (u.yx * k + vec2(vb, vc) - va);
  return vec3(value, slope);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float erf(float x) {
  float x2 = x * x;
  return sign(x) * sqrt(1.0 - exp(-x2 * (1.2732395 + 0.147 * x2) / (1.0 + 0.147 * x2)));
}

float band(float x, float halfWidth, float sigma) {
  float s = 1.4142136 * max(sigma, 0.0001);
  return 0.5 * (erf((x + halfWidth) / s) - erf((x - halfWidth) / s));
}

float strip(vec2 q, vec2 center, vec2 dir, float halfWidth, vec2 sigma) {
  vec2 normal = vec2(-dir.y, dir.x);
  return band(dot(q - center, normal), halfWidth, length(sigma * normal));
}

const vec2 SWEEP = vec2(0.5, 0.86);

float softbox(vec2 q, vec2 sigma) {
  float key = strip(q, vec2(-0.1, -0.16), normalize(SWEEP), 0.022, sigma + 0.018);
  float top = band(q.y + 0.6, 0.12, sigma.y + 0.05);
  float side = band(q.x - 0.46, 0.05, sigma.x + 0.05);
  return key + top * 0.8 + side * 0.35;
}

float room(vec2 q, vec2 sigma) {
  float fall = smoothstep(-0.55, 0.5, q.y);
  float flag = strip(q, vec2(0.24, -0.02), normalize(SWEEP), 0.09, sigma + 0.08);
  return mix(0.85, 0.12, fall) * (1.0 - 0.6 * flag);
}

void main() {
  vec2 p = vec2(vUv.x - 0.5, 0.5 - vUv.y) * uSize;
  vec2 halfSize = uSize * 0.5;
  float r = min(uRadius, min(halfSize.x, halfSize.y));
  vec2 corner = abs(p) - halfSize + r;
  vec2 side = vec2(p.x >= 0.0 ? 1.0 : -1.0, p.y >= 0.0 ? 1.0 : -1.0);
  float d;
  vec2 outward;
  if (corner.x > 0.0 && corner.y > 0.0) {
    d = length(corner) - r;
    outward = normalize(corner) * side;
  } else if (corner.x > corner.y) {
    d = corner.x - r;
    outward = vec2(side.x, 0.0);
  } else {
    d = corner.y - r;
    outward = vec2(0.0, side.y);
  }
  float coverage = clamp(0.5 - d * uScale, 0.0, 1.0);

  float chamferWidth = min(uBevel, max(r, 1.0));
  float chamfer = chamferWidth > 0.01 ? 1.0 - smoothstep(0.0, chamferWidth, -d) : 0.0;
  vec2 slope = outward * chamfer;

  vec2 wp = p / (220.0 * uWarpScale);
  vec3 w1 = gradientNoise(wp);
  vec3 w2 = gradientNoise(wp * 2.07 + 13.7);
  vec2 ripple = (w1.yz + w2.yz * 0.5) * uWarp;
  slope += ripple * 0.008;

  float grain = valueNoise(vec2(p.x * 0.008, p.y * 0.55)) * 0.45 + valueNoise(vec2(p.x * 0.019 + 3.7, p.y * 0.23)) * 0.35 + valueNoise(vec2(p.x * 0.004 + 9.2, p.y * 0.09)) * 0.2;
  float brush = uRough * uRough;
  slope.y += (grain - 0.5) * brush * 0.004;

  vec3 normal = uRotate * normalize(vec3(slope, 1.0));
  vec3 position = uRotate * vec3(p, 0.0);
  vec3 view = normalize(position - vec3(0.0, 0.0, VIEW));
  vec3 bounce = reflect(view, normal);
  vec2 q = bounce.xy / max(bounce.z, 0.2);

  vec2 footprint = fwidth(q);
  vec2 sigma = sqrt(vec2(uBlur / VIEW) * vec2(uBlur / VIEW) + footprint * footprint * 0.5);
  sigma += vec2(0.004, 0.05) * uRough;

  vec3 scene = vec3(room(q, sigma));
  scene *= 1.0 + (grain - 0.5) * brush * 0.3;

  vec2 toPointer = (uPointer - p) / (120.0 + uBlur * 4.0);
  vec2 spread = toPointer * vec2(1.0, 1.0 / (1.0 + 2.5 * uRough));
  float reach = dot(spread, spread);
  float glint = max(1.0 + 3.0 * dot(slope, toPointer), 0.0);
  float glare = (exp(-reach * 1.6) + exp(-reach * 0.35) * 0.15) * glint * uGlare * (1.0 + 0.8 * (grain - 0.5) * brush);
  float highlight = (softbox(q, sigma) * uShine + glare) * mix(0.4, 1.0, uMetal);

  vec3 dark = vec3(0.005, 0.005, 0.006) + uTint * (scene * 0.05 * uMetal + highlight * 0.36);
  vec3 light = uTint * (vec3(0.83, 0.83, 0.85) * (1.0 - 0.45 * uMetal * (1.0 - clamp(scene, 0.0, 1.0))) + highlight * 0.35);
  vec3 color = mix(dark, light, uTheme);
  color = min(color, 0.7) + 0.3 * (1.0 - exp(-max(color - 0.7, 0.0) / 0.3));
  color = pow(clamp(color, 0.0, 1.0), vec3(1.0 / 2.2));

  color += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  color = clamp(color, 0.0, 1.0);
  fragColor = vec4(color * coverage, coverage);
}`

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const toPx = (value) => (typeof value === 'number' ? `${value}px` : value)

const parseColor = (value) => {
  const text = String(value || '').trim()
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text)
  if (hex) {
    const full = hex[1].length === 3 ? hex[1].replace(/./g, (digit) => digit + digit) : hex[1]
    return [0, 2, 4].map((index) => parseInt(full.slice(index, index + 2), 16) / 255)
  }
  return [1, 1, 1]
}

const compile = (gl, type, source) => {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

const link = (gl, fragmentSource) => {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX)
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource)
  const program = vertex && fragment ? gl.createProgram() : null
  if (!vertex || !fragment || !program) {
    if (vertex) gl.deleteShader(vertex)
    if (fragment) gl.deleteShader(fragment)
    return null
  }
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.bindAttribLocation(program, 0, 'aPosition')
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program)
    return null
  }
  const uniforms = {}
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
  for (let index = 0; index < count; index++) {
    const info = gl.getActiveUniform(program, index)
    if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name)
  }
  return { program, uniforms }
}

const createRenderer = (canvas) => {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  })
  if (!gl) return null
  const plate = link(gl, PLATE)
  if (!plate) return null

  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.disable(gl.BLEND)
  gl.disable(gl.DEPTH_TEST)

  const rotation = new Float32Array(9)

  const render = ({ width, height, rotateX, rotateY, glare, pointerX, pointerY, settings }) => {
    const cx = Math.cos(rotateX)
    const sx = Math.sin(rotateX)
    const cy = Math.cos(rotateY)
    const sy = Math.sin(rotateY)
    rotation.set([cy, sx * sy, -cx * sy, 0, cx, sx, sy, -sx * cy, cx * cy])

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.useProgram(plate.program)
    const u = plate.uniforms
    gl.uniform2f(u.uSize, width, height)
    gl.uniform1f(u.uRadius, settings.radius)
    gl.uniform1f(u.uScale, canvas.width / Math.max(1, width))
    gl.uniformMatrix3fv(u.uRotate, false, rotation)
    gl.uniform1f(u.uBlur, settings.blurStrength)
    gl.uniform1f(u.uRough, settings.roughness)
    gl.uniform1f(u.uMetal, settings.metalness)
    gl.uniform3fv(u.uTint, settings.tint)
    gl.uniform1f(u.uWarp, settings.warp)
    gl.uniform1f(u.uWarpScale, settings.warpScale)
    gl.uniform1f(u.uShine, settings.shine)
    gl.uniform1f(u.uBevel, settings.bevel)
    gl.uniform1f(u.uGlare, glare)
    gl.uniform2f(u.uPointer, pointerX, pointerY)
    gl.uniform1f(u.uTheme, settings.theme)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  const dispose = () => {
    if (gl.isContextLost()) return
    gl.deleteBuffer(buffer)
    gl.deleteVertexArray(vao)
    gl.deleteProgram(plate.program)
    // Se suelta el contexto ya: esperar al recolector deja contextos vivos de más.
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }

  return { render, dispose }
}

const ReflectiveCard = ({
  children,
  theme = 'dark',
  tint = '#ffffff',
  metalness = 1,
  roughness = 0.3,
  blurStrength = 6,
  warp = 0.6,
  warpScale = 1,
  shine = 1,
  bevel = 3,
  glare = 0.5,
  enableTilt = true,
  tiltStrength = 12,
  width = 320,
  height = 500,
  radius = 24,
  className = '',
  style,
}) => {
  const rootRef = useRef(null)
  const bodyRef = useRef(null)
  const canvasRef = useRef(null)
  const wakeRef = useRef(null)
  // `live`: la tarjeta está cerca de la pantalla y vale la pena tener la placa WebGL.
  const [live, setLive] = useState(false)

  const palette = theme === 'light' ? 'light' : 'dark'
  const settings = {
    tint: parseColor(tint).map((channel) => Math.pow(channel, 2.2)),
    metalness: clamp(metalness, 0, 1),
    roughness: clamp(roughness, 0, 1),
    blurStrength: clamp(blurStrength, 0, 40),
    warp: clamp(warp, 0, 2),
    warpScale: clamp(warpScale, 0.2, 4),
    shine: clamp(shine, 0, 3),
    bevel: clamp(bevel, 0, 16),
    glare: clamp(glare, 0, 1),
    enableTilt,
    tiltStrength: clamp(tiltStrength, 0, 30),
    radius: Math.max(0, radius),
    theme: palette === 'light' ? 1 : 0,
  }
  const settingsRef = useRef(settings)

  // Los ajustes viajan por ref: se actualizan después de cada render y se redibuja.
  useEffect(() => {
    settingsRef.current = settings
    wakeRef.current?.()
  })

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const io = new IntersectionObserver(([entry]) => setLive(entry.isIntersecting), { rootMargin: '200px' })
    io.observe(root)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const root = rootRef.current
    const body = bodyRef.current
    const canvas = canvasRef.current
    if (!root || !body || !canvas) return undefined

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const renderer = live ? createRenderer(canvas) : null
    const x = { p: 0, v: 0, target: 0 }
    const y = { p: 0, v: 0, target: 0 }
    const light = { p: 0, target: 0 }
    const pointer = { x: 0, y: 0 }
    const size = { width: body.offsetWidth, height: body.offsetHeight, scale: 1 }
    let touchId = null
    let raf = 0
    let last = 0
    let lost = false

    const write = () => {
      const { enableTilt: tiltOn, tiltStrength: strength } = settingsRef.current
      const angle = tiltOn && !reduced ? strength : 0
      root.style.setProperty('--rc-rotate-x', `${(y.p * angle).toFixed(3)}deg`)
      root.style.setProperty('--rc-rotate-y', `${(-x.p * angle).toFixed(3)}deg`)
    }

    const resize = () => {
      size.width = body.offsetWidth
      size.height = body.offsetHeight
      size.scale = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.round(size.width * size.scale))
      const h = Math.max(1, Math.round(size.height * size.scale))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
    }

    const frame = (now) => {
      raf = 0
      if (lost) return
      const dt = Math.min(0.05, (now - last) / 1000 || 0)
      last = now
      const stiffness = 120
      const damping = 16
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)))
      const h = dt / steps
      for (let i = 0; i < steps; i++) {
        for (const axis of [x, y]) {
          axis.v += (stiffness * (axis.target - axis.p) - damping * axis.v) * h
          axis.p += axis.v * h
        }
      }
      light.p += (light.target - light.p) * (1 - Math.exp(-dt / (light.target > light.p ? 0.18 : 0.45)))

      const moving =
        Math.abs(x.target - x.p) > 0.0005 ||
        Math.abs(y.target - y.p) > 0.0005 ||
        Math.abs(x.v) > 0.0005 ||
        Math.abs(y.v) > 0.0005 ||
        Math.abs(light.target - light.p) > 0.002
      if (!moving) {
        x.p = x.target
        y.p = y.target
        x.v = 0
        y.v = 0
        light.p = light.target
      }
      write()

      if (renderer) {
        const s = settingsRef.current
        const angle = (s.enableTilt && !reduced ? s.tiltStrength : 0) * (Math.PI / 180)
        renderer.render({
          width: size.width,
          height: size.height,
          rotateX: y.p * angle,
          rotateY: -x.p * angle,
          glare: s.glare * light.p,
          pointerX: pointer.x,
          pointerY: pointer.y,
          settings: s,
        })
      }

      if (moving) raf = requestAnimationFrame(frame)
    }

    const wake = () => {
      if (raf || lost) return
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
    wakeRef.current = wake

    const aim = (nx, ny, on = true) => {
      x.target = clamp(nx, -1, 1)
      y.target = clamp(ny, -1, 1)
      light.target = on ? 1 : 0
      wake()
    }

    const aimAt = (event) => {
      const rect = root.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1
      pointer.x = nx * size.width * 0.5
      pointer.y = ny * size.height * 0.5
      aim(nx, ny)
    }

    const release = () => aim(0, 0, false)

    const onEnter = (event) => {
      if (event.pointerType === 'mouse') aimAt(event)
    }
    const onMove = (event) => {
      if (event.pointerType === 'mouse' || event.pointerId === touchId) aimAt(event)
    }
    const onLeave = (event) => {
      if (event.pointerType === 'mouse') release()
    }
    const onDown = (event) => {
      if (event.pointerType === 'mouse') return
      touchId = event.pointerId
      aimAt(event)
    }
    const onUp = (event) => {
      if (event.pointerId !== touchId) return
      touchId = null
      release()
    }

    root.addEventListener('pointerenter', onEnter)
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', onLeave)
    root.addEventListener('pointerdown', onDown)
    root.addEventListener('pointerup', onUp)
    root.addEventListener('pointercancel', onUp)

    // Si el navegador quita el contexto (demasiados abiertos), la tarjeta sigue andando
    // con el color plano; al volver a entrar en pantalla se pide uno nuevo.
    const onLost = (event) => {
      event.preventDefault()
      lost = true
      cancelAnimationFrame(raf)
      raf = 0
    }
    canvas.addEventListener('webglcontextlost', onLost)

    const resizeObserver = new ResizeObserver(() => {
      resize()
      wake()
    })
    resizeObserver.observe(body)
    resize()
    write()
    wake()

    return () => {
      cancelAnimationFrame(raf)
      wakeRef.current = null
      resizeObserver.disconnect()
      root.removeEventListener('pointerenter', onEnter)
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
      root.removeEventListener('pointerdown', onDown)
      root.removeEventListener('pointerup', onUp)
      root.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('webglcontextlost', onLost)
      renderer?.dispose()
    }
  }, [live])

  const corner = Math.max(0, radius)
  const cardStyle = {
    ...THEMES[palette],
    '--rc-width': toPx(width),
    '--rc-height': toPx(height),
    '--rc-radius': `${corner}px`,
  }

  return (
    <div ref={rootRef} className={`reflective-card ${className}`.trim()} style={{ ...cardStyle, ...style }}>
      <div ref={bodyRef} className="reflective-card__body">
        {/* La `key` renueva el canvas al entrar/salir de pantalla: un contexto soltado
            no se puede reutilizar sobre el mismo elemento. */}
        <canvas key={live ? 'gl' : 'idle'} ref={canvasRef} className="reflective-card__canvas" aria-hidden="true" />
        <div className="reflective-card__content">{children}</div>
        <span className="reflective-card__rim" />
      </div>
    </div>
  )
}

export default memo(ReflectiveCard)
