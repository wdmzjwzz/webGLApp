import { GLAttribStateManager } from "./WebGLAttribState";
import { mat4 } from "../common/math/TSM";
import { TypedArrayList } from "../common/container/TypedArrayList";
import { GLProgram } from "./WebGLProgram";
import { GLTexture } from "./WebGLTexture";
import { GLAttribBits, GLAttribName, GLAttribOffsetMap } from "../type";
import { attribNames } from "../constants";

// 使用abstract声明抽象类
export abstract class GLMeshBase {
  // WebGL渲染上下文
  public gl: WebGLRenderingContext;
  // gl.TRIANGLES 等7种基本几何图元之一
  public drawMode: number;
  // 顶点属性格式，和绘制当前网格时使用的GLProgram具有一致的attribBits
  protected _attribState: GLAttribBits;
  // 当前使用的顶点属性的stride字节数
  protected _attribStride: number;

  // 我们使用VAO（顶点数组对象）来管理VBO和EBO
  protected _vao: OES_vertex_array_object;
  protected _vaoTarget: WebGLVertexArrayObjectOES;

  public constructor(
    gl: WebGLRenderingContext,
    attribState: GLAttribBits,
    drawMode: number = gl.TRIANGLES
  ) {
    this.gl = gl;

    // 获取VAO的步骤：
    // 1、使用gl.getExtension( "OES_vertex_array_object" )方式获取VAO扩展
    let vao: OES_vertex_array_object | null = this.gl.getExtension(
      "OES_vertex_array_object"
    );
    if (vao === null) {
      throw new Error("Not Support OES_vertex_array_object");
    }
    this._vao = vao;

    // 2、调用createVertexArrayOES获取VAO对象
    let vaoTarget: WebGLVertexArrayObjectOES | null =
      this._vao.createVertexArrayOES();
    if (vaoTarget === null) {
      throw new Error("Not Support WebGLVertexArrayObjectOES");
    }
    this._vaoTarget = vaoTarget;

    // 顶点属性格式，和绘制当前网格时使用的GLProgram具有一致的attribBits
    this._attribState = attribState;
    // 调用GLAttribStateManager的getVertexByteStride方法，根据attribBits计算出顶点的stride字节数
    this._attribStride = GLAttribStateManager.getVertexByteStride(
      this._attribState
    );
    // 设置当前绘制时使用的基本几何图元类型，默认为三角形集合
    this.drawMode = drawMode;
  }

  public bind(): void {
    // 绑定VAO对象
    this._vao.bindVertexArrayOES(this._vaoTarget);
  }

  public unbind(): void {
    // 解绑VAO
    this._vao.bindVertexArrayOES(null);
  }

  public get vertexStride(): number {
    return this._attribStride;
  }
}

export enum EVertexLayout {
  INTERLEAVED,
  SEQUENCED,
  SEPARATED,
}

export class GLMeshBuilder extends GLMeshBase {
  // 字符串常量key
  // private _layout: EVertexLayout; // 顶点在内存或显存中的布局方式

  // 为了简单起见，只支持顶点的位置坐标、纹理0坐标、颜色和法线这四种顶点属性格式
  // 表示当前正在输入的顶点属性值

  private attribValue: { [key: string]: number[] } = {
    [GLAttribName.POSITION]: [0, 0, 0],
    [GLAttribName.COLOR]: [0, 0, 1, 1],
    [GLAttribName.TEXCOORD]: [0, 0],
    [GLAttribName.NORMAL]: [0, 0, 1],
    [GLAttribName.SIZE]: [1],
  };

  // 渲染的数据源
  private _lists: TypedArrayList<Float32Array>;
  // 渲染用的VBO
  private _buffer: WebGLBuffer;
  // 要渲染的顶点数量
  private _vertCount: number = 0;

  // 当前使用的GLProgram对象
  public program: GLProgram;
  // 如果纹理坐标，那需要设置当前使用的纹理
  public texture: WebGLTexture | null;

  private _ibo: WebGLBuffer | null;
  private _indexCount: number = -1;

  public setTexture(tex: GLTexture): void {
    this.texture = tex.texture;
  }

