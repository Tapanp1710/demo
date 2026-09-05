/**
 * ThreeUI `halftone-flow` — canonical source, vendored.
 *
 * Registered as src/shaders/neuform-isolated/sources/nexus-unified-flow.html in
 * bundle halftone-flow, SHA-256
 * fa1a015ae407dc2091c3c96239d28107e973cbc03aa7abef37dd5da791d5428b.
 *
 * The WebGL block below is VERBATIM from lines 143-263 of that file: the
 * context, both shaders, compile/link, the buffer, the uniforms and the rAF
 * loop. The halftone matrix is its authored `gridSize = 6.0`.
 *
 * WHAT WAS STRIPPED, and why it costs the effect nothing. The authored page is
 * a marketing landing page that happens to carry this canvas; the component's
 * isolate script hides everything except #glcanvas anyway.
 *
 *   cdn.tailwindcss.com      styled the page around the canvas — all of it
 *                            hidden. The canvas is sized by the inline rule
 *                            above and by the authored resize().
 *   iconify-icon 1.0.7       never referenced in the authored body.
 *   gsap + ScrollTrigger     drove one .reveal-word tween on the hidden <h1>.
 *                            This project already bundles GSAP 3.12 — the
 *                            iframe copy would have been a second one.
 *   4 Supabase JPEGs         avatars in the hidden "5,102+ early adopters"
 *                            row. NOT self-hosted: they never render, so
 *                            copying them into /public would have shipped four
 *                            unused images to satisfy a dependency that does
 *                            not exist at runtime.
 *
 * The generator asserts the shader block references none of the four before
 * emitting this file.
 */
export const NEXUS_UNIFIED_FLOW_SOURCE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nexus - Unified Ecosystem</title>
    <style>html,body{margin:0;height:100%;background:#000;overflow:hidden}
    #glcanvas{position:fixed;inset:0;width:100%;height:100%;display:block}</style>
</head>
<body>

    <!-- WebGL Background -->
    <canvas id="glcanvas"></canvas>

    <!-- Scripts -->
    <script>
        // --- WebGL Background Animation ---
        const canvas = document.getElementById('glcanvas');
        const gl = canvas.getContext('webgl');

        if (!gl) {
            console.error('WebGL not supported');
        } else {
            // Resize handler
            function resize() {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                gl.viewport(0, 0, canvas.width, canvas.height);
            }
            window.addEventListener('resize', resize);
            resize();

            // Vertex Shader
            const vsSource = \`
                attribute vec4 aVertexPosition;
                void main() {
                    gl_Position = aVertexPosition;
                }
            \`;

            // Fragment Shader (Halftone Flow)
            const fsSource = \`
                precision highp float;
                uniform vec2 u_resolution;
                uniform float u_time;

                mat2 rot(float a) {
                    float s = sin(a), c = cos(a);
                    return mat2(c, -s, s, c);
                }

                void main() {
                    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
                    vec2 p = uv * 2.0 - 1.0;
                    p.x *= u_resolution.x / u_resolution.y;

                    vec2 flow_uv = p;
                    float time = u_time * 0.4;
                    
                    for(float i = 1.0; i < 4.0; i++) {
                        flow_uv *= rot(time * 0.1);
                        flow_uv.x += sin(flow_uv.y * 2.0 * i + time) * 0.5;
                        flow_uv.y += cos(flow_uv.x * 1.5 * i - time * 0.8) * 0.5;
                    }

                    float intensity = sin(flow_uv.x * 2.0 + flow_uv.y * 3.0) * 0.5 + 0.5;
                    
                    vec3 col_dark = vec3(0.02, 0.0, 0.0);
                    vec3 col_red = vec3(0.8, 0.1, 0.05);
                    vec3 col_bright = vec3(1.0, 0.6, 0.2);
                    
                    vec3 fluid_color = mix(col_dark, col_red, smoothstep(0.2, 0.6, intensity));
                    fluid_color = mix(fluid_color, col_bright, smoothstep(0.7, 1.0, intensity));

                    float gridSize = 6.0; 
                    vec2 grid_uv = gl_FragCoord.xy / gridSize;
                    vec2 cell_uv = fract(grid_uv) - 0.5;
                    
                    float dist = length(cell_uv);
                    float radius = intensity * 0.45; 
                    float dot_mask = smoothstep(radius, radius - 0.1, dist);
                    
                    vec3 final_color = mix(vec3(0.0), fluid_color, dot_mask);
                    final_color += fluid_color * 0.15;

                    gl_FragColor = vec4(final_color, 1.0);
                }
            \`;

            function compileShader(gl, type, source) {
                const shader = gl.createShader(type);
                gl.shaderSource(shader, source);
                gl.compileShader(shader);
                if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                    console.error(gl.getShaderInfoLog(shader));
                    gl.deleteShader(shader);
                    return null;
                }
                return shader;
            }

            const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vsSource);
            const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);

            const program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            gl.useProgram(program);

            const positions = new Float32Array([
                -1.0,  1.0,
                 1.0,  1.0,
                -1.0, -1.0,
                 1.0, -1.0,
            ]);
            const positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

            const positionLocation = gl.getAttribLocation(program, "aVertexPosition");
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

            const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
            const timeLocation = gl.getUniformLocation(program, "u_time");

            let startTime = Date.now();
            function render() {
                gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
                gl.uniform1f(timeLocation, (Date.now() - startTime) / 1000.0);
                
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                requestAnimationFrame(render);
            }
            render();
        }
    </script>
</body>
</html>
`;
