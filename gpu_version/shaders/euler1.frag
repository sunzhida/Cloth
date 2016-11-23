// build-in uniforms and attributes
// https://threejs.org/docs/api/renderers/webgl/WebGLProgram.html

varying vec2 vUv;
uniform float width;
uniform sampler2D texVelocity;  
uniform sampler2D texPosition;

const float timestep = 0.001;
const float mass = 0.2; // this parameter is not the same as cpu to allow large meshResolution
const float Cd = 0.5;
const float K = 25000.0;
const vec3 uf = vec3(0.0, 0.0, 1.0);
const float Cv = 0.5;

vec2 getNeighborDelta(int n)
{
    if (n == 0) return vec2(1.0, 0.0);
    if (n == 1) return vec2(0.0, -1.0);
    if (n == 2) return vec2(-1.0, 0.0);
    if (n == 3) return vec2(0.0, 1.0);

    if (n == 4) return vec2(1.0, -1.0);
    if (n == 5) return vec2(-1.0, -1.0);
    if (n == 6) return vec2(-1.0, 1.0);
    if (n == 7) return vec2(1.0, 1.0);

    if (n == 8) return vec2(2.0, 0.0);
    if (n == 9) return vec2(0.0, -2.0);
    if (n == 10) return vec2(-2.0, 0.0);
    if (n == 11) return vec2(0.0, 2.0);

    return vec2(0.0,0.0);
}

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
    vec4 pos = texture2D(texPosition, vUv);
    vec4 vel =  texture2D(texVelocity, vUv);

    // Gravity
    vec3 gravity = vec3(0.0, -9.8, 0.0);
    vec3 force = gravity*mass;

    // Damping
    force += -Cd * vel.xyz;

    // Mass-Spring model, calculate the normal at the same time
    for(int i=0; i<12; ++i)
    {
        vec2 neighborCoord = getNeighborDelta(i);
        float restLength = length(neighborCoord/width);

        neighborCoord = neighborCoord*(1.0/width);

        vec2 coord = vUv + neighborCoord;

        if(coord.x<=0.0 || coord.x>=1.0 || coord.y<=0.0 || coord.y>=1.0)
            continue;

        vec3 neighborPos = texture2D(texPosition, coord).xyz;
        vec3 deltaPos = pos.xyz - neighborPos;

        vec3 springForce = K * (restLength-length(deltaPos)) * normalize(deltaPos);
        force += springForce;
    };

    // Viscous fluid
    bool isBound = false;
    vec3 vNormal = vec3(0.0, 0.0, 0.0);

    // 0
    vec2 neighborCoord = getNeighborDelta(0)*1.0 / width;
    vec2 coord = vUv + neighborCoord;
    if(coord.x<=0.0 || coord.x>=1.0 || coord.y<=0.0 || coord.y>=1.0)
        isBound = true;
    vec3 neighborPos0 = texture2D(texPosition, coord).xyz;

    // 1
    neighborCoord = getNeighborDelta(1)*1.0 / width;
    coord = vUv + neighborCoord;
    if(coord.x<=0.0 || coord.x>=1.0 || coord.y<=0.0 || coord.y>=1.0)
        isBound = true;
    vec3 neighborPos1 = texture2D(texPosition, coord).xyz;

    // 2
    neighborCoord = getNeighborDelta(2)*1.0 / width;
    coord = vUv + neighborCoord;
    if(coord.x<=0.0 || coord.x>=1.0 || coord.y<=0.0 || coord.y>=1.0)
        isBound = true;
    vec3 neighborPos2 = texture2D(texPosition, coord).xyz;

    // 3
    neighborCoord = getNeighborDelta(3)*1.0 / width;
    coord = vUv + neighborCoord;
    if(coord.x<=0.0 || coord.x>=1.0 || coord.y<=0.0 || coord.y>=1.0)
        isBound = true;
    vec3 neighborPos3 = texture2D(texPosition, coord).xyz;


    if(isBound==false)
    {
        vec3 nor0 = getNormal(pos.xyz, neighborPos0, neighborPos1);
        vec3 nor1 = getNormal(pos.xyz, neighborPos1, neighborPos2);
        vec3 nor2 = getNormal(pos.xyz, neighborPos2, neighborPos3);
        vec3 nor3 = getNormal(pos.xyz, neighborPos3, neighborPos0);

        vNormal += (nor0 + nor1 + nor2 + nor3);
        vNormal = normalize(vNormal);
        force += Cv*dot(vNormal, (uf - vel.xyz))*vNormal;
    }

    vec3 acc;
    if(mass == 0.0)
        acc = vec3(0.0);
    else
        acc = force / mass;

    vel.xyz += acc * timestep;

    gl_FragColor = vec4(vel.xyz, 1.0);
}