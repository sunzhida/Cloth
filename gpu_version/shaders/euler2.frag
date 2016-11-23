// build-in uniforms and attributes
// https://threejs.org/docs/api/renderers/webgl/WebGLProgram.html

varying vec2 vUv;

uniform sampler2D texVelocity;
uniform sampler2D texPosition;

uniform sampler2D origin;
uniform int isStart;

const float timestep = 0.001;

void main()
{
  vec4 pos = texture2D(texPosition, vUv);
  vec4 vel = texture2D(texVelocity, vUv);

  if(isStart == 1)
  {
    pos = vec4(texture2D(origin, vUv).xyz, 1.0);
  }
  else
  {
    bool pinBoolean = false;
    if(!pinBoolean) pinBoolean = (vUv.y < 0.035 && vUv.x < 0.035);
    if(!pinBoolean) pinBoolean = (vUv.y > 0.965 && vUv.x < 0.035);

    if(!pinBoolean)
    {
      pos.xyz += vel.xyz * timestep;
    }

  }
  gl_FragColor = vec4(pos.xyz,1.0);
}