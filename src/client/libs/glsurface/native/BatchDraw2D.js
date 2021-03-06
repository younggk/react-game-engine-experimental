/**
 * Created by tdzl2003 on 2017/3/19.
 */

const CAPACITY_NAMES = {
  maxElementsIndecies: 'MAX_ELEMENTS_INDICES',
  maxElementsVerticies: 'MAX_ELEMENTS_VERTICES',
};

const VERTEX_ATTRIBUTE_LOCATION = {
  VERTEX: 0,
  TEXCOORD: 1,
  DIFFUSE: 2,
};

const VERTEX_FORMAT_SIZE = [
  2, // VERTEX,
  2, // TEXCOORD,
  4, // DIFFUSE,
];

const MAX_VERTEX_ELEMENT_SIZE = VERTEX_FORMAT_SIZE.reduce((a, b) => a + b);

const VERTEX_FORMAT_BIT = [
  0, // VERTEX, always true.
  1 << 0, // TEXCOORD
  1 << 1, // DIFFUSE
]

// vertex buffer
// diffuse buffer
// texcoord buffer

export default class BatchDraw2D {
  caps = {};

  mode = 0;
  format = 0;
  effect = null;
  texture = null;

  // buffers:
  maxVertexBufferSize = 0;
  maxIndeciesBufferSize = 0;

  vertexBuffer = null;
  vertexBufferData = null;
  vertexBufferCount = 0;

  indeciesBuffer = null;
  indeciesBufferData = null;
  indeciesBufferCount = 0;

  // dependencies
  baseEffect = null;

  constructor(gl) {
    this.gl = gl;
    for (const key of Object.keys(CAPACITY_NAMES)) {
      this.caps[key] = gl.getParameter(gl[CAPACITY_NAMES[key]]);
    }

    if (__DEV__) {
      console.log('CAPS: ', JSON.stringify(this.caps));
    }

    this.maxVertexBufferSize = Math.max(4096, this.caps.maxElementsVerticies);
    this.vertexBufferData = new Float32Array(this.maxVertexBufferSize * MAX_VERTEX_ELEMENT_SIZE);
    this.maxIndeciesBufferSize = Math.max(8192, this.caps.maxElementsIndecies);
    this.indeciesBufferData = new Uint16Array(this.maxIndeciesBufferSize);

    this.vertexBuffer = gl.createBuffer();
    this.indeciesBuffer = gl.createBuffer();

    this.baseEffect = gl.effectManager.obtain(gl, 'base');
  }

  drawRect(x, y, w, h, r = 0, g = 0, b = 0, a = 1) {
    this.prepare(4, 6, gl.TRIANGLES, 2, this.baseEffect);
    const baseId = this.vertexBufferCount;
    let base = baseId * 6;
    let idxBase = this.indeciesBufferCount;
    this.vertexBufferCount += 4;
    this.indeciesBufferCount += 6;

    const xs = [x, x + w, x, x + w];
    const ys = [y, y, y + h, y + h];

    for (let i = 0; i < 4; i++) {
      this.vertexBufferData[base++] = xs[i];
      this.vertexBufferData[base++] = ys[i];
      this.vertexBufferData[base++] = r;
      this.vertexBufferData[base++] = g;
      this.vertexBufferData[base++] = b;
      this.vertexBufferData[base++] = a;
    }

    this.indeciesBufferData[idxBase++] = baseId;
    this.indeciesBufferData[idxBase++] = baseId + 1;
    this.indeciesBufferData[idxBase++] = baseId + 2;
    this.indeciesBufferData[idxBase++] = baseId + 2;
    this.indeciesBufferData[idxBase++] = baseId + 1;
    this.indeciesBufferData[idxBase++] = baseId + 3;
  }

  prepare(eleCnt, idxCount, mode, format, effect, texture = null) {
    if (mode !== this.mode || format !== this.format || effect !== this.effect || texture !== this.texture) {
      this.flush();
      this.mode = mode;
      this.format = format;
      this.effect = effect;
      this.texture = texture;
    } else if (eleCnt + this.vertexBufferCount > this.maxVertexBufferSize || idxCount + this.indeciesBufferCount > this.maxIndeciesBufferSize) {
      this.flush();
    }
  }

  flush() {
    if (this.indeciesBufferCount === 0) {
      return;
    }
    const { gl } = this;
    // commit buffer data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertexBufferData, gl.DYNAMIC_DRAW);

    let totalSize = 0;

    for (let i = 0; i < 3; i++) {
      if ((this.format & VERTEX_FORMAT_BIT[i]) === VERTEX_FORMAT_BIT[i]) {
        totalSize += VERTEX_FORMAT_SIZE[i];
      }
    }

    let offset = 0;

    for (let i = 0; i < 3; i++) {
      if ((this.format & VERTEX_FORMAT_BIT[i]) === VERTEX_FORMAT_BIT[i]) {
        gl.enableVertexAttribArray(i);
        gl.vertexAttribPointer(i, VERTEX_FORMAT_SIZE[i], gl.FLOAT, false, totalSize * 4, offset * 4);
        offset += VERTEX_FORMAT_SIZE[i];
      } else {
        gl.disableVertexAttribArray(i);
      }
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indeciesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indeciesBufferData, gl.DYNAMIC_DRAW);
    // this.effect.drawArrays(this.mode, 0, 3);
    this.effect.drawElements(this.mode, this.indeciesBufferCount, gl.UNSIGNED_SHORT, 0);

    this.vertexBufferCount = 0;
    this.indeciesBufferCount = 0;
  }
}