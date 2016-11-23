// build-in uniforms and attributes
// https://threejs.org/docs/api/renderers/webgl/WebGLProgram.html

uniform sampler2D map;
uniform float width;
uniform float height;
varying vec2 vUv;
varying vec4 vPosition;
varying vec3 vNormal;

vec3 getNormal(vec3 p1, vec3 p2, vec3 p3)
{
    vec3 res;
    vec3 e1 = p2 - p1;
    vec3 e2 = p3 - p1;

    vec3 nor = cross(e1, e2);
    res = normalize(nor);
    return res;
}

void main()
{
    vUv = position.xy;
    vec3 color = texture2D(map, vUv).rgb;
    vPosition = vec4(color, 1.0);

    vec3 up = texture2D(map, vUv + vec2(0.0, 1.0/height)).rgb;
    vec3 down = texture2D(map, vUv + vec2(0.0, -1.0/height)).rgb;
    vec3 left = texture2D(map, vUv + vec2(-1.0/width)).rgb;
    vec3 right = texture2D(map, vUv + vec2(1.0/width)).rgb;
    
    vNormal = vec3(0.0, 0.0, 0.0); 
    vec3 nor0 = getNormal(color, up, right);
    vec3 nor1 = getNormal(color, right, down);
    vec3 nor2 = getNormal(color, down, left);
    vec3 nor3 = getNormal(color, right, up);

    vNormal += (nor0 + nor1 + nor2 + nor3);
    vNormal = normalize(vNormal);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(color, 1.0);
}