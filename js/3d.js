(function() {

  function createShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) + source);
    }
    return shader;
  }

  function createProgramFromSource(gl, vertexShaderSource, fragmentShaderSource) {
    const program = gl.createProgram();
    gl.attachShader(program, createShader(gl, vertexShaderSource, gl.VERTEX_SHADER));
    gl.attachShader(program, createShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program));
    }
    return program;
  }

  function createVbo(gl, array, usage) {
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, array, usage !== undefined ? usage : gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return vbo;
  }
  
  function createIbo(gl, array) {
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, array, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    return ibo;
  }
  
  function createVao(gl, vboObjs, ibo) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    if (ibo !== undefined) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    }
    vboObjs.forEach((vboObj) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, vboObj.buffer);
      gl.enableVertexAttribArray(vboObj.index);
      gl.vertexAttribPointer(vboObj.index, vboObj.size, gl.FLOAT, false, 0, 0);
    });
    gl.bindVertexArray(null);
    if (ibo !== undefined) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return vao;
  }

  function getUniformLocations(gl, program, keys) {
    const locations = {};
    keys.forEach(key => {
        locations[key] = gl.getUniformLocation(program, key);
    });
    return locations;
  }

  const VERTEX_SHADER_SOURCE =
`#version 300 es

layout (location = 0) in vec3 position;

out vec3 v_position;

uniform mat4 u_mvpMatrix;

void main(void) {
  v_position = position;
  gl_Position = u_mvpMatrix * vec4(position, 1.0);
}
`;

  const NORMAL_FRAGMENT_SHADER_SOURCE =
`#version 300 es

precision highp float;

out vec4 o_color;

uniform vec3 u_color;

void main(void) {
  o_color = vec4(u_color, 1.0);
}
`;

  const FRAGDEPTH_FRAGMENT_SHADER_SOURCE =
`#version 300 es

precision highp float;

in vec3 v_position;

out vec4 o_color;

uniform mat4 u_mvpMatrix;
uniform vec3 u_color;
uniform float u_time;

float random(vec3 x){
  return fract(sin(dot(x,vec3(12.9898, 78.233, 39.425))) * 43758.5453);
}

float valuenoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);

  vec3 u = f * f * (3.0 - 2.0 * f);

  return
  mix(
    mix(
      mix(random(i), random(i + vec3(1.0, 0.0, 0.0)), u.x),
      mix(random(i + vec3(0.0, 1.0, 0.0)), random(i + vec3(1.0, 1.0, 0.0)), u.x),
      u.y
    ),
    mix(
      mix(random(i + vec3(0.0, 0.0, 1.0)), random(i + vec3(1.0, 0.0, 1.0)), u.x),
      mix(random(i + vec3(0.0, 1.0, 1.0)), random(i + vec3(1.0, 1.0, 1.0)), u.x),
      u.y
    ), 
    u.z
  );
}

float fbm(vec3 x) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amp * valuenoise(x);
    amp *= 0.5;
    x *= 2.01;
  }
  return sum;
}

void main(void) {
  o_color = vec4(u_color, 1.0);
  float offset = fbm(vec3(v_position.xy + vec2(100.0), u_time * 0.3)) * 2.0 - 1.0;
  vec4 position = u_mvpMatrix * vec4(v_position + vec3(0.0, 0.0, offset), 1.0);
  gl_FragDepth = (position.z / position.w) * 0.5 + 0.5;
}
`;

  const RECT_VERTICES_POSITION = new Float32Array([
    -0.8, -0.6, 0.0,
    0.8, -0.6, 0.0,
    -0.8,  0.6, 0.0,
    0.8,  0.6, 0.0
  ]);

  const RECT_VERTICES_INDEX = new Int16Array([
    0, 1, 2,
    3, 2, 1
  ]);

  const canvas = document.getElementById('canvas');
  const gl = canvas.getContext('webgl2');
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  const normalProgram = createProgramFromSource(gl, VERTEX_SHADER_SOURCE, NORMAL_FRAGMENT_SHADER_SOURCE);
  const fragDepthProgram = createProgramFromSource(gl, VERTEX_SHADER_SOURCE, FRAGDEPTH_FRAGMENT_SHADER_SOURCE);

  const normalUniforms = getUniformLocations(gl, normalProgram, ['u_mvpMatrix', 'u_color']);
  const fragDepthUniforms = getUniformLocations(gl, fragDepthProgram, ['u_mvpMatrix', 'u_color', 'u_time']);

  const rectVao = createVao(gl,
    [{buffer: createVbo(gl, RECT_VERTICES_POSITION), size: 3, index: 0}],
    createIbo(gl, RECT_VERTICES_INDEX));

  gl.clearColor(0.9, 0.9, 0.9, 1.0);

  const cameraUp = new Vector3(0.0, 1.0, 0.0);
  const projectionMatrix = Matrix4.perspective(canvas.width / canvas.height, 60, 0.01, 100.0);

  const startTime = performance.now();
  const render = () => {
    requestAnimationFrame(render);

    const currentTime = performance.now();
    const elapsedTime = (currentTime - startTime) * 0.001;

    const cameraAngle = Math.sin(elapsedTime) * Math.PI * 0.25;
    const cameraPosition = new Vector3(2.0 * Math.sin(cameraAngle), 0.0, 2.0 * Math.cos(cameraAngle));
    const viewMatrix = Matrix4.inverse(Matrix4.lookAt(cameraPosition, Vector3.zero, cameraUp));
    const mvpMatrix = Matrix4.mul(viewMatrix, projectionMatrix);

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(normalProgram);
    gl.uniformMatrix4fv(normalUniforms['u_mvpMatrix'], false, mvpMatrix.elements);
    gl.uniform3f(normalUniforms['u_color'], 1.0, 0.3, 0.3);
    gl.bindVertexArray(rectVao);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  
    gl.useProgram(fragDepthProgram);
    gl.uniformMatrix4fv(fragDepthUniforms['u_mvpMatrix'], false, mvpMatrix.elements);
    gl.uniform3f(fragDepthUniforms['u_color'], 0.3, 0.3, 1.0);
    gl.uniform1f(fragDepthUniforms['u_time'], elapsedTime);
    gl.bindVertexArray(rectVao);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  };
  render();

}());