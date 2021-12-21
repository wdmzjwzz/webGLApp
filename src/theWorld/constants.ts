import { GLAttribInfo, GLAttribName } from "./type";

export const FLOAT32_SIZE = Float32Array.BYTES_PER_ELEMENT;
export const UINT16_SIZE = Uint16Array.BYTES_PER_ELEMENT;

export const GLAttribMap: { [key: string]: GLAttribInfo } = {
    [GLAttribName.POSITION]: { bit: 1 << 0, component: 3, location: 0 },
    [GLAttribName.TEXCOORD]: { bit: 1 << 1, component: 2, location: 1 },
    [GLAttribName.NORMAL]: { bit: 1 << 2, component: 3, location: 2 },
    [GLAttribName.COLOR]: { bit: 1 << 3, component: 4, location: 3 },
    [GLAttribName.SIZE]: { bit: 1 << 4, component: 1, location: 4 },
  };
  export const attribNames = [
    GLAttribName.POSITION,
    GLAttribName.TEXCOORD,
    GLAttribName.NORMAL,
    GLAttribName.COLOR,
    GLAttribName.SIZE,
  ];