// OrbitControls implementation
(function () {
    const _changeEvent = { type: 'change' };
    const _startEvent = { type: 'start' };
    const _endEvent = { type: 'end' };

    class OrbitControls extends THREE.EventDispatcher {
        constructor(object, domElement) {
            super();
            this.object = object;
            this.domElement = domElement;
            this.enabled = true;
            this.target = new THREE.Vector3();
            this.minDistance = 0;
            this.maxDistance = Infinity;
            this.minZoom = 0;
            this.maxZoom = Infinity;
            this.minPolarAngle = 0;
            this.maxPolarAngle = Math.PI;
            this.minAzimuthAngle = -Infinity;
            this.maxAzimuthAngle = Infinity;
            this.enableDamping = false;
            this.dampingFactor = 0.05;
            this.enableZoom = true;
            this.zoomSpeed = 1.0;
            this.enableRotate = true;
            this.rotateSpeed = 1.0;
            this.enablePan = true;
            this.panSpeed = 1.0;
            this.screenSpacePanning = true;
            this.keyPanSpeed = 7.0;
            this.autoRotate = false;
            this.autoRotateSpeed = 2.0;

            this.keys = {
                LEFT: 'ArrowLeft',
                UP: 'ArrowUp',
                RIGHT: 'ArrowRight',
                BOTTOM: 'ArrowDown'
            };

            this.mouseButtons = {
                LEFT: THREE.MOUSE.ROTATE,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.PAN
            };

            this.touches = {
                ONE: THREE.TOUCH.ROTATE,
                TWO: THREE.TOUCH.DOLLY_PAN
            };

            this.target0 = this.target.clone();
            this.position0 = this.object.position.clone();
            this.zoom0 = this.object.zoom;

            const scope = this;
            const STATE = {
                NONE: -1,
                ROTATE: 0,
                DOLLY: 1,
                PAN: 2,
                TOUCH_ROTATE: 3,
                TOUCH_PAN: 4,
                TOUCH_DOLLY_PAN: 5,
                TOUCH_DOLLY_ROTATE: 6
            };

            let state = STATE.NONE;
            const EPS = 0.000001;
            const spherical = new THREE.Spherical();
            const sphericalDelta = new THREE.Spherical();
            let scale = 1;
            const panOffset = new THREE.Vector3();
            let zoomChanged = false;

            const rotateStart = new THREE.Vector2();
            const rotateEnd = new THREE.Vector2();
            const rotateDelta = new THREE.Vector2();

            const panStart = new THREE.Vector2();
            const panEnd = new THREE.Vector2();
            const panDelta = new THREE.Vector2();

            const dollyStart = new THREE.Vector2();
            const dollyEnd = new THREE.Vector2();
            const dollyDelta = new THREE.Vector2();

            this.update = function () {
                const offset = new THREE.Vector3();
                const quat = new THREE.Quaternion().setFromUnitVectors(object.up, new THREE.Vector3(0, 1, 0));
                const quatInverse = quat.clone().invert();
                const lastPosition = new THREE.Vector3();
                const lastQuaternion = new THREE.Quaternion();
                const twoPI = 2 * Math.PI;

                return function update() {
                    const position = scope.object.position;
                    offset.copy(position).sub(scope.target);
                    offset.applyQuaternion(quat);
                    spherical.setFromVector3(offset);

                    if (scope.autoRotate && state === STATE.NONE) {
                        rotateLeft(getAutoRotationAngle());
                    }

                    if (scope.enableDamping) {
                        spherical.theta += sphericalDelta.theta * scope.dampingFactor;
                        spherical.phi += sphericalDelta.phi * scope.dampingFactor;
                    } else {
                        spherical.theta += sphericalDelta.theta;
                        spherical.phi += sphericalDelta.phi;
                    }

                    let min = scope.minAzimuthAngle;
                    let max = scope.maxAzimuthAngle;

                    if (isFinite(min) && isFinite(max)) {
                        if (min < -Math.PI) min += twoPI;
                        else if (min > Math.PI) min -= twoPI;
                        if (max < -Math.PI) max += twoPI;
                        else if (max > Math.PI) max -= twoPI;

                        if (min <= max) {
                            spherical.theta = Math.max(min, Math.min(max, spherical.theta));
                        } else {
                            spherical.theta = spherical.theta > (min + max) / 2 ?
                                Math.max(min, spherical.theta) : Math.min(max, spherical.theta);
                        }
                    }

                    spherical.phi = Math.max(scope.minPolarAngle, Math.min(scope.maxPolarAngle, spherical.phi));
                    spherical.makeSafe();
                    spherical.radius *= scale;
                    spherical.radius = Math.max(scope.minDistance, Math.min(scope.maxDistance, spherical.radius));

                    if (scope.enableDamping === true) {
                        scope.target.addScaledVector(panOffset, scope.dampingFactor);
                    } else {
                        scope.target.add(panOffset);
                    }

                    offset.setFromSpherical(spherical);
                    offset.applyQuaternion(quatInverse);
                    position.copy(scope.target).add(offset);
                    scope.object.lookAt(scope.target);

                    if (scope.enableDamping === true) {
                        sphericalDelta.theta *= 1 - scope.dampingFactor;
                        sphericalDelta.phi *= 1 - scope.dampingFactor;
                        panOffset.multiplyScalar(1 - scope.dampingFactor);
                    } else {
                        sphericalDelta.set(0, 0, 0);
                        panOffset.set(0, 0, 0);
                    }

                    scale = 1;

                    if (zoomChanged || lastPosition.distanceToSquared(scope.object.position) > EPS ||
                        8 * (1 - lastQuaternion.dot(scope.object.quaternion)) > EPS) {
                        scope.dispatchEvent(_changeEvent);
                        lastPosition.copy(scope.object.position);
                        lastQuaternion.copy(scope.object.quaternion);
                        zoomChanged = false;
                        return true;
                    }

                    return false;
                };
            }();

            function getAutoRotationAngle() {
                return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;
            }

            function rotateLeft(angle) {
                sphericalDelta.theta -= angle;
            }

            function rotateUp(angle) {
                sphericalDelta.phi -= angle;
            }

            function dollyOut(dollyScale) {
                if (scope.object.isPerspectiveCamera) {
                    scale /= dollyScale;
                } else if (scope.object.isOrthographicCamera) {
                    scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom * dollyScale));
                    scope.object.updateProjectionMatrix();
                    zoomChanged = true;
                }
            }

            function dollyIn(dollyScale) {
                if (scope.object.isPerspectiveCamera) {
                    scale *= dollyScale;
                } else if (scope.object.isOrthographicCamera) {
                    scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom / dollyScale));
                    scope.object.updateProjectionMatrix();
                    zoomChanged = true;
                }
            }

            function handleMouseDownRotate(event) {
                rotateStart.set(event.clientX, event.clientY);
            }

            function handleMouseDownDolly(event) {
                dollyStart.set(event.clientX, event.clientY);
            }

            function handleMouseMoveRotate(event) {
                rotateEnd.set(event.clientX, event.clientY);
                rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed);
                const element = scope.domElement;
                rotateLeft(2 * Math.PI * rotateDelta.x / element.clientHeight);
                rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight);
                rotateStart.copy(rotateEnd);
                scope.update();
            }

            function handleMouseMoveDolly(event) {
                dollyEnd.set(event.clientX, event.clientY);
                dollyDelta.subVectors(dollyEnd, dollyStart);
                if (dollyDelta.y > 0) {
                    dollyOut(getZoomScale());
                } else if (dollyDelta.y < 0) {
                    dollyIn(getZoomScale());
                }
                dollyStart.copy(dollyEnd);
                scope.update();
            }

            function handleMouseWheel(event) {
                if (event.deltaY < 0) {
                    dollyIn(getZoomScale());
                } else if (event.deltaY > 0) {
                    dollyOut(getZoomScale());
                }
                scope.update();
            }

            function getZoomScale() {
                return Math.pow(0.95, scope.zoomSpeed);
            }

            function onMouseDown(event) {
                if (scope.enabled === false) return;
                event.preventDefault();

                switch (event.button) {
                    case 0:
                        if (scope.enableRotate === false) return;
                        handleMouseDownRotate(event);
                        state = STATE.ROTATE;
                        break;
                    case 1:
                        if (scope.enableZoom === false) return;
                        handleMouseDownDolly(event);
                        state = STATE.DOLLY;
                        break;
                }

                if (state !== STATE.NONE) {
                    scope.domElement.ownerDocument.addEventListener('mousemove', onMouseMove);
                    scope.domElement.ownerDocument.addEventListener('mouseup', onMouseUp);
                    scope.dispatchEvent(_startEvent);
                }
            }

            function onMouseMove(event) {
                if (scope.enabled === false) return;
                event.preventDefault();

                switch (state) {
                    case STATE.ROTATE:
                        if (scope.enableRotate === false) return;
                        handleMouseMoveRotate(event);
                        break;
                    case STATE.DOLLY:
                        if (scope.enableZoom === false) return;
                        handleMouseMoveDolly(event);
                        break;
                }
            }

            function onMouseUp() {
                if (scope.enabled === false) return;
                scope.domElement.ownerDocument.removeEventListener('mousemove', onMouseMove);
                scope.domElement.ownerDocument.removeEventListener('mouseup', onMouseUp);
                scope.dispatchEvent(_endEvent);
                state = STATE.NONE;
            }

            function onMouseWheel(event) {
                if (scope.enabled === false || scope.enableZoom === false || state !== STATE.NONE) return;
                event.preventDefault();
                event.stopPropagation();
                scope.dispatchEvent(_startEvent);
                handleMouseWheel(event);
                scope.dispatchEvent(_endEvent);
            }

            this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
            this.domElement.addEventListener('mousedown', onMouseDown);
            this.domElement.addEventListener('wheel', onMouseWheel, { passive: false });

            this.update();
        }
    }

    THREE.OrbitControls = OrbitControls;
})();

