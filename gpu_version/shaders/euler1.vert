// build-in uniforms and attributes
// https://threejs.org/docs/api/renderers/webgl/WebGLProgram.html

// uv: vertex texture coord
varying vec2 vUv;
void main() {
  vUv = uv.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}