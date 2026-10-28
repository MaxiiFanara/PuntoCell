import { useEffect, useRef } from 'react'

/**
 * Fondo de gradientes animados (ruido simplex en WebGL).
 * Es sólo decoración: si WebGL no está disponible o el shader no compila, queda
 * el degradado CSS de `fallback` y el contenido se ve igual.
 */

const VERTEX = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const FRAGMENT = `
precision highp float;
varying vec2 vUv;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_grain;
uniform vec3  u_colors[4];
uniform vec3  u_bg;

vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = vUv;
  float ratio = u_resolution.x / u_resolution.y;
  vec2 p = uv - 0.5;
  p.x *= ratio;

  float t = u_time * 0.1;

  float n1 = snoise(p * 0.4 + vec2(t * 0.2, -t * 0.3));
  float n2 = snoise(p * 0.55 + vec2(-t * 0.15, t * 0.25) + n1 * 0.25);
  float n3 = snoise(p * 0.75 + vec2(t * 0.1, -t * 0.2) + n2 * 0.2);

  vec3 col = u_bg;

  float dist = length(p) * 1.5;
  float vignette = 1.0 - smoothstep(0.3, 1.2, dist);

  col = mix(col, u_colors[0], smoothstep(-0.2, 0.5, n1) * 0.85);
  col = mix(col, u_colors[1], smoothstep(-0.1, 0.6, n2) * 0.7);
  col = mix(col, u_colors[2], smoothstep(-0.3, 0.4, n3) * 0.6);
  col = mix(col, u_colors[3], smoothstep(0.0, 0.7, n1 * n2) * 0.5);

  float glow = smoothstep(0.8, 0.0, dist) * 0.3;
  col += u_colors[1] * glow;

  col = mix(col * 0.2, col, vignette);

  float grain = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453 + u_time);
  col += (grain - 0.5) * u_grain * 0.1;

  gl_FragColor = vec4(col, 1.0);
}
`

const DEFAULT_COLORS = ['#86efac', '#4ade80', '#059669', '#000000']

const hexToRgb = (hex) => {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ]
}

function compile(gl, type, src) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export default function Velaris({
  bg = '#000000',
  colors = DEFAULT_COLORS,
  speed = 2,
  grain = 0.3,
  height = '100vh',
  fallback,
  sx,
  children,
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  // Los props viajan por ref: el efecto crea el contexto una sola vez y no se
  // reinicia cuando el padre re-renderiza con un array de colores nuevo.
  const propsRef = useRef({ bg, colors, speed, grain })
  useEffect(() => {
    propsRef.current = { bg, colors, speed, grain }
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return undefined

    const gl = canvas.getContext('webgl', { antialias: false, powerPreference: 'low-power' })
    if (!gl) return undefined

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT)
    if (!vs || !fs) return undefined

    const program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return undefined
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)

    const pos = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(pos)
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)

    const loc = {
      res: gl.getUniformLocation(program, 'u_resolution'),
      time: gl.getUniformLocation(program, 'u_time'),
      grain: gl.getUniformLocation(program, 'u_grain'),
      colors: gl.getUniformLocation(program, 'u_colors'),
      bg: gl.getUniformLocation(program, 'u_bg'),
    }

    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    let raf = 0
    let visible = true
    let alive = true

    const draw = (t) => {
      const p = propsRef.current
      gl.uniform2f(loc.res, canvas.width, canvas.height)
      gl.uniform1f(loc.time, t * 0.001 * p.speed)
      gl.uniform1f(loc.grain, p.grain)
      gl.uniform3f(loc.bg, ...hexToRgb(p.bg))
      gl.uniform3fv(loc.colors, new Float32Array(p.colors.slice(0, 4).flatMap(hexToRgb)))
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    const loop = (t) => {
      raf = 0
      if (!alive || !visible) return
      draw(t)
      raf = requestAnimationFrame(loop)
    }

    const start = () => {
      if (reducido) {
        // Un solo cuadro: el fondo queda quieto, sin gastar GPU en bucle.
        draw(4000)
        return
      }
      if (!raf && visible && alive) raf = requestAnimationFrame(loop)
    }

    const resize = () => {
      // Techo de 1.5: el shader calcula ruido por píxel y en pantallas densas pesa.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.max(1, Math.round(container.clientWidth * dpr))
      canvas.height = Math.max(1, Math.round(container.clientHeight * dpr))
      gl.viewport(0, 0, canvas.width, canvas.height)
      if (reducido) draw(4000)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(container)
    resize()

    // Fuera de pantalla no se dibuja: la landing ya tiene el visor 3D debajo.
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) start()
    })
    io.observe(container)

    start()

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      // No se hace loseContext(): en StrictMode el efecto corre dos veces sobre el
      // mismo <canvas> y getContext() devolvería un contexto muerto (fondo en blanco).
      // Se liberan los recursos y el contexto se va con el canvas al desmontar.
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(buffer)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ height, position: 'relative', width: '100%', overflow: 'hidden', background: fallback ?? bg, ...sx }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      />
      <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%' }}>{children}</div>
    </div>
  )
}