let escena, camara, renderizador, saturno, controles;
let lluviaCorazonesActiva = false, contadorToques = 0;
let objetosMensaje = [];
let objetosTextoAnillo = [];
let audioHabilitado = false;
let audioReproducido = false;

const textoAnillo = "TE AMO CON TODO MI CORAZÓN Y ALMA PARA SIEMPRE MI AMOR ETERNO";

const mensajesAmor = [
    "TE AMO", "TE QUIERO", "MI REINA", "MI AMOR", "ERES ÚNICA", "PARA SIEMPRE", "MI VIDA", "MI CORAZÓN", "MI ALMA", "MI LUZ", "MI RAZÓN", "MI FELICIDAD", "MI SUEÑO", "MI DESEO", "MI PASIÓN", "MI TESORO", "MI ÁNGEL", "MI SOL", "MI ESTRELLA", "MI DESTINO", "MI TODO", "MI VIDA ENTERA", "MI PRINCESA", "MI REINA HERMOSA", "MI COMPLEMENTO", "MI MUNDO", "MI PERSONA FAVORITA", "MI INSPIRACIÓN", "MI ALEGRÍA", "MI REFUGIO", "MI AMOR BONITO", "MI LOCURA LINDA", "MI ADICCIÓN", "MI ILUSIÓN", "MI COMPLICIDAD", "MI CIELO", "MI LATIDO", "MI POESÍA", "MI RESPIRACIÓN", "MI TODO EN UNO", "MI ABRAZO FAVORITO", "MI CARICIA PERFECTA", "MI VERDAD", "MI SUEÑO HECHO REALIDAD", "MI FINAL FELIZ", "MI MILAGRO", "MI PRESENTE Y FUTURO", "MI HOGAR", "MI ENAMORADA ETERNA", "MI CANCIÓN FAVORITA", "MI DESTINO PERFECTO", "MI VIDA CONTIGO", "MI HISTORIA DE AMOR", "MI LUGAR SEGURO", "MI TODO LO BONITO", "MI AMOR DE CINE", "MI RAZÓN DE SONREÍR", "MI VERSO MÁS BELLO", "MI AMOR ETERNO", "MI MUSA", "MI PASADO, PRESENTE Y FUTURO"
];

