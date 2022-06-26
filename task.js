window.onload = init;

let bigCube, bigCubeGeometry, scene, camera, renderer, smallFigure, bigCubeMaterials;
let materialsXY, materialsZX, materialsZY;
let hexagonalPrismXY, hexagonalPrismZX, hexagonalPrismZY;
let hexagonalPrismGeomXY, hexagonalPrismGeomZX, hexagonalPrismGeomZY;

class hexagonalPrismGeom
{
    // points - набор точек (с 1 по 6 точки - вершины нижнего основания, с 7 по 12 - вершины верхнего основания)
    constructor(points)
    {
        if(points.length != 12) throw new SyntaxError("Неверно задан массив точек для шестиугольной призмы.");
        this.lowerGround = [];
        this.upperGround = [];
        for(let i = 0; i < 6; ++i) this.lowerGround.push(points[i]);
        for(let i = 6; i < 12; ++i) this.upperGround.push(points[i]);

        this.faces = 
        [
            // - нижнее основание
            new THREE.Face3(0, 1, 2),
            new THREE.Face3(0, 2, 3),
            new THREE.Face3(3, 4, 5),
            new THREE.Face3(3, 5, 0),
            // - верхнее основание
            new THREE.Face3(6, 7, 8),
            new THREE.Face3(6, 8, 9),
            new THREE.Face3(9, 10, 11),
            new THREE.Face3(9, 11, 6),
            // - 0-1 боковая грань
            new THREE.Face3(0, 6, 7),
            new THREE.Face3(0, 7, 1),
            // - 1-2 боковая грань
            new THREE.Face3(1, 2, 8),
            new THREE.Face3(1, 8, 7),
            // - 2-3 боковая грань
            new THREE.Face3(2, 3, 9),
            new THREE.Face3(2, 9, 8),

            // - 3-4 боковая грань
            new THREE.Face3(3, 4, 10),
            new THREE.Face3(3, 10, 9),

            // - 4-5 боковая грань
            new THREE.Face3(4, 5, 11),
            new THREE.Face3(4, 11, 10),

            // - 5-0 боковая грань
            new THREE.Face3(5, 0, 6),
            new THREE.Face3(5, 6, 11),
        ];

        this.geom = new THREE.Geometry();
        this.geom.vertices = points;
        this.geom.faces = this.faces;
        this.geom.computeFaceNormals();
        this.geom.computeVertexNormals();
    }

    // -изменение высоты происходит из-за изменения координат точек верхнего основания
    setHeightX(height)
    {
        for(let vert of this.upperGround) vert.x = height;
        this.geom.verticesNeedUpdate = true;
        this.geom.computeFaceNormals();
    }

    setHeightY(height)
    {
        for(let vert of this.upperGround) vert.y = height;
        this.geom.verticesNeedUpdate = true;
        this.geom.computeFaceNormals();
    }

    setHeightZ(height)
    {
        for(let vert of this.upperGround) vert.z = height;
        this.geom.verticesNeedUpdate = true;
        this.geom.computeFaceNormals();
    }

    clone()
    {
        return this.geom.clone();
    }

    getGeom()
    {
        return this.geom;
    }

    update()
    {
        this.geom.verticesNeedUpdate = true;
        this.geom.computeFaceNormals();
    }
}

class triangularPrismGeom
{
    #lowerGround = [];
    #upperGround = [];
    #xyz = 0;

    constructor(points, height, xyz)
    {
        if(points.length != 3) throw new SyntaxError("Неверно задан массив точек для треугольной призмы.");
        this.#xyz = xyz;
        this.#lowerGround = points;
        let pointsCopy = [];

        for(let point of points) { pointsCopy.push(new THREE.Vector3(point.x, point.y, point.z)); }

        for(let point of pointsCopy)
        {
            if(xyz == 0) point.y = height;
            else if(xyz == 1) point.z = height;
            else point.x = height;
            this.#upperGround.push(point);
        }

        this.faces = 
        [
            // - нижнее основание
            new THREE.Face3(0, 1, 2),
            // - верхнее основание
            new THREE.Face3(3, 4, 5),
            // - боковые грани
            new THREE.Face3(0, 3, 4),
            new THREE.Face3(0, 4, 1),

            new THREE.Face3(1, 4, 5),
            new THREE.Face3(1, 5, 2),

            new THREE.Face3(0, 3, 5),
            new THREE.Face3(0, 5, 2),
        ];

        this.geom = new THREE.Geometry();
        this.geom.vertices = this.#lowerGround.concat(this.#upperGround);
        this.geom.faces = this.faces;
        console.log(this.geom.vertices, this.geom.faces);
        this.geom.computeFaceNormals();
        this.geom.computeVertexNormals();
    }

