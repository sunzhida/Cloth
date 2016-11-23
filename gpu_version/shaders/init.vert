// build-in uniforms and attributes
// https://threejs.org/docs/api/renderers/webgl/WebGLProgram.html
void main()
{
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}