const mensajesImagen = [
    "Eres la luz que ilumina mi vida cada día",
    "Cada momento a tu lado es un regalo del universo",
    "Tu sonrisa es mi mayor tesoro",
    "Contigo he encontrado el amor verdadero"
];

function crearEstrellasCSS(cantidad) {
    const cielo = document.getElementById('cielo-estrellas');
    for (let i = 0; i < cantidad; i++) {
        const estrella = document.createElement('div');
        estrella.classList.add('estrella');
        const tamaño = Math.random() * 2 + 1;
        estrella.style.width = tamaño + 'px';
        estrella.style.height = tamaño + 'px';
        estrella.style.left = Math.random() * 100 + 'vw';
        estrella.style.top = Math.random() * 100 + 'vh';
        estrella.style.setProperty('--retraso', Math.random() * 5 + 's');
        estrella.style.setProperty('--duracion', (Math.random() * 4 + 2) + 's');
        cielo.appendChild(estrella);
    }
}

function simularCarga() {
    const cargadorReloj = document.getElementById('cargador-reloj');
    const textoProgreso = document.getElementById('texto-progreso');
    let progreso = 0;

    const intervalo = setInterval(() => {
        progreso += 2;
        if (progreso <= 100) {
            cargadorReloj.style.setProperty('--progreso', progreso + '%');
            textoProgreso.textContent = progreso + '%';
        } else {
            clearInterval(intervalo);
        }
    }, 50);
}