    setHeight(newHeight)
    {
        for(let vert of this.upperGround)
        {
            if(this.#xyz == 0) vert.y = newHeight;
            else if(this.#xyz == 1) vert.z = newHeight;
            else vert.x = newHeight;
        }
        this.geom.verticesNeedUpdate = true;
        this.geom.computeFaceNormals();
    }

    getGeom()
    {
        return this.geom;
    }

    update()
    {
        this.geom.verticesNeedUpdate = true;
        this.geom.computeFaceNormals();
    }
}

function getgVolume(t, T)
{
    return (3*T*t*t - 2*t*t*t);
}

function showStraightProblemUI(show)
{
    let straightProblemDiv = document.getElementById('straight-problem-div');
    if(show)
    {
        straightProblemDiv.style.display = 'block';   
    }
    else
    {
        straightProblemDiv.style.display = 'none';
    }
}

function showProjectionsUI(show)
{
    let projectionsDiv = document.getElementById('projections-div');
    if(show)
    {
        projectionsDiv.style.display = 'block';   
    }
    else
    {
        projectionsDiv.style.display = 'none';   
    }
}

function updateSmallFigure(t, T, smallFigure)
{
    let vertices = 
    [
        //нижнее основание
        new THREE.Vector3(0, 0, 0), // - A[0]
        new THREE.Vector3(t, 0, 0), // - B[1]
        new THREE.Vector3(t, 0, t), // - C[2]
        new THREE.Vector3(0, 0, t), // - D[3]
        //правый бок в середине
        new THREE.Vector3(T, T - t, T), // - E[4]
        new THREE.Vector3(T - t, T - t, T), // - F[5]
        //верхнее основание
        new THREE.Vector3(T, T, T), // - G[6]
        new THREE.Vector3(T - t, T, T), // - H[7]
        new THREE.Vector3(T - t, T, T - t), // - K[8]
        new THREE.Vector3(T, T, T - t), // - L[9]
        //передняя грань
        new THREE.Vector3(T, T - t, T - t), // - P[10]
                                            // - E[4]
        //задняя грань
        new THREE.Vector3(0, t, t), // - S[11]
                                        // - N[12]
        //левый бок в середине
        new THREE.Vector3(0, t, 0), // - N[12]
        new THREE.Vector3(t, t, 0), // - M[13]
    ];


    smallFigure.children.forEach
    (
        function (e) 
        {
            e.geometry.vertices = vertices;
            e.geometry.verticesNeedUpdate = true;
            e.geometry.computeFaceNormals();
        }
    );
}

function updatet(t)
{
    let tValUI = document.getElementById('tVal');
    tValUI.innerHTML = `t = ${t}`;
}

function updateT(T)
{
    let TValUI = document.getElementById('TVal');
    TValUI.innerHTML = `T = ${T}`;
}

function updategVolumeVal(t, T)
{
    let gVolumeUI = document.getElementById('gVolume');
    gVolumeUI.innerHTML = `${getgVolume(t, T)}`;
}

function updateGVolumeVal(T)
{
    let GVolumeUI = document.getElementById("GVolume");            
    GVolumeUI.innerHTML = `${T*T*T}`;
}

function updateProbabilityVal(t, T)
{
    let probabilityUI = document.getElementById("probability"); 
    let probability = getgVolume(t, T) / (T*T*T);
    console.log(probability);
    probabilityUI.innerText = `${probability}`;
}

function updateAllTextElems(t, T)
{
    updatet(t);
    updateT(T);
    updateGVolumeVal(T);
    updategVolumeVal(t, T);
    updateProbabilityVal(t, T);
}

function showProjections(hexagonalPrismXY, hexagonalPrismGeomZX, hexagonalPrismGeomZY, visibility)
{
    hexagonalPrismXY.visible = visibility;
    hexagonalPrismGeomZX.visible = visibility;
    hexagonalPrismGeomZY.visible = visibility;
}

function getCubeGeomSubstructedByXYZY(t, T)
{
    let vertices = 
    [
        new THREE.Vector3(0, 0, 0), // - A[0]
        new THREE.Vector3(t, 0, 0), // - B[1]
        new THREE.Vector3(T, 0, T-t), // - C[2]
        new THREE.Vector3(0, 0, t), // - D[3]

        new THREE.Vector3(T, T-t, T), // - E[4]
        new THREE.Vector3(T-t, T-t, T), // - F[5]

        new THREE.Vector3(T, T, T), // - G[6]
        new THREE.Vector3(T-t, T, T), // - H[7]
        new THREE.Vector3(0, T, t), // - K[8]
        new THREE.Vector3(T, T, T-t), // - L[9]

        new THREE.Vector3(0, t, 0), // - N[10]
        new THREE.Vector3(t, t, 0), // - M[11]
    ];

    let faces = 
    [
        // - нижнее основание
        new THREE.Face3(0, 1, 2),
        new THREE.Face3(0, 2, 3),
        // - нижнее основание -> боковая грань правая
        new THREE.Face3(2, 3, 4),
        new THREE.Face3(3, 4, 5),
        // - боковая грань правая
        new THREE.Face3(4, 5, 6),
        new THREE.Face3(5, 6, 7),
        // - верхнее основание
        new THREE.Face3(6, 7, 8),
        new THREE.Face3(6, 8, 9),
        // - верхнее основание -> боковая грань левая
        new THREE.Face3(8, 9, 10),
        new THREE.Face3(9, 10, 11),
        // - боковая грань левая -> нижнее основание
        new THREE.Face3(10, 11, 0),
        new THREE.Face3(11, 0, 1),
        // - передняя левая грань (BCLM)
        new THREE.Face3(1, 2, 9),
        new THREE.Face3(1, 9, 11),
        // - передняя правая грань (CEGL)
        new THREE.Face3(2, 4, 6),
        new THREE.Face3(2, 6, 9),
        // - задняя левая грань (ADKN)
        new THREE.Face3(0, 3, 8),
        new THREE.Face3(0, 8, 10),
        // - задняя правая грань (DFHK)
        new THREE.Face3(3, 5, 7),
        new THREE.Face3(3, 7, 8)
    ]

    let geom = new THREE.Geometry();
    geom.vertices = vertices;
    geom.faces = faces;
    geom.computeFaceNormals();
    geom.computeVertexNormals();

    return geom;
}

function getFinalSmallFigGeom(t, T)
{
    //                   - Создание малой (зависит от t/T) фигуры внутри куба и добавление ее на сцену
    let vertices = [
        //нижнее основание
        new THREE.Vector3(0, 0, 0), // - A[0]
        new THREE.Vector3(t, 0, 0), // - B[1]
        new THREE.Vector3(t, 0, t), // - C[2]
        new THREE.Vector3(0, 0, t), // - D[3]
        //правый бок в середине
        new THREE.Vector3(T, T - t, T), // - E[4]
        new THREE.Vector3(T - t, T - t, T), // - F[5]
        //верхнее основание
        new THREE.Vector3(T, T, T), // - G[6]
        new THREE.Vector3(T - t, T, T), // - H[7]
        new THREE.Vector3(T - t, T, T - t), // - K[8]
        new THREE.Vector3(T, T, T - t), // - L[9]
        //передняя грань
        new THREE.Vector3(T, T - t, T - t), // - P[10]
                                            // - E[4]
        //задняя грань
        new THREE.Vector3(0, t, t), // - S[11]
                                        // - N[12]
        //левый бок в середине
        new THREE.Vector3(0, t, 0), // - N[12]
        new THREE.Vector3(t, t, 0), // - M[13]
    ];

    const faces = [
        // - нижнее основание
        new THREE.Face3(0, 2, 1), // - A-C-B
        new THREE.Face3(3, 2, 0), // - D-C-A
        // - нижнее основание -> правая грань
        new THREE.Face3(2, 3, 4), // - C-D-E
        new THREE.Face3(3, 5, 4), // - D-F-E
        // - правая грань -> верхнее основание
        new THREE.Face3(4, 5, 6), // - E-F-G
        new THREE.Face3(5, 7, 6), // - F-H-G
        // - верхнее основание
        new THREE.Face3(6, 9, 8), // - G-L-K
        new THREE.Face3(6, 8, 7), // - G-K-H
        // - передняя грань
        new THREE.Face3(6, 4, 10), // - G-E-P
        new THREE.Face3(6, 10, 9), // - G-P-L
        // - нижнее основание -> передняя грань
        new THREE.Face3(1, 10, 2), // - B-P-C
        new THREE.Face3(10, 4, 2), // - P-E-C
        // - верхнее основание -> левая грань
        new THREE.Face3(9, 12, 8), // - L-N-K
        new THREE.Face3(9, 13, 12), // - L-M-N
        // - левая грань
        new THREE.Face3(0, 1, 13), // - A-B-M
        new THREE.Face3(0, 13, 12), // - A-M-N
        // - передняя грань -> левая грань (LPBM)
        new THREE.Face3(1, 13, 9), // - B-M-L
        new THREE.Face3(1, 9, 10), // - B-L-P
        // - задняя грань
        new THREE.Face3(0, 11, 3), // - A-S-D
        new THREE.Face3(0, 12, 11), // - A-N-S
        // - верхнее основание -> задняя грань
        new THREE.Face3(8, 7, 11), // - K-H-S
        new THREE.Face3(8, 11, 12), // - K-S-N
        // - правая грань -> задняя грань (HFDS)
        new THREE.Face3(5, 3, 11), // - F-D-S
        new THREE.Face3(5, 11, 7), // - F-S-H
    ];

    let geom = new THREE.Geometry();
    geom.vertices = vertices;
    geom.faces = faces;
    geom.computeFaceNormals();
    geom.computeVertexNormals();

    return geom;
}

function init()
{
    showStraightProblemUI(true);
    showProjectionsUI(false);
    //                             - Кнопки, слайдеры, текстовые поля ui и переменные
    // - Прямая задача

    let tValUI = document.getElementById('tVal');
    let tSliderUI = document.getElementById("t-slider");
    let TValUI = document.getElementById('TVal');
    let TSliderUI = document.getElementById("T-slider");
    let T = parseFloat(TSliderUI.value);                                // - Значение T из слайдера
    let startT = T;
    let prevT = T;                                                      // - Предыдущее значение T до перемещения ползунка
    let t = parseFloat(tSliderUI.value);                                // - Значение t из слайдера
    let prevt = t;                                                      // - Предыдущее значение t до перемещения ползунка

    updateAllTextElems(t, T);

    let TValForReversedTask = document.getElementById("TVal-reversed-task-lbl");
    TValForReversedTask.style.display = 'none';

    let visibleBigFigUI = document.getElementById('visibleBigFigure'); 
    let visibleSmallFigUI = document.getElementById('visibleSmallFigure');  

    tSliderUI.oninput = function(e)
    {
        t = parseFloat(e.target.value);
        if(t > T)
        {
            // Если пользователь хочет сделать t > T либо T < t с помощью ползунков
            t = prevt;
            T = prevT;
            TSliderUI.value = T;
            tSliderUI.value = t;
        }
        else
        {
            debugger;
            prevt = t;
            prevT = T;
            updateAllTextElems(t, T);
            updateSmallFigure(t, T, smallFigure);
            renderer.render(scene, camera);
        }
    };

    TSliderUI.oninput = function(e)
    {
        T = parseFloat(e.target.value);
        if(t > T)
        {
            // Если пользователь хочет сделать t > T либо T < t с помощью ползунков
            t = prevt;
            T = prevT;
            TSliderUI.value = T;
            tSliderUI.value = t;
        }
        else
        {
            prevt = t;
            prevT = T;
            updateAllTextElems(t, T);

            updateSmallFigure(t, T, smallFigure);

            scene.remove(bigCube);
            bigCubeGeometry = new THREE.BoxGeometry(T, T, T);
            bigCube = new THREE.SceneUtils.createMultiMaterialObject(bigCubeGeometry, bigCubeMaterials);
            bigCube.position.set(T/2, T/2, T/2);
            scene.add(bigCube);

            renderer.render(scene, camera);
        }
    };

    visibleBigFigUI.oninput = function(e)
    {
        if(e.target.checked) bigCube.visible = true;
        else bigCube.visible = false;
        renderer.render(scene, camera);
        console.log(scene.getObjectByName('bigCube'));
    };  
    
    visibleSmallFigUI.oninput = function(e)
    {
        if(e.target.checked) smallFigure.visible = true;
        else smallFigure.visible = false;
        renderer.render(scene, camera);
    };

    // - Проекции

    let projectionsBtn = document.getElementById('projections-turn');
    projectionsBtn.onclick = function(e)
    {
        showStraightProblemUI(false);
        smallFigure.visible = false;
        showProjectionsUI(true);
        showProjections(hexagonalPrismXY, hexagonalPrismZX, hexagonalPrismZY, true);

        scene.remove(bigCube);
        bigCubeGeometry = new THREE.BoxGeometry(startT, startT, startT);
        bigCube = new THREE.SceneUtils.createMultiMaterialObject(bigCubeGeometry, bigCubeMaterials);
        bigCube.position.set(startT/2, startT/2, startT/2);
        scene.add(bigCube);

        renderer.render(scene, camera);
    }

    let startt = t;
    let prismHeight = 0;

    let xyAnimDoing = true;
    let zxAnimDoing = false;
    let zyAnimDoing = false;
    const growthSpeed = 0.05;

    let prjAinmBtn = document.getElementById('prj-anim');
    let projectionsAnimId = null;
    function prjAnim(e)
    {

        bigCubeMaterials = [
            new THREE.MeshBasicMaterial({color: 0x000, wireframe: true}), 
            new THREE.MeshLambertMaterial({color: 0x7777ff, side: THREE.DoubleSide, transparent: true, opacity: 0.5})
        ];

        prismHeight += growthSpeed;
        if(xyAnimDoing)
        {
            hexagonalPrismGeomXY.setHeightY( prismHeight );
            if(prismHeight >= startT) 
            {
                scene.remove(hexagonalPrismXY);
                scene.remove(bigCube);
                bigCubeGeometry = hexagonalPrismGeomXY.clone();
                bigCube = new THREE.SceneUtils.createMultiMaterialObject(bigCubeGeometry, bigCubeMaterials);
                scene.add(bigCube);
                prismHeight = 0;
                xyAnimDoing = false;
                zyAnimDoing = true;

            }
        }
        if(zyAnimDoing)
        {
            hexagonalPrismGeomZY.setHeightX( prismHeight );
            if(prismHeight >= startT) 
            {
                scene.remove(hexagonalPrismZY);
                scene.remove(bigCube);
                bigCubeGeometry = getCubeGeomSubstructedByXYZY(startt, startT);
                bigCube = new THREE.SceneUtils.createMultiMaterialObject(bigCubeGeometry, bigCubeMaterials);
                //bigCube.position.set(startT / 2, startT / 2, startT / 2);
                scene.add(bigCube);
                prismHeight = 0;
                zyAnimDoing = false;
                zxAnimDoing = true;
            }
        }
        if(zxAnimDoing)
        {
            hexagonalPrismGeomZX.setHeightZ( prismHeight );
            if(prismHeight >= startT) 
            {
                //bigCube = bigCube - hexagonalPrismXY - hexagonalPrismZX
                scene.remove(hexagonalPrismZX);
                scene.remove(bigCube);
                bigCubeGeometry = getFinalSmallFigGeom(startt, startT);
                bigCube = new THREE.SceneUtils.createMultiMaterialObject(bigCubeGeometry, bigCubeMaterials);
                //bigCube.position.set(startT / 2, startT / 2, startT / 2);
                scene.add(bigCube);
                prismHeight = 0;
                zyAnimDoing = false;
                zxAnimDoing = true;
            }
        }

        renderer.render(scene, camera);

        if(prismHeight < startT)
        {
            if(projectionsAnimId != null) 
            {
                cancelAnimationFrame(projectionsAnimId);
                projectionsAnimId = null;
            }
            projectionsAnimId = requestAnimationFrame(prjAnim);
        } 
    }

    prjAinmBtn.onclick = prjAnim;


    let backBtn = document.getElementById('back');
    backBtn.onclick = function(e)
    {
        if(scene.getObjectByName('hexagonalPrismXY') === undefined) scene.add(hexagonalPrismXY);
        if(scene.getObjectByName('hexagonalPrismZX') === undefined) scene.add(hexagonalPrismZX);
        if(scene.getObjectByName('hexagonalPrismZY') === undefined) scene.add(hexagonalPrismZY);
        scene.remove(scene.getObjectByName('triPrismXY'));
        scene.remove(scene.getObjectByName('triPrismZY'));
        scene.remove(scene.getObjectByName('intersFig'));
        prismHeight = 0;

        xyAnimDoing = true;
        zxAnimDoing = false;
        zyAnimDoing = false;
        cancelAnimationFrame(projectionsAnimId);
        hexagonalPrismGeomXY.setHeightY( prismHeight );
        hexagonalPrismGeomZX.setHeightZ( prismHeight );
        hexagonalPrismGeomZY.setHeightX( prismHeight );
        showStraightProblemUI(true);
        smallFigure.visible = visibleSmallFigUI.checked;
        showProjectionsUI(false);
        showProjections(hexagonalPrismXY, hexagonalPrismZX, hexagonalPrismZY, false);
        scene.remove(bigCube);
        bigCubeGeometry = new THREE.BoxGeometry(T, T, T);
        bigCubeMaterials = [
            new THREE.MeshBasicMaterial({color: 0x000, wireframe: true}), 
            new THREE.MeshLambertMaterial({color: 0x7777ff, side: THREE.DoubleSide, transparent: true, opacity: 0.5})
        ];
        bigCube = new THREE.SceneUtils.createMultiMaterialObject(bigCubeGeometry, bigCubeMaterials);
        bigCube.position.set(T/2, T/2, T/2);
        scene.add(bigCube);
        renderer.render(scene, camera);
    }

    let prismsHeightXY = document.getElementById('prisms-height-xy');
    prismsHeightXY.oninput = function(e)
    { 
        hexagonalPrismGeomXY.setHeightY( parseFloat( prismsHeightXY.value ) ); renderer.render(scene, camera); 
    }
    let prismsHeightZY = document.getElementById('prisms-height-zy');
    prismsHeightZY.oninput = function(e) { 
        hexagonalPrismGeomZY.setHeightX( parseFloat( prismsHeightZY.value ) ); renderer.render(scene, camera);
    }
    let prismsHeightZX = document.getElementById('prisms-height-zx');
    prismsHeightZX.oninput = function(e) { 
        hexagonalPrismGeomZX.setHeightZ( parseFloat( prismsHeightZX.value ) ); renderer.render(scene, camera);
    }
    let upperGroundZ = prismsHeightXY.value;

    let visibletriPrisms = document.getElementById('visible-triprisms');
    visibletriPrisms.onclick = function(e)
    {
        debugger;
        if(e.target.checked)
        {
            showProjections(hexagonalPrismXY, hexagonalPrismZX, hexagonalPrismZY, false);
            scene.remove(bigCube);

            let xyPoints1 = [new THREE.Vector3(startt, 0, 0), new THREE.Vector3(startT, 0, startt), new THREE.Vector3(startT, 0, 0)];
            let triPrismGeomXY = new triangularPrismGeom(xyPoints1, startT, 0);
            let xymaterials = [
                new THREE.MeshPhongMaterial({color: 0xf70000, side: THREE.DoubleSide, transparent: true, opacity: 0.4}),
                new THREE.MeshBasicMaterial({color: 0xf70000, wireframe: true})
            ];
            let triPrismXY1 = new THREE.SceneUtils.createMultiMaterialObject(triPrismGeomXY.getGeom(), xymaterials);
            triPrismXY1.name = "triPrismXY";
            scene.add(triPrismXY1);

            let xyPoints2 = [new THREE.Vector3(0, 0, startt), new THREE.Vector3(startt, 0, startT), new THREE.Vector3(0, 0, startT)];
            let triPrismGeomXY2 = new triangularPrismGeom(xyPoints2, startT, 0);
            let triPrismXY2 = new THREE.SceneUtils.createMultiMaterialObject(triPrismGeomXY2.getGeom(), xymaterials);
            triPrismXY2.name = "triPrismXY2";
            //scene.add(triPrismXY2);

            let zyPoints = [new THREE.Vector3(0, startt, 0), new THREE.Vector3(0, startT, startt), new THREE.Vector3(0, startT, 0)];
            let triPrismGeomZY = new triangularPrismGeom(zyPoints, startT, 2);
            let zymaterials = [
                new THREE.MeshPhongMaterial({color: 0xd4ff00, side: THREE.DoubleSide, transparent: true, opacity: 0.4}),
                new THREE.MeshBasicMaterial({color: 0xd4ff00, wireframe: true})
            ];
            let triPrismZY = new THREE.SceneUtils.createMultiMaterialObject(triPrismGeomZY.getGeom(), zymaterials);
            triPrismZY.name = "triPrismZY";
            scene.add(triPrismZY);

            let intersPoints = [new THREE.Vector3(startT, startt, 0), new THREE.Vector3(startT, startT, 0), 
            new THREE.Vector3(startt, startT, 0), new THREE.Vector3(startt, startt, 0), new THREE.Vector3(startT, startT, startt)];
            let intersFaces = [new THREE.Face4(0, 1, 2, 3), new THREE.Face3(0, 1, 4), new THREE.Face3(1, 2, 4), 
            new THREE.Face3(2, 3, 4), new THREE.Face3(0, 3, 4)];

            const intersGeom = new THREE.Geometry();
            intersGeom.vertices = intersPoints;
            intersGeom.faces = intersFaces;
            intersGeom.computeFaceNormals();
            intersGeom.computeVertexNormals();

            const intersMaterials = [
                new THREE.MeshPhongMaterial({color: 0xeee, side: THREE.DoubleSide}),
                new THREE.MeshBasicMaterial({color: 0xeee, wireframe: true})
            ];

            let intersFig = new THREE.SceneUtils.createMultiMaterialObject(intersGeom, intersMaterials);
            intersFig.name = "intersFig";
            scene.add(intersFig);

            let zyPoints2 = [new THREE.Vector3(0, 0, startt), new THREE.Vector3(0, startt, startT), new THREE.Vector3(0, 0, startT)];
            let triPrismGeomZY2 = new triangularPrismGeom(zyPoints2, startT, 2);
            let triPrismZY2 = new THREE.SceneUtils.createMultiMaterialObject(triPrismGeomZY2.getGeom(), zymaterials);
            triPrismZY2.name = "triPrismZY2";
            //scene.add(triPrismZY2);

            renderer.render(scene, camera);
        }
        else
        {
            showProjections(hexagonalPrismXY, hexagonalPrismZX, hexagonalPrismZY, true);
            scene.add(bigCube);
            scene.remove(scene.getObjectByName('triPrismXY'));
            scene.remove(scene.getObjectByName('triPrismZY'));
            scene.remove(scene.getObjectByName('intersFig'));
            renderer.render(scene, camera);
        }
    }

    /*let XYPrismOpacity = document.getElementById('prisms-xy-opacity');
    XYPrismOpacity.oninput = function(e)
    {
        //console.log(e.target.value);
        //console.log(scene.getObjectByName('hexagonalPrismXY'));
        scene.remove(scene.getObjectByName('hexagonalPrismXY'));
        //console.log(scene.getObjectByName('hexagonalPrismXY'));
        materialsXY = [
            new THREE.MeshLambertMaterial({color: 0x44ff44, side: THREE.DoubleSide, transparent: true, opacity: parseFloat(e.target.value)}),
            new THREE.MeshBasicMaterial({color: 0x44ff44, wireframe: true})
        ];
        hexagonalPrismXY = new THREE.SceneUtils.createMultiMaterialObject(hexagonalPrismGeomXY.getGeom(), materialsXY);
        hexagonalPrismXY.name = "hexagonalPrismXY";
        scene.add(hexagonalPrismXY);

        renderer.render(scene, camera);
    }*/

    //                          - Создание сцены
    scene = new THREE.Scene();

    // - Создание камеры и ее настройка
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.x = 25;
    camera.position.y = 15;
    camera.position.z = 8;
    const rotationSpeed = 0.03;         // - Скорость вращения камеры
    let speed = 20;
    camera.lookAt(scene.position);
    scene.add(camera);

    //                      - Создание осей и добавление их на сцену
    // - Красная ось - OX, синяя - OY, зеленая - OZ
    const axes = new THREE.AxisHelper(20);
    axes.position.set(0, 0, 0);
    scene.add(axes);

    //                     - Создание большого куба (куб с ребром = T) и добавление его на сцену

    bigCubeGeometry = new THREE.BoxGeometry(T, T, T);
    const bigCubeMaterial = new THREE.MeshBasicMaterial({color: 0x000, wireframe: true});
    const bigCubeMaterial2 = new THREE.MeshLambertMaterial({color: 0x7777ff, transparent: true, opacity: 0.5});
    bigCubeMaterial.castShadow = true;
    bigCubeMaterial2.castShadow = true;
    bigCubeMaterials = [bigCubeMaterial, bigCubeMaterial2];

    bigCube = new THREE.SceneUtils.createMultiMaterialObject(bigCubeGeometry, bigCubeMaterials);
    bigCube.name = "bigCube";
    bigCube.position.set(T/2, T/2, T/2);
    scene.add(bigCube);

    //                   - Создание малой (зависит от t/T) фигуры внутри куба и добавление ее на сцену

    const geom = getFinalSmallFigGeom(t, T);

    const smallmaterials = [
        new THREE.MeshLambertMaterial({color: 0x44ff44, side: THREE.DoubleSide}),
        new THREE.MeshBasicMaterial({color: 0x44ff44, wireframe: true})

    ];

    smallFigure = THREE.SceneUtils.createMultiMaterialObject(geom, smallmaterials);
    scene.add(smallFigure);

    //                   - Создание проекций и добавление их на сцену
    // - Линии
    let prismVertices = 
    [
        // - нижнее основание
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(t, 0, 0),
        new THREE.Vector3(T, 0, T - t),
        new THREE.Vector3(T, 0, T),
        new THREE.Vector3(T - t, 0, T),
        new THREE.Vector3(0, 0, t),
        // - верхнее основание
        new THREE.Vector3(0, upperGroundZ, 0),
        new THREE.Vector3(t, upperGroundZ, 0),
        new THREE.Vector3(T, upperGroundZ, T - t),
        new THREE.Vector3(T, upperGroundZ, T),
        new THREE.Vector3(T - t, upperGroundZ, T),
        new THREE.Vector3(0, upperGroundZ, t),
    ];

    // -PrismXY
    hexagonalPrismGeomXY = new hexagonalPrismGeom(prismVertices);

    materialsXY = [
        new THREE.MeshPhongMaterial({color: 0x44ff44, side: THREE.DoubleSide}),
        new THREE.MeshBasicMaterial({color: 0x44ff44, wireframe: true})
    ];

    hexagonalPrismXY = THREE.SceneUtils.createMultiMaterialObject(hexagonalPrismGeomXY.getGeom(), materialsXY);
    hexagonalPrismXY.name = "hexagonalPrismXY";
    scene.remove(scene.getChildByName("hexagonalPrismXY"));
    scene.add(hexagonalPrismXY);

    // -PrismZY
    const verticesZY = hexagonalPrismGeomXY.clone().vertices;
    for(let vert of verticesZY)
    {
        vert.y = vert.z;
        vert.z = vert.x;
        vert.x = 0;
    }
    materialsZY = [
        new THREE.MeshPhongMaterial({color: 0xf70000, side: THREE.DoubleSide}),
        new THREE.MeshBasicMaterial({color: 0xf70000, wireframe: true})

    ];
    hexagonalPrismGeomZY = new hexagonalPrismGeom(verticesZY);
    hexagonalPrismZY = THREE.SceneUtils.createMultiMaterialObject(hexagonalPrismGeomZY.getGeom(), materialsZY);
    hexagonalPrismZY.children.forEach(function (e) {
        e.castShadow = true
    });

    hexagonalPrismZY.name = "hexagonalPrismZY";
    scene.remove(scene.getChildByName("hexagonalPrismZY"));
    scene.add(hexagonalPrismZY);

    // -PrismZX
    const verticesZX = hexagonalPrismGeomXY.clone().vertices;
    for(let vert of verticesZX)
    {
        vert.y = vert.z;
        vert.z = 0;
    }
    materialsZX = [
        new THREE.MeshPhongMaterial({color: 0x0f67f5, side: THREE.DoubleSide}),
        new THREE.MeshBasicMaterial({color: 0x0f67f5, wireframe: true})

    ];

    hexagonalPrismGeomZX = new hexagonalPrismGeom(verticesZX);
    hexagonalPrismZX = THREE.SceneUtils.createMultiMaterialObject(hexagonalPrismGeomZX.getGeom(), materialsZX);
    hexagonalPrismZX.children.forEach(function (e) {
        e.castShadow = true
    });

    hexagonalPrismZX.name = "hexagonalPrismZX";
    scene.remove(scene.getChildByName("hexagonalPrismZX"));
    scene.add(hexagonalPrismZX);

    showProjections(hexagonalPrismXY, hexagonalPrismZX, hexagonalPrismZY, false);

    //                      - Освещение
    const spotLight = new THREE.SpotLight( 0xffffff );
    spotLight.position.set( 100, 100, 100 );
    spotLight.castShadow = true;
    spotLight.target = bigCube;
    scene.add(spotLight);

    const spotLight2 = new THREE.SpotLight( 0xffffff );
    spotLight2.position.set( -100, -100, -100 );
    spotLight2.castShadow = true;
    spotLight2.target = bigCube;
    scene.add(spotLight2);

    //                     - Создание объекта для рендеринга мира
    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(new THREE.Color(0xFFFFFF));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMapEnabled = true;
    renderer.antialias = true;
    document.getElementById("WebGL-output").appendChild(renderer.domElement);


    let orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.autoRotate = false;
    let clock = new THREE.Clock();
    let cameraMove = false;
    const cameraMoveBtn = document.getElementById('camera-move');
    cameraMoveBtn.onclick = function()
    {
        let requsetId;
        if(cameraMove)
        {
            cameraMoveBtn.innerText = 'Свободное движение камеры';
            cancelAnimationFrame(requsetId);
        } 
        else
        {
            cameraMoveBtn.innerText = 'Остановить движение';
            requsetId = requestAnimationFrame(
                function animate(time) 
                { 
                    let delta = clock.getDelta();
                    orbitControls.update(delta);
                    if(cameraMove) requestAnimationFrame(animate);
                    renderer.render(scene, camera);
                }
            );
        } 
        cameraMove = !cameraMove;
    }

    renderer.render(scene, camera);
}