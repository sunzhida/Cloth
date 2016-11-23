var meshResolutionGPU = 25;

function clothGPU()
{
    "use strict";
    var windowWidth = 400, windowHeight = 600;
    var clothWidth = meshResolutionGPU, clothHeight = meshResolutionGPU;
    var count = 0;

    var renderer;
    var material;
    var mesh;
    var geometry;
    var scene;
    var camera;

    var texture;
    var gpgpu;
    var simulation;

    // gpu computation
    var texturePos1;
    var texturePos2;

    var floatType = THREE.FloatType;

    // initial position
    var data = new Float32Array(clothWidth*clothHeight*4);
    var idx = 0;
    for (var i = 0; i < clothWidth; ++i)
    {
        for (var j = 0; j < clothHeight; ++j)
        {
            data[idx + 0] = i*1.0 / clothWidth;
            data[idx + 1] = 1.0;
            data[idx + 2] = j*1.0 / clothHeight;
            data[idx + 3] = 1.0;
            idx += 4;
        }
    }

    function init (shaderText)
    {
        var canvas = $("#canvas1")[0];

        // renderer
        renderer = new THREE.WebGLRenderer
        (
            {
                canvas: canvas,
                antialias: true,
            }
        );

        renderer.setClearColor(0x505050, 1);
        renderer.setSize(windowWidth, windowHeight);

        // scene
        scene = new THREE.Scene();

        // camera
        camera = new THREE.PerspectiveCamera(35, windowWidth/ windowHeight, 1, 100);
        camera.position.set(2, 2, -1);
        camera.lookAt(scene.position);
        scene.add(camera);

        texture = new THREE.DataTexture(data, clothWidth, clothHeight, THREE.RGBAFormat, THREE.FloatType);
        texture.needsUpdate = true;

        gpgpu = new GPGPU(renderer, clothWidth, clothHeight, floatType);

        // texture is used to initialize euler1&2's velocity and position, and origin
        simulation = new GPGPU.Simulation(shaderText, clothWidth, clothHeight, texture);

        // for ping-pong
        texturePos1 = new THREE.WebGLRenderTarget
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
                stencilBuffer: false
            }
        );

        texturePos2 = texturePos1.clone();

        geometry = new THREE.Geometry();

        for(var i=0; i<clothWidth; ++i)
        {
            for(var j=0; j<clothHeight; ++j)
            {
                var vertex = new THREE.Vector3();
                vertex.x = i*1.0 / clothWidth;
                vertex.y = j*1.0 / clothHeight;
                geometry.vertices.push(vertex);
            }
        }

        for (var x = 0; x < clothWidth - 1; ++x)
        {
            for (var y = 0; y < clothHeight - 1; ++y)
            {
                var v0 = x + clothWidth * y;
                var v1 = x + clothWidth * y + clothHeight;

                geometry.faces.push(new THREE.Face3(v1 + 1, v0, v1));
                geometry.faces.push(new THREE.Face3(v1, v0 + 1, v0));
                geometry.faces.push(new THREE.Face3(v1, v1 + 1, v0 + 1));
                geometry.faces.push(new THREE.Face3(v0 + 1, v1, v0));
                geometry.faces.push(new THREE.Face3(v1 + 1, v1, v0 + 1));
            }
        }

        var clothTexture = new THREE.TextureLoader().load('assets/texture.PNG');
        clothTexture.wrapS = clothTexture.wrapT = THREE.ClampToEdgeWrapping;

        material = new THREE.ShaderMaterial
        (
            {
                uniforms:
                    {
                        "tex": { type: "t", value: clothTexture },
                        "map": { type: "t", value: texture },
                        "width": { type: "f", value: clothWidth },
                        "height": { type: "f", value: clothHeight },
                    },
                vertexShader: shaderText[0],
                fragmentShader: shaderText[1],
            }
        );

        mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
    }

    function render ()
    {
        var timeStep = 0.001;
        var n = Math.ceil(0.01/timeStep);

        while(n > 0)
        {
            --n;
            simulation.setPosTexture(texturePos1);

            if(count < 10) // prevent the initial large velocity
            {
                // set velocity to 0
                gpgpu.init(simulation);
            }

            if(count==1) // start update
            {
                simulation.setStart(0);
            }

            gpgpu.process(simulation, texturePos2); // calculate position using euler' method on GPU
            material.uniforms.map.value = texturePos1; // update the new calculated position to show

            // Ping-pong
            var buffer = texturePos1;
            texturePos1 = texturePos2;
            texturePos2 = buffer;

            count++;
        }

        renderer.render(scene, camera);

        requestAnimationFrame(render);
    }

    loadShader
    (
        [
            'gpu_version/shaders/show.vert',
            'gpu_version/shaders/show.frag',
            'gpu_version/shaders/init.vert',
            'gpu_version/shaders/init.frag',
            'gpu_version/shaders/euler1.vert',
            'gpu_version/shaders/euler1.frag',
            'gpu_version/shaders/euler2.vert',
            'gpu_version/shaders/euler2.frag'
        ],
        function(shaderText)
        {
            init(shaderText);
            render();
        },
        function (url)
        {
            console.log('Failed to download "' + url + '"');
        }
    );

    function load(url, data, callback, errorCallback)
    {
        var request = new XMLHttpRequest();
        request.open('GET', url, true);

        request.onreadystatechange = function()
        {
            if (request.readyState == 4)
            {
                if (request.status == 200)
                {
                    callback(request.responseText, data)
                }
                else
                {
                    errorCallback(url);
                }
            }
        };

        request.send(null);
    }

    function loadShader(urls, callback, errorCallback)
    {
        var numUrls = urls.length;
        var numComplete = 0;
        var result = [];

        function partialCallback(text, urlIndex)
        {
            result[urlIndex] = text;
            numComplete++;

            if (numComplete == numUrls)
            {
                callback(result);
            }
        }

        for(var i = 0; i < numUrls; i++)
        {
            load(urls[i], i, partialCallback, errorCallback);
        }
    }
}

function changeMeshResolutionGPU(value)
{
    var id = parseInt(value, 10);
    switch(id)
    {
        case 1:
            meshResolutionGPU = 25; break;
        case 2:
            meshResolutionGPU = 100; break;
        case 3:
            meshResolutionGPU = 200; break;
    }
    clothGPU();
}