function inicializar() {
    simularCarga();

    setTimeout(() => {
        document.getElementById('cargando').style.display = 'none';

        escena = new THREE.Scene();
        escena.background = null;

        camara = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camara.position.set(0, 8, 30);

        renderizador = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        renderizador.setSize(window.innerWidth, window.innerHeight);
        renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderizador.shadowMap.enabled = true;
        renderizador.shadowMap.type = THREE.PCFSoftShadowMap;
        renderizador.toneMapping = THREE.ACESFilmicToneMapping;
        renderizador.toneMappingExposure = 1.2;
        renderizador.setClearColor(0x000000, 0);

        document.getElementById('contenedor-escena').appendChild(renderizador.domElement);

        controles = new THREE.OrbitControls(camara, renderizador.domElement);
        controles.enableDamping = true;
        controles.dampingFactor = 0.05;
        controles.rotateSpeed = 0.5;
        controles.enableZoom = true;
        controles.zoomSpeed = 1.0;
        controles.autoRotate = true;
        controles.autoRotateSpeed = 0.2;
        controles.minDistance = 10;
        controles.maxDistance = 80;
        controles.minPolarAngle = 0;
        controles.maxPolarAngle = Math.PI;

        // Iluminación
        const luzAmbiental = new THREE.AmbientLight(0x444477, 0.4);
        escena.add(luzAmbiental);

        const luzDireccional = new THREE.DirectionalLight(0xffffff, 1.5);
        luzDireccional.position.set(10, 10, 5);
        luzDireccional.castShadow = true;
        escena.add(luzDireccional);

        const luzPunto = new THREE.PointLight(0xff69b4, 0.6, 50);
        luzPunto.position.set(0, 0, 10);
        escena.add(luzPunto);

        crearSaturno();
        crearAnilloTexto();
        crearCampoEstrellas();
        crearMensajesAmor();
        crearParticulasFlotantes();

        configurarEventos();
        animar();
    }, 3000);
}

