"use strict";
var MoxWebGPU = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var src_exports = {};
  __export(src_exports, {
    BufferPool: () => BufferPool,
    DTYPES: () => DTYPES,
    GpuDataBuffer: () => GpuDataBuffer,
    Kernel: () => Kernel,
    MOXWEBGPU_VERSION: () => MOXWEBGPU_VERSION,
    MoxContext: () => MoxContext,
    PipelineCache: () => PipelineCache,
    STAGING_USAGE: () => STAGING_USAGE,
    STORAGE_USAGE: () => STORAGE_USAGE,
    Scheduler: () => Scheduler,
    Tensor: () => Tensor,
    UNIFORM_USAGE: () => UNIFORM_USAGE,
    argReducePhase1Wgsl: () => argReducePhase1Wgsl,
    argReducePhase2Wgsl: () => argReducePhase2Wgsl,
    asTypedArray: () => asTypedArray,
    binary1DWgsl: () => binary1DWgsl,
    binary2DWgsl: () => binary2DWgsl,
    binaryScalarWgsl: () => binaryScalarWgsl,
    castWgsl: () => castWgsl,
    contiguousStrides: () => contiguousStrides,
    copyWgsl: () => copyWgsl,
    createNode: () => createNode,
    dtypeInfo: () => dtypeInfo,
    encode2DUniform: () => encode2DUniform,
    encodeCopyUniform: () => encodeCopyUniform,
    encodeMatmulUniform: () => encodeMatmulUniform,
    encodeNUniform: () => encodeNUniform,
    fmtF32: () => fmtF32,
    fmtInt: () => fmtInt,
    makeTypedArray: () => makeTypedArray,
    matmulWgsl: () => matmulWgsl,
    mox: () => mox,
    numElements: () => numElements,
    reduceLastAxisWgsl: () => reduceLastAxisWgsl,
    reducePhase1Wgsl: () => reducePhase1Wgsl,
    reducePhase2Wgsl: () => reducePhase2Wgsl,
    softmaxWgsl: () => softmaxWgsl,
    topoSort: () => topoSort,
    transpose2DWgsl: () => transpose2DWgsl,
    unaryWgsl: () => unaryWgsl
  });

  // src/core/dtype.ts
  var DTYPES = {
    f32: { wgsl: "f32", bytes: 4, array: Float32Array },
    i32: { wgsl: "i32", bytes: 4, array: Int32Array },
    u32: { wgsl: "u32", bytes: 4, array: Uint32Array }
  };
  function dtypeInfo(dtype) {
    return DTYPES[dtype];
  }
  function makeTypedArray(dtype, length) {
    return new DTYPES[dtype].array(length);
  }
  function asTypedArray(dtype, data) {
    const arr = makeTypedArray(dtype, data.length);
    for (let i = 0; i < data.length; i++) arr[i] = data[i];
    return arr;
  }
  function numElements(shape) {
    let n = 1;
    for (const d of shape) n *= d;
    return n;
  }

  // src/core/buffer.ts
  var STORAGE_USAGE = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
  var UNIFORM_USAGE = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
  var STAGING_USAGE = GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST;
  function align4(n) {
    return n + 3 & ~3;
  }
  var GpuDataBuffer = class {
    constructor(buffer, elements, dtype) {
      this.buffer = buffer;
      this.elements = elements;
      this.dtype = dtype;
    }
    get byteSize() {
      return this.elements * dtypeInfo(this.dtype).bytes;
    }
    destroy() {
      this.buffer.destroy();
    }
  };
  var BufferPool = class {
    constructor(device) {
      /** Storage buckets and uniform buckets are kept strictly separate: a
       *  UNIFORM-only buffer must never be rebound as storage (and vice versa),
       *  which would be a validation error and a silent no-op dispatch. */
      this.freeStorage = /* @__PURE__ */ new Map();
      this.freeUniform = /* @__PURE__ */ new Map();
      this.liveCount = 0;
      this.poolCount = 0;
      this.device = device;
    }
    /** Acquire a storage buffer of at least `elements` elements of `dtype`. */
    acquire(elements, dtype) {
      const byteSize = align4(Math.max(4, elements * dtypeInfo(dtype).bytes));
      const bucket = nextPow2(byteSize);
      let bucketList = this.freeStorage.get(bucket);
      if (!bucketList || bucketList.length === 0) {
        const buffer2 = this.device.createBuffer({
          size: bucket,
          usage: STORAGE_USAGE,
          label: `moxwebgpu-pool-${bucket}`
        });
        this.liveCount++;
        return new GpuDataBuffer(buffer2, elements, dtype);
      }
      const buffer = bucketList.pop();
      this.poolCount--;
      return new GpuDataBuffer(buffer, elements, dtype);
    }
    /**
     * Acquire a raw uniform buffer of at least `bytes` bytes.
     * Uniform blocks are pooled too: reusing a UBO on the same queue timeline
     * is safe, and avoids churning buffer allocations per dispatch.
     */
    acquireUniform(bytes) {
      const bucket = nextPow2(Math.max(256, bytes));
      let bucketList = this.freeUniform.get(bucket);
      if (!bucketList || bucketList.length === 0) {
        const buffer2 = this.device.createBuffer({
          size: bucket,
          usage: UNIFORM_USAGE,
          label: `moxwebgpu-ubo-${bucket}`
        });
        this.liveCount++;
        return buffer2;
      }
      const buffer = bucketList.pop();
      this.poolCount--;
      return buffer;
    }
    /** Return a raw buffer to the pool. Usage must be given to pick the right bucket family. */
    releaseRaw(buffer, usage = "storage") {
      const map = usage === "uniform" ? this.freeUniform : this.freeStorage;
      const bucket = nextPow2(buffer.size);
      let bucketList = map.get(bucket);
      if (!bucketList) {
        bucketList = [];
        map.set(bucket, bucketList);
      }
      bucketList.push(buffer);
      this.poolCount++;
    }
    /** Return a buffer to the pool for recycling. */
    release(buf) {
      const bucket = nextPow2(buf.buffer.size);
      let bucketList = this.freeStorage.get(bucket);
      if (!bucketList) {
        bucketList = [];
        this.freeStorage.set(bucket, bucketList);
      }
      bucketList.push(buf.buffer);
      this.poolCount++;
    }
    /** Release a uniform buffer previously handed out by acquireUniform. */
    releaseUniform(buffer) {
      this.releaseRaw(buffer, "uniform");
    }
    /** Destroy every pooled buffer. */
    clear() {
      for (const list of this.freeStorage.values()) {
        for (const b of list) b.destroy();
      }
      for (const list of this.freeUniform.values()) {
        for (const b of list) b.destroy();
      }
      this.freeStorage.clear();
      this.freeUniform.clear();
      this.poolCount = 0;
    }
    /** Live buffers currently checked out of the pool. */
    get live() {
      return this.liveCount;
    }
    /** Buffers sitting idle in the pool. */
    get pooled() {
      return this.poolCount;
    }
    destroy() {
      this.clear();
    }
  };
  function nextPow2(n) {
    let p = 16;
    while (p < n) p *= 2;
    return p;
  }

  // src/util/hash.ts
  function hashString(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) + h + s.charCodeAt(i) | 0;
    }
    return (h >>> 0).toString(36);
  }

  // src/graph/pipelineCache.ts
  var PipelineCache = class {
    constructor(device) {
      this.cache = /* @__PURE__ */ new Map();
      this.device = device;
    }
    /**
     * Get (or compile) a pipeline for the given WGSL source + entry point.
     * The cache key is derived from the source text, so identical kernels
     * share one pipeline regardless of which op instance produced them.
     */
    get(wgsl, entryPoint = "main") {
      const key = `${hashString(wgsl)}:${entryPoint}`;
      let pipeline = this.cache.get(key);
      if (!pipeline) {
        const module = this.device.createShaderModule({ code: wgsl });
        module.getCompilationInfo?.().then((info) => {
          const errors = info.messages.filter((m) => m.type === "error");
          if (errors.length > 0) {
            const detail = errors.map((m) => `  [${m.lineNum}:${m.linePos}] ${m.message}`).join("\n");
            console.error(`moxwebgpu: WGSL compile error(s):
${detail}
--- generated shader ---
${wgsl}`);
          }
        }).catch(() => {
        });
        pipeline = this.device.createComputePipeline({
          layout: "auto",
          compute: { module, entryPoint }
        });
        this.cache.set(key, pipeline);
      }
      return pipeline;
    }
    /** Number of compiled pipelines currently cached. */
    get size() {
      return this.cache.size;
    }
  };

  // src/graph/lazy.ts
  function createNode(op, inputs, attrs = {}) {
    const shapes = inputs.map((t) => t.shape);
    const dtypes = inputs.map((t) => t.dtype);
    const shape = op.outShape(shapes, attrs);
    const dtype = op.outDtype ? op.outDtype(dtypes, attrs) : dtypes[0];
    return {
      kind: "node",
      op,
      attrs,
      // Lazy inputs reference their node; leaf tensors (node == null) wrap as leaves.
      inputs: inputs.map((t) => t.node ? t.node : { kind: "leaf", tensor: t }),
      shape,
      dtype,
      buffer: null,
      consumers: 0
    };
  }
  function topoSort(root) {
    const order = [];
    const visited = /* @__PURE__ */ new Set();
    const walk = (n) => {
      if (visited.has(n)) return;
      visited.add(n);
      for (const input of n.inputs) {
        if (input.kind !== "leaf") {
          input.consumers++;
          walk(input);
        }
      }
      order.push(n);
    };
    walk(root);
    return order;
  }

  // src/graph/scheduler.ts
  var Scheduler = class {
    constructor(ctx) {
      this.ctx = ctx;
    }
    /**
     * Execute the subgraph rooted at `t` (if needed) and return its GPU buffer.
     * Idempotent: already-materialized tensors return their existing buffer.
     */
    materialize(t) {
      if (t.data) return t.data;
      const root = t.node;
      if (!root) throw new Error("moxwebgpu: tensor has neither data nor a lazy node");
      if (root.buffer) return root.buffer;
      const order = topoSort(root);
      for (const n of order) {
        if (!n.buffer) this.runNode(n);
      }
      return root.buffer;
    }
    runNode(n) {
      const { device, queue } = this.ctx;
      const inputTensors = [];
      const inputBuffers = [];
      const nodeInputs = [];
      const inputShapes = [];
      const inputDtypes = [];
      for (const input of n.inputs) {
        if (input.kind === "leaf") {
          const t = input.tensor;
          inputTensors.push(t);
          inputBuffers.push(this.ctx.scheduler.materialize(t));
          inputShapes.push(t.shape);
          inputDtypes.push(t.dtype);
        } else {
          nodeInputs.push(input);
          inputBuffers.push(input.buffer);
          inputShapes.push(input.shape);
          inputDtypes.push(input.dtype);
        }
      }
      const plan = n.op.build(inputShapes, inputDtypes, n.attrs);
      const output = this.ctx.pool.acquire(Math.max(1, numElements(n.shape)), n.dtype);
      let prevTemp = null;
      const scratchUbos = [];
      const encoder = device.createCommandEncoder();
      for (let s = 0; s < plan.steps.length; s++) {
        const step = plan.steps[s];
        const isLast = s === plan.steps.length - 1;
        const writesOutput = isLast || step.bindings.some((b) => b.kind === "rw" && b.output === true);
        const outBuf = writesOutput ? output : this.ctx.pool.acquire(
          Math.max(1, step.tempOutputElements(n.shape)),
          step.tempOutputDtype ?? n.dtype
        );
        const entries = [];
        for (const b of step.bindings) {
          const bindingIndex = entries.length;
          if (b.kind === "uniform") {
            const data = step.uniforms();
            const ubo = this.ctx.pool.acquireUniform(data.byteLength);
            queue.writeBuffer(ubo, 0, data, 0, data.byteLength);
            scratchUbos.push(ubo);
            entries.push({ binding: bindingIndex, resource: { buffer: ubo } });
          } else if (b.kind === "read") {
            const buf = b.temp ? prevTemp : inputBuffers[b.input];
            entries.push({ binding: bindingIndex, resource: { buffer: buf.buffer } });
          } else {
            if (b.temp) {
              prevTemp = outBuf;
            }
            entries.push({ binding: bindingIndex, resource: { buffer: outBuf.buffer } });
          }
        }
        const pipeline = this.ctx.pipelines.get(step.wgsl, step.entryPoint ?? "main");
        const bindGroup = device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries
        });
        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        const [wx, wy, wz] = step.workgroups(n.shape);
        pass.dispatchWorkgroups(wx, wy || 1, wz || 1);
        pass.end();
      }
      queue.submit([encoder.finish()]);
      for (const ubo of scratchUbos) {
        this.ctx.pool.releaseUniform(ubo);
      }
      for (const nodeInput of nodeInputs) {
        nodeInput.consumers--;
        if (nodeInput.consumers === 0 && nodeInput.buffer) {
          this.ctx.pool.release(nodeInput.buffer);
          nodeInput.buffer = null;
        }
      }
      if (prevTemp) {
        this.ctx.pool.release(prevTemp);
        prevTemp = null;
      }
      n.buffer = output;
    }
    /** Copy a GPU buffer back to the CPU as a typed array. */
    async readback(buf) {
      const { device, queue } = this.ctx;
      const bytes = buf.buffer.size;
      const staging = device.createBuffer({
        size: bytes,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        label: "moxwebgpu-staging"
      });
      const encoder = device.createCommandEncoder();
      encoder.copyBufferToBuffer(buf.buffer, 0, staging, 0, bytes);
      queue.submit([encoder.finish()]);
      await staging.mapAsync(GPUMapMode.READ);
      const Ctor = DTYPES[buf.dtype].array;
      const raw2 = new Uint8Array(staging.getMappedRange());
      const out = makeTypedArray(buf.dtype, buf.elements);
      out.set(new Ctor(raw2.buffer, raw2.byteOffset, buf.elements));
      staging.unmap();
      staging.destroy();
      return out;
    }
  };

  // src/tensor/tensor.ts
  var Tensor = class _Tensor {
    constructor(ctx, shape, dtype, node, data) {
      this.ctx = ctx;
      this.shape = shape;
      this.dtype = dtype;
      this.node = node;
      this.data = data;
    }
    get size() {
      return numElements(this.shape);
    }
    get ndim() {
      return this.shape.length;
    }
    /** Create a leaf tensor from JS data (TypedArray, nested arrays or flat). */
    static fromData(ctx, data, options = {}) {
      const { shape, flat } = inferShape(data);
      const dtype = options.dtype ?? "f32";
      const finalShape = options.shape ?? shape;
      const expected = numElements(finalShape);
      if (flat.length !== expected) {
        throw new Error(
          `moxwebgpu: data length ${flat.length} does not match shape [${finalShape}] (${expected} elements)`
        );
      }
      const typed = asTypedArray(dtype, flat);
      const buf = ctx.pool.acquire(expected, dtype);
      ctx.queue.writeBuffer(buf.buffer, 0, typed.buffer, typed.byteOffset, typed.byteLength);
      return new _Tensor(ctx, finalShape, dtype, null, buf);
    }
    /**
     * Attach an op to this tensor: returns a new lazy tensor. All prototype
     * methods funnel through here.
     */
    apply(op, inputs, attrs = {}) {
      const node = createNode(op, inputs, attrs);
      return new _Tensor(this.ctx, node.shape, node.dtype, node, null);
    }
    /**
     * Zero-copy reshape: shares the same GPU buffer / graph node, only the
     * shape metadata changes. Requires the same element count.
     */
    reshape(...shape) {
      const target = shape.length === 1 && Array.isArray(shape[0]) ? shape[0] : shape;
      let hasMinusOne = false;
      let known = 1;
      for (const d of target) {
        if (d === -1) {
          if (hasMinusOne) throw new Error("moxwebgpu: reshape() supports at most one -1");
          hasMinusOne = true;
        } else {
          known *= d;
        }
      }
      const finalShape = hasMinusOne ? target.map((d) => d === -1 ? this.size / known : d) : target;
      if (numElements(finalShape) !== this.size) {
        throw new Error(`moxwebgpu: cannot reshape [${this.shape}] (${this.size}) to [${finalShape}] (${numElements(finalShape)})`);
      }
      return new _Tensor(this.ctx, finalShape, this.dtype, this.node, this.data);
    }
    /** Execute the underlying subgraph (once) and return the GPU buffer. */
    async toBuffer() {
      return this.ctx.scheduler.materialize(this);
    }
    /** Execute (if needed) and copy the result back to the CPU. */
    async toArray() {
      const buf = await this.toBuffer();
      return this.ctx.scheduler.readback(buf);
    }
    /** Convenience for scalar results: first element as a JS number. */
    async item() {
      const arr = await this.toArray();
      return arr[0];
    }
    /** Free the GPU buffer of a leaf tensor. Lazy tensors recycle via the pool. */
    destroy() {
      if (this.data) {
        this.ctx.pool.release(this.data);
        this.data = null;
      }
    }
  };
  function inferShape(data) {
    if (typeof data === "number") return { shape: [], flat: [data] };
    if (ArrayBuffer.isView(data)) {
      return { shape: [data.length], flat: Array.from(data) };
    }
    const shape = [];
    let level = data;
    while (Array.isArray(level)) {
      shape.push(level.length);
      level = level[0];
    }
    const flat = [];
    flatten(data, flat);
    return { shape, flat };
  }
  function flatten(arr, out) {
    for (const x of arr) {
      if (Array.isArray(x)) flatten(x, out);
      else out.push(x);
    }
  }

  // src/core/kernel.ts
  function raw(buffer) {
    return buffer instanceof GPUBuffer ? buffer : buffer.buffer;
  }
  var Kernel = class {
    constructor(ctx, code, options = {}) {
      this.ctx = ctx;
      this.code = code;
      this.options = options;
    }
    get workgroupSize() {
      return this.options.workgroupSize ?? 64;
    }
    get entryPoint() {
      return this.options.entryPoint ?? "main";
    }
    /**
     * Submit the kernel without reading anything back. Fires one compute pass.
     */
    dispatch(buffers, workgroups) {
      const { device } = this.ctx;
      const pipeline = this.ctx.pipelines.get(this.code, this.entryPoint);
      const entries = buffers.map((b, i) => ({ binding: i, resource: { buffer: raw(b) } }));
      const bindGroup = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries });
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.dispatchWorkgroups(workgroups[0], workgroups[1] || 1, workgroups[2] || 1);
      pass.end();
      this.ctx.queue.submit([encoder.finish()]);
    }
    /**
     * Submit the kernel and read back the output binding as a typed array.
     * The read-back buffer must be GPUBufferUsage.COPY_SRC capable (all
     * moxwebgpu storage buffers are).
     */
    async run(buffers, opts = {}) {
      let wg;
      if (opts.workgroups) {
        wg = opts.workgroups;
      } else if (opts.elements !== void 0) {
        wg = [Math.ceil(opts.elements / this.workgroupSize), 1, 1];
      } else {
        throw new Error("moxwebgpu: kernel.run() needs either `elements` or `workgroups`");
      }
      this.dispatch(buffers, wg);
      const outIndex = this.options.output ?? buffers.length - 1;
      const outBuf = buffers[outIndex];
      if (!outBuf) throw new Error(`moxwebgpu: no buffer at binding ${outIndex} to read back`);
      const gpuBuf = raw(outBuf);
      const dtype = this.options.dtype ?? "f32";
      const logical = outBuf.elements ?? Math.floor(gpuBuf.size / DTYPES[dtype].bytes);
      const bytes = Math.min(gpuBuf.size, logical * DTYPES[dtype].bytes);
      const elements = Math.floor(bytes / DTYPES[dtype].bytes);
      const { device, queue } = this.ctx;
      const staging = device.createBuffer({ size: bytes, usage: STAGING_USAGE, label: "moxwebgpu-kernel-staging" });
      const encoder = device.createCommandEncoder();
      encoder.copyBufferToBuffer(gpuBuf, 0, staging, 0, bytes);
      queue.submit([encoder.finish()]);
      await staging.mapAsync(GPUMapMode.READ);
      const Ctor = DTYPES[dtype].array;
      const mapped = new Uint8Array(staging.getMappedRange());
      const out = makeTypedArray(dtype, elements);
      out.set(new Ctor(mapped.buffer, mapped.byteOffset, elements));
      staging.unmap();
      staging.destroy();
      return out;
    }
  };

  // src/core/context.ts
  var MoxContext = class _MoxContext {
    constructor(adapter, device) {
      this.adapter = adapter;
      this.device = device;
      this.queue = device.queue;
      this.pool = new BufferPool(device);
      this.pipelines = new PipelineCache(device);
      this.scheduler = new Scheduler(this);
    }
    /** Request an adapter + device and build the context. */
    static async init(options = {}) {
      if (typeof navigator === "undefined" || !navigator.gpu) {
        throw new Error(
          "moxwebgpu: WebGPU is not available here. moxwebgpu targets browsers with WebGPU (Chrome/Edge 113+). For Node.js, run inside a WebGPU-enabled runtime."
        );
      }
      const adapter = options.adapter ?? await navigator.gpu.requestAdapter({
        powerPreference: options.powerPreference,
        ...options.requestAdapterOptions ?? {}
      });
      if (!adapter) {
        throw new Error("moxwebgpu: no suitable GPU adapter (WebGPU device unavailable or blocklisted)");
      }
      const device = await adapter.requestDevice();
      return new _MoxContext(adapter, device);
    }
    /** Create a leaf tensor from JS data. */
    tensor(data, options = {}) {
      return Tensor.fromData(this, data, options);
    }
    /** Wrap a raw WGSL compute kernel. */
    kernel(code, options = {}) {
      return new Kernel(this, code, options);
    }
    /** Copy a GPU buffer back to the CPU. */
    async readback(buf) {
      return this.scheduler.readback(buf);
    }
    /** Adapter summary for logs / about screens. */
    info() {
      const info = this.adapter.info ?? {};
      return {
        vendor: info.vendor,
        architecture: info.architecture,
        device: info.device,
        description: info.description
      };
    }
    /** Release every pooled buffer and destroy the device. */
    destroy() {
      this.pool.destroy();
      this.device.destroy();
    }
  };
  var mox = {
    init: (options = {}) => MoxContext.init(options)
  };

  // src/tensor/codegen.ts
  function fmtF32(v) {
    if (Number.isNaN(v) || v === Infinity || v === -Infinity) {
      throw new Error(
        "moxwebgpu: NaN/\xB1Infinity cannot be a WGSL const-expression literal \u2014 pass it through a uniform (OpUniforms.identity) instead"
      );
    }
    if (Number.isInteger(v) && Math.abs(v) < 1e15) return `${v}.0`;
    return `${v}`;
  }
  function fmtInt(v) {
    return `${Math.trunc(v)}u`;
  }
  function uniN() {
    return `
struct OpUniforms { n: u32, _p0: u32, scalar: f32, identity: f32 };
@group(0) @binding(0) var<uniform> uniforms: OpUniforms;`;
  }
  function uni2D() {
    return `
struct OpUniforms { rows: u32, cols: u32, scalar: f32, identity: f32 };
@group(0) @binding(0) var<uniform> uniforms: OpUniforms;`;
  }
  function uniCopy() {
    return `
struct OpUniforms {
  outShape: vec4<u32>,
  inStrides: vec4<u32>,
  outStrides: vec4<u32>,
  inOffset: u32,
  outOffset: u32,
  total: u32,
  rank: u32,
};
@group(0) @binding(0) var<uniform> uniforms: OpUniforms;`;
  }
  var BIND_READ = (name, t, i) => `@group(0) @binding(${i}) var<storage, read> ${name}: array<${t}>;`;
  var BIND_RW = (name, t, i) => `@group(0) @binding(${i}) var<storage, read_write> ${name}: array<${t}>;`;
  function binary1DWgsl(dtype, expr) {
    const t = dtypeInfo(dtype).wgsl;
    return `
${uniN()}
${BIND_READ("a", t, 1)}
${BIND_READ("b", t, 2)}
${BIND_RW("out", t, 3)}
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) g: vec3u) {
  let i = g.x;
  if (i >= uniforms.n) { return; }
  out[i] = ${expr("a[i]", "b[i]")};
}`;
  }
  function binaryScalarWgsl(dtype, expr) {
    const t = dtypeInfo(dtype).wgsl;
    return `
${uniN()}
${BIND_READ("a", t, 1)}
${BIND_RW("out", t, 2)}
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) g: vec3u) {
  let i = g.x;
  if (i >= uniforms.n) { return; }
  out[i] = ${expr("a[i]", "uniforms.scalar")};
}`;
  }
  function unaryWgsl(dtype, expr) {
    const t = dtypeInfo(dtype).wgsl;
    return `
${uniN()}
${BIND_READ("a", t, 1)}
${BIND_RW("out", t, 2)}
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) g: vec3u) {
  let i = g.x;
  if (i >= uniforms.n) { return; }
  out[i] = ${expr("a[i]")};
}`;
  }
  function castWgsl(from, to) {
    const ft = dtypeInfo(from).wgsl;
    const tt = dtypeInfo(to).wgsl;
    return `
${uniN()}
${BIND_READ("a", ft, 1)}
${BIND_RW("out", tt, 2)}
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) g: vec3u) {
  let i = g.x;
  if (i >= uniforms.n) { return; }
  out[i] = ${tt}(a[i]);
}`;
  }
  function binary2DWgsl(dtype, expr, mode) {
    const t = dtypeInfo(dtype).wgsl;
    const bIndex = mode === "row" ? "let bi = i % uniforms.cols;" : mode === "col" ? "let bi = i / uniforms.cols;" : "let bi = i;";
    return `
${uni2D()}
${BIND_READ("a", t, 1)}
${BIND_READ("b", t, 2)}
${BIND_RW("out", t, 3)}
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) g: vec3u) {
  let i = g.x;
  let total = uniforms.rows * uniforms.cols;
  if (i >= total) { return; }
  ${bIndex}
  out[i] = ${expr("a[i]", "b[bi]")};
}`;
  }
  var WORKGROUP_SIZE = 64;
  var REDUCE_CHUNK = 8;
  function reducePhase1Wgsl(dtype, combine) {
    const t = dtypeInfo(dtype).wgsl;
    return `
${uniN()}
${BIND_READ("input", t, 1)}
${BIND_RW("partial", t, 2)}
var<workgroup> smem: array<${t}, ${WORKGROUP_SIZE}>;
@compute @workgroup_size(${WORKGROUP_SIZE})
fn main(
  @builtin(global_invocation_id) g: vec3u,
  @builtin(local_invocation_id) l: vec3u,
  @builtin(workgroup_id) w: vec3u,
) {
  let start = w.x * ${WORKGROUP_SIZE}u * ${REDUCE_CHUNK}u;
  var acc = uniforms.identity;
  for (var c: u32 = 0u; c < ${REDUCE_CHUNK}u; c++) {
    let idx = start + l.x + c * ${WORKGROUP_SIZE}u;
    if (idx < uniforms.n) {
      acc = ${combine("acc", "input[idx]")};
    }
  }
  smem[l.x] = acc;
  workgroupBarrier();
  var size: u32 = ${WORKGROUP_SIZE / 2}u;
  loop {
    if (size == 0u) { break; }
    if (l.x < size) {
      smem[l.x] = ${combine("smem[l.x]", "smem[l.x + size]")};
    }
    workgroupBarrier();
    size = size / 2u;
  }
  if (l.x == 0u) {
    partial[w.x] = smem[0];
  }
}`;
  }
  function reducePhase2Wgsl(dtype, combine, epilogue = (v) => v) {
    const t = dtypeInfo(dtype).wgsl;
    return `
${uniN()}
${BIND_READ("partial", t, 1)}
${BIND_RW("out", t, 2)}
var<workgroup> smem: array<${t}, ${WORKGROUP_SIZE}>;
@compute @workgroup_size(${WORKGROUP_SIZE})
fn main(
  @builtin(global_invocation_id) g: vec3u,
  @builtin(local_invocation_id) l: vec3u,
) {
  var acc = uniforms.identity;
  // Sequential over partials (partials count is small).
  for (var i: u32 = l.x; i < uniforms.n; i += ${WORKGROUP_SIZE}u) {
    acc = ${combine("acc", "partial[i]")};
  }
  smem[l.x] = acc;
  workgroupBarrier();
  var size: u32 = ${WORKGROUP_SIZE / 2}u;
  loop {
    if (size == 0u) { break; }
    if (l.x < size) {
      smem[l.x] = ${combine("smem[l.x]", "smem[l.x + size]")};
    }
    workgroupBarrier();
    size = size / 2u;
  }
  if (l.x == 0u) {
    out[0] = ${epilogue("smem[0]")};
  }
}`;
  }
  function argReducePhase1Wgsl(dtype, better) {
    const t = dtypeInfo(dtype).wgsl;
    return `
${uniN()}
${BIND_READ("input", t, 1)}
@group(0) @binding(2) var<storage, read_write> partial: array<u32>;
var<workgroup> smem: array<u32, ${WORKGROUP_SIZE}>;
@compute @workgroup_size(${WORKGROUP_SIZE})
fn main(
  @builtin(global_invocation_id) g: vec3u,
  @builtin(local_invocation_id) l: vec3u,
  @builtin(workgroup_id) w: vec3u,
) {
  let start = w.x * ${WORKGROUP_SIZE}u * ${REDUCE_CHUNK}u;
  // Clamp the initial candidate to a valid index: lanes beyond n would
  // otherwise seed the tree with out-of-bounds reads (which return 0 and
  // wrongly win argmin).
  var acc: u32 = min(start + l.x, uniforms.n - 1u); // candidate index
  for (var c: u32 = 0u; c < ${REDUCE_CHUNK}u; c++) {
    let idx = start + l.x + c * ${WORKGROUP_SIZE}u;
    if (idx < uniforms.n) {
      if (${better("input[idx]", "input[acc]")}) { acc = idx; }
    }
  }
  smem[l.x] = acc;
  workgroupBarrier();
  var size: u32 = ${WORKGROUP_SIZE / 2}u;
  loop {
    if (size == 0u) { break; }
    if (l.x < size) {
      let ai = smem[l.x];
      let bi = smem[l.x + size];
      if (${better("input[bi]", "input[ai]")}) { smem[l.x] = bi; }
    }
    workgroupBarrier();
    size = size / 2u;
  }
  if (l.x == 0u) {
    partial[w.x] = smem[0];
  }
}`;
  }
  function argReducePhase2Wgsl(dtype, better) {
    const t = dtypeInfo(dtype).wgsl;
    return `
${uniN()}
@group(0) @binding(1) var<storage, read> partial: array<u32>;
${BIND_READ("input", t, 2)}
@group(0) @binding(3) var<storage, read_write> out: array<u32>;
@compute @workgroup_size(1)
fn main(@builtin(global_invocation_id) g: vec3u) {
  var acc: u32 = partial[0];
  for (var i: u32 = 1u; i < uniforms.n; i++) {
    let cand = partial[i];
    if (${better("input[cand]", "input[acc]")}) { acc = cand; }
  }
  out[0] = acc;
}`;
  }
  function matmulWgsl(dtype) {
    const t = dtypeInfo(dtype).wgsl;
    const TILE3 = 16;
    return `
struct Dims { m: u32, n: u32, k: u32, _p: u32 };
@group(0) @binding(0) var<uniform> dims: Dims;
${BIND_READ("a", t, 1)}
${BIND_READ("b", t, 2)}
${BIND_RW("c", t, 3)}
var<workgroup> tileA: array<${t}, ${TILE3 * TILE3}>;
var<workgroup> tileB: array<${t}, ${TILE3 * TILE3}>;
@compute @workgroup_size(${TILE3}, ${TILE3})
fn main(
  @builtin(local_invocation_id) l: vec3u,
  @builtin(workgroup_id) w: vec3u,
) {
  let rowBase = w.y * ${TILE3}u;
  let colBase = w.x * ${TILE3}u;
  var acc = ${t === "f32" ? "0.0" : `${t}(0)`};
  var tiles: u32 = (dims.k + ${TILE3 - 1}u) / ${TILE3}u;
  for (var tile: u32 = 0u; tile < tiles; tile++) {
    // Cooperatively load one 16x16 tile of A and of B.
    let aRow = rowBase + l.y;
    let aCol = tile * ${TILE3}u + l.x;
    let bRow = tile * ${TILE3}u + l.y;
    let bCol = colBase + l.x;
    if (aRow < dims.m && aCol < dims.k) {
      tileA[l.y * ${TILE3}u + l.x] = a[aRow * dims.k + aCol];
    } else {
      tileA[l.y * ${TILE3}u + l.x] = ${t === "f32" ? "0.0" : `${t}(0)`};
    }
    if (bRow < dims.k && bCol < dims.n) {
      tileB[l.y * ${TILE3}u + l.x] = b[bRow * dims.n + bCol];
    } else {
      tileB[l.y * ${TILE3}u + l.x] = ${t === "f32" ? "0.0" : `${t}(0)`};
    }
    workgroupBarrier();
    for (var kk: u32 = 0u; kk < ${TILE3}u; kk++) {
      acc = acc + tileA[l.y * ${TILE3}u + kk] * tileB[kk * ${TILE3}u + l.x];
    }
    workgroupBarrier();
  }
  let outRow = rowBase + l.y;
  let outCol = colBase + l.x;
  if (outRow < dims.m && outCol < dims.n) {
    c[outRow * dims.n + outCol] = acc;
  }
}`;
  }
  function transpose2DWgsl(dtype) {
    const t = dtypeInfo(dtype).wgsl;
    return `
${uni2D()}
${BIND_READ("input", t, 1)}
${BIND_RW("out", t, 2)}
@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) g: vec3u) {
  let i = g.y;
  let j = g.x;
  if (i < uniforms.rows && j < uniforms.cols) {
    out[j * uniforms.rows + i] = input[i * uniforms.cols + j];
  }
}`;
  }
  function reduceLastAxisWgsl(dtype, combine, epilogue) {
    const t = dtypeInfo(dtype).wgsl;
    return `
${uni2D()}
${BIND_READ("input", t, 1)}
${BIND_RW("out", t, 2)}
var<workgroup> smem: array<${t}, ${WORKGROUP_SIZE}>;
@compute @workgroup_size(${WORKGROUP_SIZE})
fn main(
  @builtin(local_invocation_id) l: vec3u,
  @builtin(workgroup_id) w: vec3u,
) {
  let cols = uniforms.cols;
  let base = w.x * cols;
  var acc = uniforms.identity;
  for (var i: u32 = l.x; i < cols; i += ${WORKGROUP_SIZE}u) {
    acc = ${combine("acc", "input[base + i]")};
  }
  smem[l.x] = acc;
  workgroupBarrier();
  var size: u32 = ${WORKGROUP_SIZE / 2}u;
  loop {
    if (size == 0u) { break; }
    if (l.x < size) {
      smem[l.x] = ${combine("smem[l.x]", "smem[l.x + size]")};
    }
    workgroupBarrier();
    size = size / 2u;
  }
  if (l.x == 0u) {
    out[w.x] = ${epilogue ? epilogue("smem[0]") : "smem[0]"};
  }
}`;
  }
  function softmaxWgsl(dtype) {
    const t = dtypeInfo(dtype).wgsl;
    return `
${uni2D()}
${BIND_READ("input", t, 1)}
${BIND_RW("out", t, 2)}
var<workgroup> smem: array<${t}, ${WORKGROUP_SIZE}>;
@compute @workgroup_size(${WORKGROUP_SIZE})
fn main(
  @builtin(local_invocation_id) l: vec3u,
  @builtin(workgroup_id) w: vec3u,
) {
  let cols = uniforms.cols;
  let base = w.x * cols;
  // Pass 1: row max. -Infinity arrives via uniforms.identity (runtime value).
  var m = uniforms.identity;
  for (var i: u32 = l.x; i < cols; i += ${WORKGROUP_SIZE}u) {
    m = max(m, input[base + i]);
  }
  smem[l.x] = m;
  workgroupBarrier();
  var size: u32 = ${WORKGROUP_SIZE / 2}u;
  loop {
    if (size == 0u) { break; }
    if (l.x < size) { smem[l.x] = max(smem[l.x], smem[l.x + size]); }
    workgroupBarrier();
    size = size / 2u;
  }
  let rowMax = smem[0];
  workgroupBarrier();
  // Pass 2: sum of exponentials.
  var s = 0.0;
  for (var i: u32 = l.x; i < cols; i += ${WORKGROUP_SIZE}u) {
    s = s + exp(input[base + i] - rowMax);
  }
  smem[l.x] = s;
  workgroupBarrier();
  size = ${WORKGROUP_SIZE / 2}u;
  loop {
    if (size == 0u) { break; }
    if (l.x < size) { smem[l.x] = smem[l.x] + smem[l.x + size]; }
    workgroupBarrier();
    size = size / 2u;
  }
  let denom = smem[0];
  // Pass 3: write normalized output.
  for (var i: u32 = l.x; i < cols; i += ${WORKGROUP_SIZE}u) {
    out[base + i] = exp(input[base + i] - rowMax) / denom;
  }
}`;
  }
  function copyWgsl(dtype) {
    const t = dtypeInfo(dtype).wgsl;
    return `
${uniCopy()}
${BIND_READ("input", t, 1)}
${BIND_RW("out", t, 2)}
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) g: vec3u) {
  let i = g.x;
  if (i >= uniforms.total) { return; }
  var rem = i;
  var src: u32 = uniforms.inOffset;
  var dst: u32 = uniforms.outOffset;
  var d: u32 = uniforms.rank;
  loop {
    if (d == 0u) { break; }
    d = d - 1u;
    let coord = rem % uniforms.outShape[d];
    rem = rem / uniforms.outShape[d];
    src = src + coord * uniforms.inStrides[d];
    dst = dst + coord * uniforms.outStrides[d];
  }
  out[dst] = input[src];
}`;
  }
  function encodeCopyUniform(shape, inStrides, outStrides, inOffset, outOffset) {
    const buf = new ArrayBuffer(64);
    const dv = new DataView(buf);
    const rank = Math.min(4, shape.length);
    for (let i = 0; i < rank; i++) {
      dv.setUint32(i * 4, shape[i], true);
      dv.setUint32(16 + i * 4, inStrides[i], true);
      dv.setUint32(32 + i * 4, outStrides[i], true);
    }
    dv.setUint32(48, inOffset, true);
    dv.setUint32(52, outOffset, true);
    dv.setUint32(56, numElementsOf(shape), true);
    dv.setUint32(60, rank, true);
    return buf;
  }
  function numElementsOf(shape) {
    let n = 1;
    for (const d of shape) n *= d;
    return n;
  }
  function encodeNUniform(n, scalar = 0, identity = 0) {
    const b = new ArrayBuffer(16);
    const dv = new DataView(b);
    dv.setUint32(0, n, true);
    dv.setFloat32(8, scalar, true);
    dv.setFloat32(12, identity, true);
    return b;
  }
  function encode2DUniform(rows, cols, scalar = 0, identity = 0) {
    const b = new ArrayBuffer(16);
    const dv = new DataView(b);
    dv.setUint32(0, rows, true);
    dv.setUint32(4, cols, true);
    dv.setFloat32(8, scalar, true);
    dv.setFloat32(12, identity, true);
    return b;
  }
  function encodeMatmulUniform(m, n, k) {
    const b = new ArrayBuffer(16);
    const dv = new DataView(b);
    dv.setUint32(0, m, true);
    dv.setUint32(4, n, true);
    dv.setUint32(8, k, true);
    return b;
  }
  function contiguousStrides(shape) {
    const s = new Array(shape.length);
    let acc = 1;
    for (let i = shape.length - 1; i >= 0; i--) {
      s[i] = acc;
      acc *= shape[i];
    }
    return s;
  }

  // src/tensor/ops/elementwise.ts
  var WG = 64;
  function broadcastMode(aShape, bShape) {
    if (aShape.length === bShape.length && aShape.every((d, i) => d === bShape[i])) return "plain";
    const aSize = numElements(aShape);
    const bSize = numElements(bShape);
    const last = aShape[aShape.length - 1];
    if (aSize % last === 0 && bSize === last) return "row";
    const first = aShape[0];
    if (aShape.length >= 2 && aSize % first === 0 && bSize === first) return "col";
    throw new Error(
      `moxwebgpu: cannot broadcast shapes [${bShape}] against [${aShape}] (plain, row or col broadcast supported)`
    );
  }
  function binaryOpDef(name, expr) {
    return {
      name,
      outShape: (shapes) => {
        broadcastMode(shapes[0], shapes[1]);
        return shapes[0];
      },
      outDtype: (dtypes) => {
        if (dtypes[0] !== dtypes[1]) {
          throw new Error(`moxwebgpu: ${name} requires matching dtypes, got ${dtypes[0]} vs ${dtypes[1]}`);
        }
        return dtypes[0];
      },
      build: (shapes, dtypes) => {
        const dtype = dtypes[0];
        const aShape = shapes[0];
        const n = numElements(aShape);
        const mode = broadcastMode(aShape, shapes[1]);
        const wgsl = mode === "plain" ? binary1DWgsl(dtype, expr) : binary2DWgsl(dtype, expr, mode);
        const step = {
          key: `${name}:${dtype}:${mode}`,
          wgsl,
          bindings: [
            { kind: "uniform" },
            { kind: "read", input: 0 },
            { kind: "read", input: 1 },
            { kind: "rw", output: true }
          ],
          uniforms: () => mode === "plain" ? encodeNUniform(n) : encode2DUniform(rowsOf(aShape, mode), colsOf(aShape, mode)),
          workgroups: () => [Math.ceil(n / WG), 1, 1]
        };
        return { steps: [step] };
      }
    };
  }
  function scalarOpDef(name, expr) {
    return {
      name,
      outShape: (shapes) => shapes[0],
      build: (_shapes, dtypes, attrs) => {
        const dtype = dtypes[0];
        const n = numElements(_shapes[0]);
        const step = {
          key: `${name}-scalar:${dtype}`,
          wgsl: binaryScalarWgsl(dtype, expr),
          bindings: [{ kind: "uniform" }, { kind: "read", input: 0 }, { kind: "rw", output: true }],
          uniforms: () => encodeNUniform(n, attrs.scalar),
          workgroups: () => [Math.ceil(n / WG), 1, 1]
        };
        return { steps: [step] };
      }
    };
  }
  function unaryOpDef(name, expr) {
    return {
      name,
      outShape: (shapes) => shapes[0],
      build: (_shapes, dtypes) => {
        const dtype = dtypes[0];
        const n = numElements(_shapes[0]);
        const step = {
          key: `${name}:${dtype}`,
          wgsl: unaryWgsl(dtype, expr),
          bindings: [{ kind: "uniform" }, { kind: "read", input: 0 }, { kind: "rw", output: true }],
          uniforms: () => encodeNUniform(n),
          workgroups: () => [Math.ceil(n / WG), 1, 1]
        };
        return { steps: [step] };
      }
    };
  }
  function rowsOf(shape, mode) {
    return mode === "row" ? numElements(shape) / shape[shape.length - 1] : shape[0];
  }
  function colsOf(shape, mode) {
    return mode === "row" ? shape[shape.length - 1] : numElements(shape) / shape[0];
  }
  var addDef = binaryOpDef("add", (a, b) => `(${a} + ${b})`);
  var subDef = binaryOpDef("sub", (a, b) => `(${a} - ${b})`);
  var mulDef = binaryOpDef("mul", (a, b) => `(${a} * ${b})`);
  var divDef = binaryOpDef("div", (a, b) => `(${a} / ${b})`);
  var powDef = binaryOpDef("pow", (a, b) => `pow(${a}, ${b})`);
  var minDef = binaryOpDef("min", (a, b) => `min(${a}, ${b})`);
  var maxDef = binaryOpDef("max", (a, b) => `max(${a}, ${b})`);
  var addScalarDef = scalarOpDef("add", (a, b) => `(${a} + ${b})`);
  var subScalarDef = scalarOpDef("sub", (a, b) => `(${a} - ${b})`);
  var rsubScalarDef = scalarOpDef("sub", (a, b) => `(${b} - ${a})`);
  var mulScalarDef = scalarOpDef("mul", (a, b) => `(${a} * ${b})`);
  var divScalarDef = scalarOpDef("div", (a, b) => `(${a} / ${b})`);
  var rdivScalarDef = scalarOpDef("div", (a, b) => `(${b} / ${a})`);
  var powScalarDef = scalarOpDef("pow", (a, b) => `pow(${a}, ${b})`);
  var minScalarDef = scalarOpDef("min", (a, b) => `min(${a}, ${b})`);
  var maxScalarDef = scalarOpDef("max", (a, b) => `max(${a}, ${b})`);
  var negDef = unaryOpDef("neg", (a) => `(-${a})`);
  var absDef = unaryOpDef("abs", (a) => `abs(${a})`);
  var expDef = unaryOpDef("exp", (a) => `exp(${a})`);
  var logDef = unaryOpDef("log", (a) => `log(${a})`);
  var sqrtDef = unaryOpDef("sqrt", (a) => `sqrt(${a})`);
  var sinDef = unaryOpDef("sin", (a) => `sin(${a})`);
  var cosDef = unaryOpDef("cos", (a) => `cos(${a})`);
  var tanhDef = unaryOpDef("tanh", (a) => `tanh(${a})`);
  var floorDef = unaryOpDef("floor", (a) => `floor(${a})`);
  var ceilDef = unaryOpDef("ceil", (a) => `ceil(${a})`);
  var reluDef = unaryOpDef("relu", (a) => `max(${a}, 0.0)`);
  var sigmoidDef = unaryOpDef("sigmoid", (a) => `(1.0 / (1.0 + exp(-(${a}))))`);
  var squareDef = unaryOpDef("square", (a) => `(${a} * ${a})`);
  var signDef = unaryOpDef("sign", (a) => `sign(${a})`);
  function castOpDef(target) {
    return {
      name: "cast",
      outShape: (shapes) => shapes[0],
      outDtype: () => target,
      build: (_shapes, dtypes) => {
        const from = dtypes[0];
        const n = numElements(_shapes[0]);
        const step = {
          key: `cast:${from}->${target}`,
          wgsl: castWgsl(from, target),
          bindings: [{ kind: "uniform" }, { kind: "read", input: 0 }, { kind: "rw", output: true }],
          uniforms: () => encodeNUniform(n),
          workgroups: () => [Math.ceil(n / WG), 1, 1]
        };
        return { steps: [step] };
      }
    };
  }

  // src/tensor/ops/reduce.ts
  var WG2 = 64;
  var CHUNK = 8;
  function globalReduceOpDef(name, spec) {
    return {
      name,
      outShape: () => [1],
      outDtype: (dtypes) => dtypes[0],
      build: (shapes, dtypes) => {
        const dtype = dtypes[0];
        const n = numElements(shapes[0]);
        const nw1 = Math.max(1, Math.ceil(n / (WG2 * CHUNK)));
        const steps = [
          {
            key: `${name}-p1:${dtype}`,
            wgsl: reducePhase1Wgsl(dtype, spec.combine),
            bindings: [{ kind: "uniform" }, { kind: "read", input: 0 }, { kind: "rw", temp: true }],
            uniforms: () => encodeNUniform(n, 0, spec.identityValue),
            workgroups: () => [nw1, 1, 1],
            tempOutputElements: () => nw1
          },
          {
            key: `${name}-p2:${dtype}`,
            wgsl: reducePhase2Wgsl(dtype, spec.combine, spec.epilogue),
            bindings: [{ kind: "uniform" }, { kind: "read", temp: true }, { kind: "rw", output: true }],
            uniforms: () => encodeNUniform(nw1, spec.epilogue ? n : 0, spec.identityValue),
            workgroups: () => [1, 1, 1]
          }
        ];
        return { steps };
      }
    };
  }
  function argReduceOpDef(name, better) {
    return {
      name,
      outShape: () => [1],
      outDtype: () => "u32",
      build: (shapes, dtypes) => {
        const dtype = dtypes[0];
        const n = numElements(shapes[0]);
        const nw1 = Math.max(1, Math.ceil(n / (WG2 * CHUNK)));
        const steps = [
          {
            key: `${name}-p1:${dtype}`,
            wgsl: argReducePhase1Wgsl(dtype, better),
            bindings: [{ kind: "uniform" }, { kind: "read", input: 0 }, { kind: "rw", temp: true }],
            uniforms: () => encodeNUniform(n),
            workgroups: () => [nw1, 1, 1],
            tempOutputElements: () => nw1,
            tempOutputDtype: "u32"
          },
          {
            key: `${name}-p2:${dtype}`,
            wgsl: argReducePhase2Wgsl(dtype, better),
            bindings: [
              { kind: "uniform" },
              { kind: "read", temp: true },
              { kind: "read", input: 0 },
              { kind: "rw", output: true }
            ],
            uniforms: () => encodeNUniform(nw1),
            workgroups: () => [1, 1, 1]
          }
        ];
        return { steps };
      }
    };
  }
  function lastAxisReduceOpDef(name, spec) {
    return {
      name,
      outShape: (shapes) => shapes[0].length <= 1 ? [1] : shapes[0].slice(0, -1),
      outDtype: (dtypes) => dtypes[0],
      build: (shapes, dtypes) => {
        const dtype = dtypes[0];
        const shape = shapes[0];
        const rows = shape.length <= 1 ? 1 : numElements(shape) / shape[shape.length - 1];
        const cols = shape[shape.length - 1];
        const divideBy = spec.epilogue ? cols : 0;
        const step = {
          key: `${name}-axis:${dtype}`,
          wgsl: reduceLastAxisWgsl(dtype, spec.combine, spec.epilogue),
          bindings: [{ kind: "uniform" }, { kind: "read", input: 0 }, { kind: "rw", output: true }],
          uniforms: () => encode2DUniform(rows, cols, divideBy, spec.identityValue),
          workgroups: () => [rows, 1, 1]
        };
        return { steps: [step] };
      }
    };
  }
  var sumDef = globalReduceOpDef("sum", {
    identityValue: 0,
    combine: (a, b) => `(${a} + ${b})`
  });
  var meanDef = globalReduceOpDef("mean", {
    identityValue: 0,
    combine: (a, b) => `(${a} + ${b})`,
    epilogue: (v) => `(${v}) / uniforms.scalar`
  });
  var maxReduceDef = globalReduceOpDef("max", {
    identityValue: -Infinity,
    combine: (a, b) => `max(${a}, ${b})`
  });
  var minReduceDef = globalReduceOpDef("min", {
    identityValue: Infinity,
    combine: (a, b) => `min(${a}, ${b})`
  });
  var argmaxDef = argReduceOpDef("argmax", (c, b) => `(${c} > ${b})`);
  var argminDef = argReduceOpDef("argmin", (c, b) => `(${c} < ${b})`);
  var sumAxisDef = lastAxisReduceOpDef("sum", {
    identityValue: 0,
    combine: (a, b) => `(${a} + ${b})`
  });
  var meanAxisDef = lastAxisReduceOpDef("mean", {
    identityValue: 0,
    combine: (a, b) => `(${a} + ${b})`,
    epilogue: (v) => `(${v}) / uniforms.scalar`
  });
  var maxAxisDef = lastAxisReduceOpDef("max", {
    identityValue: -Infinity,
    combine: (a, b) => `max(${a}, ${b})`
  });
  var minAxisDef = lastAxisReduceOpDef("min", {
    identityValue: Infinity,
    combine: (a, b) => `min(${a}, ${b})`
  });

  // src/tensor/ops/matmul.ts
  var TILE = 16;
  var matmulDef = {
    name: "matmul",
    outShape: (shapes) => {
      const [m, k] = shapes[0];
      const [k2, n] = shapes[1];
      if (k !== k2) {
        throw new Error(`moxwebgpu: matmul shape mismatch (${shapes[0]} x ${shapes[1]}): inner dims ${k} vs ${k2}`);
      }
      return [m, n];
    },
    outDtype: (dtypes) => {
      if (dtypes[0] !== dtypes[1]) {
        throw new Error(`moxwebgpu: matmul requires matching dtypes, got ${dtypes[0]} vs ${dtypes[1]}`);
      }
      return dtypes[0];
    },
    build: (shapes, dtypes) => {
      const dtype = dtypes[0];
      const [m, k] = shapes[0];
      const n = shapes[1][1];
      const step = {
        key: `matmul:${dtype}`,
        wgsl: matmulWgsl(dtype),
        bindings: [
          { kind: "uniform" },
          { kind: "read", input: 0 },
          { kind: "read", input: 1 },
          { kind: "rw", output: true }
        ],
        uniforms: () => encodeMatmulUniform(m, n, k),
        // x covers output columns, y covers output rows.
        workgroups: () => [Math.ceil(n / TILE), Math.ceil(m / TILE), 1]
      };
      return { steps: [step] };
    }
  };

  // src/tensor/ops/shape.ts
  var COPY_WG = 64;
  var TILE2 = 16;
  var transposeDef = {
    name: "transpose",
    outShape: (shapes) => {
      const s = shapes[0];
      if (s.length !== 2) {
        throw new Error(`moxwebgpu: transpose currently supports 2D tensors, got rank ${s.length}`);
      }
      return [s[1], s[0]];
    },
    build: (shapes, dtypes) => {
      const dtype = dtypes[0];
      const [rows, cols] = shapes[0];
      const step = {
        key: `transpose:${dtype}`,
        wgsl: transpose2DWgsl(dtype),
        bindings: [{ kind: "uniform" }, { kind: "read", input: 0 }, { kind: "rw", output: true }],
        uniforms: () => encode2DUniform(rows, cols),
        workgroups: () => [Math.ceil(cols / TILE2), Math.ceil(rows / TILE2), 1]
      };
      return { steps: [step] };
    }
  };
  var sliceDef = {
    name: "slice",
    outShape: (_shapes, attrs) => attrs.size,
    build: (shapes, dtypes, attrs) => {
      const dtype = dtypes[0];
      const { start, size } = attrs;
      const inShape = shapes[0];
      const inStrides = contiguousStrides(inShape);
      const inOffset = start.reduce((acc, s, d) => acc + s * inStrides[d], 0);
      const outStrides = contiguousStrides(size);
      const step = {
        key: `copy:${dtype}`,
        wgsl: copyWgsl(dtype),
        bindings: [{ kind: "uniform" }, { kind: "read", input: 0 }, { kind: "rw", output: true }],
        uniforms: () => encodeCopyUniform(size, inStrides, outStrides, inOffset, 0),
        workgroups: () => [Math.ceil(numElements(size) / COPY_WG), 1, 1]
      };
      return { steps: [step] };
    }
  };
  var concatDef = {
    name: "concat",
    outShape: (shapes, attrs) => {
      const a = shapes[0];
      const b = shapes[1];
      if (a.length !== b.length) {
        throw new Error(`moxwebgpu: concat requires matching ranks, got ${a.length} vs ${b.length}`);
      }
      const axis = attrs.axis;
      for (let d = 0; d < a.length; d++) {
        if (d !== axis && a[d] !== b[d]) {
          throw new Error(`moxwebgpu: concat shape mismatch on non-axis dim ${d}: ${a[d]} vs ${b[d]}`);
        }
      }
      const out = a.slice();
      out[axis] = a[axis] + b[axis];
      return out;
    },
    build: (shapes, dtypes, attrs) => {
      const dtype = dtypes[0];
      const axis = attrs.axis;
      const outShape = this_outShape(shapes, axis);
      const globalStrides = contiguousStrides(outShape);
      let cum = 0;
      const steps = shapes.map((chunkShape, k) => {
        const chunkStrides = contiguousStrides(chunkShape);
        const outOffset = cum * globalStrides[axis];
        cum += chunkShape[axis];
        return {
          key: `copy:${dtype}`,
          wgsl: copyWgsl(dtype),
          bindings: [
            { kind: "uniform" },
            { kind: "read", input: k },
            { kind: "rw", output: true }
          ],
          uniforms: () => encodeCopyUniform(chunkShape, chunkStrides, globalStrides, 0, outOffset),
          workgroups: () => [Math.ceil(numElements(chunkShape) / COPY_WG), 1, 1]
        };
      });
      return { steps };
    }
  };
  function this_outShape(shapes, axis) {
    const out = shapes[0].slice();
    out[axis] = shapes.reduce((acc, s) => acc + s[axis], 0);
    return out;
  }

  // src/tensor/ops/nn.ts
  var softmaxDef = {
    name: "softmax",
    outShape: (shapes) => shapes[0],
    build: (shapes, dtypes) => {
      const dtype = dtypes[0];
      const shape = shapes[0];
      const rows = shape.length <= 1 ? 1 : numElements(shape) / shape[shape.length - 1];
      const cols = shape[shape.length - 1];
      const step = {
        key: `softmax:${dtype}`,
        wgsl: softmaxWgsl(dtype),
        bindings: [{ kind: "uniform" }, { kind: "read", input: 0 }, { kind: "rw", output: true }],
        uniforms: () => encode2DUniform(rows, cols, 0, -Infinity),
        workgroups: () => [rows, 1, 1]
      };
      return { steps: [step] };
    }
  };

  // src/tensor/ops/index.ts
  function binaryMethod(def, scalarDef) {
    return function(other) {
      if (typeof other === "number") {
        return this.apply(scalarDef, [this], { scalar: other });
      }
      return this.apply(def, [this, other], {});
    };
  }
  function rbinaryMethod(def, scalarDef) {
    return function(other) {
      if (typeof other === "number") {
        return this.apply(scalarDef, [this], { scalar: other });
      }
      return other.apply(def, [other, this], {});
    };
  }
  function unaryMethod(def) {
    return function() {
      return this.apply(def, [this], {});
    };
  }
  function reduceMethod(globalDef, axisDef, binaryDef) {
    return function(other) {
      if (other === void 0) return this.apply(globalDef, [this], {});
      if (typeof other === "number") {
        if (other === -1 || other === this.ndim - 1 && axisDef) {
          if (!axisDef) return this.apply(globalDef, [this], {});
          return this.apply(axisDef, [this], {});
        }
        if (other === 0 && axisDef) {
          if (this.ndim !== 2) {
            throw new Error(`moxwebgpu: axis=0 reduce currently requires a 2D tensor, got rank ${this.ndim}`);
          }
          return this.transpose().apply(axisDef, [this.transpose()], {});
        }
        throw new Error(`moxwebgpu: unsupported reduce axis ${other} (use undefined, -1 or 0 on 2D)`);
      }
      if (binaryDef && other instanceof Tensor) {
        return this.apply(binaryDef, [this, other], {});
      }
      throw new Error("moxwebgpu: reduce methods accept no argument, an axis number, or (max/min) a Tensor");
    };
  }
  function installTensorOps(proto) {
    const p = proto;
    p.add = binaryMethod(addDef, addScalarDef);
    p.sub = binaryMethod(subDef, subScalarDef);
    p.mul = binaryMethod(mulDef, mulScalarDef);
    p.div = binaryMethod(divDef, divScalarDef);
    p.pow = binaryMethod(powDef, powScalarDef);
    p.clamp = function(lo, hi) {
      return this.apply(maxDef, [this.apply(minScalarDef, [this], { scalar: hi })], { scalar: lo });
    };
    p.rsub = rbinaryMethod(subDef, rsubScalarDef);
    p.rdiv = rbinaryMethod(divDef, rdivScalarDef);
    p.neg = unaryMethod(negDef);
    p.abs = unaryMethod(absDef);
    p.exp = unaryMethod(expDef);
    p.log = unaryMethod(logDef);
    p.sqrt = unaryMethod(sqrtDef);
    p.sin = unaryMethod(sinDef);
    p.cos = unaryMethod(cosDef);
    p.tanh = unaryMethod(tanhDef);
    p.floor = unaryMethod(floorDef);
    p.ceil = unaryMethod(ceilDef);
    p.relu = unaryMethod(reluDef);
    p.sigmoid = unaryMethod(sigmoidDef);
    p.square = unaryMethod(squareDef);
    p.sign = unaryMethod(signDef);
    p.sum = reduceMethod(sumDef, sumAxisDef);
    p.mean = reduceMethod(meanDef, meanAxisDef);
    p.max = reduceMethod(maxReduceDef, maxAxisDef, maxDef);
    p.min = reduceMethod(minReduceDef, minAxisDef, minDef);
    p.maxReduce = p.max;
    p.minReduce = p.min;
    p.argmax = reduceMethod(argmaxDef, null);
    p.argmin = reduceMethod(argminDef, null);
    p.matmul = function(other) {
      return this.apply(matmulDef, [this, other], {});
    };
    p.transpose = function() {
      return this.apply(transposeDef, [this], {});
    };
    p.slice = function(start, size) {
      const ndim = this.ndim;
      let s = typeof start === "number" ? [start] : start.slice();
      let z = typeof size === "number" ? [size] : size.slice();
      while (s.length < ndim) s.push(0);
      while (z.length < ndim) z.push(this.shape[z.length]);
      for (let d = 0; d < ndim; d++) {
        if (s[d] < 0 || z[d] < 0 || s[d] + z[d] > this.shape[d]) {
          throw new Error(`moxwebgpu: slice range [${s}, ${z}] out of bounds for shape [${this.shape}]`);
        }
      }
      return this.apply(sliceDef, [this], { start: s, size: z });
    };
    p.concat = function(other, axis = 0) {
      return this.apply(concatDef, [this, other], { axis });
    };
    p.softmax = unaryMethod(softmaxDef);
    p.cast = function(dtype) {
      if (dtype === this.dtype) return this;
      return this.apply(castOpDef(dtype), [this], {});
    };
    p.toFloat = function() {
      return this.cast("f32");
    };
  }

  // src/index.ts
  var MOXWEBGPU_VERSION = "0.1.0";
  installTensorOps(Tensor.prototype);
  return __toCommonJS(src_exports);
})();
//# sourceMappingURL=moxwebgpu.browser.js.map