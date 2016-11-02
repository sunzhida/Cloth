/*
 * Global variables
 */
var meshResolution;

// Particle states
var mass;
var vertexPosition, vertexNormal;
var vertexVelocity;

// Spring properties
var K, restLength; 

// Force parameters
var Cd;
var uf, Cv;


/*
 * Getters and setters
 */
function getPosition(i, j) {
    var id = i*meshResolution + j;
    return vec3.create([vertexPosition[3*id], vertexPosition[3*id + 1], vertexPosition[3*id + 2]]);
}

function setPosition(i, j, x) {
    var id = i*meshResolution + j;
    vertexPosition[3*id] = x[0]; vertexPosition[3*id + 1] = x[1]; vertexPosition[3*id + 2] = x[2];
}

function getNormal(i, j) {
    var id = i*meshResolution + j;
    return vec3.create([vertexNormal[3*id], vertexNormal[3*id + 1], vertexNormal[3*id + 2]]);
}

function getVelocity(i, j) {
    var id = i*meshResolution + j;
    return vec3.create(vertexVelocity[id]);
}

function setVelocity(i, j, v) {
    var id = i*meshResolution + j;
    vertexVelocity[id] = vec3.create(v);
}


/*
 * Provided global functions (you do NOT have to modify them)
 */
function computeNormals() {
    var dx = [1, 1, 0, -1, -1, 0], dy = [0, 1, 1, 0, -1, -1];
    var e1, e2;
    var i, j, k = 0, t;
    for ( i = 0; i < meshResolution; ++i )
        for ( j = 0; j < meshResolution; ++j ) {
            var p0 = getPosition(i, j), norms = [];
            for ( t = 0; t < 6; ++t ) {
                var i1 = i + dy[t], j1 = j + dx[t];
                var i2 = i + dy[(t + 1) % 6], j2 = j + dx[(t + 1) % 6];
                if ( i1 >= 0 && i1 < meshResolution && j1 >= 0 && j1 < meshResolution &&
                     i2 >= 0 && i2 < meshResolution && j2 >= 0 && j2 < meshResolution ) {
                    e1 = vec3.subtract(getPosition(i1, j1), p0);
                    e2 = vec3.subtract(getPosition(i2, j2), p0);
                    norms.push(vec3.normalize(vec3.cross(e1, e2)));
                }
            }
            e1 = vec3.create();
            for ( t = 0; t < norms.length; ++t ) vec3.add(e1, norms[t]);
            vec3.normalize(e1);
            vertexNormal[3*k] = e1[0];
            vertexNormal[3*k + 1] = e1[1];
            vertexNormal[3*k + 2] = e1[2];
            ++k;
        }
}


var clothIndex, clothWireIndex;
function initMesh() {
    var i, j, k;

    vertexPosition = new Array(meshResolution*meshResolution*3);
    vertexNormal = new Array(meshResolution*meshResolution*3);
    clothIndex = new Array((meshResolution - 1)*(meshResolution - 1)*6);
    clothWireIndex = [];

    vertexVelocity = new Array(meshResolution*meshResolution);
    restLength[0] = 4.0/(meshResolution - 1);
    restLength[1] = Math.sqrt(2.0)*4.0/(meshResolution - 1);
    restLength[2] = 2.0*restLength[0];

    for ( i = 0; i < meshResolution; ++i )
        for ( j = 0; j < meshResolution; ++j ) {
            setPosition(i, j, [-2.0 + 4.0*j/(meshResolution - 1), -2.0 + 4.0*i/(meshResolution - 1), 0.0]);
            setVelocity(i, j, vec3.create());

            if ( j < meshResolution - 1 )
                clothWireIndex.push(i*meshResolution + j, i*meshResolution + j + 1);
            if ( i < meshResolution - 1 )
                clothWireIndex.push(i*meshResolution + j, (i + 1)*meshResolution + j);
            if ( i < meshResolution - 1 && j < meshResolution - 1 )
                clothWireIndex.push(i*meshResolution + j, (i + 1)*meshResolution + j + 1);
        }
    computeNormals();

    k = 0;
    for ( i = 0; i < meshResolution - 1; ++i )
        for ( j = 0; j < meshResolution - 1; ++j ) {
            clothIndex[6*k] = i*meshResolution + j;
            clothIndex[6*k + 1] = i*meshResolution + j + 1;
            clothIndex[6*k + 2] = (i + 1)*meshResolution + j + 1;
            clothIndex[6*k + 3] = i*meshResolution + j;
            clothIndex[6*k + 4] = (i + 1)*meshResolution + j + 1;            
            clothIndex[6*k + 5] = (i + 1)*meshResolution + j;
            ++k;
        }
}