function crearSaturno() {
    // Crear geometría de Saturno
    const geometria = new THREE.SphereGeometry(4, 64, 64);

    // Cargar la textura desde el archivo
    const cargadorTextura = new THREE.TextureLoader();
    const textura = cargadorTextura.load('textura_saturno.jpg');

    const material = new THREE.MeshPhongMaterial({
        map: textura,
        shininess: 30,
        transparent: true,
        opacity: 0.9
    });

    saturno = new THREE.Mesh(geometria, material);
    saturno.castShadow = true;
    saturno.receiveShadow = true;
    escena.add(saturno);

    // Crear anillos de Saturno
    const geometriaAnillo1 = new THREE.RingGeometry(4.8, 5.2, 64);
    const materialAnillo1 = new THREE.MeshPhongMaterial({
        color: 0xffccff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4,
        emissive: 0x330022
    });
    const anillo1 = new THREE.Mesh(geometriaAnillo1, materialAnillo1);
    anillo1.rotation.x = Math.PI / 2 + 0.1;
    escena.add(anillo1);

    const geometriaAnillo2 = new THREE.RingGeometry(5.5, 6.2, 64);
    const materialAnillo2 = new THREE.MeshPhongMaterial({
        color: 0xddaaff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3,
        emissive: 0x220011
    });
    const anillo2 = new THREE.Mesh(geometriaAnillo2, materialAnillo2);
    anillo2.rotation.x = Math.PI / 2 + 0.1;
    escena.add(anillo2);

    const geometriaAnillo3 = new THREE.RingGeometry(6.5, 7.2, 64);
    const materialAnillo3 = new THREE.MeshPhongMaterial({
        color: 0xccaadd,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.2,
        emissive: 0x110022
    });
    const anillo3 = new THREE.Mesh(geometriaAnillo3, materialAnillo3);
    anillo3.rotation.x = Math.PI / 2 + 0.1;
    escena.add(anillo3);

    // Crear atmósfera
    const geometriaAtmosfera = new THREE.SphereGeometry(4.15, 32, 32);
    const materialAtmosfera = new THREE.MeshPhongMaterial({
        color: 0x88aaff,
        transparent: true,
        opacity: 0.1,
        side: THREE.BackSide
    });
    const atmosfera = new THREE.Mesh(geometriaAtmosfera, materialAtmosfera);
    saturno.add(atmosfera);
}

function crearAnilloTexto() {
    const loader = new THREE.FontLoader();
    loader.load('https://threejs.org/examples/fonts/gentilis_bold.typeface.json', function (fuente) {

        const radio = 9;
        const totalLetras = textoAnillo.length;
        const pasoAngulo = (Math.PI * 2) / totalLetras;

        for (let i = 0; i < totalLetras; i++) {
            const letra = textoAnillo[i];
            if (letra === ' ') continue;

            const geometriaTexto = new THREE.TextGeometry(letra, {
                font: fuente,
                size: 0.6,
                height: 0.2,
                curveSegments: 8,
                bevelEnabled: false
            });

            geometriaTexto.center();

            const materialTexto = new THREE.MeshPhongMaterial({
                color: 0xffccff,
                emissive: 0x550044,
                transparent: true,
                opacity: 0.9
            });

            const mallaTexto = new THREE.Mesh(geometriaTexto, materialTexto);

            // Posicionar letra en el círculo (invertido para lectura correcta)
            const angulo = -i * pasoAngulo; // Negativo para invertir dirección
            mallaTexto.position.x = Math.cos(angulo) * radio;
            mallaTexto.position.z = Math.sin(angulo) * radio;
            mallaTexto.position.y = Math.sin(angulo * 3) * 0.5;

            // Rotar la letra para que mire hacia afuera y esté orientada correctamente
            mallaTexto.lookAt(0, mallaTexto.position.y, 0);
            mallaTexto.rotateY(Math.PI);

            escena.add(mallaTexto);
            objetosTextoAnillo.push(mallaTexto);
        }
    });
}

function crearCampoEstrellas() {
    const geometriaEstrellas = new THREE.BufferGeometry();
    const materialEstrellas = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.5,
        transparent: true,
        sizeAttenuation: true
    });

    const verticesEstrellas = [];
    const colores = [];

    for (let i = 0; i < 2000; i++) {
        verticesEstrellas.push(
            (Math.random() - 0.5) * 2000,
            (Math.random() - 0.5) * 2000,
            (Math.random() - 0.5) * 2000
        );

        // Colores variados para las estrellas
        const color = new THREE.Color();
        color.setHSL(Math.random() * 0.2 + 0.5, 0.55, Math.random() * 0.25 + 0.75);
        colores.push(color.r, color.g, color.b);
    }

    geometriaEstrellas.setAttribute('position', new THREE.Float32BufferAttribute(verticesEstrellas, 3));
    geometriaEstrellas.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3));

    materialEstrellas.vertexColors = true;

    const campoEstrellas = new THREE.Points(geometriaEstrellas, materialEstrellas);
    escena.add(campoEstrellas);
}