  public setIBO(data: Uint16Array): void {
    // 创建ibo
    this._ibo = this.gl.createBuffer();
    if (!this._ibo) {
      throw new Error("IBO creation fail");
    }
    // 绑定ibo
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this._ibo);
    // 将索引数据上传到ibo中
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, data, this.gl.STATIC_DRAW);
    this._indexCount = data.length;
  }

  public constructor(
    gl: WebGLRenderingContext,
    state: GLAttribBits,
    program: GLProgram,
    texture: WebGLTexture | null = null,
  ) {
    super(gl, state); // 调用基类的构造方法

    this._ibo = null;

    // 设置当前使用的GLProgram和GLTexture2D对象
    this.program = program;
    this.texture = texture;

    // 先绑定VAO对象
    this.bind();
    // interleaved的话：
    // 使用一个arraylist,一个顶点缓存
    // 调用的是GLAttribState.getInterleavedLayoutAttribOffsetMap方法
    this._lists = new TypedArrayList<Float32Array>(Float32Array);
    this._buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this._buffer);
    let map: GLAttribOffsetMap =
      GLAttribStateManager.getInterleavedLayoutAttribOffsetMap(
        this._attribState
      );
    // 调用如下两个方法
    GLAttribStateManager.setAttribVertexArrayPointer(this.gl, map);
    GLAttribStateManager.setAttribVertexArrayState(this.gl, this._attribState);
    this.unbind();
  }

  // 输入rgba颜色值，取值范围为[ 0 , 1 ]之间,返回this,都是链式操作
  public color(
    r: number,
    g: number,
    b: number,
    a: number = 1.0
  ): GLMeshBuilder {
    if (
      !GLAttribStateManager.hasAttrib(GLAttribName.COLOR, this._attribState)
    ) {
      throw new Error("GLAttribBits is not include COLOR");
    }
    this.attribValue[GLAttribName.COLOR] = [r, g, b, a];
    return this;
  }
  // 输入点的大小,返回this,都是链式操作
  public size(size: number): GLMeshBuilder {
    if (!GLAttribStateManager.hasAttrib(GLAttribName.SIZE, this._attribState)) {
      throw new Error("GLAttribBits is not include SIZE");
    }
    this.attribValue[GLAttribName.SIZE] = [size];
    return this;
  }
  // 输入uv纹理坐标值，返回this,都是链式操作
  public texcoord(u: number, v: number): GLMeshBuilder {
    if (
      !GLAttribStateManager.hasAttrib(GLAttribName.TEXCOORD, this._attribState)
    ) {
      throw new Error("GLAttribBits is not include TEXCOORD");
    }
    this.attribValue[GLAttribName.TEXCOORD] = [u, v];
    return this;
  }

  // 输入法线值xyz，返回this,都是链式操作
  public normal(x: number, y: number, z: number): GLMeshBuilder {
    if (
      !GLAttribStateManager.hasAttrib(GLAttribName.NORMAL, this._attribState)
    ) {
      throw new Error("GLAttribBits is not include NORMAL");
    }
    this.attribValue[GLAttribName.NORMAL] = [x, y, z];
    return this;
  }

  // vertex必须要最后调用，输入xyz,返回this,都是链式操作
  public vertex(x: number, y: number, z: number): GLMeshBuilder {
    // position
    this.attribValue[GLAttribName.POSITION] = [x, y, z];
    attribNames.forEach((name) => {
      if (GLAttribStateManager.hasAttrib(name, this._attribState)) {
        this._lists.pushArray([...this.attribValue[name]]);
      }
    });

    // 记录更新后的顶点数量
    this._vertCount++;
    return this;
  }

  // 每次调用上述几个添加顶点属性的方法之前，必须要先调用begin方法，返回this指针，链式操作
  public begin(drawMode: number = this.gl.TRIANGLES): GLMeshBuilder {
    this.drawMode = drawMode;
    this.resetDefaultAttribValue();
    this._lists.clear();
    this._vertCount = 0;
    return this;
  }
  resetDefaultAttribValue() {
    this.attribValue = {
      [GLAttribName.POSITION]: [0, 0, 0],
      [GLAttribName.COLOR]: [0, 0, 1, 1],
      [GLAttribName.TEXCOORD]: [0, 0],
      [GLAttribName.NORMAL]: [0, 0, 1],
      [GLAttribName.SIZE]: [1],
    };
  }
  // end方法用于渲染操作
  public end(mvp: mat4): void {
    this.program.bind(); // 绑定GLProgram
    this.program.setMatrix4(GLProgram.MVPMatrix, mvp); // 载入MVPMatrix uniform变量
    if (this.texture !== null) {
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
      this.program.loadSampler();
    }
    this.bind(); // 绑定VAO
    // 获取数据源

    // 获取VBO
    let buffer: WebGLBuffer = this._buffer;
    // 绑定VBO
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);

    // 上传渲染数据到VBO中
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      this._lists.subArray(),
      this.gl.DYNAMIC_DRAW
    );

    // GLMeshBuilder不使用索引缓冲区绘制方式，因此调用drawArrays方法
    if (this._ibo !== null) {
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this._ibo);
      //this.gl.bufferData( this.gl.ELEMENT_ARRAY_BUFFER, this._indices.subArray(), this._indexCount );
      this.gl.drawElements(
        this.drawMode,
        this._indexCount,
        this.gl.UNSIGNED_SHORT,
        0
      );
    } else {
      this.gl.drawArrays(this.drawMode, 0, this._vertCount);
    }
    this._ibo = null
    this.unbind(); // 解绑VAO
    this.program.unbind(); // 解绑GLProgram
  }
}
