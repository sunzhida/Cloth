// build-in uniforms and attributes
// https://threejs.org/docs/api/renderers/webgl/WebGLProgram.html

uniform sampler2D tex;
varying vec2 vUv;

void main()
{
    vec4 clothTexture = texture2D(tex, vec2(vUv.x, vUv.y));
    gl_FragColor = clothTexture;
}