var GPGPU = function(renderer, clothWidth, clothHeight, floatType)
{
    // a square geometry
    var camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1);
    var scene = new THREE.Scene();
    var mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 1));
    scene.add(mesh);

    // for ping-pong
    var velTexture = new THREE.WebGLRenderTarget // A render target is a buffer where the video card draws pixels for a scene that is being rendered in the background. It is used in different effects.
    (
        clothWidth,
        clothHeight,
        {
            wrapS: THREE.ClampToEdgeWrapping,
            wrapT: THREE.ClampToEdgeWrapping,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: floatType,
        }
    );

    var prevVelTexture = velTexture.clone();

    this.init = function(shader)
    {
        // write 0 texture
        mesh.material = shader.init;
        renderer.render(scene, camera, velTexture, false); // render(scene, camera, renderTarget, forceClear)
        renderer.render(scene, camera, prevVelTexture, false);
    };

    this.process = function(shader, target)
    {
        // use euler1 to compute the velocity
        shader.setPrevVelTexture(prevVelTexture);
        mesh.material = shader.euler1;
        renderer.render(scene, camera, velTexture, false);

        // use euler2 to compute the position
        shader.setVelTexture(velTexture);
        mesh.material = shader.euler2;
        renderer.render(scene, camera, target, false);

        // Swap the reference pointers to the velocity FBO for ping-pong
        var buffer = velTexture;
        velTexture = prevVelTexture;
        prevVelTexture = buffer;
    };
};

GPGPU.Simulation = function(shaderText, clothWidth, clothHeight, texture)
{
    var init = new THREE.ShaderMaterial
    (
        {
            vertexShader: shaderText[2],
            fragmentShader: shaderText[3]
        }
    );

    var euler1 = new THREE.ShaderMaterial
    (
        {
            uniforms:
                {
                    width: { type: "f", value: clothWidth },
                    texVelocity: { type: "t", value: texture },
                    texPosition: { type: "t", value: texture },
                },

            vertexShader: shaderText[4],
            fragmentShader: shaderText[5]
        }
    );

    var euler2 = new THREE.ShaderMaterial
    (
        {
            uniforms:
                {
                    texVelocity: { type: "t", value: texture },
                    texPosition: { type: "t", value: texture },
                    origin: { type: "t", value: texture },
                    isStart: { type: "i", value: 1 },
                },
            vertexShader: shaderText[6],
            fragmentShader: shaderText[7]
        }
    );

    return {

        init: init,
        euler1: euler1,
        euler2: euler2,

        setPosTexture: function(position)
        {
            euler1.uniforms.texPosition.value = position;
            euler2.uniforms.texPosition.value = position;
            return this;
        },

        setVelTexture: function(velocity)
        {
            euler2.uniforms.texVelocity.value = velocity;
            return this;
        },

        setStart: function(isStart)
        {
            euler2.uniforms.isStart.value = isStart;
            return this;
        },

        setPrevVelTexture: function(velocity)
        {
            euler1.uniforms.texVelocity.value = velocity;
            return this;
        },
    }
};