function crearMensajesAmor() {
    const loader = new THREE.FontLoader();
    loader.load('https://threejs.org/examples/fonts/gentilis_bold.typeface.json', function (fuente) {

        // Barajar mensajes y tomar 30
        const mensajesMezclados = [...mensajesAmor].sort(() => Math.random() - 0.5);
        const mensajesAUsar = mensajesMezclados.slice(0, 30);

        mensajesAUsar.forEach((mensaje, i) => {
            // Crear geometría de texto con todo el mensaje
            const geometriaTexto = new THREE.TextGeometry(mensaje, {
                font: fuente,
                size: 0.6,
                height: 0.2,
                curveSegments: 8,
                bevelEnabled: false
            });

            geometriaTexto.center(); // centrar el texto en su eje

            const materialTexto = new THREE.MeshStandardMaterial({
                color: 0xff69b4,
                emissive: 0x550033,
                emissiveIntensity: 0.5,
                transparent: true,
                opacity: 0.9
            });

            const mallaTexto = new THREE.Mesh(geometriaTexto, materialTexto);

            // Posición inicial aleatoria alrededor del planeta
            const distancia = 12 + Math.random() * 8;
            const angulo = Math.random() * Math.PI * 2;
            const altura = (Math.random() - 0.5) * 15;

            mallaTexto.position.set(
                Math.cos(angulo) * distancia,
                altura,
                Math.sin(angulo) * distancia
            );

            escena.add(mallaTexto);

            objetosMensaje.push({
                malla: mallaTexto,
                alturaOriginal: altura,
                velocidad: 0.2 + Math.random() * 0.3,
                angulo: angulo,
                distancia: distancia
            });
        });
    });
}

function crearParticulasFlotantes() {
    const geometriaParticulas = new THREE.BufferGeometry();
    const cantidadParticulas = 500;
    const posiciones = new Float32Array(cantidadParticulas * 3);
    const colores = new Float32Array(cantidadParticulas * 3);

    for (let i = 0; i < cantidadParticulas * 3; i += 3) {
        posiciones[i] = (Math.random() - 0.5) * 100;
        posiciones[i + 1] = (Math.random() - 0.5) * 100;
        posiciones[i + 2] = (Math.random() - 0.5) * 100;

        colores[i] = 1;
        colores[i + 1] = Math.random() * 0.5 + 0.4;
        colores[i + 2] = Math.random() * 0.8 + 0.6;
    }

    geometriaParticulas.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
    geometriaParticulas.setAttribute('color', new THREE.BufferAttribute(colores, 3));

    const materialParticulas = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.6
    });

    const particulas = new THREE.Points(geometriaParticulas, materialParticulas);
    escena.add(particulas);
}

function configurarEventos() {
    document.addEventListener('click', manejarInteraccion);
    document.addEventListener('touchstart', manejarInteraccion);
    document.addEventListener('click', mostrarEfectoToque);
    document.addEventListener('touchstart', mostrarEfectoToque);

    document.querySelectorAll('.elemento-galeria').forEach(elemento => {
        elemento.addEventListener('click', abrirModal);
    });

    document.querySelector('.boton-cerrar').addEventListener('click', cerrarModal);
    document.getElementById('alternar-audio').addEventListener('click', alternarAudio);
    window.addEventListener('resize', manejarRedimensionamiento);
}

function alternarAudio() {
    audioHabilitado = !audioHabilitado;
    const botonAudio = document.getElementById('alternar-audio');

    if (audioHabilitado) {
        botonAudio.textContent = '🔊';
        botonAudio.style.background = 'rgba(255, 105, 180, 0.3)';
        reproducirAudio();
    } else {
        botonAudio.textContent = '🔇';
        botonAudio.style.background = 'rgba(255, 255, 255, 0.15)';
        pausarAudio();
    }
}

