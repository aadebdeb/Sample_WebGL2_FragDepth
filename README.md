# Sample of Writing gl_FragDepth in WebGL2

writing depth value by gl_FragDepth in fragment shader

## Sample in 2D

2 rectangles with same size are located in same position.
Blue rectangle is rendered with gl_FragDepth and red one is not.

https://aadebdeb.github.io/Sample_WebGL2_FragDepth/2d.html

![image of sample in 2d](https://user-images.githubusercontent.com/10070637/56092068-35d8ad80-5ef2-11e9-90e6-094f2a3f1693.png)

```glsl
#version 300 es

precision highp float;

in vec2 v_position;

out vec4 o_color;

uniform vec3 u_color;
uniform float u_time;


float fbm(vec3 x) {
  ...
}

void main(void) {
  o_color = vec4(u_color, 1.0);
  gl_FragDepth = fbm(vec3(v_position + vec2(100.0), u_time * 0.3));
}
```

## Sample in 3D

2 rectangles with same size are located in same position.
Blue rectangle is rendered with gl_GragDepth and red one is not.
Viewport coordinate must be written as gl_FragDepth.

https://aadebdeb.github.io/Sample_WebGL2_FragDepth/3d.html

![image of sampler in 3d](https://user-images.githubusercontent.com/10070637/56092072-3e30e880-5ef2-11e9-8688-0fdb78760480.png)

```glsl
#version 300 es

precision highp float;

in vec3 v_position;

out vec4 o_color;

uniform mat4 u_mvpMatrix;
uniform vec3 u_color;
uniform float u_time;

float fbm(vec3 x) {
  ... 
}

void main(void) {
  o_color = vec4(u_color, 1.0);
  float offset = fbm(vec3(v_position.xy + vec2(100.0), u_time * 0.3)) * 2.0 - 1.0;
  vec4 position = u_mvpMatrix * vec4(v_position + vec3(0.0, 0.0, offset), 1.0);
  gl_FragDepth = (position.z / position.w) * 0.5 + 0.5;
}
```