/*
 * KEY function: simulate one time-step using Euler's method
 */
function simulate(stepSize) {

    // code added
    let n = meshResolution;
    let Lstructural = 4/(n-1);
    let Lshear = 4*Math.sqrt(2)/(n-1);
    let Lflexion = 8/(n-1);

    var i, j;
    var Fs = [];
    for(i=0; i<n; ++i)
    {
        for(j=0; j<n; ++j)
        {
            // step 0. compute the accumulated force
            var Fspring = vec3.create([0, 0, 0]);
            var Fgravity = vec3.create([0, 0, 0]);
            var Fdamping = vec3.create([0, 0, 0]);
            var Ffliud = vec3.create([0, 0, 0]);
            var F = vec3.create([0, 0, 0]);


            // Spring Structural
            if(i-1>=0)
            {
                var tmp = vec3.create([0, 0, 0]);
                vec3.subtract(getPosition(i, j), getPosition(i-1, j), tmp);
                var scale = K[0]*(Lstructural-vec3.length(tmp));
                var Ftmp = vec3.create([0, 0, 0]);
                vec3.normalize(tmp, Ftmp);
                vec3.scale(Ftmp, scale, Ftmp);
                vec3.add(Fspring, Ftmp);
            }

            if(j+1<n)
            {
                var tmp = vec3.create([0, 0, 0]);
                vec3.subtract(getPosition(i, j), getPosition(i, j+1), tmp);
                var scale = K[0]*(Lstructural-vec3.length(tmp));
                var Ftmp = vec3.create([0, 0, 0]);
                vec3.normalize(tmp, Ftmp);
                vec3.scale(Ftmp, scale, Ftmp);
                vec3.add(Fspring, Ftmp);
            }

            if(i+1<n)
            {
                var tmp = vec3.create([0, 0, 0]);
                vec3.subtract(getPosition(i, j), getPosition(i+1, j), tmp);
                var scale = K[0]*(Lstructural-vec3.length(tmp));
                var Ftmp = vec3.create([0, 0, 0]);
                vec3.normalize(tmp, Ftmp);
                vec3.scale(Ftmp, scale, Ftmp);
                vec3.add(Fspring, Ftmp);
            }

            if(j-1>=0)
            {
                var tmp = vec3.create([0, 0, 0]);
                vec3.subtract(getPosition(i, j), getPosition(i, j-1), tmp);
                var scale = K[0]*(Lstructural-vec3.length(tmp));
                var Ftmp = vec3.create([0, 0, 0]);
                vec3.normalize(tmp, Ftmp);
                vec3.scale(Ftmp, scale, Ftmp);
                vec3.add(Fspring, Ftmp);
                // alert(Fspring);
            }

            // Spring Shear
            if(i-1>=0 && j-1>=0)
            {
                var tmp = vec3.create([0, 0, 0]);
                vec3.subtract(getPosition(i, j), getPosition(i-1, j-1), tmp);
                var scale = K[1]*(Lshear-vec3.length(tmp));
                var Ftmp = vec3.create([0, 0, 0]);
                vec3.normalize(tmp, Ftmp);
                vec3.scale(Ftmp, scale, Ftmp);
                vec3.add(Fspring, Ftmp);
            }

            if(i-1>=0 && j+1<n)
            {
                var tmp = vec3.create([0, 0, 0]);
                vec3.subtract(getPosition(i, j), getPosition(i-1, j+1), tmp);
                var scale = K[1]*(Lshear-vec3.length(tmp));
                var Ftmp = vec3.create([0, 0, 0]);
                vec3.normalize(tmp, Ftmp);
                vec3.scale(Ftmp, scale, Ftmp);
                vec3.add(Fspring, Ftmp);
            }

            if(i+1<n && j+1<n)
            {
                var tmp = vec3.create([0, 0, 0]);
                vec3.subtract(getPosition(i, j), getPosition(i+1, j+1), tmp);
                var scale = K[1]*(Lshear-vec3.length(tmp));
                var Ftmp = vec3.create([0, 0, 0]);
                vec3.normalize(tmp, Ftmp);
                vec3.scale(Ftmp, scale, Ftmp);
                vec3.add(Fspring, Ftmp);
            }

            if(i+1<n && j-1>=0)
            {
                var tmp = vec3.create([0, 0, 0]);
                vec3.subtract(getPosition(i, j), getPosition(i+1, j-1), tmp);
                var scale = K[1]*(Lshear-vec3.length(tmp));
                var Ftmp = vec3.create([0, 0, 0]);
                vec3.normalize(tmp, Ftmp);
                vec3.scale(Ftmp, scale, Ftmp);
                vec3.add(Fspring, Ftmp);
            }

            // Spring Flexion
            if(i-2>=0)
            {
                var tmp = vec3.create([0, 0, 0]);
                vec3.subtract(getPosition(i, j), getPosition(i-2, j), tmp);
                var scale = K[2]*(Lshear-vec3.length(tmp));
                var Ftmp = vec3.create([0, 0, 0]);
                vec3.normalize(tmp, Ftmp);
                vec3.scale(Ftmp, scale, Ftmp);
                vec3.add(Fspring, Ftmp);
            }

            if(j+2<n)
            {
                var tmp = vec3.create([0, 0, 0]);
                vec3.subtract(getPosition(i, j), getPosition(i, j+2), tmp);
                var scale = K[2]*(Lshear-vec3.length(tmp));
                var Ftmp = vec3.create([0, 0, 0]);
                vec3.normalize(tmp, Ftmp);
                vec3.scale(Ftmp, scale, Ftmp);
                vec3.add(Fspring, Ftmp);
            }

            if(i+2<n)
            {
                var tmp = vec3.create([0, 0, 0]);
                vec3.subtract(getPosition(i, j), getPosition(i+2, j), tmp);
                var scale = K[2]*(Lshear-vec3.length(tmp));
                var Ftmp = vec3.create([0, 0, 0]);
                vec3.normalize(tmp, Ftmp);
                vec3.scale(Ftmp, scale, Ftmp);
                vec3.add(Fspring, Ftmp);
            }

            if(j-2>=0)
            {
                var tmp = vec3.create([0, 0, 0]);
                vec3.subtract(getPosition(i, j), getPosition(i, j-2), tmp);
                var scale = K[2]*(Lshear-vec3.length(tmp));
                var Ftmp = vec3.create([0, 0, 0]);
                vec3.normalize(tmp, Ftmp);
                vec3.scale(Ftmp, scale, Ftmp);
                vec3.add(Fspring, Ftmp);
            }


            // alert(Fspring);

            Fgravity[1] = -9.8*mass;

            vec3.scale(getVelocity(i, j), -Cd, Fdamping);

            var VecTmp = vec3.create([0, 0, 0]);
            vec3.subtract(uf, getVelocity(i, j), VecTmp);
            var ScaTmp = Cv*vec3.dot(getNormal(i, j), VecTmp);
            vec3.scale(VecTmp, ScaTmp, Ffliud);

            vec3.add(Fspring, Fgravity, F);
            vec3.add(Fdamping, F, F);
            vec3.add(Ffliud, F, F);

            // alert("spring=" + Fspring.toString()+"gravity=" + Fgravity.toString()+"damping="+Fdamping.toString()+"fluid="+Ffliud.toString());

            Fs.push(F);
        }
    }

    for(i=0; i<n; ++i)
    {
        for(j=0; j<n; ++j)
        {
            if(i==n-1 && j==0) continue;
            if(i==n-1 && j==n-1) continue;

            var F = Fs[i*n+j];
            // alert(F);

            // Euler iteration
            var tmp1 = vec3.create([0, 0, 0]);

            var a = vec3.create([0, 0, 0]);
            vec3.scale(F, 1/mass, a);

            vec3.scale(a, stepSize, a);
            vec3.add(getVelocity(i, j), a, tmp1);
            setVelocity(i, j, tmp1);

            var tmp2 = vec3.create([0, 0, 0]);
            vec3.scale(getVelocity(i, j), stepSize, tmp2);
            vec3.add(getPosition(i, j), tmp2, tmp2);
            setPosition(i, j, tmp2);
        }
    }
}