function reproducirAudio() {
    const audio = document.getElementById('audio-fondo');
    if (audioHabilitado) {
        audio.play().catch(e => {
            console.log("Audio requiere interacción del usuario primero.");
        });
    }
}

function pausarAudio() {
    const audio = document.getElementById('audio-fondo');
    audio.pause();
}

function manejarInteraccion(e) {
    if (e.target.closest('.elemento-galeria') || e.target.closest('.modal') ||
        e.target.closest('#alternar-audio') ||
        document.getElementById('cargando').style.display !== 'none') return;

    if (!audioReproducido) {
        audioHabilitado = true;
        document.getElementById('alternar-audio').textContent = '🔊';
        document.getElementById('alternar-audio').style.background = 'rgba(255, 105, 180, 0.3)';
        reproducirAudio();
        audioReproducido = true;
    }

    crearExplosionTexto(e);
    crearLluviaCorazones();
    contadorToques++;

    if (contadorToques === 5) {
        document.getElementById('instrucciones').textContent = "¡Eres increíble! Cada toque es un latido de mi corazón ❤️";
    } else if (contadorToques === 10) {
        document.getElementById('instrucciones').textContent = "Eres el amor de mi vida 💖";
    } else if (contadorToques >= 15) {
        const mensajes = [
            "Mi corazón late por ti",
            "Eres mi sueño hecho realidad",
            "Eres mi todo",
            "Te amo más cada día",
            "Eres mi razón de ser"
        ];
        document.getElementById('instrucciones').textContent = mensajes[Math.floor(Math.random() * mensajes.length)];
    }
}

function crearExplosionTexto(e) {
    const x = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const y = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

    const textosAmor = ["TE AMO", "ERES MÍA", "MI AMOR", "PARA SIEMPRE", "MI VIDA", "MI TODO", "MI CORAZÓN", "MI ALMA"];
    const textoAleatorio = textosAmor[Math.floor(Math.random() * textosAmor.length)];

    const explosionTexto = document.createElement('div');
    explosionTexto.innerHTML = textoAleatorio;
    explosionTexto.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: ${y}px;
                font-size: 24px;
                color: #ff69b4;
                font-weight: bold;
                text-shadow: 0 0 10px #ff1493;
                z-index: 20;
                pointer-events: none;
                transform: translate(-50%, -50%);
                animation: animacionExplosionTexto 1.5s ease-out forwards;
            `;

    document.getElementById('superposicion-ui').appendChild(explosionTexto);

    setTimeout(() => {
        if (explosionTexto.parentNode) {
            explosionTexto.parentNode.removeChild(explosionTexto);
        }
    }, 1500);
}

function mostrarEfectoToque(e) {
    if (e.target.closest('.elemento-galeria') || e.target.closest('.modal') ||
        e.target.closest('#alternar-audio') ||
        document.getElementById('cargando').style.display !== 'none') return;

    const indicador = document.getElementById('indicador-toque');
    const x = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const y = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

    indicador.style.left = x + 'px';
    indicador.style.top = y + 'px';
    indicador.style.opacity = '1';

    setTimeout(() => {
        indicador.style.opacity = '0';
    }, 300);
}

function crearLluviaCorazones() {
    if (lluviaCorazonesActiva) return;
    lluviaCorazonesActiva = true;

    for (let i = 0; i < 15; i++) {
        setTimeout(() => crearCorazon(), i * 100);
    }

    crearCorazones3D();
    setTimeout(() => { lluviaCorazonesActiva = false; }, 2000);
}

function crearCorazon() {
    const corazon = document.createElement('div');
    corazon.innerHTML = '❤️';
    corazon.classList.add('corazon');
    corazon.style.cssText = `
                position: absolute;
                left: ${Math.random() * 100}vw;
                font-size: ${Math.random() * 20 + 18}px;
                animation-duration: ${Math.random() * 2 + 2}s;
            `;

    document.getElementById('superposicion-ui').appendChild(corazon);

    setTimeout(() => {
        if (corazon.parentNode) {
            corazon.parentNode.removeChild(corazon);
        }
    }, 5000);
}

function crearCorazones3D() {
    for (let i = 0; i < 8; i++) {
        const geometriaCorazon = new THREE.SphereGeometry(0.2, 8, 8);
        const materialCorazon = new THREE.MeshPhongMaterial({
            color: 0xff69b4,
            emissive: 0x990044,
            transparent: true,
            opacity: 0.8
        });

        const corazon = new THREE.Mesh(geometriaCorazon, materialCorazon);
        corazon.position.set(
            (Math.random() - 0.5) * 20,
            10 + Math.random() * 5,
            (Math.random() - 0.5) * 20
        );

        escena.add(corazon);
        animarCorazon3D(corazon);
    }
}

function animarCorazon3D(corazon) {
    const velocidadCaida = Math.random() * 0.05 + 0.02;
    const velocidadRotacion = Math.random() * 0.1 + 0.05;

    function animar() {
        corazon.position.y -= velocidadCaida;
        corazon.rotation.x += velocidadRotacion;
        corazon.rotation.z += velocidadRotacion;

        if (corazon.position.y > -10) {
            requestAnimationFrame(animar);
        } else {
            escena.remove(corazon);
        }
    }
    animar();
}

function abrirModal(e) {
    const indice = parseInt(e.currentTarget.getAttribute('data-indice'));
    const modal = document.getElementById('modal-imagen');
    const mensajeModal = document.getElementById('mensaje-modal');

    mensajeModal.textContent = mensajesImagen[indice];
    modal.style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('modal-imagen').style.display = 'none';
}

function manejarRedimensionamiento() {
    camara.aspect = window.innerWidth / window.innerHeight;
    camara.updateProjectionMatrix();
    renderizador.setSize(window.innerWidth, window.innerHeight);
}

function animar() {
    requestAnimationFrame(animar);

    // Rotar Saturno
    if (saturno) {
        saturno.rotation.y += 0.005;
    }

    // Animar texto del anillo
    objetosTextoAnillo.forEach((obj, i) => {
        obj.rotation.y += 0;
        obj.position.y = Math.sin(Date.now() * 0.002 + i * 0.2) * 0.3;

        obj.lookAt(camara.position);
    });

    // Animar mensajes
    const tiempo = Date.now() * 0.001;
    objetosMensaje.forEach((obj, i) => {
        obj.malla.position.y = obj.alturaOriginal + Math.sin(tiempo * obj.velocidad + i) * 2;
        obj.angulo += 0.002 * obj.velocidad;
        obj.malla.position.x = Math.cos(obj.angulo) * obj.distancia;
        obj.malla.position.z = Math.sin(obj.angulo) * obj.distancia;

        obj.malla.lookAt(camara.position);
    });

    // Actualizar posición de la luna CSS según la cámara
    actualizarPosicionLuna();

    controles.update();
    renderizador.render(escena, camara);
}

function actualizarPosicionLuna() {
    const luna = document.querySelector('.luna');
    if (!luna) return;

    // Crear un vector para la posición de la luna en el espacio 3D
    const posicionLuna3D = new THREE.Vector3(50, 30, -80);

    // Proyectar la posición 3D a coordenadas 2D de la pantalla
    const vectorPantalla = posicionLuna3D.clone();
    vectorPantalla.project(camara);

    // Convertir a coordenadas de píxeles
    const x = (vectorPantalla.x * 0.5 + 0.5) * window.innerWidth;
    const y = (vectorPantalla.y * -0.5 + 0.5) * window.innerHeight;

    // Actualizar posición de la luna
    luna.style.left = x + 'px';
    luna.style.top = y + 'px';

    // Opcional: ajustar opacidad si la luna está detrás de la cámara
    if (vectorPantalla.z > 1) {
        luna.style.opacity = '0.3';
    } else {
        luna.style.opacity = '0.8';
    }
}

// Inicializar la aplicación
crearEstrellasCSS(100);
inicializar();